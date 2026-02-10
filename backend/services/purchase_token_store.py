"""
Purchase Token Store
Manages single-use purchase tokens for negotiated prices.
Tokens are created when admin accepts an offer and consumed at checkout.
"""
import logging
import os
import secrets
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional

logger = logging.getLogger(__name__)


# ==============================================================================
# TOKEN DATA
# ==============================================================================

class TokenData:
    """Internal token record."""
    def __init__(
        self,
        token: str,
        user_id: str,
        product_id: str,
        amount: float,
        expires_at: datetime,
        agreement_id: str,
        consumed: bool = False,
        consumed_at: Optional[datetime] = None
    ):
        self.token = token
        self.user_id = user_id
        self.product_id = product_id
        self.amount = amount
        self.expires_at = expires_at
        self.agreement_id = agreement_id
        self.consumed = consumed
        self.consumed_at = consumed_at


# ==============================================================================
# INTERFACE
# ==============================================================================

class PurchaseTokenStoreInterface(ABC):
    """Abstract interface for purchase token storage."""

    @abstractmethod
    async def create_token(
        self,
        user_id: str,
        product_id: str,
        amount: float,
        agreement_id: str,
        ttl_minutes: int = 30
    ) -> dict:
        """Create a new purchase token."""
        pass

    @abstractmethod
    async def verify_token(self, user_id: str, token: str) -> dict:
        """Verify a token and return its details."""
        pass

    @abstractmethod
    async def consume_token(self, user_id: str, token: str) -> dict:
        """Consume (use) a token. Can only be consumed once."""
        pass

    @abstractmethod
    async def get_token_by_agreement(self, agreement_id: str) -> Optional[TokenData]:
        """Get token by agreement ID."""
        pass


# ==============================================================================
# IN-MEMORY IMPLEMENTATION
# ==============================================================================

class InMemoryPurchaseTokenStore(PurchaseTokenStoreInterface):
    """In-memory store for development."""

    def __init__(self):
        self._tokens: Dict[str, TokenData] = {}
        self._by_agreement: Dict[str, str] = {}  # agreement_id -> token
        logger.info("InMemoryPurchaseTokenStore initialized")

    async def create_token(
        self,
        user_id: str,
        product_id: str,
        amount: float,
        agreement_id: str,
        ttl_minutes: int = 30
    ) -> dict:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)

        token_data = TokenData(
            token=token,
            user_id=user_id,
            product_id=product_id,
            amount=amount,
            expires_at=expires_at,
            agreement_id=agreement_id,
            consumed=False
        )

        self._tokens[token] = token_data
        self._by_agreement[agreement_id] = token

        logger.info(f"Created purchase token for agreement {agreement_id}")
        return {
            "token": token,
            "expires_at": expires_at
        }

    async def verify_token(self, user_id: str, token: str) -> dict:
        token_data = self._tokens.get(token)

        if not token_data:
            return {"valid": False, "reason": "Token not found"}

        if token_data.user_id != user_id:
            return {"valid": False, "reason": "Token does not belong to user"}

        if token_data.consumed:
            return {"valid": False, "reason": "Token already consumed"}

        if datetime.now(timezone.utc) > token_data.expires_at:
            return {"valid": False, "reason": "Token expired"}

        return {
            "valid": True,
            "product_id": token_data.product_id,
            "amount": token_data.amount,
            "expires_at": token_data.expires_at,
            "agreement_id": token_data.agreement_id
        }

    async def consume_token(self, user_id: str, token: str) -> dict:
        verification = await self.verify_token(user_id, token)

        if not verification.get("valid"):
            return {"consumed": False, "reason": verification.get("reason")}

        token_data = self._tokens[token]
        token_data.consumed = True
        token_data.consumed_at = datetime.now(timezone.utc)

        logger.info(f"Consumed token for agreement {token_data.agreement_id}")
        return {
            "consumed": True,
            "agreement_id": token_data.agreement_id,
            "amount": token_data.amount,
            "product_id": token_data.product_id
        }

    async def get_token_by_agreement(self, agreement_id: str) -> Optional[TokenData]:
        token_str = self._by_agreement.get(agreement_id)
        if token_str:
            return self._tokens.get(token_str)
        return None


# ==============================================================================
# FILE-BACKED IMPLEMENTATION (Design/Dev with Persistence)
# ==============================================================================

class FilePurchaseTokenStore(PurchaseTokenStoreInterface):
    """
    File-backed store for design-stage persistence.
    
    Note: Tokens are stored but expire timestamps are honored.
    """
    
    def __init__(self, base_dir: str = None):
        from config.persistence import PERSISTENCE_DIR, PURCHASE_TOKENS_FILE
        from services.persistence.json_store import JsonStore
        
        self._base_dir = base_dir or PERSISTENCE_DIR
        self._store = JsonStore(self._base_dir)
        self._filename = PURCHASE_TOKENS_FILE
        self._tokens: Dict[str, TokenData] = {}
        self._by_agreement: Dict[str, str] = {}
        self._load_from_file()
        logger.info(f"FilePurchaseTokenStore: Loaded {len(self._tokens)} tokens")
    
    def _load_from_file(self) -> None:
        """Load tokens from JSON file."""
        data = self._store.load(self._filename, default={"tokens": []})
        for td in data.get("tokens", []):
            try:
                token_data = TokenData(
                    token=td["token"],
                    user_id=td["user_id"],
                    product_id=td["product_id"],
                    amount=td["amount"],
                    expires_at=datetime.fromisoformat(td["expires_at"]) if isinstance(td["expires_at"], str) else td["expires_at"],
                    agreement_id=td["agreement_id"],
                    consumed=td.get("consumed", False),
                    consumed_at=datetime.fromisoformat(td["consumed_at"]) if td.get("consumed_at") and isinstance(td["consumed_at"], str) else td.get("consumed_at")
                )
                self._tokens[token_data.token] = token_data
                self._by_agreement[token_data.agreement_id] = token_data.token
            except Exception as e:
                logger.warning(f"FilePurchaseTokenStore: Failed to parse token: {e}")
    
    def _save_to_file(self) -> None:
        """Save tokens to JSON file."""
        tokens_list = []
        for t in self._tokens.values():
            tokens_list.append({
                "token": t.token,
                "user_id": t.user_id,
                "product_id": t.product_id,
                "amount": t.amount,
                "expires_at": t.expires_at.isoformat(),
                "agreement_id": t.agreement_id,
                "consumed": t.consumed,
                "consumed_at": t.consumed_at.isoformat() if t.consumed_at else None
            })
        self._store.save(self._filename, {"tokens": tokens_list})
    
    async def create_token(
        self,
        user_id: str,
        product_id: str,
        amount: float,
        agreement_id: str,
        ttl_minutes: int = 30
    ) -> dict:
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)

        token_data = TokenData(
            token=token,
            user_id=user_id,
            product_id=product_id,
            amount=amount,
            expires_at=expires_at,
            agreement_id=agreement_id,
            consumed=False
        )

        self._tokens[token] = token_data
        self._by_agreement[agreement_id] = token
        self._save_to_file()

        logger.info(f"FilePurchaseTokenStore: Created token for agreement {agreement_id}")
        return {
            "token": token,
            "expires_at": expires_at
        }

    async def verify_token(self, user_id: str, token: str) -> dict:
        token_data = self._tokens.get(token)

        if not token_data:
            return {"valid": False, "reason": "Token not found"}

        if token_data.user_id != user_id:
            return {"valid": False, "reason": "Token does not belong to user"}

        if token_data.consumed:
            return {"valid": False, "reason": "Token already consumed"}

        if datetime.now(timezone.utc) > token_data.expires_at:
            return {"valid": False, "reason": "Token expired"}

        return {
            "valid": True,
            "product_id": token_data.product_id,
            "amount": token_data.amount,
            "expires_at": token_data.expires_at,
            "agreement_id": token_data.agreement_id
        }

    async def consume_token(self, user_id: str, token: str) -> dict:
        verification = await self.verify_token(user_id, token)

        if not verification.get("valid"):
            return {"consumed": False, "reason": verification.get("reason")}

        token_data = self._tokens[token]
        token_data.consumed = True
        token_data.consumed_at = datetime.now(timezone.utc)
        self._save_to_file()

        logger.info(f"FilePurchaseTokenStore: Consumed token for agreement {token_data.agreement_id}")
        return {
            "consumed": True,
            "agreement_id": token_data.agreement_id,
            "amount": token_data.amount,
            "product_id": token_data.product_id
        }

    async def get_token_by_agreement(self, agreement_id: str) -> Optional[TokenData]:
        token_str = self._by_agreement.get(agreement_id)
        if token_str:
            return self._tokens.get(token_str)
        return None


# ==============================================================================
# DB IMPLEMENTATION (STUB)
# ==============================================================================

class DbPurchaseTokenStore(PurchaseTokenStoreInterface):
    """Database-backed purchase token store."""

    def __init__(self, db):
        self._db = db
        logger.info("DbPurchaseTokenStore initialized")

    async def create_token(self, user_id: str, product_id: str, amount: float,
                           agreement_id: str, ttl_minutes: int = 1440) -> dict:
        token = secrets.token_urlsafe(32)
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=ttl_minutes)
        doc = {
            "token": token,
            "user_id": user_id,
            "product_id": product_id,
            "amount": amount,
            "agreement_id": agreement_id,
            "created_at": now.isoformat(),
            "expires_at": expires_at.isoformat(),
            "consumed": False,
            "consumed_at": None,
        }
        await self._db.purchase_tokens.insert_one(doc)
        logger.info(f"DbPurchaseTokenStore: Created token for agreement {agreement_id}")
        return doc

    async def verify_token(self, user_id: str, token: str) -> dict:
        from datetime import datetime, timezone
        doc = await self._db.purchase_tokens.find_one({"token": token}, {"_id": 0})
        if not doc:
            return {"valid": False, "reason": "Token not found"}
        if doc["user_id"] != user_id:
            return {"valid": False, "reason": "Token not for this user"}
        if doc.get("consumed"):
            return {"valid": False, "reason": "Token already used"}
        if datetime.fromisoformat(doc["expires_at"]) < datetime.now(timezone.utc):
            return {"valid": False, "reason": "Token expired"}
        return {
            "valid": True,
            "amount": doc["amount"],
            "product_id": doc["product_id"],
            "agreement_id": doc["agreement_id"],
            "expires_at": doc["expires_at"],
        }

    async def consume_token(self, user_id: str, token: str) -> dict:
        from datetime import datetime, timezone
        result = await self.verify_token(user_id, token)
        if not result.get("valid"):
            return result
        await self._db.purchase_tokens.update_one(
            {"token": token},
            {"$set": {"consumed": True, "consumed_at": datetime.now(timezone.utc).isoformat()}}
        )
        logger.info(f"DbPurchaseTokenStore: Consumed token {token[:8]}")
        return {"consumed": True, **result}

    async def get_token_by_agreement(self, agreement_id: str) -> Optional[TokenData]:
        doc = await self._db.purchase_tokens.find_one({"agreement_id": agreement_id}, {"_id": 0})
        if not doc:
            return None
        from datetime import datetime, timezone
        return TokenData(
            token=doc["token"],
            user_id=doc["user_id"],
            product_id=doc["product_id"],
            amount=doc["amount"],
            agreement_id=doc["agreement_id"],
            created_at=datetime.fromisoformat(doc["created_at"]),
            expires_at=datetime.fromisoformat(doc["expires_at"]),
            consumed=doc.get("consumed", False),
            consumed_at=datetime.fromisoformat(doc["consumed_at"]) if doc.get("consumed_at") else None,
        )


# ==============================================================================
# FACTORY
# ==============================================================================

_token_store: Optional[PurchaseTokenStoreInterface] = None


def get_purchase_token_store() -> PurchaseTokenStoreInterface:
    """Get the singleton purchase token store instance based on PERSISTENCE_MODE."""
    global _token_store
    if _token_store is None:
        from config.persistence import PERSISTENCE_MODE
        
        if PERSISTENCE_MODE == "FILE":
            _token_store = FilePurchaseTokenStore()
            logger.info("PurchaseTokenStore: Using FilePurchaseTokenStore (FILE mode)")
        elif PERSISTENCE_MODE == "DB":
            from server import db
            _token_store = DbPurchaseTokenStore(db)
            logger.info("PurchaseTokenStore: Using DbPurchaseTokenStore (DB mode)")
        else:
            _token_store = InMemoryPurchaseTokenStore()
            logger.info("PurchaseTokenStore: Using InMemoryPurchaseTokenStore (MEMORY mode)")
    return _token_store


def reset_purchase_token_store():
    """Reset store (for testing)."""
    global _token_store
    _token_store = None

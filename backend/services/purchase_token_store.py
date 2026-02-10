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
# DB IMPLEMENTATION (STUB)
# ==============================================================================

class DbPurchaseTokenStore(PurchaseTokenStoreInterface):
    """Database-backed store (STUB for future implementation)."""

    def __init__(self, db):
        self._db = db
        logger.info("DbPurchaseTokenStore initialized (STUB)")

    async def create_token(self, *args, **kwargs) -> dict:
        raise NotImplementedError("DbPurchaseTokenStore not implemented yet")

    async def verify_token(self, user_id: str, token: str) -> dict:
        raise NotImplementedError("DbPurchaseTokenStore not implemented yet")

    async def consume_token(self, user_id: str, token: str) -> dict:
        raise NotImplementedError("DbPurchaseTokenStore not implemented yet")

    async def get_token_by_agreement(self, agreement_id: str) -> Optional[TokenData]:
        raise NotImplementedError("DbPurchaseTokenStore not implemented yet")


# ==============================================================================
# FACTORY
# ==============================================================================

_token_store: Optional[PurchaseTokenStoreInterface] = None


def get_purchase_token_store() -> PurchaseTokenStoreInterface:
    """Get the singleton purchase token store instance."""
    global _token_store
    if _token_store is None:
        use_db = os.environ.get("USE_DB_PURCHASE_TOKEN_STORE", "false").lower() == "true"
        if use_db:
            _token_store = DbPurchaseTokenStore(None)
        else:
            _token_store = InMemoryPurchaseTokenStore()
    return _token_store


def reset_purchase_token_store():
    """Reset store (for testing)."""
    global _token_store
    _token_store = None

"""
Negotiation Store
Storage adapter for negotiation threads and agreements.
Implements in-memory store for dev and stub for DB.
"""
import logging
import os
import secrets
import uuid
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Literal, Optional

from models.negotiation import (
    NegotiationAgreement,
    NegotiationMessage,
    NegotiationThread,
    NegotiationThreadSummary,
)

logger = logging.getLogger(__name__)


# ==============================================================================
# INTERFACE
# ==============================================================================

class NegotiationStoreInterface(ABC):
    """Abstract interface for negotiation storage."""

    @abstractmethod
    async def create_thread(
        self,
        user_id: str,
        user_email: str,
        user_name: str,
        product_id: str,
        product_title: str,
        product_price: float,
        initial_offer_amount: float,
        text: Optional[str] = None
    ) -> NegotiationThread:
        """Create a new negotiation thread with initial offer."""
        pass

    @abstractmethod
    async def list_threads_for_user(self, user_id: str) -> List[NegotiationThreadSummary]:
        """List negotiation summaries for a user."""
        pass

    @abstractmethod
    async def list_threads_for_admin(
        self, status: Optional[Literal["OPEN", "ACCEPTED", "CLOSED"]] = None
    ) -> List[NegotiationThreadSummary]:
        """List negotiation summaries for admin."""
        pass

    @abstractmethod
    async def get_thread(self, negotiation_id: str) -> Optional[NegotiationThread]:
        """Get a full negotiation thread by ID."""
        pass

    @abstractmethod
    async def add_message(
        self,
        negotiation_id: str,
        sender_role: Literal["USER", "ADMIN"],
        kind: Literal["OFFER", "COUNTER", "NOTE", "ACCEPT", "CLOSE"],
        amount: Optional[float] = None,
        text: Optional[str] = None
    ) -> Optional[NegotiationThread]:
        """Add a message to a negotiation thread."""
        pass

    @abstractmethod
    async def set_status(
        self,
        negotiation_id: str,
        status: Literal["OPEN", "ACCEPTED", "CLOSED"]
    ) -> Optional[NegotiationThread]:
        """Set the status of a negotiation thread."""
        pass

    @abstractmethod
    async def create_agreement_on_accept(
        self,
        negotiation_id: str,
        accepted_amount: float,
        ttl_minutes: int = 30
    ) -> Optional[NegotiationAgreement]:
        """Create a purchase agreement when admin accepts."""
        pass

    @abstractmethod
    async def get_agreement_for_negotiation(
        self, negotiation_id: str
    ) -> Optional[NegotiationAgreement]:
        """Get agreement for a negotiation if exists."""
        pass

    @abstractmethod
    async def get_agreement_by_id(
        self, agreement_id: str
    ) -> Optional[NegotiationAgreement]:
        """Get agreement by ID."""
        pass


# ==============================================================================
# IN-MEMORY IMPLEMENTATION
# ==============================================================================

class InMemoryNegotiationStore(NegotiationStoreInterface):
    """In-memory store for development."""

    def __init__(self):
        self._threads: Dict[str, NegotiationThread] = {}
        self._agreements: Dict[str, NegotiationAgreement] = {}
        logger.info("InMemoryNegotiationStore initialized")

    async def create_thread(
        self,
        user_id: str,
        user_email: str,
        user_name: str,
        product_id: str,
        product_title: str,
        product_price: float,
        initial_offer_amount: float,
        text: Optional[str] = None
    ) -> NegotiationThread:
        negotiation_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        initial_message = NegotiationMessage(
            message_id=str(uuid.uuid4()),
            sender_role="USER",
            kind="OFFER",
            amount=initial_offer_amount,
            text=text,
            created_at=now
        )

        thread = NegotiationThread(
            negotiation_id=negotiation_id,
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            product_id=product_id,
            product_title=product_title,
            product_price=product_price,
            status="OPEN",
            created_at=now,
            updated_at=now,
            last_activity_at=now,
            messages=[initial_message],
            accepted_agreement_id=None
        )

        self._threads[negotiation_id] = thread
        logger.info(f"Created negotiation thread {negotiation_id} for user {user_id}")
        return thread

    async def list_threads_for_user(self, user_id: str) -> List[NegotiationThreadSummary]:
        summaries = []
        for thread in self._threads.values():
            if thread.user_id == user_id:
                summaries.append(self._to_summary(thread))
        return sorted(summaries, key=lambda x: x.last_activity_at, reverse=True)

    async def list_threads_for_admin(
        self, status: Optional[Literal["OPEN", "ACCEPTED", "CLOSED"]] = None
    ) -> List[NegotiationThreadSummary]:
        summaries = []
        for thread in self._threads.values():
            if status is None or thread.status == status:
                summaries.append(self._to_summary(thread))
        return sorted(summaries, key=lambda x: x.last_activity_at, reverse=True)

    async def get_thread(self, negotiation_id: str) -> Optional[NegotiationThread]:
        return self._threads.get(negotiation_id)

    async def add_message(
        self,
        negotiation_id: str,
        sender_role: Literal["USER", "ADMIN"],
        kind: Literal["OFFER", "COUNTER", "NOTE", "ACCEPT", "CLOSE"],
        amount: Optional[float] = None,
        text: Optional[str] = None
    ) -> Optional[NegotiationThread]:
        thread = self._threads.get(negotiation_id)
        if not thread:
            return None

        now = datetime.now(timezone.utc)
        message = NegotiationMessage(
            message_id=str(uuid.uuid4()),
            sender_role=sender_role,
            kind=kind,
            amount=amount,
            text=text,
            created_at=now
        )

        thread.messages.append(message)
        thread.updated_at = now
        thread.last_activity_at = now

        logger.info(f"Added {kind} message to negotiation {negotiation_id}")
        return thread

    async def set_status(
        self,
        negotiation_id: str,
        status: Literal["OPEN", "ACCEPTED", "CLOSED"]
    ) -> Optional[NegotiationThread]:
        thread = self._threads.get(negotiation_id)
        if not thread:
            return None

        thread.status = status
        thread.updated_at = datetime.now(timezone.utc)
        logger.info(f"Set negotiation {negotiation_id} status to {status}")
        return thread

    async def create_agreement_on_accept(
        self,
        negotiation_id: str,
        accepted_amount: float,
        ttl_minutes: int = 30
    ) -> Optional[NegotiationAgreement]:
        thread = self._threads.get(negotiation_id)
        if not thread:
            return None

        now = datetime.now(timezone.utc)
        agreement_id = str(uuid.uuid4())
        purchase_token = secrets.token_urlsafe(32)

        agreement = NegotiationAgreement(
            agreement_id=agreement_id,
            negotiation_id=negotiation_id,
            user_id=thread.user_id,
            product_id=thread.product_id,
            product_title=thread.product_title,
            accepted_amount=accepted_amount,
            status="ACTIVE",
            purchase_token=purchase_token,
            purchase_token_expires_at=now + timedelta(minutes=ttl_minutes),
            created_at=now,
            used_at=None
        )

        self._agreements[agreement_id] = agreement
        thread.accepted_agreement_id = agreement_id

        logger.info(f"Created agreement {agreement_id} for negotiation {negotiation_id}")
        return agreement

    async def get_agreement_for_negotiation(
        self, negotiation_id: str
    ) -> Optional[NegotiationAgreement]:
        for agreement in self._agreements.values():
            if agreement.negotiation_id == negotiation_id:
                return agreement
        return None

    async def get_agreement_by_id(
        self, agreement_id: str
    ) -> Optional[NegotiationAgreement]:
        return self._agreements.get(agreement_id)

    def _to_summary(self, thread: NegotiationThread) -> NegotiationThreadSummary:
        last_message = thread.messages[-1] if thread.messages else None
        last_amount = None
        for msg in reversed(thread.messages):
            if msg.amount is not None:
                last_amount = msg.amount
                break

        return NegotiationThreadSummary(
            negotiation_id=thread.negotiation_id,
            user_id=thread.user_id,
            user_email=thread.user_email,
            user_name=thread.user_name,
            product_id=thread.product_id,
            product_title=thread.product_title,
            product_price=thread.product_price,
            status=thread.status,
            created_at=thread.created_at,
            last_activity_at=thread.last_activity_at,
            last_message_preview=last_message.text[:50] if last_message and last_message.text else None,
            last_amount=last_amount,
            message_count=len(thread.messages)
        )


# ==============================================================================
# FILE-BACKED IMPLEMENTATION (Design/Dev with Persistence)
# ==============================================================================

class FileNegotiationStore(NegotiationStoreInterface):
    """
    File-backed store for design-stage persistence.
    
    Loads from JSON at init, saves after every mutation.
    """
    
    def __init__(self, base_dir: str = None):
        from config.persistence import PERSISTENCE_DIR, NEGOTIATIONS_FILE, NEGOTIATION_AGREEMENTS_FILE
        from services.persistence.json_store import JsonStore
        
        self._base_dir = base_dir or PERSISTENCE_DIR
        self._store = JsonStore(self._base_dir)
        self._threads_file = NEGOTIATIONS_FILE
        self._agreements_file = NEGOTIATION_AGREEMENTS_FILE
        self._threads: Dict[str, NegotiationThread] = {}
        self._agreements: Dict[str, NegotiationAgreement] = {}
        self._load_from_file()
        logger.info(f"FileNegotiationStore: Loaded {len(self._threads)} threads, {len(self._agreements)} agreements")
    
    def _load_from_file(self) -> None:
        """Load data from JSON files."""
        # Load threads
        threads_data = self._store.load(self._threads_file, default={"threads": []})
        for td in threads_data.get("threads", []):
            try:
                # Reconstruct messages
                messages = []
                for md in td.get("messages", []):
                    messages.append(NegotiationMessage(
                        message_id=md["message_id"],
                        sender_role=md["sender_role"],
                        kind=md["kind"],
                        amount=md.get("amount"),
                        text=md.get("text"),
                        created_at=datetime.fromisoformat(md["created_at"]) if isinstance(md["created_at"], str) else md["created_at"]
                    ))
                
                thread = NegotiationThread(
                    negotiation_id=td["negotiation_id"],
                    user_id=td["user_id"],
                    user_email=td["user_email"],
                    user_name=td["user_name"],
                    product_id=td["product_id"],
                    product_title=td["product_title"],
                    product_price=td["product_price"],
                    status=td["status"],
                    created_at=datetime.fromisoformat(td["created_at"]) if isinstance(td["created_at"], str) else td["created_at"],
                    updated_at=datetime.fromisoformat(td["updated_at"]) if isinstance(td["updated_at"], str) else td["updated_at"],
                    last_activity_at=datetime.fromisoformat(td["last_activity_at"]) if isinstance(td["last_activity_at"], str) else td["last_activity_at"],
                    messages=messages,
                    accepted_agreement_id=td.get("accepted_agreement_id")
                )
                self._threads[thread.negotiation_id] = thread
            except Exception as e:
                logger.warning(f"FileNegotiationStore: Failed to parse thread: {e}")
        
        # Load agreements
        agreements_data = self._store.load(self._agreements_file, default={"agreements": []})
        for ad in agreements_data.get("agreements", []):
            try:
                agreement = NegotiationAgreement(
                    agreement_id=ad["agreement_id"],
                    negotiation_id=ad["negotiation_id"],
                    user_id=ad["user_id"],
                    product_id=ad["product_id"],
                    product_title=ad["product_title"],
                    accepted_amount=ad["accepted_amount"],
                    status=ad["status"],
                    purchase_token=ad["purchase_token"],
                    purchase_token_expires_at=datetime.fromisoformat(ad["purchase_token_expires_at"]) if isinstance(ad["purchase_token_expires_at"], str) else ad["purchase_token_expires_at"],
                    created_at=datetime.fromisoformat(ad["created_at"]) if isinstance(ad["created_at"], str) else ad["created_at"],
                    used_at=datetime.fromisoformat(ad["used_at"]) if ad.get("used_at") and isinstance(ad["used_at"], str) else ad.get("used_at")
                )
                self._agreements[agreement.agreement_id] = agreement
            except Exception as e:
                logger.warning(f"FileNegotiationStore: Failed to parse agreement: {e}")
    
    def _save_threads(self) -> None:
        """Save threads to JSON file."""
        threads_list = []
        for t in self._threads.values():
            td = {
                "negotiation_id": t.negotiation_id,
                "user_id": t.user_id,
                "user_email": t.user_email,
                "user_name": t.user_name,
                "product_id": t.product_id,
                "product_title": t.product_title,
                "product_price": t.product_price,
                "status": t.status,
                "created_at": t.created_at.isoformat(),
                "updated_at": t.updated_at.isoformat(),
                "last_activity_at": t.last_activity_at.isoformat(),
                "messages": [
                    {
                        "message_id": m.message_id,
                        "sender_role": m.sender_role,
                        "kind": m.kind,
                        "amount": m.amount,
                        "text": m.text,
                        "created_at": m.created_at.isoformat()
                    } for m in t.messages
                ],
                "accepted_agreement_id": t.accepted_agreement_id
            }
            threads_list.append(td)
        self._store.save(self._threads_file, {"threads": threads_list})
    
    def _save_agreements(self) -> None:
        """Save agreements to JSON file."""
        agreements_list = []
        for a in self._agreements.values():
            ad = {
                "agreement_id": a.agreement_id,
                "negotiation_id": a.negotiation_id,
                "user_id": a.user_id,
                "product_id": a.product_id,
                "product_title": a.product_title,
                "accepted_amount": a.accepted_amount,
                "status": a.status,
                "purchase_token": a.purchase_token,
                "purchase_token_expires_at": a.purchase_token_expires_at.isoformat(),
                "created_at": a.created_at.isoformat(),
                "used_at": a.used_at.isoformat() if a.used_at else None
            }
            agreements_list.append(ad)
        self._store.save(self._agreements_file, {"agreements": agreements_list})
    
    async def create_thread(
        self,
        user_id: str,
        user_email: str,
        user_name: str,
        product_id: str,
        product_title: str,
        product_price: float,
        initial_offer_amount: float,
        text: Optional[str] = None
    ) -> NegotiationThread:
        negotiation_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        initial_message = NegotiationMessage(
            message_id=str(uuid.uuid4()),
            sender_role="USER",
            kind="OFFER",
            amount=initial_offer_amount,
            text=text,
            created_at=now
        )

        thread = NegotiationThread(
            negotiation_id=negotiation_id,
            user_id=user_id,
            user_email=user_email,
            user_name=user_name,
            product_id=product_id,
            product_title=product_title,
            product_price=product_price,
            status="OPEN",
            created_at=now,
            updated_at=now,
            last_activity_at=now,
            messages=[initial_message],
            accepted_agreement_id=None
        )

        self._threads[negotiation_id] = thread
        self._save_threads()
        logger.info(f"FileNegotiationStore: Created thread {negotiation_id}")
        return thread

    async def list_threads_for_user(self, user_id: str) -> List[NegotiationThreadSummary]:
        summaries = []
        for thread in self._threads.values():
            if thread.user_id == user_id:
                summaries.append(self._to_summary(thread))
        return sorted(summaries, key=lambda x: x.last_activity_at, reverse=True)

    async def list_threads_for_admin(
        self, status: Optional[Literal["OPEN", "ACCEPTED", "CLOSED"]] = None
    ) -> List[NegotiationThreadSummary]:
        summaries = []
        for thread in self._threads.values():
            if status is None or thread.status == status:
                summaries.append(self._to_summary(thread))
        return sorted(summaries, key=lambda x: x.last_activity_at, reverse=True)

    async def get_thread(self, negotiation_id: str) -> Optional[NegotiationThread]:
        return self._threads.get(negotiation_id)

    async def add_message(
        self,
        negotiation_id: str,
        sender_role: Literal["USER", "ADMIN"],
        kind: Literal["OFFER", "COUNTER", "NOTE", "ACCEPT", "CLOSE"],
        amount: Optional[float] = None,
        text: Optional[str] = None
    ) -> Optional[NegotiationThread]:
        thread = self._threads.get(negotiation_id)
        if not thread:
            return None

        now = datetime.now(timezone.utc)
        message = NegotiationMessage(
            message_id=str(uuid.uuid4()),
            sender_role=sender_role,
            kind=kind,
            amount=amount,
            text=text,
            created_at=now
        )

        thread.messages.append(message)
        thread.updated_at = now
        thread.last_activity_at = now
        self._save_threads()
        logger.debug(f"FileNegotiationStore: Added {kind} to {negotiation_id}")
        return thread

    async def set_status(
        self,
        negotiation_id: str,
        status: Literal["OPEN", "ACCEPTED", "CLOSED"]
    ) -> Optional[NegotiationThread]:
        thread = self._threads.get(negotiation_id)
        if not thread:
            return None

        thread.status = status
        thread.updated_at = datetime.now(timezone.utc)
        self._save_threads()
        return thread

    async def create_agreement_on_accept(
        self,
        negotiation_id: str,
        accepted_amount: float,
        ttl_minutes: int = 30
    ) -> Optional[NegotiationAgreement]:
        thread = self._threads.get(negotiation_id)
        if not thread:
            return None

        now = datetime.now(timezone.utc)
        agreement_id = str(uuid.uuid4())
        purchase_token = secrets.token_urlsafe(32)

        agreement = NegotiationAgreement(
            agreement_id=agreement_id,
            negotiation_id=negotiation_id,
            user_id=thread.user_id,
            product_id=thread.product_id,
            product_title=thread.product_title,
            accepted_amount=accepted_amount,
            status="ACTIVE",
            purchase_token=purchase_token,
            purchase_token_expires_at=now + timedelta(minutes=ttl_minutes),
            created_at=now,
            used_at=None
        )

        self._agreements[agreement_id] = agreement
        thread.accepted_agreement_id = agreement_id
        self._save_agreements()
        self._save_threads()
        logger.info(f"FileNegotiationStore: Created agreement {agreement_id}")
        return agreement

    async def get_agreement_for_negotiation(
        self, negotiation_id: str
    ) -> Optional[NegotiationAgreement]:
        for agreement in self._agreements.values():
            if agreement.negotiation_id == negotiation_id:
                return agreement
        return None

    async def get_agreement_by_id(
        self, agreement_id: str
    ) -> Optional[NegotiationAgreement]:
        return self._agreements.get(agreement_id)

    def _to_summary(self, thread: NegotiationThread) -> NegotiationThreadSummary:
        last_message = thread.messages[-1] if thread.messages else None
        last_amount = None
        for msg in reversed(thread.messages):
            if msg.amount is not None:
                last_amount = msg.amount
                break

        return NegotiationThreadSummary(
            negotiation_id=thread.negotiation_id,
            user_id=thread.user_id,
            user_email=thread.user_email,
            user_name=thread.user_name,
            product_id=thread.product_id,
            product_title=thread.product_title,
            product_price=thread.product_price,
            status=thread.status,
            created_at=thread.created_at,
            last_activity_at=thread.last_activity_at,
            last_message_preview=last_message.text[:50] if last_message and last_message.text else None,
            last_amount=last_amount,
            message_count=len(thread.messages)
        )


# ==============================================================================
# DB IMPLEMENTATION (STUB)
# ==============================================================================

class DbNegotiationStore(NegotiationStoreInterface):
    """MongoDB-backed negotiation store for production."""

    def __init__(self, db):
        self._db = db
        self._threads_col = "negotiation_threads"
        self._agreements_col = "negotiation_agreements"
        logger.info("DbNegotiationStore initialized")

    def _thread_from_doc(self, doc: dict) -> NegotiationThread:
        messages = []
        for md in doc.get("messages", []):
            ca = md["created_at"]
            messages.append(NegotiationMessage(
                message_id=md["message_id"],
                sender_role=md["sender_role"],
                kind=md["kind"],
                amount=md.get("amount"),
                text=md.get("text"),
                created_at=datetime.fromisoformat(ca) if isinstance(ca, str) else ca
            ))
        def _dt(val):
            if isinstance(val, str):
                return datetime.fromisoformat(val)
            return val
        return NegotiationThread(
            negotiation_id=doc["negotiation_id"],
            user_id=doc["user_id"],
            user_email=doc["user_email"],
            user_name=doc["user_name"],
            product_id=doc["product_id"],
            product_title=doc["product_title"],
            product_price=doc["product_price"],
            status=doc["status"],
            created_at=_dt(doc["created_at"]),
            updated_at=_dt(doc["updated_at"]),
            last_activity_at=_dt(doc["last_activity_at"]),
            messages=messages,
            accepted_agreement_id=doc.get("accepted_agreement_id")
        )

    def _thread_to_doc(self, t: NegotiationThread) -> dict:
        return {
            "negotiation_id": t.negotiation_id,
            "user_id": t.user_id,
            "user_email": t.user_email,
            "user_name": t.user_name,
            "product_id": t.product_id,
            "product_title": t.product_title,
            "product_price": t.product_price,
            "status": t.status,
            "created_at": t.created_at.isoformat(),
            "updated_at": t.updated_at.isoformat(),
            "last_activity_at": t.last_activity_at.isoformat(),
            "messages": [
                {
                    "message_id": m.message_id,
                    "sender_role": m.sender_role,
                    "kind": m.kind,
                    "amount": m.amount,
                    "text": m.text,
                    "created_at": m.created_at.isoformat()
                } for m in t.messages
            ],
            "accepted_agreement_id": t.accepted_agreement_id
        }

    def _agreement_from_doc(self, doc: dict) -> NegotiationAgreement:
        def _dt(val):
            if val is None:
                return None
            return datetime.fromisoformat(val) if isinstance(val, str) else val
        return NegotiationAgreement(
            agreement_id=doc["agreement_id"],
            negotiation_id=doc["negotiation_id"],
            user_id=doc["user_id"],
            product_id=doc["product_id"],
            product_title=doc["product_title"],
            accepted_amount=doc["accepted_amount"],
            status=doc["status"],
            purchase_token=doc["purchase_token"],
            purchase_token_expires_at=_dt(doc["purchase_token_expires_at"]),
            created_at=_dt(doc["created_at"]),
            used_at=_dt(doc.get("used_at"))
        )

    async def create_thread(
        self, user_id, user_email, user_name, product_id,
        product_title, product_price, initial_offer_amount, text=None
    ) -> NegotiationThread:
        negotiation_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        initial_message = NegotiationMessage(
            message_id=str(uuid.uuid4()), sender_role="USER",
            kind="OFFER", amount=initial_offer_amount, text=text, created_at=now
        )
        thread = NegotiationThread(
            negotiation_id=negotiation_id, user_id=user_id, user_email=user_email,
            user_name=user_name, product_id=product_id, product_title=product_title,
            product_price=product_price, status="OPEN", created_at=now,
            updated_at=now, last_activity_at=now, messages=[initial_message],
            accepted_agreement_id=None
        )
        await self._db[self._threads_col].insert_one(self._thread_to_doc(thread))
        logger.info(f"DbNegotiationStore: Created thread {negotiation_id}")
        return thread

    async def list_threads_for_user(self, user_id: str) -> List[NegotiationThreadSummary]:
        cursor = self._db[self._threads_col].find(
            {"user_id": user_id}, {"_id": 0}
        ).sort("last_activity_at", -1)
        return [self._to_summary(self._thread_from_doc(d)) async for d in cursor]

    async def list_threads_for_admin(self, status=None) -> List[NegotiationThreadSummary]:
        query = {"status": status} if status else {}
        cursor = self._db[self._threads_col].find(
            query, {"_id": 0}
        ).sort("last_activity_at", -1)
        return [self._to_summary(self._thread_from_doc(d)) async for d in cursor]

    async def get_thread(self, negotiation_id: str) -> Optional[NegotiationThread]:
        doc = await self._db[self._threads_col].find_one(
            {"negotiation_id": negotiation_id}, {"_id": 0}
        )
        return self._thread_from_doc(doc) if doc else None

    async def add_message(self, negotiation_id, sender_role, kind, amount=None, text=None):
        thread = await self.get_thread(negotiation_id)
        if not thread:
            return None
        now = datetime.now(timezone.utc)
        message = NegotiationMessage(
            message_id=str(uuid.uuid4()), sender_role=sender_role,
            kind=kind, amount=amount, text=text, created_at=now
        )
        thread.messages.append(message)
        thread.updated_at = now
        thread.last_activity_at = now
        await self._db[self._threads_col].replace_one(
            {"negotiation_id": negotiation_id},
            self._thread_to_doc(thread)
        )
        return thread

    async def set_status(self, negotiation_id, status):
        thread = await self.get_thread(negotiation_id)
        if not thread:
            return None
        thread.status = status
        thread.updated_at = datetime.now(timezone.utc)
        await self._db[self._threads_col].replace_one(
            {"negotiation_id": negotiation_id},
            self._thread_to_doc(thread)
        )
        return thread

    async def create_agreement_on_accept(self, negotiation_id, accepted_amount, ttl_minutes=30):
        thread = await self.get_thread(negotiation_id)
        if not thread:
            return None
        now = datetime.now(timezone.utc)
        agreement_id = str(uuid.uuid4())
        purchase_token = secrets.token_urlsafe(32)
        agreement = NegotiationAgreement(
            agreement_id=agreement_id, negotiation_id=negotiation_id,
            user_id=thread.user_id, product_id=thread.product_id,
            product_title=thread.product_title, accepted_amount=accepted_amount,
            status="ACTIVE", purchase_token=purchase_token,
            purchase_token_expires_at=now + timedelta(minutes=ttl_minutes),
            created_at=now, used_at=None
        )
        doc = {
            "agreement_id": agreement_id, "negotiation_id": negotiation_id,
            "user_id": thread.user_id, "product_id": thread.product_id,
            "product_title": thread.product_title, "accepted_amount": accepted_amount,
            "status": "ACTIVE", "purchase_token": purchase_token,
            "purchase_token_expires_at": agreement.purchase_token_expires_at.isoformat(),
            "created_at": now.isoformat(), "used_at": None
        }
        await self._db[self._agreements_col].insert_one(doc)
        thread.accepted_agreement_id = agreement_id
        await self._db[self._threads_col].replace_one(
            {"negotiation_id": negotiation_id},
            self._thread_to_doc(thread)
        )
        return agreement

    async def get_agreement_for_negotiation(self, negotiation_id):
        doc = await self._db[self._agreements_col].find_one(
            {"negotiation_id": negotiation_id}, {"_id": 0}
        )
        return self._agreement_from_doc(doc) if doc else None

    async def get_agreement_by_id(self, agreement_id):
        doc = await self._db[self._agreements_col].find_one(
            {"agreement_id": agreement_id}, {"_id": 0}
        )
        return self._agreement_from_doc(doc) if doc else None

    def _to_summary(self, thread: NegotiationThread) -> NegotiationThreadSummary:
        last_message = thread.messages[-1] if thread.messages else None
        last_amount = None
        for msg in reversed(thread.messages):
            if msg.amount is not None:
                last_amount = msg.amount
                break
        return NegotiationThreadSummary(
            negotiation_id=thread.negotiation_id,
            user_id=thread.user_id,
            user_email=thread.user_email,
            user_name=thread.user_name,
            product_id=thread.product_id,
            product_title=thread.product_title,
            product_price=thread.product_price,
            status=thread.status,
            created_at=thread.created_at,
            last_activity_at=thread.last_activity_at,
            last_message_preview=last_message.text[:50] if last_message and last_message.text else None,
            last_amount=last_amount,
            message_count=len(thread.messages)
        )


# ==============================================================================
# FACTORY
# ==============================================================================

_negotiation_store: Optional[NegotiationStoreInterface] = None


def get_negotiation_store(db=None) -> NegotiationStoreInterface:
    """Get the singleton negotiation store instance based on PERSISTENCE_MODE."""
    global _negotiation_store
    if _negotiation_store is None:
        from config.persistence import PERSISTENCE_MODE
        
        if PERSISTENCE_MODE == "FILE":
            _negotiation_store = FileNegotiationStore()
            logger.info("NegotiationStore: Using FileNegotiationStore (FILE mode)")
        elif PERSISTENCE_MODE == "DB":
            if db is not None:
                _negotiation_store = DbNegotiationStore(db)
                logger.info("NegotiationStore: Using DbNegotiationStore (DB mode)")
            else:
                _negotiation_store = FileNegotiationStore()
                logger.warning("NegotiationStore: DB mode but no db yet, temporary FileNegotiationStore")
        else:
            _negotiation_store = InMemoryNegotiationStore()
            logger.info("NegotiationStore: Using InMemoryNegotiationStore (MEMORY mode)")
    return _negotiation_store


def reset_negotiation_store():
    """Reset store (for testing)."""
    global _negotiation_store
    _negotiation_store = None

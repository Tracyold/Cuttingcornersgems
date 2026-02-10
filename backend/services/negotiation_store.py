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
# DB IMPLEMENTATION (STUB)
# ==============================================================================

class DbNegotiationStore(NegotiationStoreInterface):
    """Database-backed store (STUB for future implementation)."""

    def __init__(self, db):
        self._db = db
        logger.info("DbNegotiationStore initialized (STUB)")

    async def create_thread(self, *args, **kwargs) -> NegotiationThread:
        # TODO: Implement MongoDB storage
        raise NotImplementedError("DbNegotiationStore not implemented yet")

    async def list_threads_for_user(self, user_id: str) -> List[NegotiationThreadSummary]:
        raise NotImplementedError("DbNegotiationStore not implemented yet")

    async def list_threads_for_admin(self, status=None) -> List[NegotiationThreadSummary]:
        raise NotImplementedError("DbNegotiationStore not implemented yet")

    async def get_thread(self, negotiation_id: str) -> Optional[NegotiationThread]:
        raise NotImplementedError("DbNegotiationStore not implemented yet")

    async def add_message(self, *args, **kwargs) -> Optional[NegotiationThread]:
        raise NotImplementedError("DbNegotiationStore not implemented yet")

    async def set_status(self, *args, **kwargs) -> Optional[NegotiationThread]:
        raise NotImplementedError("DbNegotiationStore not implemented yet")

    async def create_agreement_on_accept(self, *args, **kwargs) -> Optional[NegotiationAgreement]:
        raise NotImplementedError("DbNegotiationStore not implemented yet")

    async def get_agreement_for_negotiation(self, negotiation_id: str) -> Optional[NegotiationAgreement]:
        raise NotImplementedError("DbNegotiationStore not implemented yet")

    async def get_agreement_by_id(self, agreement_id: str) -> Optional[NegotiationAgreement]:
        raise NotImplementedError("DbNegotiationStore not implemented yet")


# ==============================================================================
# FACTORY
# ==============================================================================

_negotiation_store: Optional[NegotiationStoreInterface] = None


def get_negotiation_store() -> NegotiationStoreInterface:
    """Get the singleton negotiation store instance."""
    global _negotiation_store
    if _negotiation_store is None:
        use_db = os.environ.get("USE_DB_NEGOTIATION_STORE", "false").lower() == "true"
        if use_db:
            # TODO: Pass actual DB instance
            _negotiation_store = DbNegotiationStore(None)
        else:
            _negotiation_store = InMemoryNegotiationStore()
    return _negotiation_store


def reset_negotiation_store():
    """Reset store (for testing)."""
    global _negotiation_store
    _negotiation_store = None

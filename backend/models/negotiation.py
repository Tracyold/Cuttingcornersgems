"""
Negotiation Data Models
Defines contracts for NYP negotiation threads, messages, and purchase agreements.
"""
from datetime import datetime
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


# ==============================================================================
# NEGOTIATION MESSAGE
# ==============================================================================

class NegotiationMessage(BaseModel):
    """A single message in a negotiation thread."""
    message_id: str
    sender_role: Literal["USER", "ADMIN"]
    kind: Literal["OFFER", "COUNTER", "NOTE", "ACCEPT", "CLOSE"]
    amount: Optional[float] = None  # Required for OFFER/COUNTER/ACCEPT
    text: Optional[str] = None
    created_at: datetime


# ==============================================================================
# NEGOTIATION THREAD
# ==============================================================================

class NegotiationThread(BaseModel):
    """A negotiation thread between a user and admin for a specific product."""
    negotiation_id: str
    user_id: str
    user_email: str
    user_name: str
    product_id: str
    product_title: str
    product_price: float  # Original listed price for reference
    status: Literal["OPEN", "ACCEPTED", "CLOSED"] = "OPEN"
    created_at: datetime
    updated_at: datetime
    last_activity_at: datetime
    messages: List[NegotiationMessage] = Field(default_factory=list)
    accepted_agreement_id: Optional[str] = None


class NegotiationThreadSummary(BaseModel):
    """Summary view for listing negotiations."""
    negotiation_id: str
    user_id: str
    user_email: str
    user_name: str
    product_id: str
    product_title: str
    product_price: float
    status: Literal["OPEN", "ACCEPTED", "CLOSED"]
    created_at: datetime
    last_activity_at: datetime
    last_message_preview: Optional[str] = None
    last_amount: Optional[float] = None
    message_count: int = 0


# ==============================================================================
# NEGOTIATION AGREEMENT (USER-SCOPED PRICING)
# ==============================================================================

class NegotiationAgreement(BaseModel):
    """
    A user-scoped purchase agreement created when admin accepts an offer.
    This NEVER changes the product's public price.
    """
    agreement_id: str
    negotiation_id: str
    user_id: str
    product_id: str
    product_title: str
    accepted_amount: float
    status: Literal["ACTIVE", "USED", "EXPIRED", "CANCELLED"] = "ACTIVE"
    purchase_token: str  # Opaque, single-use token
    purchase_token_expires_at: datetime
    created_at: datetime
    used_at: Optional[datetime] = None


# ==============================================================================
# API REQUEST/RESPONSE MODELS
# ==============================================================================

class CreateNegotiationRequest(BaseModel):
    """Request to create a new negotiation."""
    product_id: str
    offer_amount: float
    text: Optional[str] = None


class AddMessageRequest(BaseModel):
    """Request to add a message to a negotiation (user side)."""
    kind: Literal["OFFER", "NOTE"]
    amount: Optional[float] = None  # Required if kind=OFFER
    text: Optional[str] = None


class AdminCounterRequest(BaseModel):
    """Request for admin to send a counter-offer."""
    amount: float
    text: Optional[str] = None


class AdminAcceptRequest(BaseModel):
    """Request for admin to accept an offer."""
    amount: float
    text: Optional[str] = None
    ttl_minutes: int = 30  # Token validity period


class AdminCloseRequest(BaseModel):
    """Request for admin to close a negotiation."""
    text: Optional[str] = None


class AgreementResponse(BaseModel):
    """Response for agreement availability check."""
    available: bool
    product_id: Optional[str] = None
    accepted_amount: Optional[float] = None
    purchase_token: Optional[str] = None
    expires_at: Optional[datetime] = None
    agreement_id: Optional[str] = None


class PurchaseQuoteResponse(BaseModel):
    """Response for purchase quote."""
    product_id: str
    amount: float
    token_valid_until: datetime
    agreement_id: str


class PurchaseCheckoutResponse(BaseModel):
    """Response for checkout."""
    requires_payment: bool = True
    provider: str = "NOT_CONFIGURED"
    amount: float
    product_id: str
    agreement_id: str
    checkout_url: Optional[str] = None


# ==============================================================================
# USER PREFERENCES (FOR SMS OPT-IN)
# ==============================================================================

class UserPreferencesUpdate(BaseModel):
    """Request to update user negotiation preferences."""
    sms_negotiations_enabled: Optional[bool] = None
    phone_e164: Optional[str] = None


class UserPreferencesResponse(BaseModel):
    """User negotiation preferences."""
    sms_negotiations_enabled: bool = False
    phone_e164: Optional[str] = None

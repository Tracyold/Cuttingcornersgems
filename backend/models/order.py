"""
Order Data Contract
Normalized Order structure used by entitlement logic regardless of storage backend.
"""
from enum import Enum
from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field


class OrderStatus(str, Enum):
    """Order status enumeration."""
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    REFUNDED = "REFUNDED"
    CANCELLED = "CANCELLED"


class Order(BaseModel):
    """
    Normalized Order structure.
    This contract is used by entitlement logic regardless of storage backend.
    """
    order_id: str
    user_id: str
    order_total: float = Field(ge=0, description="Total order amount in USD")
    status: OrderStatus = OrderStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    class Config:
        use_enum_values = True


class OrderCreate(BaseModel):
    """Schema for creating new orders via API."""
    order_id: str
    user_id: str
    order_total: float = Field(ge=0)
    status: OrderStatus = OrderStatus.PENDING
    created_at: Optional[datetime] = None

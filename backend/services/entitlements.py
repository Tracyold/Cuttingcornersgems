"""
Entitlements Service
Calculates user entitlements based on purchase history.

Features:
- Cumulative spend calculation
- Threshold-based unlock checks (e.g., Name-Your-Price eligibility)
- Configurable thresholds
- Admin override for NYP eligibility
"""
import logging
from typing import Optional

from models.order import OrderStatus
from services.order_store import OrderStoreInterface, get_order_store

logger = logging.getLogger(__name__)


# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Name Your Price unlock threshold in USD
NYP_UNLOCK_THRESHOLD: float = 1000.0

# Future thresholds can be added here
# VIP_THRESHOLD: float = 5000.0
# PLATINUM_THRESHOLD: float = 10000.0


# ==============================================================================
# ENTITLEMENT FUNCTIONS
# ==============================================================================

async def get_user_total_spend(user_id: str, store: Optional[OrderStoreInterface] = None) -> float:
    """
    Calculate total spend for a user.
    
    Only includes orders with status == COMPLETED.
    Excludes REFUNDED, CANCELLED, and PENDING orders.
    
    Args:
        user_id: User identifier
        store: Optional OrderStoreInterface (uses default if not provided)
    
    Returns:
        Total spend amount in USD (float)
    """
    if store is None:
        store = get_order_store()
    
    orders = await store.list_orders_for_user(user_id)
    
    total = sum(
        order.order_total 
        for order in orders 
        if order.status == OrderStatus.COMPLETED
    )
    
    logger.debug(f"User {user_id} total spend: ${total:.2f}")
    return total


async def has_unlocked_threshold(
    user_id: str, 
    threshold_amount: float, 
    store: Optional[OrderStoreInterface] = None
) -> bool:
    """
    Check if user has unlocked a specific spending threshold.
    
    Args:
        user_id: User identifier
        threshold_amount: Threshold to check against
        store: Optional OrderStoreInterface
    
    Returns:
        True if user's total spend >= threshold_amount
    """
    total_spend = await get_user_total_spend(user_id, store)
    unlocked = total_spend >= threshold_amount
    
    logger.debug(
        f"User {user_id} threshold check: ${total_spend:.2f} >= ${threshold_amount:.2f} = {unlocked}"
    )
    return unlocked


async def has_unlocked_nyp(user_id: str, store: Optional[OrderStoreInterface] = None) -> bool:
    """
    Check if user has unlocked Name Your Price feature.
    
    Convenience wrapper using NYP_UNLOCK_THRESHOLD.
    
    Args:
        user_id: User identifier
        store: Optional OrderStoreInterface
    
    Returns:
        True if user qualifies for Name Your Price
    """
    return await has_unlocked_threshold(user_id, NYP_UNLOCK_THRESHOLD, store)


async def get_user_entitlements(
    user_id: str, 
    store: Optional[OrderStoreInterface] = None,
    user_record: Optional[dict] = None
) -> dict:
    """
    Get complete entitlements summary for a user.
    
    Supports admin override: if user_record.nyp_override_enabled is True,
    unlocked_nyp will be True regardless of spend.
    
    Args:
        user_id: User identifier
        store: Optional OrderStoreInterface (uses default if not provided)
        user_record: Optional user document with nyp_override_enabled field
    
    Returns:
        {
            "total_spend": float,
            "unlocked_nyp": bool,
            "threshold": float,
            "spend_to_unlock": float,
            "override_enabled": bool
        }
    """
    if store is None:
        store = get_order_store()
    
    total_spend = await get_user_total_spend(user_id, store)
    
    # Check for admin override
    override_enabled = False
    if user_record and user_record.get("nyp_override_enabled", False):
        override_enabled = True
        unlocked_nyp = True
        # Show progress as complete when override is enabled
        spend_to_unlock = 0
        logger.debug(f"User {user_id} has NYP override enabled")
    else:
        unlocked_nyp = total_spend >= NYP_UNLOCK_THRESHOLD
        spend_to_unlock = max(0, NYP_UNLOCK_THRESHOLD - total_spend)
    
    return {
        "total_spend": round(total_spend, 2),
        "unlocked_nyp": unlocked_nyp,
        "threshold": NYP_UNLOCK_THRESHOLD,
        "spend_to_unlock": round(spend_to_unlock, 2),
        "override_enabled": override_enabled
    }


async def check_nyp_eligibility(user_id: str, user_record: Optional[dict] = None) -> bool:
    """
    Check if user is eligible for NYP (either by spend or admin override).
    
    Args:
        user_id: User identifier
        user_record: Optional user document with nyp_override_enabled field
    
    Returns:
        True if user can use NYP features
    """
    if user_record and user_record.get("nyp_override_enabled", False):
        return True
    return await has_unlocked_nyp(user_id)

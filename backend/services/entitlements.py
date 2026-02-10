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


async def get_user_entitlements(user_id: str, store: Optional[OrderStoreInterface] = None) -> dict:
    """
    Get complete entitlements summary for a user.
    
    Returns a dict suitable for API response.
    
    Args:
        user_id: User identifier
        store: Optional OrderStoreInterface
    
    Returns:
        {
            "total_spend": float,
            "unlocked_nyp": bool,
            "threshold": float,
            "spend_to_unlock": float  # Amount needed to reach threshold (0 if unlocked)
        }
    """
    if store is None:
        store = get_order_store()
    
    total_spend = await get_user_total_spend(user_id, store)
    unlocked_nyp = total_spend >= NYP_UNLOCK_THRESHOLD
    spend_to_unlock = max(0, NYP_UNLOCK_THRESHOLD - total_spend)
    
    return {
        "total_spend": round(total_spend, 2),
        "unlocked_nyp": unlocked_nyp,
        "threshold": NYP_UNLOCK_THRESHOLD,
        "spend_to_unlock": round(spend_to_unlock, 2)
    }

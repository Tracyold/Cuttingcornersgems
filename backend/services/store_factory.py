"""
Store Factory
Centralized factory functions for all persistence stores.

Provides single point of access for all stores based on PERSISTENCE_MODE.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def get_content_store(db=None):
    """
    Get content store instance.
    
    Args:
        db: Optional MongoDB database instance
    
    Returns:
        ContentStoreInterface implementation
    """
    from services.content_store import get_content_store as _get_content_store
    return _get_content_store(db)


def get_order_store(db=None):
    """
    Get order store instance.
    
    Args:
        db: Optional MongoDB database instance
    
    Returns:
        OrderStoreInterface implementation
    """
    from services.order_store import get_order_store as _get_order_store
    return _get_order_store(db)


def get_negotiation_store():
    """
    Get negotiation store instance.
    
    Returns:
        NegotiationStoreInterface implementation
    """
    from services.negotiation_store import get_negotiation_store as _get_negotiation_store
    return _get_negotiation_store()


def get_purchase_token_store():
    """
    Get purchase token store instance.
    
    Returns:
        PurchaseTokenStoreInterface implementation
    """
    from services.purchase_token_store import get_purchase_token_store as _get_purchase_token_store
    return _get_purchase_token_store()


def reset_all_stores():
    """Reset all store instances (for testing)."""
    from services.content_store import reset_content_store_instance
    from services.order_store import reset_order_store
    from services.negotiation_store import reset_negotiation_store
    from services.purchase_token_store import reset_purchase_token_store
    
    reset_content_store_instance()
    reset_order_store()
    reset_negotiation_store()
    reset_purchase_token_store()
    logger.info("All stores reset")


def get_persistence_status() -> dict:
    """
    Get status of all persistence stores.
    
    Returns:
        Dict with store types and current implementations
    """
    from config.persistence import PERSISTENCE_MODE, PERSISTENCE_DIR
    
    # Import and check each store type
    content_store = get_content_store()
    order_store = get_order_store()
    negotiation_store = get_negotiation_store()
    token_store = get_purchase_token_store()
    
    return {
        "persistence_mode": PERSISTENCE_MODE,
        "persistence_dir": PERSISTENCE_DIR,
        "stores": {
            "content": type(content_store).__name__,
            "orders": type(order_store).__name__,
            "negotiations": type(negotiation_store).__name__,
            "purchase_tokens": type(token_store).__name__,
        }
    }

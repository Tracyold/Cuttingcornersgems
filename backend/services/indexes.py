"""
MongoDB Index Creation Service
Idempotent index creation for all collections
"""
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


async def ensure_indexes(db: AsyncIOMotorDatabase) -> dict:
    """
    Create all necessary indexes idempotently
    MongoDB will skip if index already exists
    """
    results = {
        "created": [],
        "existing": [],
        "errors": []
    }
    
    try:
        # Users collection indexes
        await db.users.create_index("id", unique=True)
        results["created"].append("users.id")
        
        await db.users.create_index("email", unique=True)
        results["created"].append("users.email")
        
        await db.users.create_index("created_at")
        results["created"].append("users.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("users indexes")
        else:
            results["errors"].append(f"users: {str(e)}")
    
    try:
        # Products collection indexes
        await db.products.create_index("id", unique=True)
        results["created"].append("products.id")
        
        await db.products.create_index("category")
        results["created"].append("products.category")
        
        await db.products.create_index("in_stock")
        results["created"].append("products.in_stock")
        
        await db.products.create_index([("category", 1), ("in_stock", 1)])
        results["created"].append("products.category_in_stock")
        
        await db.products.create_index("created_at")
        results["created"].append("products.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("products indexes")
        else:
            results["errors"].append(f"products: {str(e)}")
    
    try:
        # Gallery collection indexes
        await db.gallery.create_index("id", unique=True)
        results["created"].append("gallery.id")
        
        await db.gallery.create_index("category")
        results["created"].append("gallery.category")
        
        await db.gallery.create_index("featured")
        results["created"].append("gallery.featured")
        
        await db.gallery.create_index("created_at")
        results["created"].append("gallery.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("gallery indexes")
        else:
            results["errors"].append(f"gallery: {str(e)}")
    
    try:
        # Carts collection indexes
        await db.carts.create_index("user_id", unique=True)
        results["created"].append("carts.user_id")
        
        await db.carts.create_index("updated_at")
        results["created"].append("carts.updated_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("carts indexes")
        else:
            results["errors"].append(f"carts: {str(e)}")
    
    try:
        # Orders collection indexes
        await db.orders.create_index("id", unique=True)
        results["created"].append("orders.id")
        
        await db.orders.create_index("user_id")
        results["created"].append("orders.user_id")
        
        await db.orders.create_index("status")
        results["created"].append("orders.status")
        
        await db.orders.create_index([("user_id", 1), ("created_at", -1)])
        results["created"].append("orders.user_created")
        
        await db.orders.create_index("created_at")
        results["created"].append("orders.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("orders indexes")
        else:
            results["errors"].append(f"orders: {str(e)}")
    
    try:
        # Bookings collection indexes
        await db.bookings.create_index("id", unique=True)
        results["created"].append("bookings.id")
        
        await db.bookings.create_index("email")
        results["created"].append("bookings.email")
        
        await db.bookings.create_index("status")
        results["created"].append("bookings.status")
        
        await db.bookings.create_index("created_at")
        results["created"].append("bookings.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("bookings indexes")
        else:
            results["errors"].append(f"bookings: {str(e)}")
    
    try:
        # Product inquiries indexes
        await db.product_inquiries.create_index("id", unique=True)
        results["created"].append("product_inquiries.id")
        
        await db.product_inquiries.create_index("product_id")
        results["created"].append("product_inquiries.product_id")
        
        await db.product_inquiries.create_index("email")
        results["created"].append("product_inquiries.email")
        
        await db.product_inquiries.create_index("created_at")
        results["created"].append("product_inquiries.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("product_inquiries indexes")
        else:
            results["errors"].append(f"product_inquiries: {str(e)}")
    
    try:
        # Sell inquiries indexes
        await db.sell_inquiries.create_index("id", unique=True)
        results["created"].append("sell_inquiries.id")
        
        await db.sell_inquiries.create_index("email")
        results["created"].append("sell_inquiries.email")
        
        await db.sell_inquiries.create_index("created_at")
        results["created"].append("sell_inquiries.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("sell_inquiries indexes")
        else:
            results["errors"].append(f"sell_inquiries: {str(e)}")
    
    try:
        # Name your price inquiries indexes
        await db.name_your_price_inquiries.create_index("id", unique=True)
        results["created"].append("name_your_price_inquiries.id")
        
        await db.name_your_price_inquiries.create_index("user_id")
        results["created"].append("name_your_price_inquiries.user_id")
        
        await db.name_your_price_inquiries.create_index("product_id")
        results["created"].append("name_your_price_inquiries.product_id")
        
        await db.name_your_price_inquiries.create_index("status")
        results["created"].append("name_your_price_inquiries.status")
        
        await db.name_your_price_inquiries.create_index("created_at")
        results["created"].append("name_your_price_inquiries.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("name_your_price_inquiries indexes")
        else:
            results["errors"].append(f"name_your_price_inquiries: {str(e)}")
    
    try:
        # Sold items indexes
        await db.sold_items.create_index("id", unique=True)
        results["created"].append("sold_items.id")
        
        await db.sold_items.create_index("invoice_number", unique=True)
        results["created"].append("sold_items.invoice_number")
        
        await db.sold_items.create_index("sold_at")
        results["created"].append("sold_items.sold_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("sold_items indexes")
        else:
            results["errors"].append(f"sold_items: {str(e)}")
    
    try:
        # User messages indexes
        await db.user_messages.create_index("id", unique=True)
        results["created"].append("user_messages.id")
        
        await db.user_messages.create_index("user_id")
        results["created"].append("user_messages.user_id")
        
        await db.user_messages.create_index("created_at")
        results["created"].append("user_messages.created_at")
        
    except Exception as e:
        if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
            results["existing"].append("user_messages indexes")
        else:
            results["errors"].append(f"user_messages: {str(e)}")
    
    logger.info(f"Index creation complete: {len(results['created'])} created/verified, {len(results['errors'])} errors")
    
    return results

"""
Audit Log & TTL Management Service
Implements TTL policies for audit logs and old data
"""
import logging
import os
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# TTL configuration from environment
AUDIT_TTL_DAYS = os.environ.get('AUDIT_TTL_DAYS')  # None by default = no TTL


async def setup_ttl_indexes(db: AsyncIOMotorDatabase) -> dict:
    """
    Setup TTL indexes for audit/archive collections
    Only creates TTL if AUDIT_TTL_DAYS environment variable is set
    """
    results = {
        "ttl_enabled": AUDIT_TTL_DAYS is not None,
        "ttl_days": AUDIT_TTL_DAYS,
        "indexes_created": [],
        "skipped": [],
        "errors": []
    }
    
    if not AUDIT_TTL_DAYS:
        logger.info("AUDIT_TTL_DAYS not set - TTL indexes will not be created")
        results["skipped"].append("TTL disabled: AUDIT_TTL_DAYS environment variable not set")
        return results
    
    try:
        ttl_seconds = int(AUDIT_TTL_DAYS) * 24 * 60 * 60
    except (ValueError, TypeError):
        results["errors"].append(f"Invalid AUDIT_TTL_DAYS value: {AUDIT_TTL_DAYS}")
        return results
    
    # Collections that should have TTL
    ttl_collections = [
        ("archived_bookings", "archived_at"),
        ("archived_inquiries", "archived_at"),
        ("archived_products", "archived_at"),
        ("archived_gallery", "archived_at"),
        ("user_messages", "created_at"),
        ("bookings", "created_at"),  # Optional: TTL for completed bookings
    ]
    
    for collection_name, date_field in ttl_collections:
        try:
            # Create TTL index
            await db[collection_name].create_index(
                date_field,
                expireAfterSeconds=ttl_seconds,
                name=f"{date_field}_ttl"
            )
            results["indexes_created"].append(f"{collection_name}.{date_field} (TTL: {AUDIT_TTL_DAYS} days)")
            logger.info(f"TTL index created: {collection_name}.{date_field} ({AUDIT_TTL_DAYS} days)")
            
        except Exception as e:
            if "already exists" in str(e) or "IndexOptionsConflict" in str(e):
                results["indexes_created"].append(f"{collection_name}.{date_field} (already exists)")
            else:
                results["errors"].append(f"{collection_name}.{date_field}: {str(e)}")
    
    return results


async def get_ttl_status(db: AsyncIOMotorDatabase) -> dict:
    """
    Check TTL index status across collections
    """
    status = {
        "ttl_configured": AUDIT_TTL_DAYS is not None,
        "ttl_days": AUDIT_TTL_DAYS,
        "collections": []
    }
    
    collections_to_check = [
        "archived_bookings",
        "archived_inquiries",
        "archived_products",
        "archived_gallery",
        "user_messages",
        "bookings"
    ]
    
    for collection_name in collections_to_check:
        indexes = await db[collection_name].list_indexes().to_list(100)
        
        ttl_indexes = []
        for index in indexes:
            if "expireAfterSeconds" in index:
                ttl_indexes.append({
                    "name": index["name"],
                    "field": list(index["key"].keys())[0],
                    "ttl_seconds": index["expireAfterSeconds"],
                    "ttl_days": index["expireAfterSeconds"] / (24 * 60 * 60)
                })
        
        status["collections"].append({
            "name": collection_name,
            "has_ttl": len(ttl_indexes) > 0,
            "ttl_indexes": ttl_indexes
        })
    
    return status

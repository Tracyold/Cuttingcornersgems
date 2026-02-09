"""
Data Integrity & Cleanliness Service
Checks for orphaned references, data consistency, and system health
"""
from typing import Dict, List, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import os

# Feature flags
CLEANLINESS_ENABLE_REPAIR = os.environ.get('CLEANLINESS_ENABLE_REPAIR', 'false').lower() == 'true'


async def generate_integrity_report(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Generate comprehensive data integrity report
    Checks for orphaned references and data inconsistencies
    """
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "overall_status": "healthy",
        "issues": [],
        "warnings": [],
        "statistics": {}
    }
    
    # Check 1: Orphaned cart references (carts pointing to non-existent products)
    orphaned_cart_items = []
    carts = await db.carts.find({}).to_list(1000)
    all_product_ids = set([p["id"] async for p in db.products.find({}, {"id": 1})])
    
    for cart in carts:
        for item in cart.get("items", []):
            if item["product_id"] not in all_product_ids:
                orphaned_cart_items.append({
                    "cart_user_id": cart["user_id"],
                    "product_id": item["product_id"],
                    "issue": "product_not_found"
                })
    
    if orphaned_cart_items:
        report["issues"].append({
            "type": "orphaned_cart_references",
            "severity": "medium",
            "count": len(orphaned_cart_items),
            "details": orphaned_cart_items[:10],  # Limit to first 10
            "repairable": CLEANLINESS_ENABLE_REPAIR
        })
        report["overall_status"] = "degraded"
    
    # Check 2: Orphaned order references
    orphaned_order_items = []
    orders = await db.orders.find({}).to_list(1000)
    
    for order in orders:
        for item in order.get("items", []):
            if item["product_id"] not in all_product_ids:
                orphaned_order_items.append({
                    "order_id": order["id"],
                    "product_id": item["product_id"],
                    "issue": "product_not_found"
                })
    
    if orphaned_order_items:
        report["warnings"].append({
            "type": "orphaned_order_references",
            "severity": "low",
            "count": len(orphaned_order_items),
            "details": orphaned_order_items[:10],
            "note": "Historical data - product may have been deleted"
        })
    
    # Check 3: Users with orders/carts but no user record
    order_user_ids = set([o["user_id"] async for o in db.orders.find({}, {"user_id": 1})])
    cart_user_ids = set([c["user_id"] async for c in db.carts.find({}, {"user_id": 1})])
    all_user_ids = set([u["id"] async for u in db.users.find({}, {"id": 1})])
    
    orphaned_users = (order_user_ids | cart_user_ids) - all_user_ids
    if orphaned_users:
        report["issues"].append({
            "type": "orphaned_user_data",
            "severity": "high",
            "count": len(orphaned_users),
            "user_ids": list(orphaned_users)[:10],
            "repairable": CLEANLINESS_ENABLE_REPAIR
        })
        report["overall_status"] = "critical"
    
    # Check 4: Product inquiries referencing non-existent products
    orphaned_inquiries = []
    inquiries = await db.product_inquiries.find({}).to_list(1000)
    
    for inquiry in inquiries:
        if inquiry.get("product_id") and inquiry["product_id"] not in all_product_ids:
            orphaned_inquiries.append({
                "inquiry_id": inquiry["id"],
                "product_id": inquiry["product_id"],
                "issue": "product_not_found"
            })
    
    if orphaned_inquiries:
        report["warnings"].append({
            "type": "orphaned_inquiry_references",
            "severity": "low",
            "count": len(orphaned_inquiries),
            "details": orphaned_inquiries[:10],
            "note": "Inquiries for deleted products"
        })
    
    # Statistics
    report["statistics"] = {
        "total_users": len(all_user_ids),
        "total_products": len(all_product_ids),
        "total_carts": len(carts),
        "total_orders": len(orders),
        "total_inquiries": len(inquiries),
        "orphaned_cart_items": len(orphaned_cart_items),
        "orphaned_order_items": len(orphaned_order_items),
        "orphaned_users": len(orphaned_users),
        "orphaned_inquiries": len(orphaned_inquiries)
    }
    
    return report


async def generate_cleanliness_report(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Generate system cleanliness report
    Checks for unused data, old records, and maintenance needs
    """
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cleanliness_score": 100,
        "recommendations": [],
        "statistics": {}
    }
    
    # Check 1: Empty carts
    empty_carts = await db.carts.count_documents({"items": []})
    if empty_carts > 0:
        report["recommendations"].append({
            "type": "empty_carts",
            "count": empty_carts,
            "action": "Consider removing empty carts older than 30 days",
            "impact": "low"
        })
        report["cleanliness_score"] -= 5
    
    # Check 2: Old archived data
    old_archived_bookings = await db.archived_bookings.count_documents({})
    old_archived_inquiries = await db.archived_inquiries.count_documents({})
    
    if old_archived_bookings > 100 or old_archived_inquiries > 100:
        report["recommendations"].append({
            "type": "large_archives",
            "archived_bookings": old_archived_bookings,
            "archived_inquiries": old_archived_inquiries,
            "action": "Consider implementing TTL policy for old archives",
            "impact": "low"
        })
        report["cleanliness_score"] -= 5
    
    # Check 3: Duplicate user emails (shouldn't exist)
    pipeline = [
        {"$group": {"_id": "$email", "count": {"$sum": 1}}},
        {"$match": {"count": {"$gt": 1}}}
    ]
    duplicate_emails = await db.users.aggregate(pipeline).to_list(100)
    
    if duplicate_emails:
        report["recommendations"].append({
            "type": "duplicate_emails",
            "count": len(duplicate_emails),
            "action": "Investigate duplicate user emails",
            "impact": "high"
        })
        report["cleanliness_score"] -= 20
    
    # Check 4: Products without images
    products_no_image = await db.products.count_documents({
        "$or": [
            {"image_url": {"$exists": False}},
            {"image_url": None},
            {"image_url": ""}
        ]
    })
    
    if products_no_image > 0:
        report["recommendations"].append({
            "type": "products_without_images",
            "count": products_no_image,
            "action": "Add images to products for better UX",
            "impact": "medium"
        })
        report["cleanliness_score"] -= 10
    
    # Check 5: Gallery items without images
    gallery_no_image = await db.gallery.count_documents({
        "$or": [
            {"image_url": {"$exists": False}},
            {"image_url": None},
            {"image_url": ""}
        ]
    })
    
    if gallery_no_image > 0:
        report["recommendations"].append({
            "type": "gallery_without_images",
            "count": gallery_no_image,
            "action": "Add images to gallery items",
            "impact": "high"
        })
        report["cleanliness_score"] -= 15
    
    # Check 6: Abandoned carts (items but no orders)
    abandoned_count = await db.abandoned_carts.count_documents({})
    active_carts = await db.carts.count_documents({"items": {"$ne": []}})
    
    report["recommendations"].append({
        "type": "cart_tracking",
        "active_carts_with_items": active_carts,
        "tracked_abandoned_carts": abandoned_count,
        "action": "Abandoned cart tracking is configured but may need population",
        "impact": "low"
    })
    
    # Statistics
    report["statistics"] = {
        "total_collections": len(await db.list_collection_names()),
        "empty_carts": empty_carts,
        "archived_bookings": old_archived_bookings,
        "archived_inquiries": old_archived_inquiries,
        "products_without_images": products_no_image,
        "gallery_without_images": gallery_no_image,
        "duplicate_email_groups": len(duplicate_emails),
        "active_carts": active_carts,
        "abandoned_carts": abandoned_count
    }
    
    # Ensure score doesn't go below 0
    report["cleanliness_score"] = max(0, report["cleanliness_score"])
    
    return report


async def repair_orphaned_cart_references(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Repair orphaned cart references (behind CLEANLINESS_ENABLE_REPAIR flag)
    Removes cart items that reference deleted products
    """
    if not CLEANLINESS_ENABLE_REPAIR:
        return {
            "error": "Repair operations disabled",
            "message": "Set CLEANLINESS_ENABLE_REPAIR=true to enable"
        }
    
    all_product_ids = set([p["id"] async for p in db.products.find({}, {"id": 1})])
    
    repaired_carts = 0
    removed_items = 0
    
    carts = await db.carts.find({}).to_list(1000)
    for cart in carts:
        original_items = cart.get("items", [])
        valid_items = [item for item in original_items if item["product_id"] in all_product_ids]
        
        if len(valid_items) != len(original_items):
            await db.carts.update_one(
                {"user_id": cart["user_id"]},
                {"$set": {"items": valid_items, "updated_at": datetime.now(timezone.utc).isoformat()}}
            )
            repaired_carts += 1
            removed_items += len(original_items) - len(valid_items)
    
    return {
        "operation": "repair_orphaned_cart_references",
        "repaired_carts": repaired_carts,
        "removed_items": removed_items,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


async def repair_empty_carts(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Remove empty carts (behind CLEANLINESS_ENABLE_REPAIR flag)
    """
    if not CLEANLINESS_ENABLE_REPAIR:
        return {
            "error": "Repair operations disabled",
            "message": "Set CLEANLINESS_ENABLE_REPAIR=true to enable"
        }
    
    result = await db.carts.delete_many({"items": []})
    
    return {
        "operation": "repair_empty_carts",
        "deleted_carts": result.deleted_count,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

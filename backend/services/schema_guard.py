"""
Schema Version Guard (D4)
Prevents silent schema drift in MongoDB
"""
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import os

logger = logging.getLogger(__name__)

# Feature flag - default OFF per G3
SCHEMA_DRIFT_GUARD_ENABLED = os.environ.get('SCHEMA_DRIFT_GUARD_ENABLED', 'false').lower() == 'true'

# Current schema version
CURRENT_SCHEMA_VERSION = "1.0.0"


async def ensure_schema_version(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Ensure schema_version document exists and is current
    Only runs if SCHEMA_DRIFT_GUARD_ENABLED=true
    """
    if not SCHEMA_DRIFT_GUARD_ENABLED:
        return {
            "status": "disabled",
            "message": "Schema drift guard disabled. Set SCHEMA_DRIFT_GUARD_ENABLED=true to enable"
        }
    
    # Check for schema_version document
    schema_doc = await db.schema_version.find_one({"_id": "main"})
    
    if not schema_doc:
        # Initialize schema version
        schema_doc = {
            "_id": "main",
            "version": CURRENT_SCHEMA_VERSION,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "migrations": []
        }
        await db.schema_version.insert_one(schema_doc)
        logger.info(f"Schema version initialized: {CURRENT_SCHEMA_VERSION}")
        return {"status": "initialized", "version": CURRENT_SCHEMA_VERSION}
    
    # Check if version matches
    if schema_doc["version"] != CURRENT_SCHEMA_VERSION:
        logger.warning(f"Schema version mismatch: DB={schema_doc['version']}, Code={CURRENT_SCHEMA_VERSION}")
        return {
            "status": "version_mismatch",
            "db_version": schema_doc["version"],
            "code_version": CURRENT_SCHEMA_VERSION,
            "message": "Schema migration may be required"
        }
    
    return {"status": "current", "version": CURRENT_SCHEMA_VERSION}


async def backfill_missing_field(
    db: AsyncIOMotorDatabase,
    collection: str,
    field: str,
    default_value: Any,
    condition: Optional[Dict] = None
) -> Dict[str, Any]:
    """
    Backfill missing required field in collection
    Deterministic backfill for clean data post-deploy
    
    Example: backfill_missing_field(db, "users", "token_version", 1, {"token_version": {"$exists": False}})
    """
    if not SCHEMA_DRIFT_GUARD_ENABLED:
        return {
            "status": "disabled",
            "message": "Schema drift guard disabled"
        }
    
    # Build query
    query = condition or {field: {"$exists": False}}
    
    # Count documents needing backfill
    count = await db[collection].count_documents(query)
    
    if count == 0:
        return {
            "status": "no_backfill_needed",
            "collection": collection,
            "field": field
        }
    
    # Perform backfill
    result = await db[collection].update_many(
        query,
        {"$set": {field: default_value}}
    )
    
    logger.info(f"Backfilled {field} in {collection}: {result.modified_count} documents")
    
    return {
        "status": "backfill_complete",
        "collection": collection,
        "field": field,
        "default_value": default_value,
        "documents_updated": result.modified_count
    }


async def validate_required_fields(
    db: AsyncIOMotorDatabase,
    collection: str,
    required_fields: list
) -> Dict[str, Any]:
    """
    Validate that all documents in collection have required fields
    Returns list of documents missing required fields
    """
    if not SCHEMA_DRIFT_GUARD_ENABLED:
        return {
            "status": "disabled",
            "message": "Schema drift guard disabled"
        }
    
    issues = []
    
    for field in required_fields:
        # Find documents missing this field
        missing_count = await db[collection].count_documents({
            field: {"$exists": False}
        })
        
        if missing_count > 0:
            issues.append({
                "collection": collection,
                "field": field,
                "missing_count": missing_count,
                "action": f"Run backfill_missing_field(db, '{collection}', '{field}', <default_value>)"
            })
    
    return {
        "status": "validation_complete",
        "collection": collection,
        "issues": issues,
        "clean": len(issues) == 0
    }


async def register_migration(
    db: AsyncIOMotorDatabase,
    migration_name: str,
    description: str
) -> Dict[str, Any]:
    """
    Register that a schema migration has been applied
    Keeps audit trail of schema changes
    """
    if not SCHEMA_DRIFT_GUARD_ENABLED:
        return {
            "status": "disabled",
            "message": "Schema drift guard disabled"
        }
    
    migration_record = {
        "name": migration_name,
        "description": description,
        "applied_at": datetime.now(timezone.utc).isoformat()
    }
    
    result = await db.schema_version.update_one(
        {"_id": "main"},
        {
            "$push": {"migrations": migration_record},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    logger.info(f"Migration registered: {migration_name}")
    
    return {
        "status": "migration_registered",
        "migration": migration_record
    }


async def get_schema_status(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    """
    Get current schema version and migration history
    """
    if not SCHEMA_DRIFT_GUARD_ENABLED:
        return {
            "enabled": False,
            "message": "Schema drift guard disabled. Set SCHEMA_DRIFT_GUARD_ENABLED=true to enable"
        }
    
    schema_doc = await db.schema_version.find_one({"_id": "main"})
    
    if not schema_doc:
        return {
            "enabled": True,
            "status": "not_initialized",
            "message": "Run ensure_schema_version() to initialize"
        }
    
    return {
        "enabled": True,
        "status": "initialized",
        "current_version": schema_doc["version"],
        "code_version": CURRENT_SCHEMA_VERSION,
        "version_match": schema_doc["version"] == CURRENT_SCHEMA_VERSION,
        "migrations": schema_doc.get("migrations", []),
        "created_at": schema_doc.get("created_at"),
        "updated_at": schema_doc.get("updated_at")
    }


# Example usage (for documentation)
"""
# Enable schema drift guard
export SCHEMA_DRIFT_GUARD_ENABLED=true

# Initialize schema version
await ensure_schema_version(db)

# Backfill missing field
await backfill_missing_field(
    db,
    collection="users",
    field="token_version",
    default_value=1,
    condition={"token_version": {"$exists": False}}
)

# Validate required fields
await validate_required_fields(
    db,
    collection="products",
    required_fields=["id", "title", "price", "in_stock"]
)

# Register migration
await register_migration(
    db,
    migration_name="add_token_version_field",
    description="Added token_version field to all user documents with default value 1"
)

# Check schema status
status = await get_schema_status(db)
"""

"""
Content Storage Adapter Layer
Provides pluggable storage backends for CMS content data.

Adapters:
- InMemoryContentStore: Development/testing (default when no DB)
- DbContentStore: Production MongoDB storage (stub, requires DB)

Factory function selects appropriate adapter based on environment.
"""
import os
import logging
from abc import ABC, abstractmethod
from typing import Optional
from datetime import datetime, timezone

from models.studio_content import StudioContent, get_default_studio_content

logger = logging.getLogger(__name__)


class ContentStoreInterface(ABC):
    """Abstract interface for content storage backends."""
    
    @abstractmethod
    async def get_studio_content(self) -> StudioContent:
        """Retrieve Studio page content."""
        pass
    
    @abstractmethod
    async def save_studio_content(self, content: StudioContent) -> StudioContent:
        """Save/update Studio page content."""
        pass
    
    @abstractmethod
    async def reset_studio_content(self) -> StudioContent:
        """Reset Studio content to defaults."""
        pass


# ==============================================================================
# IN-MEMORY ADAPTER (Development/Testing)
# ==============================================================================

# Module-level storage for in-memory adapter
_studio_content: Optional[StudioContent] = None


class InMemoryContentStore(ContentStoreInterface):
    """
    In-memory content storage for development and testing.
    
    Used automatically when:
    - ENV != "production"
    - Database is not configured
    
    Data persists only for the lifetime of the process.
    """
    
    async def get_studio_content(self) -> StudioContent:
        """Retrieve Studio content from memory, or create defaults."""
        global _studio_content
        if _studio_content is None:
            _studio_content = get_default_studio_content()
            logger.info("InMemory: Initialized Studio content with defaults")
        return _studio_content
    
    async def save_studio_content(self, content: StudioContent) -> StudioContent:
        """Save Studio content to memory."""
        global _studio_content
        
        # Update metadata
        content.updated_at = datetime.now(timezone.utc)
        if _studio_content is not None:
            content.version = _studio_content.version + 1
        else:
            content.version = 1
        
        _studio_content = content
        logger.debug(f"InMemory: Saved Studio content v{content.version}")
        return _studio_content
    
    async def reset_studio_content(self) -> StudioContent:
        """Reset Studio content to defaults."""
        global _studio_content
        _studio_content = get_default_studio_content()
        logger.info("InMemory: Reset Studio content to defaults")
        return _studio_content


# ==============================================================================
# DATABASE ADAPTER (Production - STUB)
# ==============================================================================

class DbContentStore(ContentStoreInterface):
    """
    MongoDB-backed content storage for production.
    
    STUB IMPLEMENTATION - Requires database connection.
    Replace TODO placeholders when wiring to actual database.
    """
    
    def __init__(self, db=None):
        """
        Initialize with database connection.
        
        Args:
            db: Motor async MongoDB database instance
        """
        self.db = db
        self.collection_name = "cms_content"
    
    async def get_studio_content(self) -> StudioContent:
        """Retrieve Studio content from database."""
        # TODO: Implement when wiring to MongoDB
        # doc = await self.db[self.collection_name].find_one(
        #     {"content_type": "studio"},
        #     {"_id": 0}
        # )
        # if doc:
        #     return StudioContent(**doc["content"])
        # return get_default_studio_content()
        raise NotImplementedError("DbContentStore requires database connection")
    
    async def save_studio_content(self, content: StudioContent) -> StudioContent:
        """Save Studio content to database."""
        # TODO: Implement when wiring to MongoDB
        # content.updated_at = datetime.now(timezone.utc)
        # 
        # result = await self.db[self.collection_name].find_one_and_update(
        #     {"content_type": "studio"},
        #     {
        #         "$set": {"content": content.model_dump()},
        #         "$inc": {"version": 1}
        #     },
        #     upsert=True,
        #     return_document=True
        # )
        # return StudioContent(**result["content"])
        raise NotImplementedError("DbContentStore requires database connection")
    
    async def reset_studio_content(self) -> StudioContent:
        """Reset Studio content to defaults in database."""
        # TODO: Implement when wiring to MongoDB
        # default = get_default_studio_content()
        # await self.db[self.collection_name].replace_one(
        #     {"content_type": "studio"},
        #     {"content_type": "studio", "content": default.model_dump()},
        #     upsert=True
        # )
        # return default
        raise NotImplementedError("DbContentStore requires database connection")


# ==============================================================================
# FACTORY / ADAPTER SELECTION
# ==============================================================================

# Singleton instance cache
_content_store_instance: Optional[ContentStoreInterface] = None


def get_content_store(db=None, force_memory: bool = False) -> ContentStoreInterface:
    """
    Factory function to get appropriate content store based on environment.
    
    Selection logic:
    - force_memory=True: Always return InMemoryContentStore
    - ENV != "production" OR db is None: InMemoryContentStore
    - Otherwise: DbContentStore
    
    Args:
        db: Optional MongoDB database instance
        force_memory: Force in-memory store regardless of environment
    
    Returns:
        ContentStoreInterface implementation
    """
    global _content_store_instance
    
    env = os.environ.get("ENV", "development").lower()
    is_production = env == "production"
    
    if force_memory:
        logger.info("ContentStore: Using InMemoryContentStore (forced)")
        return InMemoryContentStore()
    
    if not is_production or db is None:
        if _content_store_instance is None or not isinstance(_content_store_instance, InMemoryContentStore):
            _content_store_instance = InMemoryContentStore()
            logger.info(f"ContentStore: Using InMemoryContentStore (env={env}, db_available={db is not None})")
        return _content_store_instance
    
    # Production with DB available
    if _content_store_instance is None or not isinstance(_content_store_instance, DbContentStore):
        _content_store_instance = DbContentStore(db)
        logger.info("ContentStore: Using DbContentStore (production)")
    return _content_store_instance


def reset_content_store_instance() -> None:
    """Reset the singleton store instance (for testing)."""
    global _content_store_instance, _studio_content
    _content_store_instance = None
    _studio_content = None

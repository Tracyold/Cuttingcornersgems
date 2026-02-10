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
    """
    
    def __init__(self, db):
        self.db = db
        self.collection_name = "cms_content"
    
    async def get_studio_content(self) -> StudioContent:
        """Retrieve Studio content from database."""
        doc = await self.db[self.collection_name].find_one(
            {"content_type": "studio"},
            {"_id": 0}
        )
        if doc and "content" in doc:
            try:
                return StudioContent(**doc["content"])
            except Exception as e:
                logger.warning(f"DbContentStore: Failed to parse, using defaults: {e}")
        return get_default_studio_content()
    
    async def save_studio_content(self, content: StudioContent) -> StudioContent:
        """Save Studio content to database."""
        content.updated_at = datetime.now(timezone.utc)
        
        # Get current version
        existing = await self.db[self.collection_name].find_one(
            {"content_type": "studio"},
            {"_id": 0, "content.version": 1}
        )
        if existing and "content" in existing:
            content.version = existing["content"].get("version", 0) + 1
        else:
            content.version = 1
        
        content_dict = content.model_dump()
        # Convert datetimes to ISO strings for safe storage
        for key, val in content_dict.items():
            if isinstance(val, datetime):
                content_dict[key] = val.isoformat()
        
        await self.db[self.collection_name].update_one(
            {"content_type": "studio"},
            {"$set": {"content": content_dict, "content_type": "studio"}},
            upsert=True
        )
        logger.debug(f"DbContentStore: Saved content v{content.version}")
        return content
    
    async def reset_studio_content(self) -> StudioContent:
        """Reset Studio content to defaults in database."""
        default = get_default_studio_content()
        content_dict = default.model_dump()
        for key, val in content_dict.items():
            if isinstance(val, datetime):
                content_dict[key] = val.isoformat()
        
        await self.db[self.collection_name].update_one(
            {"content_type": "studio"},
            {"$set": {"content": content_dict, "content_type": "studio"}},
            upsert=True
        )
        logger.info("DbContentStore: Reset content to defaults")
        return default


# ==============================================================================
# FILE-BACKED ADAPTER (Design/Dev with Persistence)
# ==============================================================================

class FileContentStore(ContentStoreInterface):
    """
    File-backed content storage for design-stage persistence.
    
    Loads from JSON file at initialization, saves after every mutation.
    Allows content to survive preview refreshes and restarts.
    """
    
    def __init__(self, base_dir: str = None):
        """
        Initialize with file storage.
        
        Args:
            base_dir: Override for persistence directory
        """
        from config.persistence import PERSISTENCE_DIR, CONTENT_STUDIO_FILE
        from services.persistence.json_store import JsonStore
        
        self._base_dir = base_dir or PERSISTENCE_DIR
        self._store = JsonStore(self._base_dir)
        self._filename = CONTENT_STUDIO_FILE
        self._cache: Optional[StudioContent] = None
        self._load_from_file()
        logger.info(f"FileContentStore: Initialized with file {self._filename}")
    
    def _load_from_file(self) -> None:
        """Load content from JSON file into cache."""
        data = self._store.load(self._filename, default=None)
        if data is not None:
            try:
                self._cache = StudioContent(**data)
                logger.debug(f"FileContentStore: Loaded existing content v{self._cache.version}")
            except Exception as e:
                logger.warning(f"FileContentStore: Failed to parse file, using defaults: {e}")
                self._cache = get_default_studio_content()
        else:
            self._cache = get_default_studio_content()
            self._save_to_file()  # Persist defaults
    
    def _save_to_file(self) -> None:
        """Save current cache to JSON file."""
        if self._cache is not None:
            self._store.save(self._filename, self._cache.model_dump())
    
    async def get_studio_content(self) -> StudioContent:
        """Retrieve Studio content from cache."""
        if self._cache is None:
            self._load_from_file()
        return self._cache
    
    async def save_studio_content(self, content: StudioContent) -> StudioContent:
        """Save Studio content to cache and file."""
        content.updated_at = datetime.now(timezone.utc)
        if self._cache is not None:
            content.version = self._cache.version + 1
        else:
            content.version = 1
        
        self._cache = content
        self._save_to_file()
        logger.debug(f"FileContentStore: Saved content v{content.version}")
        return self._cache
    
    async def reset_studio_content(self) -> StudioContent:
        """Reset content to defaults and persist."""
        self._cache = get_default_studio_content()
        self._save_to_file()
        logger.info("FileContentStore: Reset content to defaults")
        return self._cache


# ==============================================================================
# FACTORY / ADAPTER SELECTION
# ==============================================================================

# Singleton instance cache
_content_store_instance: Optional[ContentStoreInterface] = None


def get_content_store(db=None, force_memory: bool = False) -> ContentStoreInterface:
    """
    Factory function to get appropriate content store based on environment.
    
    Selection logic (updated for PERSISTENCE_MODE):
    - force_memory=True: Always return InMemoryContentStore
    - PERSISTENCE_MODE=FILE: FileContentStore (design-stage persistence)
    - PERSISTENCE_MODE=MEMORY: InMemoryContentStore
    - PERSISTENCE_MODE=DB and db available: DbContentStore
    
    Args:
        db: Optional MongoDB database instance
        force_memory: Force in-memory store regardless of environment
    
    Returns:
        ContentStoreInterface implementation
    """
    global _content_store_instance
    
    from config.persistence import PERSISTENCE_MODE
    
    if force_memory:
        logger.info("ContentStore: Using InMemoryContentStore (forced)")
        return InMemoryContentStore()
    
    # Use PERSISTENCE_MODE to select adapter
    if PERSISTENCE_MODE == "FILE":
        if _content_store_instance is None or not isinstance(_content_store_instance, FileContentStore):
            _content_store_instance = FileContentStore()
            logger.info("ContentStore: Using FileContentStore (FILE mode)")
        return _content_store_instance
    
    elif PERSISTENCE_MODE == "MEMORY":
        if _content_store_instance is None or not isinstance(_content_store_instance, InMemoryContentStore):
            _content_store_instance = InMemoryContentStore()
            logger.info("ContentStore: Using InMemoryContentStore (MEMORY mode)")
        return _content_store_instance
    
    else:  # DB mode
        if db is None:
            # Fallback to file if DB not available
            if _content_store_instance is None or not isinstance(_content_store_instance, FileContentStore):
                _content_store_instance = FileContentStore()
                logger.warning("ContentStore: DB mode but no db, falling back to FileContentStore")
            return _content_store_instance
        
        if _content_store_instance is None or not isinstance(_content_store_instance, DbContentStore):
            _content_store_instance = DbContentStore(db)
            logger.info("ContentStore: Using DbContentStore (DB mode)")
        return _content_store_instance


def reset_content_store_instance() -> None:
    """Reset the singleton store instance (for testing)."""
    global _content_store_instance, _studio_content
    _content_store_instance = None
    _studio_content = None

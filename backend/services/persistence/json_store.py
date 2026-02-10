"""
JSON Persistence Utility
Provides atomic, thread-safe JSON file operations for design-stage data persistence.

Features:
- Atomic writes (temp file + os.replace)
- Thread-safe with per-file locks
- Automatic directory creation
- Deterministic JSON output (sorted keys)
- Backup functionality
- stdlib only (no dependencies)
"""
import json
import os
import shutil
import tempfile
import threading
import time
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Thread locks per file path (module-level)
_file_locks: Dict[str, threading.Lock] = {}
_locks_lock = threading.Lock()


def _get_lock(path: str) -> threading.Lock:
    """Get or create a lock for a specific file path."""
    with _locks_lock:
        if path not in _file_locks:
            _file_locks[path] = threading.Lock()
        return _file_locks[path]


def _ensure_dir(path: Path) -> None:
    """Ensure parent directory exists."""
    path.parent.mkdir(parents=True, exist_ok=True)


def _serialize(obj: Any) -> str:
    """Serialize object to deterministic JSON string."""
    return json.dumps(
        obj,
        sort_keys=True,
        indent=2,
        ensure_ascii=False,
        default=_json_default
    )


def _json_default(obj: Any) -> Any:
    """Handle special types during JSON serialization."""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if hasattr(obj, 'model_dump'):
        # Pydantic v2
        return obj.model_dump()
    if hasattr(obj, 'dict'):
        # Pydantic v1
        return obj.dict()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


class JsonStore:
    """
    Thread-safe JSON file storage utility.
    
    Usage:
        store = JsonStore("/app/backend/data")
        data = store.load("content_studio.json", default={})
        store.save("content_studio.json", updated_data)
    """
    
    def __init__(self, base_dir: str = "backend/data"):
        """
        Initialize JsonStore with a base directory.
        
        Args:
            base_dir: Base directory for JSON files (relative or absolute)
        """
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"JsonStore initialized with base_dir: {self.base_dir.absolute()}")
    
    def _resolve_path(self, filename: str) -> Path:
        """Resolve filename to full path."""
        return self.base_dir / filename
    
    def exists(self, filename: str) -> bool:
        """Check if a JSON file exists."""
        return self._resolve_path(filename).exists()
    
    def load(self, filename: str, default: Any = None) -> Any:
        """
        Load data from a JSON file.
        
        Args:
            filename: JSON filename (relative to base_dir)
            default: Default value if file doesn't exist or is invalid
        
        Returns:
            Parsed JSON data or default value
        """
        path = self._resolve_path(filename)
        lock = _get_lock(str(path))
        
        with lock:
            if not path.exists():
                logger.debug(f"JsonStore: File not found, using default: {filename}")
                return default
            
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                logger.debug(f"JsonStore: Loaded {filename}")
                return data
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"JsonStore: Error loading {filename}: {e}")
                return default
    
    def save(self, filename: str, data: Any) -> None:
        """
        Save data to a JSON file atomically.
        
        Uses temp file + os.replace for atomic write.
        
        Args:
            filename: JSON filename (relative to base_dir)
            data: Data to serialize and save
        """
        path = self._resolve_path(filename)
        lock = _get_lock(str(path))
        
        with lock:
            _ensure_dir(path)
            
            # Write to temp file first
            fd, temp_path = tempfile.mkstemp(
                suffix='.json.tmp',
                dir=str(path.parent),
                prefix=f".{path.stem}_"
            )
            try:
                with os.fdopen(fd, 'w', encoding='utf-8') as f:
                    f.write(_serialize(data))
                
                # Atomic replace
                os.replace(temp_path, str(path))
                logger.debug(f"JsonStore: Saved {filename}")
            except Exception as e:
                # Clean up temp file on failure
                try:
                    os.unlink(temp_path)
                except OSError:
                    pass
                logger.error(f"JsonStore: Error saving {filename}: {e}")
                raise
    
    def backup(self, filename: str) -> Optional[str]:
        """
        Create a timestamped backup of a JSON file.
        
        Args:
            filename: JSON filename to backup
        
        Returns:
            Backup filename or None if source doesn't exist
        """
        path = self._resolve_path(filename)
        lock = _get_lock(str(path))
        
        with lock:
            if not path.exists():
                return None
            
            timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
            backup_name = f"{path.stem}_{timestamp}{path.suffix}"
            backup_path = path.parent / backup_name
            
            shutil.copy2(str(path), str(backup_path))
            logger.info(f"JsonStore: Created backup {backup_name}")
            return backup_name
    
    def delete(self, filename: str) -> bool:
        """
        Delete a JSON file.
        
        Args:
            filename: JSON filename to delete
        
        Returns:
            True if deleted, False if didn't exist
        """
        path = self._resolve_path(filename)
        lock = _get_lock(str(path))
        
        with lock:
            if not path.exists():
                return False
            
            os.unlink(str(path))
            logger.debug(f"JsonStore: Deleted {filename}")
            return True
    
    def list_files(self, pattern: str = "*.json") -> list:
        """
        List JSON files in base directory matching pattern.
        
        Args:
            pattern: Glob pattern (default: *.json)
        
        Returns:
            List of filenames
        """
        return [p.name for p in self.base_dir.glob(pattern)]


# Module-level singleton for convenience
_default_store: Optional[JsonStore] = None


def get_json_store(base_dir: str = "backend/data") -> JsonStore:
    """Get or create the default JsonStore instance."""
    global _default_store
    if _default_store is None:
        _default_store = JsonStore(base_dir)
    return _default_store


def reset_json_store() -> None:
    """Reset the default JsonStore (for testing)."""
    global _default_store
    _default_store = None

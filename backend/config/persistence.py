"""
Persistence Configuration
Controls storage backend selection for design-stage vs production.

Environment Variables:
- PERSISTENCE_MODE: FILE | MEMORY | DB (default: FILE for dev convenience)
- PERSISTENCE_DIR: Directory for JSON files (default: /app/backend/data)

Usage:
    from config.persistence import PERSISTENCE_MODE, PERSISTENCE_DIR
    
    if PERSISTENCE_MODE == "FILE":
        store = FileContentStore()
    elif PERSISTENCE_MODE == "MEMORY":
        store = InMemoryContentStore()
    else:
        store = DbContentStore(db)

Deployment Notes:
    For persistent storage in production, mount a volume to PERSISTENCE_DIR:
    
    Example (Render / Docker / Fly):
        PERSISTENCE_DIR=/data/app_storage
    
    Example (Docker Compose):
        volumes:
          - app_data:/data/app_storage
        environment:
          - PERSISTENCE_DIR=/data/app_storage
"""
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ============ PERSISTENCE SETTINGS ============

# Storage mode: FILE (default for dev), MEMORY (testing), DB (production)
PERSISTENCE_MODE = os.environ.get("PERSISTENCE_MODE", "FILE").upper()

# Base directory for JSON file storage
# Priority: Environment variable > Default (/app/backend/data)
_default_dir = Path(__file__).parent.parent / "data"
_env_dir = os.environ.get("PERSISTENCE_DIR")

if _env_dir:
    PERSISTENCE_DIR = Path(_env_dir)
else:
    PERSISTENCE_DIR = _default_dir

# Ensure PERSISTENCE_DIR is absolute
PERSISTENCE_DIR = PERSISTENCE_DIR.resolve()

# Validate mode
VALID_MODES = {"FILE", "MEMORY", "DB"}
if PERSISTENCE_MODE not in VALID_MODES:
    logger.warning(f"Invalid PERSISTENCE_MODE '{PERSISTENCE_MODE}', defaulting to FILE")
    PERSISTENCE_MODE = "FILE"


# ============ DIRECTORY INITIALIZATION ============

def initialize_persistence_dir() -> bool:
    """
    Create persistence directory if it doesn't exist.
    Returns True if directory is ready and writable.
    """
    try:
        PERSISTENCE_DIR.mkdir(parents=True, exist_ok=True)
        
        # Verify writable by creating a test file
        test_file = PERSISTENCE_DIR / ".write_test"
        test_file.write_text("test")
        test_file.unlink()
        
        logger.info(
            f"Persistence Mode: {PERSISTENCE_MODE} | "
            f"Directory: {PERSISTENCE_DIR} | "
            f"Writable: True"
        )
        return True
    except (OSError, PermissionError) as e:
        logger.error(f"Persistence directory not writable: {PERSISTENCE_DIR} - {e}")
        return False


def check_persistence_writable() -> bool:
    """Check if persistence directory is writable."""
    try:
        test_file = PERSISTENCE_DIR / ".write_test"
        test_file.write_text("test")
        test_file.unlink()
        return True
    except (OSError, PermissionError):
        return False


# Initialize directory on module load (for FILE mode)
if PERSISTENCE_MODE == "FILE":
    _init_success = initialize_persistence_dir()
    if not _init_success:
        logger.warning(
            "Persistence directory not writable. "
            "FILE mode may fail. Consider setting PERSISTENCE_DIR to a writable path."
        )
else:
    logger.info(f"Persistence Mode: {PERSISTENCE_MODE} | Directory: {PERSISTENCE_DIR} (not used)")


# ============ FILE NAMES ============

# Content files
CONTENT_STUDIO_FILE = "content_studio.json"

# Order/entitlements files
ORDERS_FILE = "orders.json"

# Negotiation files
NEGOTIATIONS_FILE = "negotiations.json"
NEGOTIATION_AGREEMENTS_FILE = "negotiation_agreements.json"
PURCHASE_TOKENS_FILE = "purchase_tokens.json"


def is_file_mode() -> bool:
    """Check if file persistence mode is active."""
    return PERSISTENCE_MODE == "FILE"


def is_memory_mode() -> bool:
    """Check if memory-only mode is active."""
    return PERSISTENCE_MODE == "MEMORY"


def is_db_mode() -> bool:
    """Check if database mode is active."""
    return PERSISTENCE_MODE == "DB"

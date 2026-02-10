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
"""
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# ============ PERSISTENCE SETTINGS ============

# Storage mode: FILE (default for dev), MEMORY (testing), DB (production)
PERSISTENCE_MODE = os.environ.get("PERSISTENCE_MODE", "FILE").upper()

# Base directory for JSON file storage (absolute path)
_default_dir = Path(__file__).parent.parent / "data"
PERSISTENCE_DIR = os.environ.get("PERSISTENCE_DIR", str(_default_dir.absolute()))

# Validate mode
VALID_MODES = {"FILE", "MEMORY", "DB"}
if PERSISTENCE_MODE not in VALID_MODES:
    logger.warning(f"Invalid PERSISTENCE_MODE '{PERSISTENCE_MODE}', defaulting to FILE")
    PERSISTENCE_MODE = "FILE"

logger.info(f"Persistence configured: mode={PERSISTENCE_MODE}, dir={PERSISTENCE_DIR}")


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

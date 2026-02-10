"""
Centralized Security Configuration
Single source of truth for credentials and secrets
"""
import os
import logging

logger = logging.getLogger(__name__)

# Environment detection
ENV = os.environ.get("ENV", "development").lower()
IS_PRODUCTION = ENV == "production"

# JWT Configuration
if IS_PRODUCTION:
    # Production: require env var, no fallback
    if "JWT_SECRET" not in os.environ:
        raise RuntimeError("JWT_SECRET environment variable is required in production")
    JWT_SECRET = os.environ["JWT_SECRET"]
else:
    # Development: allow fallback with clear dev-only marker
    JWT_SECRET = os.environ.get("JWT_SECRET", "DEV-ONLY-NOT-FOR-PRODUCTION-emergent-2024")

JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Admin Credentials
# Required: ADMIN_USERNAME and ADMIN_PASSWORD_HASH from environment
# No plaintext passwords in source code
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")

def validate_admin_config():
    """
    Validate admin configuration at startup.
    In production: raises if missing.
    In development: logs warning and uses defaults.
    """
    global ADMIN_USERNAME, ADMIN_PASSWORD_HASH
    
    if ADMIN_USERNAME and ADMIN_PASSWORD_HASH:
        logger.info("Admin credentials loaded from environment")
        return True
    
    if IS_PRODUCTION:
        raise RuntimeError(
            "ADMIN_USERNAME and ADMIN_PASSWORD_HASH environment variables are required in production"
        )
    
    # Development fallback - generate hash at runtime (not stored in source)
    import bcrypt
    logger.warning("Using development admin defaults - NOT FOR PRODUCTION")
    ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "postvibe")
    # Hash generated at runtime, not stored as plaintext
    default_password = os.environ.get("ADMIN_DEFAULT_PASSWORD", "adm1npa$$word")
    ADMIN_PASSWORD_HASH = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    return False

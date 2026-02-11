"""
Centralized Security Configuration
Single source of truth for credentials and secrets
"""
import os
import logging
import bcrypt

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

# Admin Credentials - initialized at module load
def _init_admin_credentials():
    """
    Initialize admin credentials from environment or development defaults.
    Called at module load time to ensure credentials are available immediately.
    """
    username = os.environ.get("ADMIN_USERNAME")
    password_hash = os.environ.get("ADMIN_PASSWORD_HASH")
    
    if username and password_hash:
        logger.info("Admin credentials loaded from environment")
        return username, password_hash
    
    # Fallback to defaults if env vars not fully set
    # In production, log a warning but still allow startup with defaults
    if IS_PRODUCTION:
        logger.warning("ADMIN credentials not fully configured in production - using defaults. Please set ADMIN_USERNAME and ADMIN_PASSWORD_HASH environment variables.")
    else:
        logger.warning("Using development admin defaults")
    
    # Use defaults - username and password from env or hardcoded fallback
    username = username or "postvibe"
    default_password = os.environ.get("ADMIN_DEFAULT_PASSWORD", "adm1npa$$word")
    password_hash = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    return username, password_hash

# Initialize credentials at module load
ADMIN_USERNAME, ADMIN_PASSWORD_HASH = _init_admin_credentials()

def validate_admin_config():
    """
    Validate admin configuration (called at startup for logging).
    Credentials are already initialized at module load.
    """
    if ADMIN_USERNAME and ADMIN_PASSWORD_HASH:
        return True
    return False

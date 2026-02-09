"""
Log Stream Management
Structured logging with stream separation
"""
import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any
import sys


class JSONFormatter(logging.Formatter):
    """Format logs as JSON lines for structured logging"""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        if hasattr(record, "event_type"):
            log_data["event_type"] = record.event_type
        if hasattr(record, "user_id"):
            log_data["user_id"] = record.user_id
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        
        return json.dumps(log_data)


class AppLogHandler(logging.StreamHandler):
    """Handler for application logs (stdout)"""
    
    def __init__(self):
        super().__init__(sys.stdout)
        self.setFormatter(JSONFormatter())
        self.setLevel(logging.INFO)


class ErrorEventHandler(logging.StreamHandler):
    """Handler for high-severity errors (stderr)"""
    
    def __init__(self):
        super().__init__(sys.stderr)
        self.setFormatter(JSONFormatter())
        self.setLevel(logging.ERROR)


def setup_logging():
    """
    Configure logging with split streams
    - app_logs: stdout (INFO+)
    - error_events: stderr (ERROR+)
    - audit_logs: DB collection (configured separately)
    """
    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Clear existing handlers
    root_logger.handlers.clear()
    
    # Add app log handler (stdout)
    app_handler = AppLogHandler()
    root_logger.addHandler(app_handler)
    
    # Add error event handler (stderr)
    error_handler = ErrorEventHandler()
    root_logger.addHandler(error_handler)
    
    return root_logger


# Event type enumerations (L4 - signal definitions)
class AuthEvents:
    """Authentication event types"""
    LOGIN_SUCCESS = "auth.login_success"
    LOGIN_FAIL = "auth.login_fail"
    TOKEN_REJECT_EXPIRED = "auth.token_reject_expired"
    TOKEN_REJECT_INVALID = "auth.token_reject_invalid"
    TOKEN_REJECT_ROLE = "auth.token_reject_role"
    SIGNUP_SUCCESS = "auth.signup_success"
    SIGNUP_FAIL = "auth.signup_fail"


class DataEvents:
    """Data operation event types"""
    ARCHIVE_RUN = "data.archive_run"
    ARCHIVE_RESTORE = "data.archive_restore"
    DELETE_ATTEMPT = "data.delete_attempt"
    DELETE_BLOCKED = "data.delete_blocked"
    INTEGRITY_NONZERO = "data.integrity_nonzero"
    CREATE_SUCCESS = "data.create_success"
    UPDATE_SUCCESS = "data.update_success"


class SecurityEvents:
    """Security event types"""
    RATE_LIMIT_HIT = "security.rate_limit_hit"
    ADMIN_REVOKE_CALLED = "security.admin_revoke_called"
    SUSPICIOUS_ACTIVITY = "security.suspicious_activity"


def log_auth_event(logger: logging.Logger, event_type: str, **kwargs):
    """Log authentication event with structured data"""
    extra = {"event_type": event_type}
    extra.update(kwargs)
    logger.info(f"Auth event: {event_type}", extra=extra)


def log_data_event(logger: logging.Logger, event_type: str, **kwargs):
    """Log data operation event with structured data"""
    extra = {"event_type": event_type}
    extra.update(kwargs)
    logger.info(f"Data event: {event_type}", extra=extra)


def log_security_event(logger: logging.Logger, event_type: str, **kwargs):
    """Log security event with structured data"""
    extra = {"event_type": event_type}
    extra.update(kwargs)
    logger.warning(f"Security event: {event_type}", extra=extra)

"""
Log Redaction Utility
Prevents secret, token, and PII leakage in logs
"""
import re
import hashlib
from typing import Any, Dict


# Fields that must be redacted
REDACT_FIELDS = {
    "password",
    "password_hash",
    "JWT_SECRET",
    "authorization",
    "token",
    "access_token",
    "refresh_token",
    "api_key",
    "secret_key",
    "webhook_secret",
    "stripe_secret_key",
    "stripe_publishable_key",
    "email_api_key",
    "sms_api_key",
    "cloud_storage_api_key",
    "captcha_secret_key"
}


def hash_pii(value: str) -> str:
    """Hash PII for logging (one-way)"""
    return hashlib.sha256(value.encode()).hexdigest()[:16]


def mask_email(email: str) -> str:
    """Partially mask email for logging"""
    if "@" not in email:
        return "[invalid_email]"
    
    local, domain = email.split("@", 1)
    if len(local) <= 2:
        masked_local = "*" * len(local)
    else:
        masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
    
    return f"{masked_local}@{domain}"


def mask_phone(phone: str) -> str:
    """Partially mask phone number for logging"""
    # Keep only last 4 digits
    if len(phone) <= 4:
        return "***"
    return "*" * (len(phone) - 4) + phone[-4:]


def redact_value(key: str, value: Any) -> Any:
    """
    Redact sensitive value based on key name
    Returns redacted version safe for logging
    """
    key_lower = key.lower()
    
    # Check if field should be fully redacted
    if any(redact_field in key_lower for redact_field in REDACT_FIELDS):
        if isinstance(value, str):
            return "[REDACTED]"
        return "[REDACTED]"
    
    # Special handling for PII
    if "email" in key_lower and isinstance(value, str):
        return mask_email(value)
    
    if "phone" in key_lower and isinstance(value, str):
        return mask_phone(value)
    
    return value


def redact_dict(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Recursively redact sensitive fields in dictionary
    Returns safe copy for logging
    """
    if not isinstance(data, dict):
        return data
    
    redacted = {}
    for key, value in data.items():
        if isinstance(value, dict):
            redacted[key] = redact_dict(value)
        elif isinstance(value, list):
            redacted[key] = [redact_dict(item) if isinstance(item, dict) else redact_value(key, item) 
                           for item in value]
        else:
            redacted[key] = redact_value(key, value)
    
    return redacted


def redact_authorization_header(header: str) -> str:
    """Redact authorization header value"""
    if not header:
        return "[empty]"
    
    parts = header.split()
    if len(parts) != 2:
        return "[malformed]"
    
    scheme, token = parts
    # Show only first and last 4 characters of token
    if len(token) > 8:
        return f"{scheme} {token[:4]}...{token[-4:]}"
    return f"{scheme} [REDACTED]"


def safe_log_request(method: str, path: str, headers: Dict[str, str], body: Any = None) -> Dict[str, Any]:
    """
    Create safe log representation of HTTP request
    """
    safe_headers = {}
    for key, value in headers.items():
        key_lower = key.lower()
        if key_lower == "authorization":
            safe_headers[key] = redact_authorization_header(value)
        elif any(secret in key_lower for secret in ["token", "key", "secret"]):
            safe_headers[key] = "[REDACTED]"
        else:
            safe_headers[key] = value
    
    safe_body = redact_dict(body) if isinstance(body, dict) else "[non-dict-body]"
    
    return {
        "method": method,
        "path": path,
        "headers": safe_headers,
        "body": safe_body
    }


def safe_log_user(user: Dict[str, Any]) -> Dict[str, Any]:
    """
    Create safe log representation of user object
    """
    return {
        "user_id": user.get("id", "[unknown]"),
        "email": mask_email(user.get("email", "[no-email]")),
        "created_at": user.get("created_at", "[unknown]")
    }


# Volume guard (L3) - prevent logging large payloads
MAX_LOG_ITEMS = 10  # Log counts instead of full arrays

def safe_log_collection(items: list, collection_name: str) -> Dict[str, Any]:
    """
    Log collection metadata instead of full payload
    """
    if len(items) <= MAX_LOG_ITEMS:
        return {
            "collection": collection_name,
            "count": len(items),
            "items": [redact_dict(item) if isinstance(item, dict) else item for item in items]
        }
    else:
        return {
            "collection": collection_name,
            "count": len(items),
            "sample": [redact_dict(items[0])] if items else [],
            "message": f"Logging count only (exceeded {MAX_LOG_ITEMS} items)"
        }

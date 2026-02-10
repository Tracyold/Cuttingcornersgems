"""
Password Reset Service
======================
Manages password reset tokens and email delivery for forgot-password flow.

Token Storage:
- MongoDB collection: password_reset_tokens
- Tokens expire after 1 hour
- One active token per user at a time (old tokens invalidated)

Security:
- Tokens are cryptographically random (32 bytes, hex-encoded)
- Public endpoints return generic responses (no user enumeration)
- Reset links delivered only via email (never returned in API response)
"""
import logging
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

# Token expiration time
TOKEN_EXPIRY_HOURS = 1


@dataclass
class PasswordResetToken:
    """Password reset token data."""
    token: str
    user_id: str
    email: str
    created_at: str
    expires_at: str
    used: bool = False


def generate_reset_token() -> str:
    """Generate a cryptographically secure reset token."""
    return secrets.token_hex(32)  # 64 character hex string


def get_token_expiry() -> datetime:
    """Get the expiry timestamp for a new token."""
    return datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRY_HOURS)


async def create_reset_token(db, user_id: str, email: str) -> PasswordResetToken:
    """
    Create a new password reset token for a user.
    Invalidates any existing tokens for the same user.
    
    Args:
        db: MongoDB database instance
        user_id: User's unique ID
        email: User's email address
    
    Returns:
        PasswordResetToken instance
    """
    # Invalidate any existing tokens for this user
    await db.password_reset_tokens.update_many(
        {"user_id": user_id, "used": False},
        {"$set": {"used": True}}
    )
    
    # Generate new token
    token = generate_reset_token()
    now = datetime.now(timezone.utc)
    expires_at = get_token_expiry()
    
    token_doc = {
        "token": token,
        "user_id": user_id,
        "email": email,
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat(),
        "used": False
    }
    
    await db.password_reset_tokens.insert_one(token_doc)
    logger.info(f"Created password reset token for user {user_id}")
    
    return PasswordResetToken(
        token=token,
        user_id=user_id,
        email=email,
        created_at=now.isoformat(),
        expires_at=expires_at.isoformat(),
        used=False
    )


async def validate_reset_token(db, token: str) -> Optional[Dict[str, Any]]:
    """
    Validate a password reset token.
    
    Args:
        db: MongoDB database instance
        token: The reset token to validate
    
    Returns:
        Token document if valid, None if invalid/expired/used
    """
    token_doc = await db.password_reset_tokens.find_one(
        {"token": token},
        {"_id": 0}
    )
    
    if not token_doc:
        logger.warning("Password reset token not found")
        return None
    
    if token_doc.get("used", False):
        logger.warning("Password reset token already used")
        return None
    
    # Check expiration
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        logger.warning("Password reset token expired")
        return None
    
    return token_doc


async def mark_token_used(db, token: str) -> bool:
    """
    Mark a password reset token as used.
    
    Args:
        db: MongoDB database instance
        token: The reset token to mark as used
    
    Returns:
        True if token was marked, False if not found
    """
    result = await db.password_reset_tokens.update_one(
        {"token": token, "used": False},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    return result.modified_count > 0


async def cleanup_expired_tokens(db) -> int:
    """
    Remove expired tokens from the database.
    Can be called periodically for housekeeping.
    
    Args:
        db: MongoDB database instance
    
    Returns:
        Number of tokens deleted
    """
    now = datetime.now(timezone.utc).isoformat()
    result = await db.password_reset_tokens.delete_many({
        "expires_at": {"$lt": now}
    })
    if result.deleted_count > 0:
        logger.info(f"Cleaned up {result.deleted_count} expired password reset tokens")
    return result.deleted_count


def build_reset_email_html(reset_url: str, from_name: str = "Support") -> str:
    """
    Build HTML email content for password reset.
    
    Args:
        reset_url: The full URL with reset token
        from_name: Name to use in the email
    
    Returns:
        HTML string for email body
    """
    return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%); padding: 30px; border-radius: 8px; margin-bottom: 20px;">
        <h1 style="color: #d4af37; margin: 0; font-size: 24px;">Password Reset Request</h1>
    </div>
    
    <div style="background: #f9f9f9; padding: 25px; border-radius: 8px; border: 1px solid #e0e0e0;">
        <p style="margin-top: 0;">Hello,</p>
        
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="{reset_url}" 
               style="background: #d4af37; color: #000; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: 600; display: inline-block;">
                Reset Password
            </a>
        </div>
        
        <p style="font-size: 14px; color: #666;">
            Or copy and paste this link into your browser:<br>
            <a href="{reset_url}" style="color: #d4af37; word-break: break-all;">{reset_url}</a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;">
        
        <p style="font-size: 13px; color: #888; margin-bottom: 0;">
            <strong>Important:</strong> This link will expire in 1 hour for security reasons.
            If you didn't request a password reset, you can safely ignore this email.
        </p>
    </div>
    
    <p style="font-size: 12px; color: #999; text-align: center; margin-top: 20px;">
        This is an automated message. Please do not reply to this email.
    </p>
</body>
</html>
"""


def build_reset_email_text(reset_url: str) -> str:
    """
    Build plain text email content for password reset.
    
    Args:
        reset_url: The full URL with reset token
    
    Returns:
        Plain text string for email body
    """
    return f"""Password Reset Request

Hello,

We received a request to reset your password. To create a new password, visit the link below:

{reset_url}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email.

---
This is an automated message. Please do not reply to this email.
"""

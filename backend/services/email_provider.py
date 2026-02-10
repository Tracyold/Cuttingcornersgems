"""
Email Provider Service
======================
Provider-agnostic email delivery layer.
Reuses existing email settings from MongoDB site_settings collection.

Supported Providers:
- sendgrid: SendGrid API
- resend: Resend API
- mailgun: Mailgun API
- ses: AWS SES
- postmark: Postmark API

When email_enabled=false or provider not configured/implemented,
NullEmailProvider is used (no-op, logs intent).
"""
import logging
import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)


@dataclass
class EmailMessage:
    """Email message structure."""
    to: str
    subject: str
    html_body: Optional[str] = None
    text_body: Optional[str] = None
    reply_to: Optional[str] = None
    
    def __post_init__(self):
        if not self.html_body and not self.text_body:
            raise ValueError("Email must have html_body or text_body")


@dataclass
class EmailResult:
    """Result of an email send attempt."""
    sent: bool
    message: str
    provider: str
    message_id: Optional[str] = None
    error_code: Optional[str] = None


class EmailProvider(ABC):
    """Abstract base class for email providers."""
    
    provider_name: str = "base"
    
    def __init__(self, settings: Optional[Dict[str, Any]] = None):
        self.settings = settings or {}
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if the provider is properly configured."""
        pass
    
    @abstractmethod
    async def send(self, message: EmailMessage) -> EmailResult:
        """Send an email message."""
        pass
    
    @abstractmethod
    async def test_connection(self) -> EmailResult:
        """Test the provider connection by sending a test email."""
        pass
    
    def get_from_address(self) -> str:
        """Get the configured from address."""
        return self.settings.get("email_from_address", "")
    
    def get_from_name(self) -> str:
        """Get the configured from name."""
        return self.settings.get("email_from_name", "")
    
    def get_formatted_from(self) -> str:
        """Get formatted 'From Name <email>' string."""
        name = self.get_from_name()
        addr = self.get_from_address()
        if name:
            return f"{name} <{addr}>"
        return addr


class NullEmailProvider(EmailProvider):
    """
    Null/No-op email provider.
    Used when email is disabled or provider not configured.
    """
    
    provider_name = "null"
    
    def __init__(self, settings: Optional[Dict[str, Any]] = None, reason: str = "Email service disabled"):
        super().__init__(settings)
        self.reason = reason
    
    def is_configured(self) -> bool:
        return False
    
    async def send(self, message: EmailMessage) -> EmailResult:
        logger.info(f"[NULL EMAIL] Would send to {message.to}: {message.subject} (reason: {self.reason})")
        return EmailResult(
            sent=False,
            message=self.reason,
            provider=self.provider_name
        )
    
    async def test_connection(self) -> EmailResult:
        return EmailResult(
            sent=False,
            message=self.reason,
            provider=self.provider_name
        )


class SendGridProvider(EmailProvider):
    """SendGrid email provider implementation."""
    
    provider_name = "sendgrid"
    
    def is_configured(self) -> bool:
        return bool(
            self.settings.get("email_enabled") and
            self.settings.get("email_provider") == "sendgrid" and
            self.settings.get("email_api_key") and
            self.settings.get("email_from_address")
        )
    
    async def send(self, message: EmailMessage) -> EmailResult:
        if not self.is_configured():
            return EmailResult(
                sent=False,
                message="SendGrid not configured",
                provider=self.provider_name
            )
        
        try:
            import httpx
            
            api_key = self.settings.get("email_api_key")
            from_email = self.get_from_address()
            from_name = self.get_from_name()
            
            # Build SendGrid API payload
            payload = {
                "personalizations": [{"to": [{"email": message.to}]}],
                "from": {"email": from_email},
                "subject": message.subject,
                "content": []
            }
            
            if from_name:
                payload["from"]["name"] = from_name
            
            if message.reply_to:
                payload["reply_to"] = {"email": message.reply_to}
            
            if message.text_body:
                payload["content"].append({"type": "text/plain", "value": message.text_body})
            if message.html_body:
                payload["content"].append({"type": "text/html", "value": message.html_body})
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.sendgrid.com/v3/mail/send",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=30.0
                )
            
            if response.status_code in (200, 201, 202):
                message_id = response.headers.get("X-Message-Id", "")
                logger.info(f"[SENDGRID] Email sent to {message.to}, message_id={message_id}")
                return EmailResult(
                    sent=True,
                    message="Email sent successfully",
                    provider=self.provider_name,
                    message_id=message_id
                )
            else:
                error_text = response.text[:200]
                logger.error(f"[SENDGRID] Failed to send: {response.status_code} - {error_text}")
                return EmailResult(
                    sent=False,
                    message=f"SendGrid API error: {response.status_code}",
                    provider=self.provider_name,
                    error_code=str(response.status_code)
                )
                
        except ImportError:
            return EmailResult(
                sent=False,
                message="httpx library not installed",
                provider=self.provider_name,
                error_code="MISSING_DEPENDENCY"
            )
        except Exception as e:
            logger.exception(f"[SENDGRID] Exception sending email: {e}")
            return EmailResult(
                sent=False,
                message=f"SendGrid error: {str(e)}",
                provider=self.provider_name,
                error_code="EXCEPTION"
            )
    
    async def test_connection(self) -> EmailResult:
        """Test SendGrid connection by sending a test email to the from address."""
        from_addr = self.get_from_address()
        if not from_addr:
            return EmailResult(
                sent=False,
                message="No from_address configured for test",
                provider=self.provider_name
            )
        
        test_message = EmailMessage(
            to=from_addr,
            subject="Email Service Test - SendGrid",
            text_body="This is a test email to verify your SendGrid configuration is working correctly.",
            html_body="<p>This is a test email to verify your <strong>SendGrid</strong> configuration is working correctly.</p>"
        )
        return await self.send(test_message)


class ResendProvider(EmailProvider):
    """Resend email provider implementation."""
    
    provider_name = "resend"
    
    def is_configured(self) -> bool:
        return bool(
            self.settings.get("email_enabled") and
            self.settings.get("email_provider") == "resend" and
            self.settings.get("email_api_key") and
            self.settings.get("email_from_address")
        )
    
    async def send(self, message: EmailMessage) -> EmailResult:
        if not self.is_configured():
            return EmailResult(
                sent=False,
                message="Resend not configured",
                provider=self.provider_name
            )
        
        try:
            import httpx
            
            api_key = self.settings.get("email_api_key")
            from_formatted = self.get_formatted_from()
            
            payload = {
                "from": from_formatted,
                "to": [message.to],
                "subject": message.subject
            }
            
            if message.html_body:
                payload["html"] = message.html_body
            if message.text_body:
                payload["text"] = message.text_body
            if message.reply_to:
                payload["reply_to"] = message.reply_to
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.resend.com/emails",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=30.0
                )
            
            if response.status_code in (200, 201):
                data = response.json()
                message_id = data.get("id", "")
                logger.info(f"[RESEND] Email sent to {message.to}, message_id={message_id}")
                return EmailResult(
                    sent=True,
                    message="Email sent successfully",
                    provider=self.provider_name,
                    message_id=message_id
                )
            else:
                error_text = response.text[:200]
                logger.error(f"[RESEND] Failed to send: {response.status_code} - {error_text}")
                return EmailResult(
                    sent=False,
                    message=f"Resend API error: {response.status_code}",
                    provider=self.provider_name,
                    error_code=str(response.status_code)
                )
                
        except ImportError:
            return EmailResult(
                sent=False,
                message="httpx library not installed",
                provider=self.provider_name,
                error_code="MISSING_DEPENDENCY"
            )
        except Exception as e:
            logger.exception(f"[RESEND] Exception sending email: {e}")
            return EmailResult(
                sent=False,
                message=f"Resend error: {str(e)}",
                provider=self.provider_name,
                error_code="EXCEPTION"
            )
    
    async def test_connection(self) -> EmailResult:
        """Test Resend connection by sending a test email to the from address."""
        from_addr = self.get_from_address()
        if not from_addr:
            return EmailResult(
                sent=False,
                message="No from_address configured for test",
                provider=self.provider_name
            )
        
        test_message = EmailMessage(
            to=from_addr,
            subject="Email Service Test - Resend",
            text_body="This is a test email to verify your Resend configuration is working correctly.",
            html_body="<p>This is a test email to verify your <strong>Resend</strong> configuration is working correctly.</p>"
        )
        return await self.send(test_message)


class MailgunProvider(EmailProvider):
    """Mailgun email provider implementation."""
    
    provider_name = "mailgun"
    
    def is_configured(self) -> bool:
        return bool(
            self.settings.get("email_enabled") and
            self.settings.get("email_provider") == "mailgun" and
            self.settings.get("email_api_key") and
            self.settings.get("email_from_address")
        )
    
    async def send(self, message: EmailMessage) -> EmailResult:
        if not self.is_configured():
            return EmailResult(
                sent=False,
                message="Mailgun not configured",
                provider=self.provider_name
            )
        
        try:
            import httpx
            
            api_key = self.settings.get("email_api_key")
            from_formatted = self.get_formatted_from()
            
            # Extract domain from from_address for Mailgun API URL
            from_addr = self.get_from_address()
            domain = from_addr.split("@")[-1] if "@" in from_addr else ""
            
            if not domain:
                return EmailResult(
                    sent=False,
                    message="Cannot extract domain from from_address",
                    provider=self.provider_name
                )
            
            form_data = {
                "from": from_formatted,
                "to": message.to,
                "subject": message.subject
            }
            
            if message.text_body:
                form_data["text"] = message.text_body
            if message.html_body:
                form_data["html"] = message.html_body
            if message.reply_to:
                form_data["h:Reply-To"] = message.reply_to
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"https://api.mailgun.net/v3/{domain}/messages",
                    auth=("api", api_key),
                    data=form_data,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                message_id = data.get("id", "")
                logger.info(f"[MAILGUN] Email sent to {message.to}, message_id={message_id}")
                return EmailResult(
                    sent=True,
                    message="Email sent successfully",
                    provider=self.provider_name,
                    message_id=message_id
                )
            else:
                error_text = response.text[:200]
                logger.error(f"[MAILGUN] Failed to send: {response.status_code} - {error_text}")
                return EmailResult(
                    sent=False,
                    message=f"Mailgun API error: {response.status_code}",
                    provider=self.provider_name,
                    error_code=str(response.status_code)
                )
                
        except ImportError:
            return EmailResult(
                sent=False,
                message="httpx library not installed",
                provider=self.provider_name,
                error_code="MISSING_DEPENDENCY"
            )
        except Exception as e:
            logger.exception(f"[MAILGUN] Exception sending email: {e}")
            return EmailResult(
                sent=False,
                message=f"Mailgun error: {str(e)}",
                provider=self.provider_name,
                error_code="EXCEPTION"
            )
    
    async def test_connection(self) -> EmailResult:
        from_addr = self.get_from_address()
        if not from_addr:
            return EmailResult(
                sent=False,
                message="No from_address configured for test",
                provider=self.provider_name
            )
        
        test_message = EmailMessage(
            to=from_addr,
            subject="Email Service Test - Mailgun",
            text_body="This is a test email to verify your Mailgun configuration is working correctly.",
            html_body="<p>This is a test email to verify your <strong>Mailgun</strong> configuration is working correctly.</p>"
        )
        return await self.send(test_message)


class PostmarkProvider(EmailProvider):
    """Postmark email provider implementation."""
    
    provider_name = "postmark"
    
    def is_configured(self) -> bool:
        return bool(
            self.settings.get("email_enabled") and
            self.settings.get("email_provider") == "postmark" and
            self.settings.get("email_api_key") and
            self.settings.get("email_from_address")
        )
    
    async def send(self, message: EmailMessage) -> EmailResult:
        if not self.is_configured():
            return EmailResult(
                sent=False,
                message="Postmark not configured",
                provider=self.provider_name
            )
        
        try:
            import httpx
            
            api_key = self.settings.get("email_api_key")
            from_formatted = self.get_formatted_from()
            
            payload = {
                "From": from_formatted,
                "To": message.to,
                "Subject": message.subject
            }
            
            if message.html_body:
                payload["HtmlBody"] = message.html_body
            if message.text_body:
                payload["TextBody"] = message.text_body
            if message.reply_to:
                payload["ReplyTo"] = message.reply_to
            
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://api.postmarkapp.com/email",
                    headers={
                        "X-Postmark-Server-Token": api_key,
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                message_id = data.get("MessageID", "")
                logger.info(f"[POSTMARK] Email sent to {message.to}, message_id={message_id}")
                return EmailResult(
                    sent=True,
                    message="Email sent successfully",
                    provider=self.provider_name,
                    message_id=str(message_id)
                )
            else:
                error_text = response.text[:200]
                logger.error(f"[POSTMARK] Failed to send: {response.status_code} - {error_text}")
                return EmailResult(
                    sent=False,
                    message=f"Postmark API error: {response.status_code}",
                    provider=self.provider_name,
                    error_code=str(response.status_code)
                )
                
        except ImportError:
            return EmailResult(
                sent=False,
                message="httpx library not installed",
                provider=self.provider_name,
                error_code="MISSING_DEPENDENCY"
            )
        except Exception as e:
            logger.exception(f"[POSTMARK] Exception sending email: {e}")
            return EmailResult(
                sent=False,
                message=f"Postmark error: {str(e)}",
                provider=self.provider_name,
                error_code="EXCEPTION"
            )
    
    async def test_connection(self) -> EmailResult:
        from_addr = self.get_from_address()
        if not from_addr:
            return EmailResult(
                sent=False,
                message="No from_address configured for test",
                provider=self.provider_name
            )
        
        test_message = EmailMessage(
            to=from_addr,
            subject="Email Service Test - Postmark",
            text_body="This is a test email to verify your Postmark configuration is working correctly.",
            html_body="<p>This is a test email to verify your <strong>Postmark</strong> configuration is working correctly.</p>"
        )
        return await self.send(test_message)


class SesProvider(EmailProvider):
    """AWS SES email provider implementation (STUB - requires boto3)."""
    
    provider_name = "ses"
    
    def is_configured(self) -> bool:
        return bool(
            self.settings.get("email_enabled") and
            self.settings.get("email_provider") == "ses" and
            self.settings.get("email_api_key") and
            self.settings.get("email_from_address")
        )
    
    async def send(self, message: EmailMessage) -> EmailResult:
        # AWS SES requires boto3 and AWS credentials configuration
        # This is a stub that returns "not implemented" for now
        return EmailResult(
            sent=False,
            message="AWS SES provider not fully implemented (requires boto3 and AWS credentials)",
            provider=self.provider_name,
            error_code="NOT_IMPLEMENTED"
        )
    
    async def test_connection(self) -> EmailResult:
        return EmailResult(
            sent=False,
            message="AWS SES provider not fully implemented (requires boto3 and AWS credentials)",
            provider=self.provider_name,
            error_code="NOT_IMPLEMENTED"
        )


# Provider registry
PROVIDER_MAP = {
    "sendgrid": SendGridProvider,
    "resend": ResendProvider,
    "mailgun": MailgunProvider,
    "postmark": PostmarkProvider,
    "ses": SesProvider,
}


def get_email_provider(settings: Optional[Dict[str, Any]] = None) -> EmailProvider:
    """
    Get the appropriate email provider based on site settings.
    
    Args:
        settings: Site settings dict from MongoDB site_settings collection
    
    Returns:
        Configured EmailProvider instance (NullEmailProvider if not configured)
    """
    if not settings:
        return NullEmailProvider(settings, reason="No settings provided")
    
    if not settings.get("email_enabled", False):
        return NullEmailProvider(settings, reason="Email service disabled")
    
    provider_name = (settings.get("email_provider") or "").lower().strip()
    
    if not provider_name:
        return NullEmailProvider(settings, reason="No email provider selected")
    
    provider_class = PROVIDER_MAP.get(provider_name)
    
    if not provider_class:
        return NullEmailProvider(settings, reason=f"Unknown provider: {provider_name}")
    
    provider = provider_class(settings)
    
    if not provider.is_configured():
        return NullEmailProvider(settings, reason=f"Provider '{provider_name}' not fully configured")
    
    return provider


async def send_email(
    settings: Dict[str, Any],
    to: str,
    subject: str,
    html_body: Optional[str] = None,
    text_body: Optional[str] = None,
    reply_to: Optional[str] = None
) -> EmailResult:
    """
    Convenience function to send an email using the configured provider.
    
    Args:
        settings: Site settings dict
        to: Recipient email address
        subject: Email subject
        html_body: HTML content (optional)
        text_body: Plain text content (optional)
        reply_to: Reply-to address (optional)
    
    Returns:
        EmailResult with send status
    """
    provider = get_email_provider(settings)
    message = EmailMessage(
        to=to,
        subject=subject,
        html_body=html_body,
        text_body=text_body,
        reply_to=reply_to
    )
    return await provider.send(message)

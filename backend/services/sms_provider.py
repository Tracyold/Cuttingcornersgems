"""
SMS Provider Service
Handles SMS sending for negotiation notifications.
Uses existing admin settings for provider configuration.
"""
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class SmsProvider:
    """Base SMS provider interface."""

    def __init__(self, settings: Optional[dict] = None):
        self.settings = settings or {}

    def is_configured(self) -> bool:
        """Check if SMS is configured and ready to send."""
        return False

    async def send(self, to: str, message: str) -> dict:
        """Send an SMS message."""
        return {"sent": False, "reason": "Not configured"}


class NoopSmsProvider(SmsProvider):
    """No-op SMS provider (default when not configured)."""

    def is_configured(self) -> bool:
        return False

    async def send(self, to: str, message: str) -> dict:
        logger.info(f"[NOOP SMS] Would send to {to}: {message}")
        return {"sent": False, "reason": "SMS provider not configured"}


class TwilioSmsProvider(SmsProvider):
    """Twilio SMS provider (STUB for future implementation)."""

    def is_configured(self) -> bool:
        return (
            self.settings.get("sms_enabled", False) and
            self.settings.get("sms_provider") == "twilio" and
            self.settings.get("sms_api_key") and
            self.settings.get("sms_api_secret") and
            self.settings.get("sms_phone_number")
        )

    async def send(self, to: str, message: str) -> dict:
        if not self.is_configured():
            return {"sent": False, "reason": "Twilio not configured"}

        # TODO: Implement actual Twilio sending
        # from twilio.rest import Client
        # client = Client(self.settings["sms_api_key"], self.settings["sms_api_secret"])
        # message = client.messages.create(
        #     body=message,
        #     from_=self.settings["sms_phone_number"],
        #     to=to
        # )
        logger.info(f"[TWILIO STUB] Would send to {to}: {message}")
        return {"sent": False, "reason": "Twilio sending not implemented yet"}


def get_sms_provider(settings: Optional[dict] = None) -> SmsProvider:
    """
    Get the appropriate SMS provider based on admin settings.
    
    Args:
        settings: Site settings dict from admin configuration
    
    Returns:
        Configured SMS provider instance
    """
    if not settings or not settings.get("sms_enabled", False):
        return NoopSmsProvider(settings)

    provider_name = settings.get("sms_provider", "").lower()

    if provider_name == "twilio":
        return TwilioSmsProvider(settings)
    # Add more providers here as needed
    # elif provider_name == "vonage":
    #     return VonageSmsProvider(settings)

    return NoopSmsProvider(settings)

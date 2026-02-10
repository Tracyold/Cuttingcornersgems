"""
Negotiation Notifications Service
Handles SMS notifications for negotiation events.
Non-blocking - negotiation endpoints succeed even if notification fails.
"""
import logging
from typing import Optional

from models.negotiation import NegotiationThread
from services.sms_provider import SmsProvider, get_sms_provider

logger = logging.getLogger(__name__)


# ==============================================================================
# MESSAGE TEMPLATES
# ==============================================================================

TEMPLATES = {
    "NYP_OFFER_SENT": "Offer sent for {product_title}.",
    "NYP_COUNTER_SENT": "Counter-offer received for {product_title}.",
    "NYP_ACCEPTED": "Offer accepted for {product_title}. Open your account to purchase.",
    "NYP_CLOSED": "Negotiation closed for {product_title}.",
}


# ==============================================================================
# NOTIFICATION FUNCTIONS
# ==============================================================================

async def maybe_notify(
    event_type: str,
    thread: NegotiationThread,
    user: dict,
    site_settings: Optional[dict] = None,
    sms_provider: Optional[SmsProvider] = None
) -> dict:
    """
    Attempt to send notification for a negotiation event.
    
    Only sends if:
    - user.sms_negotiations_enabled == True
    - user.phone_e164 is present
    - SMS provider is configured
    
    Args:
        event_type: One of NYP_OFFER_SENT, NYP_COUNTER_SENT, NYP_ACCEPTED, NYP_CLOSED
        thread: The negotiation thread
        user: User record dict
        site_settings: Site settings for SMS provider configuration
        sms_provider: Optional pre-configured provider (for testing)
    
    Returns:
        {"notified": bool, "reason": str}
    """
    # Check user opt-in
    if not user.get("sms_negotiations_enabled", False):
        logger.debug(f"User {user.get('id')} has not opted in to negotiation SMS")
        return {"notified": False, "reason": "User not opted in"}

    # Check phone number
    phone = user.get("phone_e164")
    if not phone:
        logger.debug(f"User {user.get('id')} has no phone number")
        return {"notified": False, "reason": "No phone number"}

    # Get provider
    if sms_provider is None:
        sms_provider = get_sms_provider(site_settings)

    # Check provider configured
    if not sms_provider.is_configured():
        logger.debug("SMS provider not configured")
        return {"notified": False, "reason": "SMS not configured"}

    # Build message
    template = TEMPLATES.get(event_type)
    if not template:
        logger.warning(f"Unknown notification event type: {event_type}")
        return {"notified": False, "reason": f"Unknown event: {event_type}"}

    message = template.format(product_title=thread.product_title)

    # Send (non-blocking - we don't want to fail the negotiation endpoint)
    try:
        result = await sms_provider.send(phone, message)
        if result.get("sent"):
            logger.info(f"Sent {event_type} SMS to user {user.get('id')}")
            return {"notified": True, "reason": "Sent"}
        else:
            logger.info(f"SMS not sent: {result.get('reason')}")
            return {"notified": False, "reason": result.get("reason", "Unknown")}
    except Exception as e:
        logger.error(f"SMS send error: {e}")
        return {"notified": False, "reason": str(e)}


async def notify_user_offer_sent(thread: NegotiationThread, user: dict, site_settings: Optional[dict] = None):
    """Notify user that their offer was sent."""
    return await maybe_notify("NYP_OFFER_SENT", thread, user, site_settings)


async def notify_user_counter_received(thread: NegotiationThread, user: dict, site_settings: Optional[dict] = None):
    """Notify user that admin sent a counter-offer."""
    return await maybe_notify("NYP_COUNTER_SENT", thread, user, site_settings)


async def notify_user_accepted(thread: NegotiationThread, user: dict, site_settings: Optional[dict] = None):
    """Notify user that their offer was accepted."""
    return await maybe_notify("NYP_ACCEPTED", thread, user, site_settings)


async def notify_user_closed(thread: NegotiationThread, user: dict, site_settings: Optional[dict] = None):
    """Notify user that negotiation was closed."""
    return await maybe_notify("NYP_CLOSED", thread, user, site_settings)

"""
Payment Provider Adapter
Follows the same pattern as sms_provider / email_provider.
NullPaymentProvider when disabled; StripePaymentProvider when enabled + keys.
"""
import logging
from abc import ABC, abstractmethod
from typing import Optional

logger = logging.getLogger(__name__)


class PaymentResult:
    def __init__(self, provider: str, checkout_url: Optional[str] = None,
                 error_code: Optional[str] = None, session_id: Optional[str] = None):
        self.provider = provider
        self.checkout_url = checkout_url
        self.error_code = error_code
        self.session_id = session_id

    def to_dict(self):
        d = {"provider": self.provider}
        if self.checkout_url:
            d["checkout_url"] = self.checkout_url
        if self.error_code:
            d["error_code"] = self.error_code
        if self.session_id:
            d["session_id"] = self.session_id
        return d


class PaymentProviderInterface(ABC):
    @abstractmethod
    async def create_checkout_session(self, order_id: str, amount: float,
                                       currency: str, line_items: list,
                                       success_url: str, cancel_url: str) -> PaymentResult:
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        pass


class NullPaymentProvider(PaymentProviderInterface):
    async def create_checkout_session(self, **kwargs) -> PaymentResult:
        return PaymentResult(
            provider="none",
            error_code="PAYMENT_PROVIDER_NOT_CONFIGURED"
        )

    def is_configured(self) -> bool:
        return False


class StripePaymentProvider(PaymentProviderInterface):
    def __init__(self, secret_key: str, test_mode: bool = True):
        import stripe
        self._stripe = stripe
        self._stripe.api_key = secret_key
        self._test_mode = test_mode
        logger.info(f"StripePaymentProvider initialized (test_mode={{test_mode}})")

    def is_configured(self) -> bool:
        return True

    async def create_checkout_session(self, order_id: str, amount: float,
                                       currency: str = "usd", line_items: list = None,
                                       success_url: str = "", cancel_url: str = "") -> PaymentResult:
        try:
            stripe_line_items = []
            if line_items:
                for item in line_items:
                    stripe_line_items.append({
                        "price_data": {
                            "currency": currency,
                            "product_data": {"name": item.get("title", "Gemstone")},
                            "unit_amount": int(item.get("price", 0) * 100),
                        },
                        "quantity": item.get("quantity", 1),
                    })
            else:
                stripe_line_items.append({
                    "price_data": {
                        "currency": currency,
                        "product_data": {"name": f"Order {{order_id[:8]}}"},
                        "unit_amount": int(amount * 100),
                    },
                    "quantity": 1,
                })

            session = self._stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=stripe_line_items,
                mode="payment",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={"order_id": order_id},
            )
            return PaymentResult(
                provider="stripe",
                checkout_url=session.url,
                session_id=session.id,
            )
        except Exception as e:
            logger.error(f"Stripe checkout session error: {{e}}")
            return PaymentResult(
                provider="stripe",
                error_code=f"STRIPE_ERROR: {{str(e)}}"
            )


async def get_payment_provider(db) -> PaymentProviderInterface:
    """Factory: read admin settings and return the appropriate provider."""
    settings = await db.settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        return NullPaymentProvider()

    if settings.get("stripe_enabled") and settings.get("stripe_secret_key"):
        return StripePaymentProvider(
            secret_key=settings["stripe_secret_key"],
            test_mode=settings.get("stripe_test_mode", True),
        )

    return NullPaymentProvider()
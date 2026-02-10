"""
Test Sold Lifecycle Fix - Order Payment Flow
Tests:
1. POST /api/orders creates order with status=pending, commit_expires_at, paid_at=null - products NOT marked sold
2. POST /api/admin/orders/{order_id}/mark-paid sets paid_at, payment_provider=manual, status=paid AND marks products sold
3. POST /api/payments/checkout-session returns PAYMENT_PROVIDER_NOT_CONFIGURED when Stripe disabled
4. POST /api/payments/checkout-session rejects already-paid orders (400)
5. GET /api/orders/{order_id}/invoice.pdf returns 200 with content-type application/pdf
6. POST /api/admin/orders/{order_id}/mark-paid rejects already-paid orders
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timezone, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    resp = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": "postvibe",
        "password": "adm1npa$$word"
    })
    assert resp.status_code == 200, f"Admin login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def user_token():
    """Get user auth token by registering or logging in"""
    test_email = f"test_lifecycle_{uuid.uuid4().hex[:8]}@example.com"
    # Try to register
    resp = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": "Test1234",
        "name": "Lifecycle Tester"
    })
    if resp.status_code == 200:
        return resp.json()["access_token"]
    # If registration fails (email exists), try login
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_email,
        "password": "Test1234"
    })
    if resp.status_code == 200:
        return resp.json()["access_token"]
    # Fallback to test user
    resp = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "override_test@example.com",
        "password": "Test1234"
    })
    assert resp.status_code == 200, f"User login failed: {resp.text}"
    return resp.json()["access_token"]

@pytest.fixture(scope="module")
def test_product(admin_token):
    """Create a test product for order testing"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    product_data = {
        "title": f"TEST_Lifecycle_Product_{uuid.uuid4().hex[:6]}",
        "category": "Sapphire",
        "price": 500.00,
        "image_url": "https://example.com/test.jpg",
        "in_stock": True,
        "is_sold": False
    }
    resp = requests.post(f"{BASE_URL}/api/admin/products", json=product_data, headers=headers)
    assert resp.status_code == 200, f"Failed to create test product: {resp.text}"
    product = resp.json()
    yield product
    # Cleanup - mark product as unsold if needed
    requests.patch(
        f"{BASE_URL}/api/admin/products/{product['id']}",
        json={"is_sold": False, "in_stock": True},
        headers=headers
    )

@pytest.fixture(scope="module")
def order_with_product(user_token, test_product):
    """Add product to cart and create an order"""
    headers = {"Authorization": f"Bearer {user_token}"}
    
    # Add product to cart
    resp = requests.post(
        f"{BASE_URL}/api/cart/add",
        json={"product_id": test_product["id"]},
        headers=headers
    )
    assert resp.status_code == 200, f"Failed to add to cart: {resp.text}"
    
    # Create order
    resp = requests.post(
        f"{BASE_URL}/api/orders",
        json={
            "items": [{"product_id": test_product["id"], "quantity": 1}],
            "shipping_address": "123 Test Street, Test City, TS 12345",
            "payment_method": "stripe"
        },
        headers=headers
    )
    assert resp.status_code == 200, f"Failed to create order: {resp.text}"
    return resp.json()


class TestOrderCreation:
    """Tests for POST /api/orders"""
    
    def test_order_has_pending_status(self, order_with_product):
        """Test 1: Order created with status=pending"""
        assert order_with_product["status"] == "pending"
        print(f"✓ Order status is 'pending': {order_with_product['status']}")
    
    def test_order_has_commit_expires_at(self, order_with_product):
        """Test 1: Order has commit_expires_at set approximately 24h ahead"""
        assert order_with_product.get("commit_expires_at") is not None
        expires = datetime.fromisoformat(order_with_product["commit_expires_at"].replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        time_diff = (expires - now).total_seconds()
        # Should be approximately 24 hours (within 1 hour tolerance)
        assert 23 * 3600 < time_diff < 25 * 3600, f"commit_expires_at should be ~24h ahead, got {time_diff/3600:.1f}h"
        print(f"✓ commit_expires_at set correctly: {order_with_product['commit_expires_at']}")
    
    def test_order_paid_at_is_null(self, order_with_product):
        """Test 1: Order has paid_at=null"""
        assert order_with_product.get("paid_at") is None
        print("✓ paid_at is null for new order")
    
    def test_product_not_marked_sold_after_order(self, order_with_product, test_product, admin_token):
        """Test 1: Product is NOT marked sold after order creation"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        resp = requests.get(f"{BASE_URL}/api/admin/products", headers=headers)
        assert resp.status_code == 200
        products = resp.json()
        product = next((p for p in products if p["id"] == test_product["id"]), None)
        assert product is not None, "Test product not found"
        assert product.get("is_sold") is False, "Product should NOT be marked sold after order creation"
        print(f"✓ Product is_sold=False after order creation")


class TestMarkPaid:
    """Tests for POST /api/admin/orders/{order_id}/mark-paid"""
    
    def test_mark_paid_success(self, admin_token, user_token, test_product):
        """Test 2: Admin can mark order as paid, which marks products as sold"""
        # Create a fresh order for this test
        user_headers = {"Authorization": f"Bearer {user_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create another test product
        product_data = {
            "title": f"TEST_MarkPaid_Product_{uuid.uuid4().hex[:6]}",
            "category": "Sapphire",
            "price": 750.00,
            "image_url": "https://example.com/markpaid.jpg",
            "in_stock": True,
            "is_sold": False
        }
        resp = requests.post(f"{BASE_URL}/api/admin/products", json=product_data, headers=admin_headers)
        assert resp.status_code == 200
        mark_paid_product = resp.json()
        
        # Add to cart
        resp = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": mark_paid_product["id"]},
            headers=user_headers
        )
        assert resp.status_code == 200
        
        # Create order
        resp = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{"product_id": mark_paid_product["id"], "quantity": 1}],
                "shipping_address": "456 Mark Paid St, Test City, TS 67890",
                "payment_method": "stripe"
            },
            headers=user_headers
        )
        assert resp.status_code == 200
        order = resp.json()
        
        # Mark as paid
        resp = requests.post(
            f"{BASE_URL}/api/admin/orders/{order['id']}/mark-paid",
            headers=admin_headers
        )
        assert resp.status_code == 200
        mark_paid_result = resp.json()
        
        # Verify mark-paid response
        assert mark_paid_result.get("paid_at") is not None
        assert mark_paid_result.get("payment_provider") == "manual"
        assert mark_paid_result.get("status") == "paid"
        print(f"✓ mark-paid returned: paid_at={mark_paid_result['paid_at']}, payment_provider={mark_paid_result['payment_provider']}, status={mark_paid_result['status']}")
        
        # Verify product is now sold
        resp = requests.get(f"{BASE_URL}/api/admin/products", headers=admin_headers)
        products = resp.json()
        product = next((p for p in products if p["id"] == mark_paid_product["id"]), None)
        assert product is not None
        assert product.get("is_sold") is True, "Product should be marked sold after mark-paid"
        print(f"✓ Product is_sold=True after admin mark-paid")
        
        # Cleanup
        requests.patch(
            f"{BASE_URL}/api/admin/products/{mark_paid_product['id']}",
            json={"is_sold": False, "in_stock": True},
            headers=admin_headers
        )
    
    def test_mark_paid_rejects_already_paid(self, admin_token, user_token):
        """Test 6: mark-paid rejects already-paid orders"""
        user_headers = {"Authorization": f"Bearer {user_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a product
        product_data = {
            "title": f"TEST_AlreadyPaid_Product_{uuid.uuid4().hex[:6]}",
            "category": "Ruby",
            "price": 300.00,
            "image_url": "https://example.com/alreadypaid.jpg",
            "in_stock": True,
            "is_sold": False
        }
        resp = requests.post(f"{BASE_URL}/api/admin/products", json=product_data, headers=admin_headers)
        assert resp.status_code == 200
        product = resp.json()
        
        # Add to cart and create order
        requests.post(f"{BASE_URL}/api/cart/add", json={"product_id": product["id"]}, headers=user_headers)
        resp = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{"product_id": product["id"], "quantity": 1}],
                "shipping_address": "789 Already Paid Blvd",
                "payment_method": "stripe"
            },
            headers=user_headers
        )
        assert resp.status_code == 200
        order = resp.json()
        
        # First mark-paid should succeed
        resp = requests.post(f"{BASE_URL}/api/admin/orders/{order['id']}/mark-paid", headers=admin_headers)
        assert resp.status_code == 200
        print("✓ First mark-paid succeeded")
        
        # Second mark-paid should fail with 400
        resp = requests.post(f"{BASE_URL}/api/admin/orders/{order['id']}/mark-paid", headers=admin_headers)
        assert resp.status_code == 400, f"Expected 400 for already-paid order, got {resp.status_code}"
        assert "already paid" in resp.json().get("detail", "").lower()
        print("✓ Second mark-paid rejected with 400: 'Order already paid'")
        
        # Cleanup
        requests.patch(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            json={"is_sold": False, "in_stock": True},
            headers=admin_headers
        )


class TestCheckoutSession:
    """Tests for POST /api/payments/checkout-session"""
    
    def test_checkout_session_returns_not_configured(self, order_with_product, user_token):
        """Test 3: checkout-session returns PAYMENT_PROVIDER_NOT_CONFIGURED when Stripe disabled"""
        headers = {"Authorization": f"Bearer {user_token}"}
        resp = requests.post(
            f"{BASE_URL}/api/payments/checkout-session",
            json={"order_id": order_with_product["id"]},
            headers=headers
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("provider") == "none"
        assert data.get("error_code") == "PAYMENT_PROVIDER_NOT_CONFIGURED"
        print(f"✓ checkout-session returns: provider={data['provider']}, error_code={data['error_code']}")
    
    def test_checkout_session_rejects_paid_order(self, admin_token, user_token):
        """Test 4: checkout-session rejects already-paid orders with 400"""
        user_headers = {"Authorization": f"Bearer {user_token}"}
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create product and order
        product_data = {
            "title": f"TEST_PaidCheckout_{uuid.uuid4().hex[:6]}",
            "category": "Emerald",
            "price": 400.00,
            "image_url": "https://example.com/paidcheckout.jpg",
            "in_stock": True,
            "is_sold": False
        }
        resp = requests.post(f"{BASE_URL}/api/admin/products", json=product_data, headers=admin_headers)
        product = resp.json()
        
        requests.post(f"{BASE_URL}/api/cart/add", json={"product_id": product["id"]}, headers=user_headers)
        resp = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{"product_id": product["id"], "quantity": 1}],
                "shipping_address": "Paid Checkout Lane",
                "payment_method": "stripe"
            },
            headers=user_headers
        )
        order = resp.json()
        
        # Mark as paid first
        requests.post(f"{BASE_URL}/api/admin/orders/{order['id']}/mark-paid", headers=admin_headers)
        
        # Now try checkout-session on paid order
        resp = requests.post(
            f"{BASE_URL}/api/payments/checkout-session",
            json={"order_id": order["id"]},
            headers=user_headers
        )
        assert resp.status_code == 400, f"Expected 400 for already-paid order, got {resp.status_code}"
        assert "already paid" in resp.json().get("detail", "").lower()
        print("✓ checkout-session rejects paid order with 400: 'Order already paid'")
        
        # Cleanup
        requests.patch(
            f"{BASE_URL}/api/admin/products/{product['id']}",
            json={"is_sold": False, "in_stock": True},
            headers=admin_headers
        )


class TestInvoicePDF:
    """Tests for GET /api/orders/{order_id}/invoice.pdf"""
    
    def test_invoice_returns_pdf(self, order_with_product, user_token):
        """Test 5: invoice.pdf returns HTTP 200 with content-type application/pdf"""
        headers = {"Authorization": f"Bearer {user_token}"}
        resp = requests.get(
            f"{BASE_URL}/api/orders/{order_with_product['id']}/invoice.pdf",
            headers=headers
        )
        assert resp.status_code == 200, f"Invoice endpoint returned {resp.status_code}: {resp.text}"
        content_type = resp.headers.get("Content-Type", "")
        assert "application/pdf" in content_type, f"Expected application/pdf, got {content_type}"
        # Verify PDF content starts with %PDF
        assert resp.content.startswith(b"%PDF"), "Response does not appear to be a valid PDF"
        print(f"✓ invoice.pdf returns 200 with content-type: {content_type}")
        print(f"✓ PDF size: {len(resp.content)} bytes")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

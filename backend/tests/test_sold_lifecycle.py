"""
Test suite for 'sold' lifecycle feature.
Tests: admin SOLD toggle, public products filtering, direct URL access, 
cart add blocking, name-your-price blocking, and auto-sold on order creation.
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_USERNAME = "postvibe"
ADMIN_PASSWORD = "adm1npa$$word"
TEST_USER_EMAIL = "sold_lifecycle_test@example.com"
TEST_USER_PASSWORD = "Test1234"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/admin/login",
        json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
    )
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def test_user_token():
    """Get or create test user and return token"""
    # Try to login first
    login_response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_USER_EMAIL, "password": TEST_USER_PASSWORD}
    )
    if login_response.status_code == 200:
        return login_response.json()["access_token"]
    
    # If user doesn't exist, register
    register_response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": "Sold Lifecycle Test User"
        }
    )
    assert register_response.status_code == 200, f"User registration failed: {register_response.text}"
    return register_response.json()["access_token"]


@pytest.fixture(scope="module")
def first_product_id(admin_token):
    """Get the first product ID from admin products list"""
    response = requests.get(
        f"{BASE_URL}/api/admin/products",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200, f"Failed to get products: {response.text}"
    products = response.json()
    assert len(products) > 0, "No products found for testing"
    return products[0]["id"]


class TestAdminSoldToggle:
    """Test admin can toggle product sold status"""
    
    def test_mark_product_as_sold(self, admin_token, first_product_id):
        """Test 1: PATCH /api/admin/products/{id} with {is_sold:true} sets is_sold=true and sold_at timestamp"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/products/{first_product_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_sold": True}
        )
        assert response.status_code == 200, f"Failed to mark as sold: {response.text}"
        
        product = response.json()
        assert product["is_sold"] is True, "Product should be marked as sold"
        assert product.get("sold_at") is not None, "sold_at timestamp should be set"
        print(f"✓ Product marked as SOLD, sold_at: {product['sold_at']}")
    
    def test_mark_product_as_unsold(self, admin_token, first_product_id):
        """Test 2: PATCH /api/admin/products/{id} with {is_sold:false} clears is_sold and sold_at"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/products/{first_product_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_sold": False}
        )
        assert response.status_code == 200, f"Failed to mark as unsold: {response.text}"
        
        product = response.json()
        assert product["is_sold"] is False, "Product should be marked as unsold"
        assert product.get("sold_at") is None, "sold_at should be cleared"
        print("✓ Product marked as UNSOLD, sold_at cleared")


class TestPublicProductsFiltering:
    """Test public products endpoint filters sold items"""
    
    def test_sold_item_hidden_from_public_list(self, admin_token, first_product_id):
        """Test 3: GET /api/products (public) excludes is_sold=true items"""
        # First mark product as sold
        mark_response = requests.patch(
            f"{BASE_URL}/api/admin/products/{first_product_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_sold": True}
        )
        assert mark_response.status_code == 200
        
        # Check public products list
        public_response = requests.get(f"{BASE_URL}/api/products")
        assert public_response.status_code == 200, f"Failed to get public products: {public_response.text}"
        
        products = public_response.json()
        product_ids = [p["id"] for p in products]
        assert first_product_id not in product_ids, "Sold product should be hidden from public list"
        print(f"✓ Sold product hidden from public list ({len(products)} products returned)")
    
    def test_sold_item_accessible_via_direct_url(self, admin_token, first_product_id):
        """Test 4: GET /api/products/{id} (direct) returns product with is_sold=true for sold items"""
        # Ensure product is still sold
        direct_response = requests.get(f"{BASE_URL}/api/products/{first_product_id}")
        assert direct_response.status_code == 200, f"Failed to access product directly: {direct_response.text}"
        
        product = direct_response.json()
        assert product["id"] == first_product_id, "Correct product returned"
        assert product["is_sold"] is True, "Product should show is_sold=true via direct access"
        print(f"✓ Sold product accessible via direct URL with is_sold=true")


class TestCartBlocking:
    """Test cart add blocking for sold items"""
    
    def test_cart_add_rejects_sold_items(self, admin_token, first_product_id, test_user_token):
        """Test 5: POST /api/cart/add rejects sold items with 400 'This item has been sold'"""
        # Ensure product is sold
        mark_response = requests.patch(
            f"{BASE_URL}/api/admin/products/{first_product_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_sold": True}
        )
        assert mark_response.status_code == 200
        
        # Try to add to cart
        cart_response = requests.post(
            f"{BASE_URL}/api/cart/add",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"product_id": first_product_id, "quantity": 1}
        )
        assert cart_response.status_code == 400, f"Expected 400, got {cart_response.status_code}"
        assert "sold" in cart_response.json().get("detail", "").lower(), "Error should mention 'sold'"
        print("✓ Cart add correctly rejected for sold item with 400")


class TestNameYourPriceBlocking:
    """Test Name Your Price blocking for sold items"""
    
    def test_nyp_rejects_sold_items(self, admin_token, first_product_id):
        """Test 6: POST /api/name-your-price rejects sold items with 400"""
        # Ensure product is sold
        mark_response = requests.patch(
            f"{BASE_URL}/api/admin/products/{first_product_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_sold": True}
        )
        assert mark_response.status_code == 200
        
        # Get product title
        product_response = requests.get(f"{BASE_URL}/api/products/{first_product_id}")
        product_title = product_response.json().get("title", "Test Product")
        
        # Try NYP inquiry
        nyp_response = requests.post(
            f"{BASE_URL}/api/name-your-price",
            json={
                "name": "Test User",
                "phone": "1234567890",
                "price": 1000.0,
                "product_id": first_product_id,
                "product_title": product_title
            }
        )
        assert nyp_response.status_code == 400, f"Expected 400, got {nyp_response.status_code}: {nyp_response.text}"
        assert "sold" in nyp_response.json().get("detail", "").lower(), "Error should mention 'sold'"
        print("✓ Name Your Price correctly rejected for sold item with 400")


class TestAutoSoldOnOrder:
    """Test auto-sold on order creation"""
    
    @pytest.fixture
    def test_product_for_order(self, admin_token):
        """Create a test product specifically for order testing"""
        product_data = {
            "title": f"TEST_ORDER_SOLD_{uuid.uuid4().hex[:8]}",
            "category": "sapphire",
            "description": "Test product for order sold lifecycle",
            "price": 100.0,
            "image_url": "https://example.com/test.jpg",
            "in_stock": True,
            "is_sold": False
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/products",
            headers={"Authorization": f"Bearer {admin_token}"},
            json=product_data
        )
        assert response.status_code == 200, f"Failed to create test product: {response.text}"
        product = response.json()
        yield product
        
        # Cleanup: Delete the test product
        try:
            requests.delete(
                f"{BASE_URL}/api/admin/products/{product['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        except:
            pass
    
    def test_order_marks_products_as_sold(self, admin_token, test_user_token, test_product_for_order):
        """Test 7: POST /api/orders auto-marks purchased products as SOLD (is_sold=true, sold_at set, in_stock=false)"""
        product_id = test_product_for_order["id"]
        
        # Clear cart first
        requests.get(
            f"{BASE_URL}/api/cart",
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        
        # Add product to cart
        add_response = requests.post(
            f"{BASE_URL}/api/cart/add",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={"product_id": product_id, "quantity": 1}
        )
        assert add_response.status_code == 200, f"Failed to add to cart: {add_response.text}"
        
        # Create order
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            headers={"Authorization": f"Bearer {test_user_token}"},
            json={
                "items": [{"product_id": product_id, "quantity": 1}],
                "shipping_address": "123 Test St, Test City",
                "payment_method": "stripe"
            }
        )
        assert order_response.status_code == 200, f"Failed to create order: {order_response.text}"
        
        # Verify product is now marked as sold
        product_response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert product_response.status_code == 200, f"Failed to get product: {product_response.text}"
        
        product = product_response.json()
        assert product["is_sold"] is True, "Product should be marked as SOLD after order"
        assert product.get("sold_at") is not None, "sold_at timestamp should be set"
        assert product["in_stock"] is False, "in_stock should be False after order"
        print(f"✓ Product auto-marked as SOLD after order creation (sold_at: {product['sold_at']})")


class TestCleanup:
    """Cleanup tests - reset product to unsold state"""
    
    def test_reset_first_product_to_unsold(self, admin_token, first_product_id):
        """Reset first product to unsold state for future tests"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/products/{first_product_id}",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"is_sold": False, "in_stock": True}
        )
        assert response.status_code == 200
        print("✓ First product reset to unsold state")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

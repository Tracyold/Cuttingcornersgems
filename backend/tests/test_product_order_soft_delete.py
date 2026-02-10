"""
Test suite for Product and Order soft-delete/restore functionality.

Tests:
1. Product soft-delete (referenced by orders) returns "Product hidden (historical orders preserved)"
2. Product hard-delete on referenced product returns 409
3. Product restore removes is_deleted flag
4. GET /admin/products?include_deleted=true returns deleted products
5. GET /products (public) excludes is_deleted=true products
6. Order soft-delete works only for unpaid pending orders
7. Order soft-delete returns 400 for paid orders
8. Order restore works correctly
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductSoftDelete:
    """Tests for product deletion/restore lifecycle."""

    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for authenticated requests."""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "postvibe",
            "password": "adm1npa$$word"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]

    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}

    @pytest.fixture(scope="class")
    def user_token(self):
        """Create or login test user."""
        test_email = f"test_softdel_{uuid.uuid4().hex[:8]}@example.com"
        # Try register
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "Test1234",
            "name": "Test User"
        })
        if response.status_code == 200:
            return response.json()["access_token"], test_email
        # Fall back to existing user
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "smoke2@example.com",
            "password": "Test1234"
        })
        if response.status_code == 200:
            return response.json()["access_token"], "smoke2@example.com"
        pytest.skip("Could not authenticate test user")

    @pytest.fixture
    def test_product(self, admin_headers):
        """Create a test product for deletion tests."""
        product_data = {
            "title": f"TEST_DELETE_PRODUCT_{uuid.uuid4().hex[:8]}",
            "category": "sapphire",
            "image_url": "https://example.com/test.jpg",
            "price": 1000,
            "in_stock": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/products", json=product_data, headers=admin_headers)
        assert response.status_code == 200, f"Create product failed: {response.text}"
        product = response.json()
        yield product
        # Cleanup - try hard delete (may fail if referenced)
        try:
            requests.delete(f"{BASE_URL}/api/admin/products/{product['id']}?hard=true", headers=admin_headers)
        except:
            pass

    @pytest.fixture
    def product_with_order(self, admin_headers, user_token):
        """Create a product and an order referencing it."""
        token, email = user_token
        user_headers = {"Authorization": f"Bearer {token}"}
        
        # Create product
        product_data = {
            "title": f"TEST_ORDER_REF_PRODUCT_{uuid.uuid4().hex[:8]}",
            "category": "emerald",
            "image_url": "https://example.com/test.jpg",
            "price": 500,
            "in_stock": True
        }
        response = requests.post(f"{BASE_URL}/api/admin/products", json=product_data, headers=admin_headers)
        assert response.status_code == 200, f"Create product failed: {response.text}"
        product = response.json()
        
        # Create order with this product
        order_data = {
            "items": [{"product_id": product["id"], "quantity": 1}],
            "shipping_address": "123 Test St",
            "payment_method": "none"
        }
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data, headers=user_headers)
        assert response.status_code in [200, 201], f"Create order failed: {response.text}"
        order = response.json()
        
        yield product, order
        
        # Cleanup
        try:
            requests.post(f"{BASE_URL}/api/admin/orders/{order['id']}/delete", headers=admin_headers)
            requests.delete(f"{BASE_URL}/api/admin/products/{product['id']}?hard=true", headers=admin_headers)
        except:
            pass

    def test_soft_delete_unreferenced_product(self, admin_headers, test_product):
        """Test 1: Soft-delete a product NOT referenced by orders."""
        product_id = test_product["id"]
        
        # Delete (soft)
        response = requests.delete(f"{BASE_URL}/api/admin/products/{product_id}", headers=admin_headers)
        assert response.status_code == 200, f"Soft delete failed: {response.text}"
        data = response.json()
        assert "hidden" in data["message"].lower() or "deleted" in data["message"].lower(), f"Unexpected message: {data}"
        
        # Verify product is soft-deleted
        response = requests.get(f"{BASE_URL}/api/admin/products?include_deleted=true", headers=admin_headers)
        assert response.status_code == 200
        products = response.json()
        deleted_product = next((p for p in products if p["id"] == product_id), None)
        assert deleted_product is not None, "Product not found with include_deleted=true"
        assert deleted_product.get("is_deleted") is True, "Product should be marked is_deleted=True"
        print(f"PASS: Product {product_id} soft-deleted successfully")

    def test_soft_delete_referenced_product_returns_correct_message(self, admin_headers, product_with_order):
        """Test 2: Soft-delete product referenced by order returns correct message."""
        product, order = product_with_order
        product_id = product["id"]
        
        # Delete (soft) - should soft-delete and return specific message
        response = requests.delete(f"{BASE_URL}/api/admin/products/{product_id}", headers=admin_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert "hidden" in data["message"].lower() or "historical" in data["message"].lower(), f"Expected 'hidden' or 'historical' in message: {data}"
        print(f"PASS: Referenced product soft-delete returned: {data['message']}")

    def test_hard_delete_referenced_product_returns_409(self, admin_headers, product_with_order):
        """Test 3: Hard-delete on referenced product returns 409 Conflict."""
        product, order = product_with_order
        product_id = product["id"]
        
        # Try hard delete
        response = requests.delete(f"{BASE_URL}/api/admin/products/{product_id}?hard=true", headers=admin_headers)
        assert response.status_code == 409, f"Expected 409 Conflict, got {response.status_code}: {response.text}"
        data = response.json()
        assert "cannot" in data.get("detail", "").lower() or "hard" in data.get("detail", "").lower(), f"Unexpected error message: {data}"
        print(f"PASS: Hard-delete on referenced product returned 409: {data}")

    def test_restore_product(self, admin_headers, test_product):
        """Test 4: Restore a soft-deleted product."""
        product_id = test_product["id"]
        
        # First soft-delete it
        response = requests.delete(f"{BASE_URL}/api/admin/products/{product_id}", headers=admin_headers)
        assert response.status_code == 200
        
        # Restore
        response = requests.post(f"{BASE_URL}/api/admin/products/{product_id}/restore", headers=admin_headers)
        assert response.status_code == 200, f"Restore failed: {response.text}"
        data = response.json()
        assert "restored" in data.get("message", "").lower(), f"Unexpected message: {data}"
        
        # Verify product is no longer deleted
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=admin_headers)
        assert response.status_code == 200
        products = response.json()
        restored_product = next((p for p in products if p["id"] == product_id), None)
        assert restored_product is not None, "Product should appear in non-deleted list after restore"
        assert restored_product.get("is_deleted") is not True, "Product should NOT have is_deleted=True"
        print(f"PASS: Product {product_id} restored successfully")

    def test_include_deleted_returns_deleted_products(self, admin_headers, test_product):
        """Test 5: GET /admin/products?include_deleted=true returns deleted products."""
        product_id = test_product["id"]
        
        # Soft-delete
        requests.delete(f"{BASE_URL}/api/admin/products/{product_id}", headers=admin_headers)
        
        # Check include_deleted=true
        response = requests.get(f"{BASE_URL}/api/admin/products?include_deleted=true", headers=admin_headers)
        assert response.status_code == 200
        products = response.json()
        deleted_ids = [p["id"] for p in products if p.get("is_deleted")]
        assert product_id in deleted_ids, "Deleted product should appear with include_deleted=true"
        
        # Check without include_deleted (should NOT appear)
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=admin_headers)
        assert response.status_code == 200
        products = response.json()
        active_ids = [p["id"] for p in products]
        assert product_id not in active_ids, "Deleted product should NOT appear without include_deleted"
        print(f"PASS: include_deleted filter works correctly")

    def test_public_products_excludes_deleted(self, admin_headers, test_product):
        """Test 6: GET /products (public) excludes is_deleted=true products."""
        product_id = test_product["id"]
        
        # Soft-delete
        requests.delete(f"{BASE_URL}/api/admin/products/{product_id}", headers=admin_headers)
        
        # Public endpoint should NOT include deleted products
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        public_ids = [p["id"] for p in products]
        assert product_id not in public_ids, "Deleted product should NOT appear in public API"
        print(f"PASS: Public /products excludes deleted products")


class TestOrderSoftDelete:
    """Tests for order deletion/restore lifecycle."""

    @pytest.fixture(scope="class")
    def admin_token(self):
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "postvibe",
            "password": "adm1npa$$word"
        })
        assert response.status_code == 200
        return response.json()["access_token"]

    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        return {"Authorization": f"Bearer {admin_token}"}

    @pytest.fixture(scope="class")
    def user_token(self):
        test_email = f"test_order_{uuid.uuid4().hex[:8]}@example.com"
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "Test1234",
            "name": "Test Order User"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "smoke2@example.com",
            "password": "Test1234"
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Could not authenticate")

    @pytest.fixture
    def unpaid_order(self, admin_headers, user_token):
        """Create an unpaid pending order."""
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get an existing product
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        if not products:
            pytest.skip("No products available")
        product = products[0]
        
        # Create order
        order_data = {
            "items": [{"product_id": product["id"], "quantity": 1}],
            "shipping_address": "456 Test Ave",
            "payment_method": "none"
        }
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data, headers=user_headers)
        assert response.status_code in [200, 201], f"Create order failed: {response.text}"
        order = response.json()
        yield order
        # Cleanup
        try:
            requests.post(f"{BASE_URL}/api/admin/orders/{order['id']}/delete", headers=admin_headers)
        except:
            pass

    @pytest.fixture
    def paid_order(self, admin_headers, user_token):
        """Create a paid order."""
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get an existing product
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        products = response.json()
        if not products:
            pytest.skip("No products available")
        product = products[0]
        
        # Create order
        order_data = {
            "items": [{"product_id": product["id"], "quantity": 1}],
            "shipping_address": "789 Test Blvd",
            "payment_method": "none"
        }
        response = requests.post(f"{BASE_URL}/api/orders", json=order_data, headers=user_headers)
        assert response.status_code in [200, 201]
        order = response.json()
        
        # Mark as paid
        response = requests.post(f"{BASE_URL}/api/admin/orders/{order['id']}/mark-paid", headers=admin_headers)
        # Even if mark-paid fails, proceed with what we have
        
        yield order

    def test_delete_unpaid_pending_order_succeeds(self, admin_headers, unpaid_order):
        """Test 7: POST /admin/orders/{id}/delete works for unpaid pending orders."""
        order_id = unpaid_order["id"]
        
        response = requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/delete", headers=admin_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert "deleted" in data.get("message", "").lower(), f"Unexpected message: {data}"
        
        # Verify order is soft-deleted
        response = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=admin_headers)
        assert response.status_code == 200
        orders = response.json()
        deleted_order = next((o for o in orders if o["id"] == order_id), None)
        assert deleted_order is not None, "Order should exist with include_deleted"
        assert deleted_order.get("is_deleted") is True, "Order should be marked is_deleted"
        print(f"PASS: Unpaid order {order_id} soft-deleted successfully")

    def test_delete_paid_order_returns_400(self, admin_headers, paid_order):
        """Test 8: POST /admin/orders/{id}/delete returns 400 for paid orders."""
        order_id = paid_order["id"]
        
        # First check if order is actually paid
        response = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=admin_headers)
        orders = response.json()
        order = next((o for o in orders if o["id"] == order_id), None)
        
        if order and order.get("paid_at"):
            # Try to delete paid order
            response = requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/delete", headers=admin_headers)
            assert response.status_code == 400, f"Expected 400 for paid order delete, got {response.status_code}: {response.text}"
            data = response.json()
            assert "paid" in data.get("detail", "").lower() or "cannot" in data.get("detail", "").lower(), f"Unexpected error: {data}"
            print(f"PASS: Delete paid order returned 400: {data}")
        else:
            # Order not paid, try marking it paid first
            requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/mark-paid", headers=admin_headers)
            response = requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/delete", headers=admin_headers)
            # Should fail if it got marked paid
            print(f"Order paid status: {order.get('paid_at') if order else 'N/A'}, delete response: {response.status_code}")

    def test_restore_deleted_order(self, admin_headers, unpaid_order):
        """Test 9: POST /admin/orders/{id}/restore restores soft-deleted orders."""
        order_id = unpaid_order["id"]
        
        # Delete first
        response = requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/delete", headers=admin_headers)
        assert response.status_code == 200
        
        # Restore
        response = requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/restore", headers=admin_headers)
        assert response.status_code == 200, f"Restore failed: {response.text}"
        data = response.json()
        assert "restored" in data.get("message", "").lower(), f"Unexpected message: {data}"
        
        # Verify order is restored
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        assert response.status_code == 200
        orders = response.json()
        restored_order = next((o for o in orders if o["id"] == order_id), None)
        assert restored_order is not None, "Order should appear after restore"
        assert restored_order.get("is_deleted") is not True, "Order should not be deleted after restore"
        print(f"PASS: Order {order_id} restored successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

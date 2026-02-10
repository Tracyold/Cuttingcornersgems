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

Uses existing orders in the system rather than creating new ones (cart API required).
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

    def test_soft_delete_referenced_product_returns_correct_message(self, admin_headers):
        """Test 2: Soft-delete product referenced by order returns correct message."""
        # Get existing orders to find a product that's referenced
        response = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=admin_headers)
        assert response.status_code == 200
        orders = response.json()
        
        if not orders:
            pytest.skip("No existing orders to test with")
        
        # Get a product_id from an existing order
        referenced_product_id = None
        for order in orders:
            if order.get("items"):
                for item in order["items"]:
                    if item.get("product_id"):
                        referenced_product_id = item["product_id"]
                        break
            if referenced_product_id:
                break
        
        if not referenced_product_id:
            pytest.skip("No products referenced by orders")
        
        # Check if product exists (might already be deleted)
        response = requests.get(f"{BASE_URL}/api/admin/products?include_deleted=true", headers=admin_headers)
        products = response.json()
        product = next((p for p in products if p["id"] == referenced_product_id), None)
        
        if not product:
            pytest.skip("Referenced product not found")
        
        # If product is already deleted, restore it first
        if product.get("is_deleted"):
            requests.post(f"{BASE_URL}/api/admin/products/{referenced_product_id}/restore", headers=admin_headers)
        
        # Now try to delete (soft)
        response = requests.delete(f"{BASE_URL}/api/admin/products/{referenced_product_id}", headers=admin_headers)
        assert response.status_code == 200, f"Delete failed: {response.text}"
        data = response.json()
        assert "hidden" in data["message"].lower() or "historical" in data["message"].lower(), f"Expected 'hidden' or 'historical' in message: {data}"
        print(f"PASS: Referenced product soft-delete returned: {data['message']}")
        
        # Restore for other tests
        requests.post(f"{BASE_URL}/api/admin/products/{referenced_product_id}/restore", headers=admin_headers)

    def test_hard_delete_referenced_product_returns_409(self, admin_headers):
        """Test 3: Hard-delete on referenced product returns 409 Conflict."""
        # Find product referenced by an order
        response = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=admin_headers)
        orders = response.json()
        
        referenced_product_id = None
        for order in orders:
            if order.get("items"):
                for item in order["items"]:
                    if item.get("product_id"):
                        referenced_product_id = item["product_id"]
                        break
            if referenced_product_id:
                break
        
        if not referenced_product_id:
            pytest.skip("No products referenced by orders")
        
        # Try hard delete
        response = requests.delete(f"{BASE_URL}/api/admin/products/{referenced_product_id}?hard=true", headers=admin_headers)
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
    """Tests for order deletion/restore lifecycle using existing orders."""

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

    def test_delete_unpaid_pending_order_succeeds(self, admin_headers):
        """Test 7: POST /admin/orders/{id}/delete works for unpaid pending orders."""
        # Get pending orders
        response = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=admin_headers)
        assert response.status_code == 200
        orders = response.json()
        
        # Find an unpaid pending order that's not already deleted
        pending_order = None
        for order in orders:
            if order.get("status") == "pending" and not order.get("paid_at") and not order.get("is_deleted"):
                pending_order = order
                break
        
        if not pending_order:
            # Check if there's a deleted pending order we can restore first
            for order in orders:
                if order.get("status") == "pending" and not order.get("paid_at") and order.get("is_deleted"):
                    requests.post(f"{BASE_URL}/api/admin/orders/{order['id']}/restore", headers=admin_headers)
                    pending_order = order
                    break
        
        if not pending_order:
            pytest.skip("No pending unpaid orders available")
        
        order_id = pending_order["id"]
        
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
        
        # Restore it for other tests
        requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/restore", headers=admin_headers)

    def test_delete_paid_order_returns_400(self, admin_headers):
        """Test 8: POST /admin/orders/{id}/delete returns 400 for paid orders."""
        # Get orders
        response = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=admin_headers)
        assert response.status_code == 200
        orders = response.json()
        
        # Find a paid order
        paid_order = None
        for order in orders:
            if order.get("paid_at"):
                paid_order = order
                break
        
        if not paid_order:
            pytest.skip("No paid orders available to test")
        
        order_id = paid_order["id"]
        
        # Try to delete paid order
        response = requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/delete", headers=admin_headers)
        assert response.status_code == 400, f"Expected 400 for paid order delete, got {response.status_code}: {response.text}"
        data = response.json()
        assert "paid" in data.get("detail", "").lower() or "cannot" in data.get("detail", "").lower(), f"Unexpected error: {data}"
        print(f"PASS: Delete paid order returned 400: {data}")

    def test_restore_deleted_order(self, admin_headers):
        """Test 9: POST /admin/orders/{id}/restore restores soft-deleted orders."""
        # Get orders including deleted
        response = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=admin_headers)
        assert response.status_code == 200
        orders = response.json()
        
        # Find an unpaid pending order to use
        test_order = None
        for order in orders:
            if order.get("status") == "pending" and not order.get("paid_at"):
                test_order = order
                break
        
        if not test_order:
            pytest.skip("No pending orders available")
        
        order_id = test_order["id"]
        
        # If not deleted, delete it first
        if not test_order.get("is_deleted"):
            response = requests.post(f"{BASE_URL}/api/admin/orders/{order_id}/delete", headers=admin_headers)
            if response.status_code != 200:
                pytest.skip("Could not delete order for restore test")
        
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

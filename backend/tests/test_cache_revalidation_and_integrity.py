"""
Test suite for:
1. (P0) Client-side cache revalidation - AdminProducts and AdminGallery auto-refresh after mutations
2. (P1) Data integrity on product deletion - Products cannot be deleted if referenced in carts/orders

These tests verify the fixes implemented in the current fork.
"""

import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProductDeletionIntegrity:
    """Tests for P1: Data integrity on product deletion - should block if product in cart/orders"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token and create test product"""
        # Admin login
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "postvibe",
            "password": "adm1npa$$word"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_token = login_response.json()["access_token"]
        self.admin_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
        
        # Create a test user for cart testing
        self.test_user_email = f"test_integrity_{int(time.time())}@example.com"
        user_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": self.test_user_email,
            "password": "testpass123",
            "name": "Test User Integrity"
        })
        if user_response.status_code == 200:
            self.user_token = user_response.json()["access_token"]
            self.user_headers = {
                "Authorization": f"Bearer {self.user_token}",
                "Content-Type": "application/json"
            }
        else:
            # User might already exist, try login
            login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": self.test_user_email,
                "password": "testpass123"
            })
            if login_resp.status_code == 200:
                self.user_token = login_resp.json()["access_token"]
                self.user_headers = {
                    "Authorization": f"Bearer {self.user_token}",
                    "Content-Type": "application/json"
                }
            else:
                self.user_token = None
                self.user_headers = None
    
    def test_product_deletion_success_when_not_in_cart_or_orders(self):
        """Test: Product can be deleted successfully when not referenced in carts/orders"""
        # Create a test product
        product_data = {
            "title": "TEST_DELETE_SUCCESS_Product",
            "category": "sapphire",
            "image_url": "https://example.com/test-image.jpg",
            "price": 1000,
            "in_stock": True
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data,
            headers=self.admin_headers
        )
        assert create_response.status_code == 200, f"Product creation failed: {create_response.text}"
        product_id = create_response.json()["id"]
        
        # Delete the product - should succeed
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/products/{product_id}",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify product is deleted
        get_response = requests.get(
            f"{BASE_URL}/api/products/{product_id}",
            headers=self.admin_headers
        )
        assert get_response.status_code == 404, "Product should not exist after deletion"
        print("✓ Product deletion SUCCESS when not in cart/orders")
    
    def test_product_deletion_blocked_when_in_cart(self):
        """Test: Product deletion should return 409 when product is in a user's cart"""
        if not self.user_headers:
            pytest.skip("User registration/login failed - cannot test cart integrity")
        
        # Create a test product
        product_data = {
            "title": "TEST_DELETE_BLOCKED_CART_Product",
            "category": "emerald",
            "image_url": "https://example.com/test-emerald.jpg",
            "price": 2500,
            "in_stock": True
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data,
            headers=self.admin_headers
        )
        assert create_response.status_code == 200, f"Product creation failed: {create_response.text}"
        product_id = create_response.json()["id"]
        
        # Add product to user's cart
        cart_add_response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            headers=self.user_headers
        )
        assert cart_add_response.status_code == 200, f"Adding to cart failed: {cart_add_response.text}"
        
        # Try to delete the product - should fail with 409 Conflict
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/products/{product_id}",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 409, f"Expected 409 Conflict, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify error message mentions cart
        error_detail = delete_response.json().get("detail", "")
        assert "cart" in error_detail.lower(), f"Error message should mention 'cart': {error_detail}"
        print(f"✓ Product deletion BLOCKED when in cart (409): {error_detail}")
        
        # Cleanup: Remove from cart first, then delete product
        requests.delete(f"{BASE_URL}/api/cart/{product_id}", headers=self.user_headers)
        requests.delete(f"{BASE_URL}/api/admin/products/{product_id}", headers=self.admin_headers)
    
    def test_product_deletion_blocked_when_in_orders(self):
        """Test: Product deletion should return 409 when product exists in order history"""
        if not self.user_headers:
            pytest.skip("User registration/login failed - cannot test order integrity")
        
        # Create a test product
        product_data = {
            "title": "TEST_DELETE_BLOCKED_ORDER_Product",
            "category": "tanzanite",
            "image_url": "https://example.com/test-tanzanite.jpg",
            "price": 3500,
            "in_stock": True
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data,
            headers=self.admin_headers
        )
        assert create_response.status_code == 200, f"Product creation failed: {create_response.text}"
        product_id = create_response.json()["id"]
        
        # Add product to cart
        cart_response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            headers=self.user_headers
        )
        assert cart_response.status_code == 200, f"Adding to cart failed: {cart_response.text}"
        
        # Create an order
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            json={
                "items": [{"product_id": product_id, "quantity": 1}],
                "shipping_address": "123 Test St, Test City",
                "payment_method": "stripe"
            },
            headers=self.user_headers
        )
        assert order_response.status_code == 200, f"Order creation failed: {order_response.text}"
        
        # Now try to delete the product - should fail with 409 Conflict
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/products/{product_id}",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 409, f"Expected 409 Conflict, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify error message mentions order history
        error_detail = delete_response.json().get("detail", "")
        assert "order" in error_detail.lower(), f"Error message should mention 'order': {error_detail}"
        print(f"✓ Product deletion BLOCKED when in orders (409): {error_detail}")
    
    def test_product_deletion_404_for_nonexistent(self):
        """Test: Deleting a non-existent product returns 404"""
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/products/nonexistent-product-id-12345",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 404, f"Expected 404, got {delete_response.status_code}"
        print("✓ Product deletion returns 404 for non-existent product")


class TestAdminProductsAPI:
    """Tests for AdminProducts API - verify CRUD operations work correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "postvibe",
            "password": "adm1npa$$word"
        })
        assert login_response.status_code == 200, f"Admin login failed: {login_response.text}"
        self.admin_token = login_response.json()["access_token"]
        self.admin_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_product(self):
        """Test: Admin can create a new product"""
        product_data = {
            "title": "TEST_CREATE_Product",
            "category": "aquamarine",
            "description": "Test description",
            "image_url": "https://example.com/aquamarine.jpg",
            "price": 1500,
            "carat": "2.5ct",
            "in_stock": True
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data,
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["title"] == product_data["title"]
        assert data["price"] == product_data["price"]
        assert "id" in data
        print(f"✓ Product created successfully: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/products/{data['id']}", headers=self.admin_headers)
    
    def test_update_product(self):
        """Test: Admin can update an existing product"""
        # Create first
        product_data = {
            "title": "TEST_UPDATE_Product_Original",
            "category": "garnet",
            "image_url": "https://example.com/garnet.jpg",
            "price": 800,
            "in_stock": True
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/products",
            json=product_data,
            headers=self.admin_headers
        )
        product_id = create_response.json()["id"]
        
        # Update
        update_data = {"title": "TEST_UPDATE_Product_Updated", "price": 950}
        update_response = requests.patch(
            f"{BASE_URL}/api/admin/products/{product_id}",
            json=update_data,
            headers=self.admin_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated["title"] == "TEST_UPDATE_Product_Updated"
        assert updated["price"] == 950
        print(f"✓ Product updated successfully: {product_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/products/{product_id}", headers=self.admin_headers)
    
    def test_list_products(self):
        """Test: Admin can list all products"""
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=self.admin_headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} products")


class TestAdminGalleryAPI:
    """Tests for AdminGallery API - verify CRUD operations work correctly"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin auth token"""
        login_response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "postvibe",
            "password": "adm1npa$$word"
        })
        assert login_response.status_code == 200
        self.admin_token = login_response.json()["access_token"]
        self.admin_headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def test_create_gallery_item(self):
        """Test: Admin can create a new gallery item"""
        item_data = {
            "title": "TEST_CREATE_GalleryItem",
            "category": "sapphire",
            "image_url": "https://example.com/gallery-sapphire.jpg",
            "featured": False
        }
        response = requests.post(
            f"{BASE_URL}/api/admin/gallery",
            json=item_data,
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Create failed: {response.text}"
        data = response.json()
        assert data["title"] == item_data["title"]
        assert "id" in data
        print(f"✓ Gallery item created: {data['id']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery/{data['id']}", headers=self.admin_headers)
    
    def test_update_gallery_item(self):
        """Test: Admin can update an existing gallery item"""
        # Create first
        item_data = {
            "title": "TEST_UPDATE_GalleryItem_Original",
            "category": "tourmaline",
            "image_url": "https://example.com/gallery-tourmaline.jpg",
            "featured": False
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/gallery",
            json=item_data,
            headers=self.admin_headers
        )
        item_id = create_response.json()["id"]
        
        # Update
        update_response = requests.patch(
            f"{BASE_URL}/api/admin/gallery/{item_id}",
            json={"title": "TEST_UPDATE_GalleryItem_Updated", "featured": True},
            headers=self.admin_headers
        )
        assert update_response.status_code == 200, f"Update failed: {update_response.text}"
        updated = update_response.json()
        assert updated["title"] == "TEST_UPDATE_GalleryItem_Updated"
        assert updated["featured"] == True
        print(f"✓ Gallery item updated: {item_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/admin/gallery/{item_id}", headers=self.admin_headers)
    
    def test_delete_gallery_item(self):
        """Test: Admin can delete a gallery item"""
        # Create first
        item_data = {
            "title": "TEST_DELETE_GalleryItem",
            "category": "emerald",
            "image_url": "https://example.com/gallery-emerald.jpg",
            "featured": False
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/gallery",
            json=item_data,
            headers=self.admin_headers
        )
        item_id = create_response.json()["id"]
        
        # Delete
        delete_response = requests.delete(
            f"{BASE_URL}/api/admin/gallery/{item_id}",
            headers=self.admin_headers
        )
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print(f"✓ Gallery item deleted: {item_id}")
    
    def test_list_gallery_items(self):
        """Test: Admin can list all gallery items"""
        response = requests.get(f"{BASE_URL}/api/admin/gallery", headers=self.admin_headers)
        assert response.status_code == 200, f"List failed: {response.text}"
        assert isinstance(response.json(), list)
        print(f"✓ Listed {len(response.json())} gallery items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

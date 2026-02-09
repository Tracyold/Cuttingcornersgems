"""
Backend API Tests for Admin Panel Features
Tests: Admin login, dashboard stats, sold items, settings endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "postvibe"
ADMIN_PASSWORD = "adm1npa$$word"


class TestAdminAuth:
    """Admin authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("is_admin") == True
        assert data.get("token_type") == "bearer"
        print("✓ Admin login successful, token received")
        return data["access_token"]
    
    def test_admin_login_invalid_username(self):
        """Test admin login with invalid username"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "wronguser",
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 401
        print("✓ Invalid username correctly rejected")
    
    def test_admin_login_invalid_password(self):
        """Test admin login with invalid password"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid password correctly rejected")


class TestAdminDashboard:
    """Admin dashboard stats tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_dashboard_stats_endpoint(self, admin_token):
        """Test /api/admin/dashboard/stats returns correct data structure"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify all expected fields are present
        expected_fields = [
            "products", "gallery", "bookings", "users", "orders", "sold",
            "inquiries", "product_inquiries", "sell_inquiries", "nyp_inquiries",
            "total_revenue", "pending_bookings", "pending_inquiries"
        ]
        
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
            assert isinstance(data[field], (int, float)), f"Field {field} should be numeric"
        
        print(f"✓ Dashboard stats returned all {len(expected_fields)} expected fields")
        print(f"  Products: {data['products']}, Gallery: {data['gallery']}, Users: {data['users']}")
        print(f"  Total Revenue: ${data['total_revenue']}")
    
    def test_dashboard_stats_unauthorized(self):
        """Test dashboard stats requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/stats")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Dashboard stats correctly requires authentication")


class TestAdminSoldItems:
    """Admin sold items endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_sold_items_endpoint(self, admin_token):
        """Test /api/admin/sold returns list of sold items"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sold", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Sold items should return a list"
        print(f"✓ Sold items endpoint returned {len(data)} items")
    
    def test_sold_items_unauthorized(self):
        """Test sold items requires authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/sold")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Sold items correctly requires authentication")


class TestAdminSettings:
    """Admin settings endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_settings(self, admin_token):
        """Test GET /api/admin/settings returns settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for key settings fields
        settings_fields = [
            "sms_enabled", "captcha_enabled", "stripe_enabled", 
            "cloud_storage_enabled", "email_enabled"
        ]
        
        for field in settings_fields:
            assert field in data, f"Missing settings field: {field}"
        
        print("✓ Settings endpoint returned all expected fields")
        print(f"  SMS: {data.get('sms_enabled')}, Stripe: {data.get('stripe_enabled')}, Email: {data.get('email_enabled')}")
    
    def test_update_settings(self, admin_token):
        """Test PATCH /api/admin/settings updates settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update a setting
        update_data = {"email_enabled": True}
        response = requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("email_enabled") == True
        
        # Revert the setting
        update_data = {"email_enabled": False}
        response = requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json=update_data)
        assert response.status_code == 200
        
        print("✓ Settings update and revert successful")
    
    def test_email_test_connection(self, admin_token):
        """Test email test connection endpoint (MOCKED)"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Test with a known provider
        test_data = {
            "provider": "sendgrid",
            "api_key": "test_api_key_12345",
            "from_address": "test@example.com"
        }
        response = requests.post(f"{BASE_URL}/api/admin/settings/test-email", headers=headers, json=test_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "success" in data
        assert "message" in data
        print(f"✓ Email test connection endpoint works (MOCKED): {data.get('message')}")


class TestAdminProducts:
    """Admin products CRUD tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_products(self, admin_token):
        """Test GET /api/admin/products returns products list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/products", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin products endpoint returned {len(data)} products")
    
    def test_create_and_delete_product(self, admin_token):
        """Test product creation and deletion"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test product
        product_data = {
            "title": "TEST_Product_For_Testing",
            "category": "sapphire",
            "image_url": "https://example.com/test.jpg",
            "price": 1000.00,
            "in_stock": True
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/products", headers=headers, json=product_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        created_product = create_response.json()
        assert created_product["title"] == product_data["title"]
        product_id = created_product["id"]
        print(f"✓ Product created with ID: {product_id}")
        
        # Delete the test product
        delete_response = requests.delete(f"{BASE_URL}/api/admin/products/{product_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print("✓ Product deleted successfully")


class TestAdminGallery:
    """Admin gallery CRUD tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_gallery(self, admin_token):
        """Test GET /api/admin/gallery returns gallery items"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/gallery", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Admin gallery endpoint returned {len(data)} items")
    
    def test_create_and_delete_gallery_item(self, admin_token):
        """Test gallery item creation and deletion"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Create a test gallery item
        item_data = {
            "title": "TEST_Gallery_Item",
            "category": "sapphire",
            "image_url": "https://example.com/test.jpg",
            "featured": False
        }
        
        create_response = requests.post(f"{BASE_URL}/api/admin/gallery", headers=headers, json=item_data)
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        
        created_item = create_response.json()
        assert created_item["title"] == item_data["title"]
        item_id = created_item["id"]
        print(f"✓ Gallery item created with ID: {item_id}")
        
        # Delete the test item
        delete_response = requests.delete(f"{BASE_URL}/api/admin/gallery/{item_id}", headers=headers)
        assert delete_response.status_code == 200, f"Delete failed: {delete_response.text}"
        print("✓ Gallery item deleted successfully")


class TestAdminInquiries:
    """Admin inquiries endpoint tests"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token for authenticated requests"""
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": ADMIN_USERNAME,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json()["access_token"]
        pytest.skip("Admin login failed")
    
    def test_get_bookings(self, admin_token):
        """Test GET /api/admin/bookings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/bookings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(response.json(), list)
        print(f"✓ Bookings endpoint returned {len(response.json())} items")
    
    def test_get_product_inquiries(self, admin_token):
        """Test GET /api/admin/product-inquiries"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/product-inquiries", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(response.json(), list)
        print(f"✓ Product inquiries endpoint returned {len(response.json())} items")
    
    def test_get_sell_inquiries(self, admin_token):
        """Test GET /api/admin/sell-inquiries"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sell-inquiries", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(response.json(), list)
        print(f"✓ Sell inquiries endpoint returned {len(response.json())} items")
    
    def test_get_nyp_inquiries(self, admin_token):
        """Test GET /api/admin/name-your-price-inquiries"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/name-your-price-inquiries", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(response.json(), list)
        print(f"✓ Name Your Price inquiries endpoint returned {len(response.json())} items")
    
    def test_get_orders(self, admin_token):
        """Test GET /api/admin/orders"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(response.json(), list)
        print(f"✓ Orders endpoint returned {len(response.json())} items")
    
    def test_get_users(self, admin_token):
        """Test GET /api/admin/users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert isinstance(response.json(), list)
        print(f"✓ Users endpoint returned {len(response.json())} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

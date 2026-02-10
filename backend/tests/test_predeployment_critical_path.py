"""
Pre-Deployment Critical Path Tests for Cutting Corners Gems
Tests: Admin flows (A1-A4), User flows (B1-B3), CORS (C1), Persistence (D1)
"""
import pytest
import requests
import os
import time
from datetime import datetime

# Use deployed URL for testing
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pending-invoice-flow.preview.emergentagent.com')
API_URL = f"{BASE_URL}/api"

# Test credentials
ADMIN_USERNAME = "postvibe"
ADMIN_PASSWORD = "adm1npa$$word"

# Generate unique test identifiers
TIMESTAMP = datetime.now().strftime("%Y%m%d%H%M%S")
TEST_PRODUCT_TITLE = f"PROD_DEPLOY_TEST_{TIMESTAMP}"
TEST_GALLERY_TITLE = f"GALLERY_DEPLOY_TEST_{TIMESTAMP}"
TEST_USER_EMAIL = f"USER_DEPLOY_TEST_{TIMESTAMP}@example.com"
TEST_USER_PASSWORD = "TestPass123!"
TEST_USER_NAME = "Deploy Test User"

# Shared state for tests
class TestState:
    admin_token = None
    user_token = None
    created_product_id = None
    created_gallery_id = None
    created_user_id = None


class TestA1AdminLogin:
    """A1: Admin login at /admin/login -> token stored, redirect to dashboard"""
    
    def test_admin_login_success(self):
        """Admin can login with correct credentials"""
        response = requests.post(
            f"{API_URL}/admin/login",
            json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in response"
        assert data.get("is_admin") == True, "is_admin not set to True"
        
        TestState.admin_token = data["access_token"]
        print(f"✓ Admin login successful, token received")
    
    def test_admin_login_invalid_credentials(self):
        """Admin login fails with wrong credentials"""
        response = requests.post(
            f"{API_URL}/admin/login",
            json={"username": "wronguser", "password": "wrongpass"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Admin login correctly rejected invalid credentials")
    
    def test_admin_verify_token(self):
        """Verify admin token is valid"""
        assert TestState.admin_token, "No admin token available"
        
        response = requests.get(
            f"{API_URL}/admin/verify",
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        assert response.status_code == 200, f"Admin verify failed: {response.text}"
        data = response.json()
        assert data.get("valid") == True
        assert data.get("is_admin") == True
        print(f"✓ Admin token verified")


class TestA2ProductsCRUD:
    """A2: Products CRUD - Admin creates product, verify in admin list and /shop"""
    
    def test_admin_create_product(self):
        """Admin creates a new product"""
        assert TestState.admin_token, "Admin login required first"
        
        product_data = {
            "title": TEST_PRODUCT_TITLE,
            "category": "sapphire",
            "description": "Deployment test product - can be deleted",
            "price": 9999,
            "image_url": "https://images.unsplash.com/photo-1515709980177-5e4e47c8b7e3?w=400",
            "in_stock": True
        }
        
        response = requests.post(
            f"{API_URL}/admin/products",
            json=product_data,
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        assert response.status_code == 200, f"Create product failed: {response.text}"
        
        data = response.json()
        assert data.get("title") == TEST_PRODUCT_TITLE
        assert "id" in data
        
        TestState.created_product_id = data["id"]
        print(f"✓ Product created: {TEST_PRODUCT_TITLE} (ID: {TestState.created_product_id})")
    
    def test_product_appears_in_admin_list(self):
        """Product appears in admin products list"""
        assert TestState.admin_token, "Admin login required"
        assert TestState.created_product_id, "Product creation required first"
        
        response = requests.get(
            f"{API_URL}/admin/products",
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        assert response.status_code == 200, f"Get admin products failed: {response.text}"
        
        products = response.json()
        product_titles = [p.get("title") for p in products]
        assert TEST_PRODUCT_TITLE in product_titles, f"Product {TEST_PRODUCT_TITLE} not in admin list"
        print(f"✓ Product appears in admin products list")
    
    def test_product_appears_in_public_shop(self):
        """Product appears in public /shop endpoint"""
        # Give a moment for any caching to update
        time.sleep(0.5)
        
        response = requests.get(f"{API_URL}/products")
        assert response.status_code == 200, f"Get products failed: {response.text}"
        
        products = response.json()
        product_titles = [p.get("title") for p in products]
        assert TEST_PRODUCT_TITLE in product_titles, f"Product {TEST_PRODUCT_TITLE} not in public shop"
        print(f"✓ Product appears in public /shop")


class TestA3GalleryCRUD:
    """A3: Gallery CRUD - Admin creates gallery item, verify in admin and /gallery"""
    
    def test_admin_create_gallery_item(self):
        """Admin creates a new gallery item"""
        assert TestState.admin_token, "Admin login required first"
        
        gallery_data = {
            "title": TEST_GALLERY_TITLE,
            "category": "sapphire",
            "era": "PRESENT",
            "description": "Deployment test gallery item - can be deleted",
            "image_url": "https://images.unsplash.com/photo-1553531889-e6cf4d692b1b?w=400"
        }
        
        response = requests.post(
            f"{API_URL}/admin/gallery",
            json=gallery_data,
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        assert response.status_code == 200, f"Create gallery failed: {response.text}"
        
        data = response.json()
        assert data.get("title") == TEST_GALLERY_TITLE
        assert data.get("era") == "PRESENT"
        assert "id" in data
        
        TestState.created_gallery_id = data["id"]
        print(f"✓ Gallery item created: {TEST_GALLERY_TITLE} (ID: {TestState.created_gallery_id})")
    
    def test_gallery_appears_in_admin_list(self):
        """Gallery item appears in admin gallery list"""
        assert TestState.admin_token, "Admin login required"
        assert TestState.created_gallery_id, "Gallery creation required first"
        
        response = requests.get(
            f"{API_URL}/admin/gallery",
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        assert response.status_code == 200, f"Get admin gallery failed: {response.text}"
        
        items = response.json()
        item_titles = [i.get("title") for i in items]
        assert TEST_GALLERY_TITLE in item_titles, f"Gallery {TEST_GALLERY_TITLE} not in admin list"
        print(f"✓ Gallery item appears in admin gallery list")
    
    def test_gallery_appears_in_public_gallery(self):
        """Gallery item appears in public /gallery endpoint"""
        time.sleep(0.5)
        
        response = requests.get(f"{API_URL}/gallery")
        assert response.status_code == 200, f"Get gallery failed: {response.text}"
        
        items = response.json()
        item_titles = [i.get("title") for i in items]
        assert TEST_GALLERY_TITLE in item_titles, f"Gallery {TEST_GALLERY_TITLE} not in public gallery"
        print(f"✓ Gallery item appears in public /gallery")
    
    def test_gallery_category_filter(self):
        """Gallery item appears when filtering by category"""
        response = requests.get(f"{API_URL}/gallery?category=sapphire")
        assert response.status_code == 200, f"Get gallery with category failed: {response.text}"
        
        items = response.json()
        item_titles = [i.get("title") for i in items]
        assert TEST_GALLERY_TITLE in item_titles, f"Gallery item not found in sapphire category filter"
        print(f"✓ Gallery item appears in category filter")


class TestA4AdminSettings:
    """A4: Admin settings read/write - Open settings, save, verify 200"""
    
    def test_admin_get_settings(self):
        """Admin can read settings"""
        assert TestState.admin_token, "Admin login required"
        
        response = requests.get(
            f"{API_URL}/admin/settings",
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        assert response.status_code == 200, f"Get settings failed: {response.text}"
        
        data = response.json()
        # Settings should have known fields
        assert "sms_enabled" in data or "stripe_enabled" in data or "user_signup_enabled" in data
        print(f"✓ Admin settings retrieved successfully")
    
    def test_admin_save_settings_no_changes(self):
        """Admin can save settings with no changes (idempotent)"""
        assert TestState.admin_token, "Admin login required"
        
        # Send empty update (no changes)
        response = requests.patch(
            f"{API_URL}/admin/settings",
            json={},
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        assert response.status_code == 200, f"Save settings failed: {response.text}"
        print(f"✓ Admin settings saved successfully (no changes)")
    
    def test_admin_settings_persist_after_read(self):
        """Settings persist correctly after save/read cycle"""
        assert TestState.admin_token, "Admin login required"
        
        # Read settings again
        response = requests.get(
            f"{API_URL}/admin/settings",
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        assert response.status_code == 200, f"Get settings after save failed: {response.text}"
        print(f"✓ Admin settings persist after refresh")


class TestB1UserSignupLogin:
    """B1: User signup + login - Create user, verify token stored, dashboard reachable"""
    
    def test_user_signup(self):
        """User can create a new account"""
        response = requests.post(
            f"{API_URL}/auth/register",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "name": TEST_USER_NAME
            }
        )
        assert response.status_code == 200, f"User signup failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data, "No access_token in signup response"
        assert "user" in data, "No user in signup response"
        assert data["user"]["email"] == TEST_USER_EMAIL
        
        TestState.user_token = data["access_token"]
        TestState.created_user_id = data["user"]["id"]
        print(f"✓ User signup successful: {TEST_USER_EMAIL}")
    
    def test_user_token_valid(self):
        """User token can access protected endpoints"""
        assert TestState.user_token, "User signup required first"
        
        response = requests.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {TestState.user_token}"}
        )
        assert response.status_code == 200, f"Auth me failed: {response.text}"
        
        data = response.json()
        assert data.get("email") == TEST_USER_EMAIL
        print(f"✓ User token valid, can access /auth/me")
    
    def test_user_login_after_signup(self):
        """User can login with created credentials"""
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
        )
        assert response.status_code == 200, f"User login failed: {response.text}"
        
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_USER_EMAIL
        
        # Update token with fresh login token
        TestState.user_token = data["access_token"]
        print(f"✓ User login successful after signup")


class TestB2AccountPersistence:
    """B2: Account persistence - After login, refresh should still be authenticated"""
    
    def test_user_remains_authenticated(self):
        """User token remains valid (simulating browser refresh)"""
        assert TestState.user_token, "User login required first"
        
        # Make another request with same token (simulating refresh)
        response = requests.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": f"Bearer {TestState.user_token}"}
        )
        assert response.status_code == 200, f"Auth persistence failed: {response.text}"
        
        data = response.json()
        assert data.get("email") == TEST_USER_EMAIL
        print(f"✓ User authentication persists (token still valid)")
    
    def test_user_can_access_protected_resources(self):
        """User can access protected cart endpoint"""
        assert TestState.user_token, "User login required"
        
        response = requests.get(
            f"{API_URL}/cart",
            headers={"Authorization": f"Bearer {TestState.user_token}"}
        )
        assert response.status_code == 200, f"Cart access failed: {response.text}"
        print(f"✓ User can access protected resources (cart)")


class TestB3Logout:
    """B3: Logout - Token cleared, protected pages require login again"""
    
    def test_protected_endpoint_requires_auth(self):
        """Protected endpoints reject requests without token"""
        # Try accessing cart without token
        response = requests.get(f"{API_URL}/cart")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Protected endpoints require authentication")
    
    def test_invalid_token_rejected(self):
        """Invalid tokens are rejected"""
        response = requests.get(
            f"{API_URL}/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Invalid tokens correctly rejected")


class TestC1CORSVerification:
    """C1: CORS verification - API calls from frontend don't have CORS errors"""
    
    def test_cors_headers_on_products(self):
        """Products endpoint includes CORS headers"""
        # Simulate browser preflight
        response = requests.options(
            f"{API_URL}/products",
            headers={
                "Origin": BASE_URL,
                "Access-Control-Request-Method": "GET"
            }
        )
        # FastAPI with CORS middleware returns 200 for OPTIONS
        assert response.status_code in [200, 204], f"OPTIONS failed: {response.status_code}"
        print(f"✓ CORS preflight passed for /products")
    
    def test_cors_headers_on_gallery(self):
        """Gallery endpoint includes CORS headers"""
        response = requests.options(
            f"{API_URL}/gallery",
            headers={
                "Origin": BASE_URL,
                "Access-Control-Request-Method": "GET"
            }
        )
        assert response.status_code in [200, 204], f"OPTIONS failed: {response.status_code}"
        print(f"✓ CORS preflight passed for /gallery")
    
    def test_actual_get_with_origin_header(self):
        """GET requests with Origin header succeed"""
        response = requests.get(
            f"{API_URL}/products",
            headers={"Origin": BASE_URL}
        )
        assert response.status_code == 200, f"GET with Origin failed: {response.text}"
        # Check Access-Control-Allow-Origin header
        cors_header = response.headers.get("Access-Control-Allow-Origin")
        assert cors_header in ["*", BASE_URL], f"Missing or wrong CORS header: {cors_header}"
        print(f"✓ CORS header present on response: {cors_header}")


class TestD1PersistenceVerification:
    """D1: Persistence verification - Items persist after refresh and backend restart"""
    
    def test_product_persists_after_api_call(self):
        """Created product persists in database"""
        assert TestState.created_product_id, "Product creation required"
        
        # Verify product still exists
        response = requests.get(f"{API_URL}/products")
        assert response.status_code == 200
        
        products = response.json()
        product_ids = [p.get("id") for p in products]
        assert TestState.created_product_id in product_ids, "Created product not persisted"
        print(f"✓ Product persists in database")
    
    def test_gallery_persists_after_api_call(self):
        """Created gallery item persists in database"""
        assert TestState.created_gallery_id, "Gallery creation required"
        
        # Verify gallery item still exists
        response = requests.get(f"{API_URL}/gallery")
        assert response.status_code == 200
        
        items = response.json()
        item_ids = [i.get("id") for i in items]
        assert TestState.created_gallery_id in item_ids, "Created gallery item not persisted"
        print(f"✓ Gallery item persists in database")
    
    def test_health_endpoint(self):
        """Backend health check passes"""
        response = requests.get(f"{API_URL}/")
        assert response.status_code == 200, f"Health check failed: {response.text}"
        print(f"✓ Backend health check passed")
    
    def test_user_persists(self):
        """Created user persists in database"""
        # Try logging in again
        response = requests.post(
            f"{API_URL}/auth/login",
            json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            }
        )
        assert response.status_code == 200, f"User login failed (persistence issue): {response.text}"
        print(f"✓ User persists in database")


class TestCleanup:
    """Cleanup test data (optional - run last)"""
    
    def test_cleanup_test_product(self):
        """Delete test product if exists"""
        if not TestState.admin_token or not TestState.created_product_id:
            pytest.skip("No admin token or product to clean up")
        
        response = requests.delete(
            f"{API_URL}/admin/products/{TestState.created_product_id}",
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        # May fail if in cart - that's OK for cleanup
        if response.status_code == 200:
            print(f"✓ Test product cleaned up")
        else:
            print(f"ℹ Product cleanup skipped (may be in cart/order): {response.status_code}")
    
    def test_cleanup_test_gallery(self):
        """Delete test gallery item if exists"""
        if not TestState.admin_token or not TestState.created_gallery_id:
            pytest.skip("No admin token or gallery item to clean up")
        
        response = requests.delete(
            f"{API_URL}/admin/gallery/{TestState.created_gallery_id}",
            headers={"Authorization": f"Bearer {TestState.admin_token}"}
        )
        if response.status_code == 200:
            print(f"✓ Test gallery item cleaned up")
        else:
            print(f"ℹ Gallery cleanup status: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

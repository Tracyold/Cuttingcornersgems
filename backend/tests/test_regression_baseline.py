"""
Pre/Post Refactor Regression Test Suite
Tests all endpoints to ensure API contract preservation
"""
import pytest
import asyncio
from httpx import AsyncClient
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001')
API_URL = f"{BASE_URL}/api"

# Test credentials
TEST_USER = {
    "email": f"test_user_{datetime.now().timestamp()}@example.com",
    "password": "TestPass123!",
    "name": "Test User"
}

ADMIN_CREDENTIALS = {
    "username": "postvibe",
    "password": "adm1npa$$word"
}

class TestRegressionSuite:
    """Feature-parity regression tests"""
    
    @pytest.fixture
    async def client(self):
        async with AsyncClient(base_url=API_URL, timeout=30.0) as client:
            yield client
    
    @pytest.fixture
    async def user_token(self, client):
        """Create test user and return auth token"""
        response = await client.post("/auth/signup", json=TEST_USER)
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture
    async def admin_token(self, client):
        """Get admin auth token"""
        response = await client.post("/admin/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        return response.json()["access_token"]
    
    # ==================== PUBLIC ENDPOINTS ====================
    
    async def test_public_products_list(self, client):
        """GET /api/products - Public product listing"""
        response = await client.get("/products")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Products list: {len(response.json())} items")
    
    async def test_public_products_by_category(self, client):
        """GET /api/products?category=sapphire - Filter by category"""
        response = await client.get("/products?category=sapphire")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Products by category: {len(response.json())} items")
    
    async def test_public_gallery_list(self, client):
        """GET /api/gallery - Public gallery listing"""
        response = await client.get("/gallery")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Gallery list: {len(response.json())} items")
    
    async def test_public_gallery_categories(self, client):
        """GET /api/gallery/categories - Get distinct categories"""
        response = await client.get("/gallery/categories")
        assert response.status_code == 200
        assert "categories" in response.json()
        print(f"✓ Gallery categories: {response.json()['categories']}")
    
    async def test_public_gallery_featured(self, client):
        """GET /api/gallery/featured - Get featured items"""
        response = await client.get("/gallery/featured")
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Featured gallery: {len(response.json())} items")
    
    async def test_public_booking_submission(self, client):
        """POST /api/booking - Submit booking"""
        booking_data = {
            "name": "Test Customer",
            "email": "customer@example.com",
            "service": "Custom Cut",
            "description": "Test booking"
        }
        response = await client.post("/booking", json=booking_data)
        assert response.status_code == 200
        print(f"✓ Booking submitted: {response.json()['id']}")
    
    async def test_signup_status_check(self, client):
        """GET /api/auth/signup-status - Check if signup enabled"""
        response = await client.get("/auth/signup-status")
        assert response.status_code == 200
        assert "enabled" in response.json()
        print(f"✓ Signup status: {response.json()['enabled']}")
    
    # ==================== USER ENDPOINTS ====================
    
    async def test_user_signup(self, client):
        """POST /api/auth/signup - User registration"""
        user_data = {
            "email": f"reg_test_{datetime.now().timestamp()}@example.com",
            "password": "TestPass123!",
            "name": "Registration Test"
        }
        response = await client.post("/auth/signup", json=user_data)
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert "user" in response.json()
        print(f"✓ User signup: {response.json()['user']['email']}")
    
    async def test_user_login(self, client, user_token):
        """POST /api/auth/login - User login"""
        response = await client.post("/auth/login", json={
            "email": TEST_USER["email"],
            "password": TEST_USER["password"]
        })
        assert response.status_code == 200
        assert "access_token" in response.json()
        print(f"✓ User login successful")
    
    async def test_user_cart_operations(self, client, user_token):
        """Cart CRUD operations"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        # Get cart
        response = await client.get("/cart", headers=headers)
        assert response.status_code == 200
        print(f"✓ Get cart: {response.json()}")
        
        # Get products to add to cart
        products_response = await client.get("/products")
        if products_response.json():
            product_id = products_response.json()[0]["id"]
            
            # Add to cart
            add_response = await client.post("/cart/add", 
                headers=headers,
                json={"product_id": product_id, "quantity": 1}
            )
            assert add_response.status_code == 200
            print(f"✓ Add to cart successful")
            
            # Remove from cart
            remove_response = await client.post("/cart/remove",
                headers=headers,
                json={"product_id": product_id}
            )
            assert remove_response.status_code == 200
            print(f"✓ Remove from cart successful")
    
    async def test_user_orders(self, client, user_token):
        """GET /api/orders - Get user orders"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = await client.get("/orders", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ User orders: {len(response.json())} orders")
    
    async def test_user_profile(self, client, user_token):
        """GET /api/user/profile - Get user profile"""
        headers = {"Authorization": f"Bearer {user_token}"}
        response = await client.get("/user/profile", headers=headers)
        assert response.status_code == 200
        assert "email" in response.json()
        print(f"✓ User profile: {response.json()['email']}")
    
    # ==================== ADMIN ENDPOINTS ====================
    
    async def test_admin_login(self, client):
        """POST /api/admin/login - Admin login"""
        response = await client.post("/admin/login", json=ADMIN_CREDENTIALS)
        assert response.status_code == 200
        assert "access_token" in response.json()
        assert response.json()["is_admin"] is True
        print(f"✓ Admin login successful")
    
    async def test_admin_stats(self, client, admin_token):
        """GET /api/admin/stats - Dashboard statistics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = await client.get("/admin/stats", headers=headers)
        assert response.status_code == 200
        assert "products" in response.json()
        print(f"✓ Admin stats: {response.json()['products']} products")
    
    async def test_admin_products_crud(self, client, admin_token):
        """Admin product CRUD operations"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # List products
        list_response = await client.get("/admin/products", headers=headers)
        assert list_response.status_code == 200
        print(f"✓ Admin list products: {len(list_response.json())} items")
        
        # Create product
        product_data = {
            "title": f"Test Product {datetime.now().timestamp()}",
            "category": "sapphire",
            "description": "Test product for regression",
            "image_url": "https://example.com/test.jpg",
            "price": 100.0,
            "in_stock": True
        }
        create_response = await client.post("/admin/products", 
            headers=headers,
            json=product_data
        )
        assert create_response.status_code == 200
        product_id = create_response.json()["id"]
        print(f"✓ Admin create product: {product_id}")
        
        # Update product
        update_response = await client.patch(f"/admin/products/{product_id}",
            headers=headers,
            json={"price": 150.0}
        )
        assert update_response.status_code == 200
        assert update_response.json()["price"] == 150.0
        print(f"✓ Admin update product: price updated")
        
        # Delete product
        delete_response = await client.delete(f"/admin/products/{product_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Admin delete product successful")
    
    async def test_admin_gallery_crud(self, client, admin_token):
        """Admin gallery CRUD operations"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # List gallery
        list_response = await client.get("/admin/gallery", headers=headers)
        assert list_response.status_code == 200
        print(f"✓ Admin list gallery: {len(list_response.json())} items")
        
        # Create gallery item
        gallery_data = {
            "title": f"Test Gallery {datetime.now().timestamp()}",
            "category": "tourmaline",
            "image_url": "https://example.com/test-gallery.jpg",
            "featured": False
        }
        create_response = await client.post("/admin/gallery",
            headers=headers,
            json=gallery_data
        )
        assert create_response.status_code == 200
        gallery_id = create_response.json()["id"]
        print(f"✓ Admin create gallery: {gallery_id}")
        
        # Delete gallery item
        delete_response = await client.delete(f"/admin/gallery/{gallery_id}",
            headers=headers
        )
        assert delete_response.status_code == 200
        print(f"✓ Admin delete gallery successful")
    
    async def test_admin_users_list(self, client, admin_token):
        """GET /api/admin/users - List all users"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = await client.get("/admin/users", headers=headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)
        print(f"✓ Admin users list: {len(response.json())} users")
    
    async def test_admin_inquiries(self, client, admin_token):
        """GET /api/admin/bookings, inquiries - List all inquiries"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        bookings = await client.get("/admin/bookings", headers=headers)
        assert bookings.status_code == 200
        print(f"✓ Admin bookings: {len(bookings.json())} items")
        
        product_inq = await client.get("/admin/product-inquiries", headers=headers)
        assert product_inq.status_code == 200
        print(f"✓ Admin product inquiries: {len(product_inq.json())} items")
        
        sell_inq = await client.get("/admin/sell-inquiries", headers=headers)
        assert sell_inq.status_code == 200
        print(f"✓ Admin sell inquiries: {len(sell_inq.json())} items")
    
    async def test_admin_settings(self, client, admin_token):
        """GET /api/admin/settings - Get site settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = await client.get("/admin/settings", headers=headers)
        assert response.status_code == 200
        print(f"✓ Admin settings retrieved")


# Run baseline tests
if __name__ == "__main__":
    print("\n" + "="*60)
    print("PRE-REFACTOR BASELINE REGRESSION TEST")
    print("="*60 + "\n")
    
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "-s"
    ])

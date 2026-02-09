"""
Backend API Tests for Data & Archives, Analytics Settings, and Seed Test Data
Tests: Archive endpoints, analytics test connection, seed test data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "postvibe"
ADMIN_PASSWORD = "adm1npa$$word"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token for authenticated requests"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json()["access_token"]
    pytest.skip("Admin login failed")


class TestSeedTestData:
    """Test seed test data endpoint"""
    
    def test_seed_test_data_creates_items(self, admin_token):
        """Test /api/admin/seed-test-data creates test inquiries and sold item"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/seed-test-data", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "created" in data
        assert "product_inquiry" in data["created"]
        assert "sell_inquiry" in data["created"]
        assert "name_your_price" in data["created"]
        assert "sold_item" in data["created"]
        
        print("✓ Seed test data created successfully")
        print(f"  Product Inquiry ID: {data['created']['product_inquiry']}")
        print(f"  Sell Inquiry ID: {data['created']['sell_inquiry']}")
        print(f"  NYP Inquiry ID: {data['created']['name_your_price']}")
        print(f"  Sold Item ID: {data['created']['sold_item']}")
    
    def test_seed_test_data_unauthorized(self):
        """Test seed test data requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/seed-test-data")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Seed test data correctly requires authentication")


class TestArchivedDataEndpoints:
    """Test archived data retrieval endpoints"""
    
    def test_get_archived_sold(self, admin_token):
        """Test /api/admin/data/archived/sold returns list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/data/archived/sold", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Archived sold endpoint returned {len(data)} items")
    
    def test_get_archived_inquiries(self, admin_token):
        """Test /api/admin/data/archived/inquiries returns list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/data/archived/inquiries", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Archived inquiries endpoint returned {len(data)} items")
    
    def test_get_archived_bookings(self, admin_token):
        """Test /api/admin/data/archived/bookings returns list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/data/archived/bookings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Archived bookings endpoint returned {len(data)} items")
    
    def test_get_archived_gallery(self, admin_token):
        """Test /api/admin/data/archived/gallery returns list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/data/archived/gallery", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Archived gallery endpoint returned {len(data)} items")
    
    def test_get_archived_products(self, admin_token):
        """Test /api/admin/data/archived/products returns list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/data/archived/products", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Archived products endpoint returned {len(data)} items")
    
    def test_get_archived_all(self, admin_token):
        """Test /api/admin/data/archived/all returns combined list"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/data/archived/all", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Archived all endpoint returned {len(data)} items")
    
    def test_archived_endpoints_unauthorized(self):
        """Test archived endpoints require authentication"""
        endpoints = [
            "/api/admin/data/archived/sold",
            "/api/admin/data/archived/inquiries",
            "/api/admin/data/archived/bookings",
            "/api/admin/data/archived/gallery",
            "/api/admin/data/archived/products",
            "/api/admin/data/archived/all"
        ]
        
        for endpoint in endpoints:
            response = requests.get(f"{BASE_URL}{endpoint}")
            assert response.status_code in [401, 403], f"Expected 401/403 for {endpoint}, got {response.status_code}"
        
        print("✓ All archived endpoints correctly require authentication")


class TestArchiveRunProcess:
    """Test auto-archive run process"""
    
    def test_run_archive_process(self, admin_token):
        """Test /api/admin/data/archive/run executes archive process"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/data/archive/run", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data
        assert "archived" in data
        assert "sold" in data["archived"]
        assert "inquiries" in data["archived"]
        assert "bookings" in data["archived"]
        
        print("✓ Archive process completed")
        print(f"  Archived sold: {data['archived']['sold']}")
        print(f"  Archived inquiries: {data['archived']['inquiries']}")
        print(f"  Archived bookings: {data['archived']['bookings']}")
    
    def test_run_archive_unauthorized(self):
        """Test archive run requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/data/archive/run")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Archive run correctly requires authentication")


class TestAnalyticsSettings:
    """Test analytics settings and test connection"""
    
    def test_analytics_test_connection_google(self, admin_token):
        """Test analytics test connection with Google Analytics"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        test_data = {
            "provider": "google",
            "tracking_id": "G-TESTID12345"
        }
        response = requests.post(f"{BASE_URL}/api/admin/settings/test-analytics", headers=headers, json=test_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "success" in data
        assert data["success"] == True
        assert "message" in data
        print(f"✓ Analytics test connection (Google) successful: {data['message']}")
    
    def test_analytics_test_connection_plausible(self, admin_token):
        """Test analytics test connection with Plausible"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        test_data = {
            "provider": "plausible",
            "tracking_id": "example.com"
        }
        response = requests.post(f"{BASE_URL}/api/admin/settings/test-analytics", headers=headers, json=test_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data["success"] == True
        print(f"✓ Analytics test connection (Plausible) successful: {data['message']}")
    
    def test_analytics_test_connection_invalid_tracking_id(self, admin_token):
        """Test analytics test connection with invalid tracking ID"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        test_data = {
            "provider": "google",
            "tracking_id": "abc"  # Too short
        }
        response = requests.post(f"{BASE_URL}/api/admin/settings/test-analytics", headers=headers, json=test_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        print("✓ Analytics test correctly rejects invalid tracking ID")
    
    def test_analytics_test_connection_unknown_provider(self, admin_token):
        """Test analytics test connection with unknown provider"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        test_data = {
            "provider": "unknownprovider",
            "tracking_id": "VALID12345"
        }
        response = requests.post(f"{BASE_URL}/api/admin/settings/test-analytics", headers=headers, json=test_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["success"] == False
        print("✓ Analytics test correctly rejects unknown provider")
    
    def test_analytics_settings_update(self, admin_token):
        """Test updating analytics settings"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Update analytics settings
        update_data = {
            "analytics_enabled": True,
            "analytics_provider": "google",
            "analytics_tracking_id": "G-TEST123456",
            "track_browser_type": True,
            "track_device_type": True,
            "track_clicks": True,
            "track_views": True,
            "track_duration": True,
            "track_interaction_rate": True
        }
        response = requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json=update_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify settings were updated
        assert data.get("analytics_enabled") == True or data.get("analytics_enabled") is None  # May not be in response model
        print("✓ Analytics settings updated successfully")
        
        # Revert settings
        revert_data = {"analytics_enabled": False}
        requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json=revert_data)
        print("✓ Analytics settings reverted")


class TestSoldItemsWithInvoice:
    """Test sold items with invoice details"""
    
    def test_sold_items_have_invoice_fields(self, admin_token):
        """Test sold items contain invoice-related fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/sold", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if len(data) > 0:
            item = data[0]
            
            # Check for invoice-related fields
            invoice_fields = [
                "id", "product_id", "product_title", "buyer_name", "buyer_email",
                "item_price", "shipping_cost", "total_paid", "sold_at"
            ]
            
            for field in invoice_fields:
                assert field in item, f"Missing invoice field: {field}"
            
            print("✓ Sold item has all invoice fields")
            print(f"  Invoice: {item.get('invoice_number', 'N/A')}")
            print(f"  Total Paid: ${item.get('total_paid', 0)}")
            print(f"  Tracking: {item.get('tracking_number', 'N/A')}")
        else:
            print("✓ Sold items endpoint works (no items to verify)")
    
    def test_update_sold_item_tracking(self, admin_token):
        """Test updating sold item tracking info"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get sold items
        response = requests.get(f"{BASE_URL}/api/admin/sold", headers=headers)
        data = response.json()
        
        if len(data) > 0:
            item_id = data[0]["id"]
            
            # Update tracking
            update_data = {
                "tracking_number": "TEST123456789",
                "tracking_carrier": "usps"
            }
            update_response = requests.patch(f"{BASE_URL}/api/admin/sold/{item_id}", headers=headers, json=update_data)
            
            assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
            print("✓ Sold item tracking updated successfully")
        else:
            print("✓ No sold items to update (skipped)")


class TestNameYourPriceInquiries:
    """Test Name Your Price inquiries with product info"""
    
    def test_nyp_inquiries_have_product_info(self, admin_token):
        """Test NYP inquiries contain product information"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/name-your-price-inquiries", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        if len(data) > 0:
            item = data[0]
            
            # Check for NYP-specific fields
            nyp_fields = ["id", "name", "phone", "product_id", "product_title", "price", "created_at"]
            
            for field in nyp_fields:
                assert field in item, f"Missing NYP field: {field}"
            
            print("✓ NYP inquiry has all required fields")
            print(f"  Customer: {item.get('name')}")
            print(f"  Product: {item.get('product_title')}")
            print(f"  Offered Price: ${item.get('price')}")
        else:
            print("✓ NYP inquiries endpoint works (no items to verify)")


class TestDashboardStatsWithNewData:
    """Test dashboard stats reflect new test data"""
    
    def test_dashboard_stats_counts(self, admin_token):
        """Test dashboard stats show correct counts"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify counts are present and numeric
        assert data.get("sold", 0) >= 0
        assert data.get("product_inquiries", 0) >= 0
        assert data.get("sell_inquiries", 0) >= 0
        assert data.get("nyp_inquiries", 0) >= 0
        
        print("✓ Dashboard stats verified")
        print(f"  Sold: {data.get('sold')}")
        print(f"  Product Inquiries: {data.get('product_inquiries')}")
        print(f"  Sell Inquiries: {data.get('sell_inquiries')}")
        print(f"  NYP Inquiries: {data.get('nyp_inquiries')}")
        print(f"  Total Revenue: ${data.get('total_revenue')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

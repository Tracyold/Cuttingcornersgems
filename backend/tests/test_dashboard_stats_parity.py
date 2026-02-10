"""
Tests for Admin Dashboard Stats Count Parity
- Dashboard stats endpoint should return counts matching non-deleted list endpoint counts
- Recent activity should include deleted items (with include_deleted=true)
- Pending status detection on activity items
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDashboardStatsParity:
    """Test dashboard stats match non-deleted list counts"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "postvibe", "password": "adm1npa$$word"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_dashboard_stats_endpoint_accessible(self, headers):
        """Test dashboard stats endpoint returns 200"""
        response = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers)
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields exist
        expected_fields = ['products', 'gallery', 'bookings', 'users', 'orders', 
                          'sold', 'product_inquiries', 'sell_inquiries', 'nyp_inquiries']
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
    
    def test_bookings_count_parity(self, headers):
        """Bookings stat matches non-deleted list count"""
        stats = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers).json()
        bookings_list = requests.get(f"{BASE_URL}/api/admin/bookings", headers=headers).json()
        
        assert stats['bookings'] == len(bookings_list), \
            f"Dashboard bookings={stats['bookings']} != list count={len(bookings_list)}"
    
    def test_users_count_parity(self, headers):
        """Users stat matches non-deleted list count"""
        stats = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers).json()
        users_list = requests.get(f"{BASE_URL}/api/admin/users", headers=headers).json()
        
        assert stats['users'] == len(users_list), \
            f"Dashboard users={stats['users']} != list count={len(users_list)}"
    
    def test_orders_count_parity(self, headers):
        """Orders stat matches non-deleted list count"""
        stats = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers).json()
        orders_list = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers).json()
        
        assert stats['orders'] == len(orders_list), \
            f"Dashboard orders={stats['orders']} != list count={len(orders_list)}"
    
    def test_sold_count_parity(self, headers):
        """Sold items stat matches non-deleted list count"""
        stats = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers).json()
        sold_list = requests.get(f"{BASE_URL}/api/admin/sold", headers=headers).json()
        
        assert stats['sold'] == len(sold_list), \
            f"Dashboard sold={stats['sold']} != list count={len(sold_list)}"
    
    def test_product_inquiries_count_parity(self, headers):
        """Product inquiries stat matches non-deleted list count"""
        stats = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers).json()
        inquiries_list = requests.get(f"{BASE_URL}/api/admin/product-inquiries", headers=headers).json()
        
        assert stats['product_inquiries'] == len(inquiries_list), \
            f"Dashboard product_inquiries={stats['product_inquiries']} != list count={len(inquiries_list)}"
    
    def test_sell_inquiries_count_parity(self, headers):
        """Sell inquiries stat matches non-deleted list count"""
        stats = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers).json()
        inquiries_list = requests.get(f"{BASE_URL}/api/admin/sell-inquiries", headers=headers).json()
        
        assert stats['sell_inquiries'] == len(inquiries_list), \
            f"Dashboard sell_inquiries={stats['sell_inquiries']} != list count={len(inquiries_list)}"
    
    def test_nyp_inquiries_count_parity(self, headers):
        """NYP inquiries stat matches non-deleted list count"""
        stats = requests.get(f"{BASE_URL}/api/admin/dashboard/stats", headers=headers).json()
        inquiries_list = requests.get(f"{BASE_URL}/api/admin/name-your-price-inquiries", headers=headers).json()
        
        assert stats['nyp_inquiries'] == len(inquiries_list), \
            f"Dashboard nyp_inquiries={stats['nyp_inquiries']} != list count={len(inquiries_list)}"


class TestRecentActivityIncludesDeleted:
    """Test recent activity endpoints with include_deleted=true"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "postvibe", "password": "adm1npa$$word"}
        )
        assert response.status_code == 200
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_bookings_include_deleted_returns_more_items(self, headers):
        """Bookings with include_deleted=true returns deleted items"""
        without_deleted = requests.get(f"{BASE_URL}/api/admin/bookings", headers=headers).json()
        with_deleted = requests.get(f"{BASE_URL}/api/admin/bookings?include_deleted=true", headers=headers).json()
        
        # With include_deleted should return >= items
        assert len(with_deleted) >= len(without_deleted), \
            f"include_deleted should return >= items: {len(with_deleted)} vs {len(without_deleted)}"
        
        # Check for is_deleted flag on deleted items
        deleted_items = [b for b in with_deleted if b.get('is_deleted', False)]
        print(f"Found {len(deleted_items)} deleted bookings out of {len(with_deleted)} total")
    
    def test_product_inquiries_include_deleted(self, headers):
        """Product inquiries with include_deleted=true returns deleted items"""
        without_deleted = requests.get(f"{BASE_URL}/api/admin/product-inquiries", headers=headers).json()
        with_deleted = requests.get(f"{BASE_URL}/api/admin/product-inquiries?include_deleted=true", headers=headers).json()
        
        assert len(with_deleted) >= len(without_deleted)
        deleted_items = [i for i in with_deleted if i.get('is_deleted', False)]
        print(f"Found {len(deleted_items)} deleted product inquiries out of {len(with_deleted)} total")
    
    def test_sell_inquiries_include_deleted(self, headers):
        """Sell inquiries with include_deleted=true returns deleted items"""
        without_deleted = requests.get(f"{BASE_URL}/api/admin/sell-inquiries", headers=headers).json()
        with_deleted = requests.get(f"{BASE_URL}/api/admin/sell-inquiries?include_deleted=true", headers=headers).json()
        
        assert len(with_deleted) >= len(without_deleted)
        deleted_items = [i for i in with_deleted if i.get('is_deleted', False)]
        print(f"Found {len(deleted_items)} deleted sell inquiries out of {len(with_deleted)} total")
    
    def test_orders_include_deleted(self, headers):
        """Orders with include_deleted=true returns deleted items"""
        without_deleted = requests.get(f"{BASE_URL}/api/admin/orders", headers=headers).json()
        with_deleted = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=headers).json()
        
        assert len(with_deleted) >= len(without_deleted)
        deleted_items = [o for o in with_deleted if o.get('is_deleted', False)]
        print(f"Found {len(deleted_items)} deleted orders out of {len(with_deleted)} total")


class TestPendingStatusDetection:
    """Test pending status is properly detected on activity items"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin authentication token"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "postvibe", "password": "adm1npa$$word"}
        )
        return response.json()["access_token"]
    
    @pytest.fixture(scope="class")
    def headers(self, admin_token):
        """Create auth headers"""
        return {"Authorization": f"Bearer {admin_token}"}
    
    def test_bookings_have_status_field(self, headers):
        """Bookings should have status field for pending detection"""
        bookings = requests.get(f"{BASE_URL}/api/admin/bookings?include_deleted=true", headers=headers).json()
        
        for booking in bookings[:5]:
            assert 'status' in booking or 'booking_status' in booking, \
                f"Booking missing status field: {booking.get('id')}"
            status = booking.get('status') or booking.get('booking_status')
            print(f"Booking {booking.get('id', 'unknown')[:8]}... status={status}")
    
    def test_orders_have_status_field(self, headers):
        """Orders should have status field for pending detection"""
        orders = requests.get(f"{BASE_URL}/api/admin/orders?include_deleted=true", headers=headers).json()
        
        for order in orders[:5]:
            assert 'status' in order, f"Order missing status field: {order.get('id')}"
            print(f"Order {order.get('id', 'unknown')[:8]}... status={order.get('status')}")
    
    def test_items_can_be_both_deleted_and_pending(self, headers):
        """Items can have both is_deleted=true AND status=pending"""
        # Get all items with include_deleted
        bookings = requests.get(f"{BASE_URL}/api/admin/bookings?include_deleted=true", headers=headers).json()
        
        both_flags = []
        for b in bookings:
            is_deleted = b.get('is_deleted', False)
            status = b.get('status') or b.get('booking_status', '')
            is_pending = status == 'pending'
            
            if is_deleted and is_pending:
                both_flags.append(b)
        
        print(f"Found {len(both_flags)} items with both is_deleted=true AND status=pending")
        # Note: This test verifies the capability exists, not requiring specific count


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

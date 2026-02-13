import requests
import sys
import json
from datetime import datetime

class AdminOrdersAPITester:
    def __init__(self, base_url="https://admin-order-tracker.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        self.test_order_id = "906aaae0-ecf0-4853-8875-4ead6c58fa4c"  # Known test order

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin_token=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        # Use appropriate token
        if use_admin_token and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif not use_admin_token and self.user_token:
            test_headers['Authorization'] = f'Bearer {self.user_token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json()
                    error_msg += f" - {error_detail}"
                except:
                    error_msg += f" - {response.text[:200]}"
                
                self.log_test(name, False, error_msg)
                try:
                    return False, response.json()
                except:
                    return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_admin_login(self):
        """Test admin login"""
        admin_creds = {
            "username": "postvibe",
            "password": "adm1npa$$word"
        }
        
        success, response = self.run_test("Admin Login", "POST", "admin/login", 200, admin_creds)
        if success and 'access_token' in response:
            self.admin_token = response['access_token']
            print(f"   Admin token obtained: {self.admin_token[:20]}...")
            return True
        return False

    def test_user_login(self):
        """Test user login"""
        user_creds = {
            "email": "testuser2@example.com",
            "password": "testpass123"
        }
        
        success, response = self.run_test("User Login", "POST", "auth/login", 200, user_creds)
        if success and 'access_token' in response:
            self.user_token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   User token obtained: {self.user_token[:20]}...")
            print(f"   User ID: {self.user_id}")
            return True
        return False

    def test_admin_orders_endpoint(self):
        """Test admin orders endpoint with enriched user data"""
        if not self.admin_token:
            self.log_test("Admin Orders - Get All", False, "No admin token")
            return False
            
        success, orders = self.run_test("Admin Orders - Get All", "GET", "admin/orders", 200, use_admin_token=True)
        
        if success and orders:
            print(f"   Found {len(orders)} orders")
            
            # Check if orders have enriched user data
            orders_with_buyer_info = [o for o in orders if 'buyer_name' in o or 'buyer_email' in o]
            if orders_with_buyer_info:
                order = orders_with_buyer_info[0]
                print(f"   Sample order buyer info: {order.get('buyer_name', 'N/A')} - {order.get('buyer_email', 'N/A')}")
                self.log_test("Admin Orders - Has Buyer Info", True, f"Found buyer info in {len(orders_with_buyer_info)} orders")
            else:
                self.log_test("Admin Orders - Has Buyer Info", False, "No orders with buyer info found")
            
            # Test include_deleted parameter
            success2, deleted_orders = self.run_test("Admin Orders - Include Deleted", "GET", "admin/orders?include_deleted=true", 200, use_admin_token=True)
            if success2:
                print(f"   Found {len(deleted_orders)} orders (including deleted)")
            
            return success and success2
        
        return success

    def test_order_tracking_update(self):
        """Test updating order tracking info"""
        if not self.admin_token:
            self.log_test("Order Tracking Update", False, "No admin token")
            return False
        
        # Get an order to update (use test order ID or find one)
        success, orders = self.run_test("Get Orders for Tracking Test", "GET", "admin/orders", 200, use_admin_token=True)
        
        order_id = self.test_order_id
        if success and orders:
            # Find a suitable order (preferably paid)
            suitable_orders = [o for o in orders if o.get('paid_at') is not None]
            if suitable_orders:
                order_id = suitable_orders[0]['id']
                print(f"   Using order ID: {order_id}")
        
        tracking_update = {
            "tracking_number": "1Z999AA1234567890", 
            "tracking_carrier": "ups",
            "seller_notes": "Test tracking info added via API test"
        }
        
        success, response = self.run_test(
            "Update Order Tracking", 
            "PATCH", 
            f"admin/orders/{order_id}/tracking", 
            200, 
            tracking_update, 
            use_admin_token=True
        )
        
        return success

    def test_mark_order_paid(self):
        """Test marking order as paid"""
        if not self.admin_token:
            self.log_test("Mark Order Paid", False, "No admin token")
            return False
        
        # Get pending orders
        success, orders = self.run_test("Get Orders for Paid Test", "GET", "admin/orders", 200, use_admin_token=True)
        
        if success and orders:
            # Find a pending (unpaid) order
            pending_orders = [o for o in orders if o.get('status') == 'pending' and not o.get('paid_at')]
            
            if pending_orders:
                order_id = pending_orders[0]['id']
                print(f"   Found pending order: {order_id}")
                
                success, response = self.run_test(
                    "Mark Order as Paid", 
                    "POST", 
                    f"admin/orders/{order_id}/mark-paid", 
                    200, 
                    use_admin_token=True
                )
                return success
            else:
                self.log_test("Mark Order Paid", False, "No pending orders found to test with")
                return False
        
        return False

    def test_user_orders_endpoint(self):
        """Test user can see their orders with tracking info"""
        if not self.user_token:
            self.log_test("User Orders", False, "No user token")
            return False
        
        success, orders = self.run_test("User Orders - Get All", "GET", "orders", 200, use_admin_token=False)
        
        if success:
            print(f"   User has {len(orders)} orders")
            
            # Check for orders with tracking info
            orders_with_tracking = [o for o in orders if o.get('tracking_number')]
            if orders_with_tracking:
                order = orders_with_tracking[0]
                print(f"   Sample order tracking: {order.get('tracking_carrier', 'N/A')}: {order.get('tracking_number', 'N/A')}")
                if order.get('seller_notes'):
                    print(f"   Seller notes: {order.get('seller_notes')[:50]}...")
                
                self.log_test("User Orders - Has Tracking Info", True, f"Found tracking in {len(orders_with_tracking)} orders")
            else:
                self.log_test("User Orders - Has Tracking Info", False, "No orders with tracking info found")
        
        return success

    def test_order_delete_restore(self):
        """Test deleting and restoring orders (admin only)"""
        if not self.admin_token:
            self.log_test("Order Delete/Restore", False, "No admin token")
            return False
        
        # Get orders to find a suitable one for delete test
        success, orders = self.run_test("Get Orders for Delete Test", "GET", "admin/orders", 200, use_admin_token=True)
        
        if success and orders:
            # Find a pending order we can safely delete
            pending_orders = [o for o in orders if o.get('status') == 'pending' and not o.get('paid_at') and not o.get('is_deleted')]
            
            if pending_orders:
                order_id = pending_orders[0]['id']
                print(f"   Testing with order: {order_id}")
                
                # Test delete
                success_delete, _ = self.run_test(
                    "Delete Pending Order", 
                    "POST", 
                    f"admin/orders/{order_id}/delete", 
                    200, 
                    use_admin_token=True
                )
                
                if success_delete:
                    # Test restore
                    success_restore, _ = self.run_test(
                        "Restore Deleted Order", 
                        "POST", 
                        f"admin/orders/{order_id}/restore", 
                        200, 
                        use_admin_token=True
                    )
                    return success_restore
                
                return success_delete
            else:
                self.log_test("Order Delete/Restore", False, "No suitable pending orders found for delete test")
                return False
        
        return False

    def run_all_tests(self):
        """Run all admin orders tests"""
        print("🚀 Starting Admin Orders API Tests")
        print("=" * 50)
        
        # Test authentication first
        if not self.test_admin_login():
            print("❌ Admin login failed - cannot continue with admin tests")
            return 1
        
        if not self.test_user_login():
            print("❌ User login failed - cannot test user functionality")
        
        # Test admin order endpoints
        self.test_admin_orders_endpoint()
        
        # Test order tracking updates
        self.test_order_tracking_update()
        
        # Test marking orders as paid
        self.test_mark_order_paid()
        
        # Test user can see orders with tracking
        if self.user_token:
            self.test_user_orders_endpoint()
        
        # Test delete/restore functionality
        self.test_order_delete_restore()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            
            # Print failed tests details
            failed_tests = [t for t in self.test_results if not t['success']]
            if failed_tests:
                print("\nFailed tests:")
                for test in failed_tests:
                    print(f"  - {test['test']}: {test['details']}")
            
            return 1

def main():
    tester = AdminOrdersAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
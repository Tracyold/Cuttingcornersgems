import requests
import sys
import json
from datetime import datetime

class CuttingCornersAPITester:
    def __init__(self, base_url="https://password-reset-ready.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

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

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
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
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Request failed: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_seed_data(self):
        """Test seeding data"""
        return self.run_test("Seed Data", "POST", "seed", 200)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"test{timestamp}@example.com",
            "password": "TestPass123!"
        }
        
        success, response = self.run_test("User Registration", "POST", "auth/register", 200, user_data)
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.token:
            return False
            
        # Try to get user info to verify token works
        return self.run_test("User Login Verification", "GET", "auth/me", 200)[0]

    def test_gallery_endpoints(self):
        """Test gallery-related endpoints"""
        results = []
        
        # Test get all gallery items
        success, _ = self.run_test("Get Gallery Items", "GET", "gallery", 200)
        results.append(success)
        
        # Test get gallery categories
        success, _ = self.run_test("Get Gallery Categories", "GET", "gallery/categories", 200)
        results.append(success)
        
        # Test get featured gallery
        success, _ = self.run_test("Get Featured Gallery", "GET", "gallery/featured", 200)
        results.append(success)
        
        # Test category filter
        success, _ = self.run_test("Gallery Category Filter", "GET", "gallery?category=sapphire", 200)
        results.append(success)
        
        return all(results)

    def test_shop_endpoints(self):
        """Test shop/product endpoints"""
        results = []
        
        # Test get all products
        success, products_response = self.run_test("Get Products", "GET", "products", 200)
        results.append(success)
        
        # Test category filter
        success, _ = self.run_test("Products Category Filter", "GET", "products?category=sapphire", 200)
        results.append(success)
        
        # Test featured products
        success, _ = self.run_test("Featured Products", "GET", "products?featured=true", 200)
        results.append(success)
        
        # Test get specific product (if products exist)
        if success and products_response and len(products_response) > 0:
            product_id = products_response[0]['id']
            success, _ = self.run_test("Get Specific Product", "GET", f"products/{product_id}", 200)
            results.append(success)
        
        return all(results)

    def test_cart_functionality(self):
        """Test cart operations (requires authentication)"""
        if not self.token:
            print("❌ Cart tests skipped - no authentication token")
            return False
            
        results = []
        
        # Test get cart
        success, cart_response = self.run_test("Get Cart", "GET", "cart", 200)
        results.append(success)
        
        # Test add to cart (need a product first)
        success, products = self.run_test("Get Products for Cart", "GET", "products", 200)
        if success and products and len(products) > 0:
            product_id = products[0]['id']
            cart_item = {"product_id": product_id, "quantity": 1}
            success, _ = self.run_test("Add to Cart", "POST", "cart/add", 200, cart_item)
            results.append(success)
            
            # Test remove from cart
            if success:
                success, _ = self.run_test("Remove from Cart", "DELETE", f"cart/{product_id}", 200)
                results.append(success)
        
        return all(results)

    def test_booking_functionality(self):
        """Test booking creation"""
        booking_data = {
            "name": "Test Customer",
            "email": "test@example.com",
            "phone": "480-285-4595",
            "service": "cut",
            "stone_type": "sapphire",
            "description": "Test booking for sapphire cutting service"
        }
        
        success, _ = self.run_test("Create Booking", "POST", "bookings", 200, booking_data)
        
        # Test get user bookings (requires auth)
        if self.token:
            success2, _ = self.run_test("Get User Bookings", "GET", "bookings", 200)
            return success and success2
        
        return success

    def test_order_functionality(self):
        """Test order creation (requires authentication and cart items)"""
        if not self.token:
            print("❌ Order tests skipped - no authentication token")
            return False
            
        # First add item to cart
        success, products = self.run_test("Get Products for Order", "GET", "products", 200)
        if not success or not products:
            return False
            
        product_id = products[0]['id']
        cart_item = {"product_id": product_id, "quantity": 1}
        success, _ = self.run_test("Add to Cart for Order", "POST", "cart/add", 200, cart_item)
        
        if success:
            order_data = {
                "items": [{"product_id": product_id, "quantity": 1}],
                "shipping_address": "123 Test St, Tempe, AZ 85281",
                "payment_method": "stripe"
            }
            success, _ = self.run_test("Create Order", "POST", "orders", 200, order_data)
            
            if success:
                success2, _ = self.run_test("Get User Orders", "GET", "orders", 200)
                return success2
        
        return False

    def run_all_tests(self):
        """Run comprehensive API tests"""
        print("🚀 Starting Cutting Corners API Tests")
        print("=" * 50)
        
        # Test basic connectivity
        self.test_root_endpoint()
        
        # Seed data
        self.test_seed_data()
        
        # Test authentication
        if self.test_user_registration():
            self.test_user_login()
        
        # Test gallery functionality
        self.test_gallery_endpoints()
        
        # Test shop functionality
        self.test_shop_endpoints()
        
        # Test authenticated features
        if self.token:
            self.test_cart_functionality()
            self.test_order_functionality()
        
        # Test booking (works with or without auth)
        self.test_booking_functionality()
        
        # Print summary
        print("\n" + "=" * 50)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = CuttingCornersAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())
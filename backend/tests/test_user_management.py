"""
Backend API Tests for User Management Features
Tests: Admin users endpoint, user details, signup status, user messages, site settings toggles
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Admin credentials
ADMIN_USERNAME = "postvibe"
ADMIN_PASSWORD = "adm1npa$$word"

# Test user credentials
TEST_USER_EMAIL = f"test_user_{uuid.uuid4().hex[:8]}@example.com"
TEST_USER_PASSWORD = "password123"
TEST_USER_NAME = "Test User"


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


@pytest.fixture(scope="module")
def test_user_token():
    """Create a test user and get token"""
    # First check if signup is enabled
    status_response = requests.get(f"{BASE_URL}/api/auth/signup-status")
    if status_response.status_code == 200:
        if not status_response.json().get("signup_enabled", True):
            pytest.skip("User signup is disabled")
    
    # Register test user
    response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "name": TEST_USER_NAME
    })
    
    if response.status_code == 200:
        data = response.json()
        return {
            "token": data["access_token"],
            "user": data["user"]
        }
    elif response.status_code == 400 and "already registered" in response.text.lower():
        # User exists, try to login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        })
        if login_response.status_code == 200:
            data = login_response.json()
            return {
                "token": data["access_token"],
                "user": data["user"]
            }
    
    pytest.skip(f"Could not create/login test user: {response.text}")


class TestSignupStatus:
    """Test signup status endpoint"""
    
    def test_signup_status_endpoint(self):
        """Test /api/auth/signup-status returns signup status"""
        response = requests.get(f"{BASE_URL}/api/auth/signup-status")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "signup_enabled" in data, "Missing signup_enabled field"
        assert isinstance(data["signup_enabled"], bool), "signup_enabled should be boolean"
        
        print(f"✓ Signup status endpoint works")
        print(f"  Signup enabled: {data['signup_enabled']}")
    
    def test_signup_status_no_auth_required(self):
        """Test signup status is public (no auth required)"""
        response = requests.get(f"{BASE_URL}/api/auth/signup-status")
        assert response.status_code == 200, "Signup status should be public"
        print(f"✓ Signup status is publicly accessible")


class TestAdminUsersEndpoint:
    """Test admin users list endpoint"""
    
    def test_get_users_list(self, admin_token):
        """Test /api/admin/users returns users with summary data"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Users should return a list"
        print(f"✓ Admin users endpoint returned {len(data)} users")
        
        if len(data) > 0:
            user = data[0]
            # Check for expected fields
            expected_fields = ["id", "email", "name", "created_at"]
            for field in expected_fields:
                assert field in user, f"Missing field: {field}"
            
            # Check for summary data fields
            assert "total_orders" in user, "Missing total_orders summary field"
            assert "cart_items" in user, "Missing cart_items summary field"
            
            print(f"  First user: {user.get('name')} ({user.get('email')})")
            print(f"  Orders: {user.get('total_orders')}, Cart items: {user.get('cart_items')}")
    
    def test_users_list_unauthorized(self):
        """Test users list requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Users list correctly requires authentication")
    
    def test_users_list_excludes_password(self, admin_token):
        """Test users list does not expose password hash"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        for user in data:
            assert "password_hash" not in user, "Password hash should not be exposed"
            assert "password" not in user, "Password should not be exposed"
        
        print(f"✓ Users list correctly excludes password data")


class TestAdminUserDetails:
    """Test admin user details endpoint"""
    
    def test_get_user_details(self, admin_token, test_user_token):
        """Test /api/admin/users/{id}/details returns full user details"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        user_id = test_user_token["user"]["id"]
        
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}/details", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Check for basic user info
        assert "email" in data, "Missing email"
        assert "name" in data, "Missing name"
        
        # Check for detailed data
        assert "orders" in data, "Missing orders array"
        assert "cart_items" in data, "Missing cart_items array"
        assert "abandoned_items" in data, "Missing abandoned_items array"
        assert "inquiries" in data, "Missing inquiries array"
        assert "messages" in data, "Missing messages array"
        assert "analytics" in data, "Missing analytics object"
        
        # Check analytics structure
        analytics = data["analytics"]
        analytics_fields = ["click_through_rate", "most_clicked_item", "longest_view_time", "shortest_view_time"]
        for field in analytics_fields:
            assert field in analytics, f"Missing analytics field: {field}"
        
        print(f"✓ User details endpoint returned full data")
        print(f"  User: {data.get('name')} ({data.get('email')})")
        print(f"  Orders: {len(data.get('orders', []))}")
        print(f"  Cart items: {len(data.get('cart_items', []))}")
        print(f"  Inquiries: {len(data.get('inquiries', []))}")
        print(f"  Messages: {len(data.get('messages', []))}")
        print(f"  Analytics CTR: {analytics.get('click_through_rate')}%")
    
    def test_user_details_not_found(self, admin_token):
        """Test user details returns 404 for non-existent user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/users/nonexistent-user-id/details", headers=headers)
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ User details correctly returns 404 for non-existent user")
    
    def test_user_details_unauthorized(self, test_user_token):
        """Test user details requires admin auth"""
        user_id = test_user_token["user"]["id"]
        response = requests.get(f"{BASE_URL}/api/admin/users/{user_id}/details")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ User details correctly requires admin authentication")


class TestUserMessages:
    """Test user messages to admin functionality"""
    
    def test_send_message_to_admin(self, test_user_token):
        """Test /api/user/messages POST sends message to admin"""
        headers = {"Authorization": f"Bearer {test_user_token['token']}"}
        message_data = {
            "subject": "Test Message Subject",
            "message": "This is a test message from the automated test suite."
        }
        
        response = requests.post(f"{BASE_URL}/api/user/messages", headers=headers, json=message_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "message" in data, "Missing response message"
        assert "id" in data, "Missing message id"
        
        print(f"✓ Message sent to admin successfully")
        print(f"  Message ID: {data.get('id')}")
    
    def test_get_user_messages(self, test_user_token):
        """Test /api/user/messages GET returns user's messages"""
        headers = {"Authorization": f"Bearer {test_user_token['token']}"}
        
        response = requests.get(f"{BASE_URL}/api/user/messages", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Messages should return a list"
        
        if len(data) > 0:
            msg = data[0]
            assert "id" in msg, "Missing message id"
            assert "subject" in msg, "Missing subject"
            assert "message" in msg, "Missing message content"
            assert "created_at" in msg, "Missing created_at"
        
        print(f"✓ User messages endpoint returned {len(data)} messages")
    
    def test_send_message_requires_auth(self):
        """Test sending message requires authentication"""
        message_data = {
            "subject": "Test",
            "message": "Test message"
        }
        response = requests.post(f"{BASE_URL}/api/user/messages", json=message_data)
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Sending message correctly requires authentication")


class TestAdminMessages:
    """Test admin messages endpoint"""
    
    def test_admin_get_all_messages(self, admin_token):
        """Test /api/admin/messages returns all user messages"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/messages", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert isinstance(data, list), "Messages should return a list"
        
        if len(data) > 0:
            msg = data[0]
            assert "id" in msg, "Missing message id"
            assert "user_id" in msg, "Missing user_id"
            assert "user_email" in msg, "Missing user_email"
            assert "subject" in msg, "Missing subject"
            assert "message" in msg, "Missing message content"
            assert "read" in msg, "Missing read status"
        
        print(f"✓ Admin messages endpoint returned {len(data)} messages")
    
    def test_admin_mark_message_read(self, admin_token):
        """Test /api/admin/messages/{id}/read marks message as read"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # First get messages
        response = requests.get(f"{BASE_URL}/api/admin/messages", headers=headers)
        messages = response.json()
        
        if len(messages) > 0:
            message_id = messages[0]["id"]
            
            # Mark as read
            read_response = requests.patch(f"{BASE_URL}/api/admin/messages/{message_id}/read", headers=headers)
            
            assert read_response.status_code == 200, f"Expected 200, got {read_response.status_code}"
            print(f"✓ Message marked as read successfully")
        else:
            print(f"✓ No messages to mark as read (skipped)")
    
    def test_admin_messages_unauthorized(self):
        """Test admin messages requires admin auth"""
        response = requests.get(f"{BASE_URL}/api/admin/messages")
        
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print(f"✓ Admin messages correctly requires authentication")


class TestSiteSettingsUserAuth:
    """Test site settings for user authentication"""
    
    def test_get_user_signup_setting(self, admin_token):
        """Test settings include user_signup_enabled"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert "user_signup_enabled" in data, "Missing user_signup_enabled setting"
        assert "require_email_verification" in data, "Missing require_email_verification setting"
        
        print(f"✓ User auth settings present")
        print(f"  Signup enabled: {data.get('user_signup_enabled')}")
        print(f"  Email verification required: {data.get('require_email_verification')}")
    
    def test_toggle_user_signup(self, admin_token):
        """Test toggling user signup setting"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current setting
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        current_value = get_response.json().get("user_signup_enabled", True)
        
        # Toggle to opposite
        new_value = not current_value
        update_response = requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json={
            "user_signup_enabled": new_value
        })
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        assert update_response.json().get("user_signup_enabled") == new_value
        
        # Verify signup status endpoint reflects change
        status_response = requests.get(f"{BASE_URL}/api/auth/signup-status")
        assert status_response.json().get("signup_enabled") == new_value
        
        # Revert to original
        revert_response = requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json={
            "user_signup_enabled": current_value
        })
        assert revert_response.status_code == 200
        
        print(f"✓ User signup toggle works correctly")
        print(f"  Toggled from {current_value} to {new_value} and back")
    
    def test_toggle_email_verification(self, admin_token):
        """Test toggling email verification setting"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Get current setting
        get_response = requests.get(f"{BASE_URL}/api/admin/settings", headers=headers)
        current_value = get_response.json().get("require_email_verification", False)
        
        # Toggle to opposite
        new_value = not current_value
        update_response = requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json={
            "require_email_verification": new_value
        })
        
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}"
        
        # Revert to original
        revert_response = requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json={
            "require_email_verification": current_value
        })
        assert revert_response.status_code == 200
        
        print(f"✓ Email verification toggle works correctly")


class TestUserRegistrationWithDisabledSignup:
    """Test user registration when signup is disabled"""
    
    def test_registration_blocked_when_disabled(self, admin_token):
        """Test registration fails when signup is disabled"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Disable signup
        requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json={
            "user_signup_enabled": False
        })
        
        # Try to register
        register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": f"blocked_user_{uuid.uuid4().hex[:8]}@example.com",
            "password": "password123",
            "name": "Blocked User"
        })
        
        # Should be blocked
        assert register_response.status_code == 403, f"Expected 403, got {register_response.status_code}"
        
        # Re-enable signup
        requests.patch(f"{BASE_URL}/api/admin/settings", headers=headers, json={
            "user_signup_enabled": True
        })
        
        print(f"✓ Registration correctly blocked when signup disabled")


class TestExistingUserLogin:
    """Test login with existing test user"""
    
    def test_login_existing_user(self):
        """Test login with provided test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser213928@example.com",
            "password": "password123"
        })
        
        # User may or may not exist
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert "user" in data
            print(f"✓ Existing test user login successful")
            print(f"  User: {data['user'].get('name')} ({data['user'].get('email')})")
        elif response.status_code == 401:
            print(f"✓ Test user does not exist or wrong password (expected)")
        else:
            print(f"? Unexpected response: {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

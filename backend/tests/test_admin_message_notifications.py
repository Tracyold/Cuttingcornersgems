"""
Tests for Admin Message Notification System:
- GET /api/admin/messages/unread-counts - Returns total_unread and per_user counts
- PATCH /api/admin/users/{user_id}/messages/mark-read - Marks user's messages as read
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminMessageNotifications:
    """Test admin message notification system"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get admin token for authenticated requests"""
        # Admin login
        response = requests.post(f"{BASE_URL}/api/admin/login", json={
            "username": "postvibe",
            "password": "adm1npa$$word"
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        self.admin_token = response.json()["access_token"]
        self.admin_headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Create or get test user
        test_email = f"test_msg_{uuid.uuid4().hex[:8]}@example.com"
        user_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": test_email,
            "password": "Test1234!",
            "name": "Test Msg User",
            "phone": "5551234567"
        })
        if user_response.status_code == 201:
            user_data = user_response.json()
            self.test_user_id = user_data["user"]["id"]
            self.test_user_token = user_data["access_token"]
        else:
            # User may exist, try login
            login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": test_email,
                "password": "Test1234!"
            })
            if login_response.status_code == 200:
                user_data = login_response.json()
                self.test_user_id = user_data["user"]["id"]
                self.test_user_token = user_data["access_token"]
            else:
                self.test_user_id = None
                self.test_user_token = None
        
        self.test_user_headers = {"Authorization": f"Bearer {self.test_user_token}"} if self.test_user_token else {}
        yield
    
    def test_unread_counts_endpoint_exists(self):
        """Test 1: GET /api/admin/messages/unread-counts endpoint returns valid response"""
        response = requests.get(
            f"{BASE_URL}/api/admin/messages/unread-counts",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "total_unread" in data, "Response should contain total_unread"
        assert "per_user" in data, "Response should contain per_user"
        assert isinstance(data["total_unread"], int), "total_unread should be an integer"
        assert isinstance(data["per_user"], dict), "per_user should be a dictionary"
        print(f"✅ Unread counts endpoint working: total_unread={data['total_unread']}, per_user_count={len(data['per_user'])}")
    
    def test_unread_counts_requires_auth(self):
        """Test 2: Unread counts endpoint requires admin authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/messages/unread-counts")
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated request, got {response.status_code}"
        print("✅ Unread counts endpoint properly requires authentication")
    
    def test_mark_read_endpoint_exists(self):
        """Test 3: PATCH /api/admin/users/{user_id}/messages/mark-read works"""
        if not self.test_user_id:
            pytest.skip("No test user available")
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/messages/mark-read",
            headers=self.admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "message" in data, "Response should contain message field"
        print(f"✅ Mark-read endpoint working: {data['message']}")
    
    def test_mark_read_requires_auth(self):
        """Test 4: Mark-read endpoint requires admin authentication"""
        response = requests.patch(f"{BASE_URL}/api/admin/users/fake-user-id/messages/mark-read")
        assert response.status_code in [401, 403], f"Expected 401/403 for unauthenticated request, got {response.status_code}"
        print("✅ Mark-read endpoint properly requires authentication")
    
    def test_user_sends_message_increases_unread_count(self):
        """Test 5: When user sends message, unread count increases"""
        if not self.test_user_id or not self.test_user_token:
            pytest.skip("No test user available")
        
        # Get initial unread count
        initial_response = requests.get(
            f"{BASE_URL}/api/admin/messages/unread-counts",
            headers=self.admin_headers
        )
        assert initial_response.status_code == 200
        initial_count = initial_response.json()["total_unread"]
        
        # User sends a message
        msg_response = requests.post(
            f"{BASE_URL}/api/user/messages",
            headers=self.test_user_headers,
            json={
                "subject": "Test Message",
                "message": "This is a test message from automated testing"
            }
        )
        assert msg_response.status_code in [200, 201], f"User message send failed: {msg_response.text}"
        
        # Get new unread count
        new_response = requests.get(
            f"{BASE_URL}/api/admin/messages/unread-counts",
            headers=self.admin_headers
        )
        assert new_response.status_code == 200
        new_count = new_response.json()["total_unread"]
        
        assert new_count > initial_count, f"Unread count should increase after user sends message. Initial: {initial_count}, New: {new_count}"
        print(f"✅ Unread count increased: {initial_count} -> {new_count}")
    
    def test_mark_read_decreases_unread_count(self):
        """Test 6: Marking messages as read decreases unread count"""
        if not self.test_user_id or not self.test_user_token:
            pytest.skip("No test user available")
        
        # User sends a message first
        msg_response = requests.post(
            f"{BASE_URL}/api/user/messages",
            headers=self.test_user_headers,
            json={
                "subject": "Test Message for Mark Read",
                "message": "This message should be marked as read"
            }
        )
        assert msg_response.status_code in [200, 201], f"User message send failed: {msg_response.text}"
        
        # Get unread count before marking read
        before_response = requests.get(
            f"{BASE_URL}/api/admin/messages/unread-counts",
            headers=self.admin_headers
        )
        assert before_response.status_code == 200
        before_data = before_response.json()
        before_total = before_data["total_unread"]
        before_user_count = before_data["per_user"].get(self.test_user_id, 0)
        
        # Mark user's messages as read
        mark_response = requests.patch(
            f"{BASE_URL}/api/admin/users/{self.test_user_id}/messages/mark-read",
            headers=self.admin_headers
        )
        assert mark_response.status_code == 200, f"Mark read failed: {mark_response.text}"
        
        # Get unread count after marking read
        after_response = requests.get(
            f"{BASE_URL}/api/admin/messages/unread-counts",
            headers=self.admin_headers
        )
        assert after_response.status_code == 200
        after_data = after_response.json()
        after_user_count = after_data["per_user"].get(self.test_user_id, 0)
        
        assert after_user_count == 0, f"User's unread count should be 0 after mark-read, got {after_user_count}"
        print(f"✅ Mark-read works: user unread count {before_user_count} -> {after_user_count}")
    
    def test_per_user_counts_structure(self):
        """Test 7: per_user field contains correct structure (user_id -> count mapping)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/messages/unread-counts",
            headers=self.admin_headers
        )
        assert response.status_code == 200
        
        data = response.json()
        per_user = data["per_user"]
        
        # Check structure: all values should be positive integers
        for user_id, count in per_user.items():
            assert isinstance(user_id, str), f"user_id should be string, got {type(user_id)}"
            assert isinstance(count, int), f"count should be int, got {type(count)}"
            assert count > 0, f"count should be positive for users in the dict, got {count}"
        
        print(f"✅ per_user structure valid with {len(per_user)} users with unread messages")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])

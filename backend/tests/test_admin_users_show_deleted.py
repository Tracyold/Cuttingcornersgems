"""
Test cases for Admin Users 'Show Deleted' toggle feature
Tests the include_deleted query parameter on GET /api/admin/users endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAdminUsersShowDeleted:
    """Admin Users endpoint tests for include_deleted feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: Get admin token for all tests"""
        self.admin_token = self._get_admin_token()
        self.headers = {
            "Authorization": f"Bearer {self.admin_token}",
            "Content-Type": "application/json"
        }
    
    def _get_admin_token(self):
        """Helper: Authenticate as admin"""
        response = requests.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "postvibe", "password": "adm1npa$$word"}
        )
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["access_token"]
    
    # ============ CORE FUNCTIONALITY TESTS ============
    
    def test_get_users_without_include_deleted_returns_only_non_deleted(self):
        """GET /api/admin/users without include_deleted should return only non-deleted users"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        assert response.status_code == 200
        users = response.json()
        
        # All returned users should have is_deleted != True
        for user in users:
            assert user.get("is_deleted") != True, f"User {user.get('email')} should not be deleted but is_deleted={user.get('is_deleted')}"
    
    def test_get_users_with_include_deleted_true_returns_all_users(self):
        """GET /api/admin/users?include_deleted=true should return ALL users including deleted"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?include_deleted=true",
            headers=self.headers
        )
        assert response.status_code == 200
        users = response.json()
        
        # Should have more users when including deleted
        # Verify there are some deleted users in the response
        deleted_users = [u for u in users if u.get("is_deleted") == True]
        non_deleted_users = [u for u in users if u.get("is_deleted") != True]
        
        assert len(deleted_users) > 0, "Expected at least 1 deleted user when include_deleted=true"
        assert len(users) == len(deleted_users) + len(non_deleted_users)
    
    def test_include_deleted_false_same_as_default(self):
        """GET /api/admin/users?include_deleted=false should behave same as no parameter"""
        # Get default response (no parameter)
        response_default = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        
        # Get response with include_deleted=false
        response_explicit = requests.get(
            f"{BASE_URL}/api/admin/users?include_deleted=false",
            headers=self.headers
        )
        
        assert response_default.status_code == 200
        assert response_explicit.status_code == 200
        
        # Both should return same count
        assert len(response_default.json()) == len(response_explicit.json())
    
    def test_users_count_difference_with_toggle(self):
        """Include deleted toggle should show more users"""
        # Without include_deleted
        response_without = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        
        # With include_deleted=true
        response_with = requests.get(
            f"{BASE_URL}/api/admin/users?include_deleted=true",
            headers=self.headers
        )
        
        assert response_without.status_code == 200
        assert response_with.status_code == 200
        
        count_without = len(response_without.json())
        count_with = len(response_with.json())
        
        # With deleted should be >= without (could be equal if no deleted users)
        assert count_with >= count_without, f"Expected include_deleted count ({count_with}) >= filtered count ({count_without})"
        
        # In our test data, we know there are deleted users
        assert count_with > count_without, f"Expected more users when including deleted. Without: {count_without}, With: {count_with}"
    
    # ============ DATA INTEGRITY TESTS ============
    
    def test_deleted_users_have_required_fields(self):
        """Deleted users should have proper is_deleted and deleted_at fields"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users?include_deleted=true",
            headers=self.headers
        )
        assert response.status_code == 200
        
        deleted_users = [u for u in response.json() if u.get("is_deleted") == True]
        
        for user in deleted_users:
            # All deleted users should have is_deleted=True
            assert user.get("is_deleted") == True
            # Deleted users should have core user fields
            assert "id" in user
            assert "email" in user
            assert "name" in user
    
    def test_user_response_structure_includes_summary_data(self):
        """User response should include summary fields (total_orders, cart_items)"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers=self.headers
        )
        assert response.status_code == 200
        users = response.json()
        
        if len(users) > 0:
            user = users[0]
            # Backend adds these summary fields
            assert "total_orders" in user, "Expected total_orders field in user response"
            assert "cart_items" in user, "Expected cart_items field in user response"
    
    # ============ AUTHENTICATION TESTS ============
    
    def test_unauthenticated_request_fails(self):
        """Request without auth token should fail with 403"""
        response = requests.get(f"{BASE_URL}/api/admin/users")
        assert response.status_code == 403, f"Expected 403 for unauthenticated request, got {response.status_code}"
    
    def test_invalid_token_fails(self):
        """Request with invalid token should fail with 401"""
        response = requests.get(
            f"{BASE_URL}/api/admin/users",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        assert response.status_code == 401, f"Expected 401 for invalid token, got {response.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

"""
Admin Per-User Override Tests
Tests the admin-controlled per-user override that grants threshold-gated access
(Humble Beginnings + Name Your Price unlock) without requiring purchases.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://pending-invoice-flow.preview.emergentagent.com')

# Test credentials
ADMIN_USERNAME = "postvibe"
ADMIN_PASSWORD = "adm1npa$$word"
TEST_USER_EMAIL = "override_test@example.com"
TEST_USER_PASSWORD = "Test1234"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/admin/login", json={
        "username": ADMIN_USERNAME,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def test_user_id(admin_token):
    """Get the test user's ID"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
    assert response.status_code == 200
    users = response.json()
    
    for user in users:
        if user.get("email") == TEST_USER_EMAIL:
            return user["id"]
    
    pytest.fail(f"Test user {TEST_USER_EMAIL} not found")


@pytest.fixture(scope="module")
def user_token():
    """Get test user auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD
    })
    assert response.status_code == 200, f"User login failed: {response.text}"
    return response.json()["access_token"]


class TestAdminOverrideBackend:
    """Backend tests for admin override feature"""
    
    # ==========================================================================
    # Test 1: PATCH /api/admin/users/{user_id}/entitlements with override_enabled=true
    # ==========================================================================
    def test_enable_override_with_note(self, admin_token, test_user_id):
        """Test 1: Admin can enable override with optional note"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user_id}/entitlements",
            json={"override_enabled": True, "note": "VIP"},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to enable override: {response.text}"
        data = response.json()
        
        # Verify response
        assert data["id"] == test_user_id
        assert data["override_enabled"] == True
        assert data["nyp_override_note"] == "VIP"
        assert "nyp_override_set_at" in data
        
        print(f"✓ PASS: Override enabled with note 'VIP' for user {test_user_id}")
    
    # ==========================================================================
    # Test 2: GET /api/users/me/entitlements returns unlocked state when override ON
    # ==========================================================================
    def test_user_entitlements_when_override_on(self, user_token):
        """Test 2: User entitlements show unlocked when override is ON"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/users/me/entitlements",
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to get entitlements: {response.text}"
        data = response.json()
        
        # Verify unlocked state
        assert data["unlocked_nyp"] == True, f"Expected unlocked_nyp=True, got {data['unlocked_nyp']}"
        assert data["override_enabled"] == True, f"Expected override_enabled=True, got {data['override_enabled']}"
        assert data["spend_to_unlock"] == 0, f"Expected spend_to_unlock=0, got {data['spend_to_unlock']}"
        
        print(f"✓ PASS: User entitlements show unlocked_nyp=true, override_enabled=true, spend_to_unlock=0")
    
    # ==========================================================================
    # Test 3: PATCH with override_enabled=false reverts to spend-based gating
    # ==========================================================================
    def test_disable_override(self, admin_token, test_user_id):
        """Test 3: Admin can disable override, reverting to spend-based gating"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user_id}/entitlements",
            json={"override_enabled": False},
            headers=headers
        )
        
        assert response.status_code == 200, f"Failed to disable override: {response.text}"
        data = response.json()
        
        # Verify override disabled
        assert data["override_enabled"] == False
        # Note should be cleared when disabling
        assert data["nyp_override_note"] is None
        
        print(f"✓ PASS: Override disabled for user {test_user_id}")
    
    # ==========================================================================
    # Test 4: User entitlements show locked when override is OFF (0 spend)
    # ==========================================================================
    def test_user_entitlements_when_override_off(self, user_token):
        """Test 4: User entitlements show locked when override is OFF"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = requests.get(
            f"{BASE_URL}/api/users/me/entitlements",
            headers=headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # User has $0 spend, so without override should be locked
        assert data["unlocked_nyp"] == False, f"Expected unlocked_nyp=False, got {data['unlocked_nyp']}"
        assert data["override_enabled"] == False, f"Expected override_enabled=False, got {data['override_enabled']}"
        # spend_to_unlock should be threshold (1000) minus 0 = 1000
        assert data["spend_to_unlock"] > 0, f"Expected spend_to_unlock > 0, got {data['spend_to_unlock']}"
        
        print(f"✓ PASS: User entitlements show unlocked_nyp=false, override_enabled=false for $0 spend user")
    
    # ==========================================================================
    # Test 5: Override persists across requests (not session-only)
    # ==========================================================================
    def test_override_persistence(self, admin_token, test_user_id, user_token):
        """Test 5: Override persists in MongoDB user record"""
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        user_headers = {"Authorization": f"Bearer {user_token}"}
        
        # Enable override
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user_id}/entitlements",
            json={"override_enabled": True, "note": "Persistence Test"},
            headers=admin_headers
        )
        assert response.status_code == 200
        
        # First check - user entitlements
        response = requests.get(f"{BASE_URL}/api/users/me/entitlements", headers=user_headers)
        assert response.status_code == 200
        data1 = response.json()
        assert data1["unlocked_nyp"] == True
        assert data1["override_enabled"] == True
        
        # Second check - still persisted
        response = requests.get(f"{BASE_URL}/api/users/me/entitlements", headers=user_headers)
        assert response.status_code == 200
        data2 = response.json()
        assert data2["unlocked_nyp"] == True
        assert data2["override_enabled"] == True
        
        # Verify in admin users list (shows nyp_override_enabled field)
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200
        users = response.json()
        test_user = next((u for u in users if u["id"] == test_user_id), None)
        assert test_user is not None
        assert test_user.get("nyp_override_enabled") == True
        assert test_user.get("nyp_override_note") == "Persistence Test"
        
        print(f"✓ PASS: Override persists across multiple requests and shows in admin users list")
        
        # Cleanup - disable override for further tests
        requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user_id}/entitlements",
            json={"override_enabled": False},
            headers=admin_headers
        )
    
    # ==========================================================================
    # Test 6: Admin users list shows nyp_override_enabled and nyp_override_note
    # ==========================================================================
    def test_admin_users_includes_override_fields(self, admin_token, test_user_id):
        """Test 6: Admin GET users returns override fields"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Enable override with note
        requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user_id}/entitlements",
            json={"override_enabled": True, "note": "Admin View Test"},
            headers=headers
        )
        
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=headers)
        assert response.status_code == 200
        
        users = response.json()
        test_user = next((u for u in users if u["id"] == test_user_id), None)
        assert test_user is not None
        
        # Verify override fields are included
        assert "nyp_override_enabled" in test_user
        assert "nyp_override_note" in test_user
        assert test_user["nyp_override_enabled"] == True
        assert test_user["nyp_override_note"] == "Admin View Test"
        
        print(f"✓ PASS: Admin users list includes nyp_override_enabled and nyp_override_note fields")
    
    # ==========================================================================
    # Test 7: Unauthenticated access to admin override is forbidden
    # ==========================================================================
    def test_unauthenticated_override_fails(self, test_user_id):
        """Test 7: Override endpoint requires admin auth"""
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user_id}/entitlements",
            json={"override_enabled": True}
        )
        
        # Should return 403 (Forbidden) - no auth header
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print(f"✓ PASS: Unauthenticated request to override endpoint returns 403")
    
    # ==========================================================================
    # Test 8: Non-admin user cannot access override endpoint
    # ==========================================================================
    def test_non_admin_override_fails(self, user_token, test_user_id):
        """Test 8: Regular user cannot use admin override endpoint"""
        headers = {"Authorization": f"Bearer {user_token}"}
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user_id}/entitlements",
            json={"override_enabled": True},
            headers=headers
        )
        
        # Should return 403 (Forbidden) - not admin
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        
        print(f"✓ PASS: Non-admin user request to override endpoint returns 403")


class TestOverrideCleanup:
    """Cleanup after tests - leave override OFF"""
    
    def test_cleanup_disable_override(self, admin_token, test_user_id):
        """Cleanup: Disable override for test user"""
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        response = requests.patch(
            f"{BASE_URL}/api/admin/users/{test_user_id}/entitlements",
            json={"override_enabled": False},
            headers=headers
        )
        assert response.status_code == 200
        
        print(f"✓ CLEANUP: Override disabled for test user")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

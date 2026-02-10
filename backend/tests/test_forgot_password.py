"""
Forgot Password Feature Tests
=============================
Tests for the password reset/forgot password flow:
- POST /api/auth/forgot-password endpoint
- Valid email returns generic success (security best practice)
- Invalid/missing email returns appropriate errors
- Email delivery is MOCKED (not actually sent)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestForgotPasswordEndpoint:
    """Tests for POST /api/auth/forgot-password"""
    
    def test_forgot_password_with_valid_email_format(self):
        """Test forgot password with valid email format returns generic success"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "test@example.com"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200 regardless of whether email exists (security)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        # Verify generic message (no user enumeration)
        assert "if an account" in data["message"].lower() or "password reset" in data["message"].lower()
    
    def test_forgot_password_with_nonexistent_email(self):
        """Test forgot password with non-existent email also returns generic success"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "nonexistent_user_12345@example.com"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 200 even for non-existent email (no enumeration)
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
    
    def test_forgot_password_missing_email_field(self):
        """Test forgot password without email field returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 422 Unprocessable Entity
        assert response.status_code == 422
        
        data = response.json()
        assert "detail" in data
        # Check that error mentions missing email field
        error_detail = str(data["detail"])
        assert "email" in error_detail.lower()
    
    def test_forgot_password_invalid_email_format(self):
        """Test forgot password with invalid email format returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": "not-an-email"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 422 Unprocessable Entity
        assert response.status_code == 422
        
        data = response.json()
        assert "detail" in data
        # Check that error mentions invalid email
        error_detail = str(data["detail"])
        assert "email" in error_detail.lower() or "valid" in error_detail.lower()
    
    def test_forgot_password_empty_email(self):
        """Test forgot password with empty email string returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": ""},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 422 Unprocessable Entity
        assert response.status_code == 422
    
    def test_forgot_password_idempotent(self):
        """Test calling forgot password multiple times with same email is safe"""
        email = "test_idempotent@example.com"
        
        # Call twice
        response1 = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": email},
            headers={"Content-Type": "application/json"}
        )
        response2 = requests.post(
            f"{BASE_URL}/api/auth/forgot-password",
            json={"email": email},
            headers={"Content-Type": "application/json"}
        )
        
        # Both should succeed
        assert response1.status_code == 200
        assert response2.status_code == 200
        
        # Both should return same generic message
        data1 = response1.json()
        data2 = response2.json()
        assert data1["message"] == data2["message"]


class TestResetPasswordEndpoint:
    """Tests for POST /api/auth/reset-password"""
    
    def test_reset_password_invalid_token(self):
        """Test reset password with invalid token returns error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": "invalid_token_12345", "new_password": "newpassword123"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 Bad Request for invalid token
        assert response.status_code == 400
        
        data = response.json()
        assert "detail" in data
        assert "invalid" in data["detail"].lower() or "expired" in data["detail"].lower()
    
    def test_reset_password_missing_token(self):
        """Test reset password without token returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"new_password": "newpassword123"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 422 Unprocessable Entity
        assert response.status_code == 422
    
    def test_reset_password_missing_password(self):
        """Test reset password without password returns validation error"""
        response = requests.post(
            f"{BASE_URL}/api/auth/reset-password",
            json={"token": "some_token"},
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 422 Unprocessable Entity
        assert response.status_code == 422


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

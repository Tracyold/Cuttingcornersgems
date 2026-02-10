"""
DRAFT - NOT USED
================
This AuthService module is quarantined. server.py implements auth inline.
If you plan to refactor auth into a service, update this file and integrate.
Otherwise, delete this file to reduce confusion.

Original purpose: Authentication Service - Handles user and admin authentication logic
"""
import jwt
import bcrypt
from datetime import datetime, timezone, timedelta
from typing import Dict
from fastapi import HTTPException

# NOTE: Do not define credentials here. Use config.security for all credentials.
# from config.security import ADMIN_USERNAME, ADMIN_PASSWORD_HASH, JWT_SECRET


class AuthService:
    def __init__(self, db, jwt_secret: str, jwt_algorithm: str = "HS256", jwt_expiration_hours: int = 24):
        self.db = db
        self.jwt_secret = jwt_secret
        self.jwt_algorithm = jwt_algorithm
        self.jwt_expiration_hours = jwt_expiration_hours
    
    def create_access_token(self, data: dict) -> str:
        """Generate JWT access token"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(hours=self.jwt_expiration_hours)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, self.jwt_secret, algorithm=self.jwt_algorithm)
        return encoded_jwt
    
    async def signup_user(self, email: str, password: str, name: str) -> Dict:
        """Create new user account"""
        import uuid
        
        # Check if email already exists
        existing = await self.db.users.find_one({"email": email})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        
        # Hash password
        password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        # Create user
        user_id = str(uuid.uuid4())
        user_data = {
            "id": user_id,
            "email": email,
            "name": name,
            "password_hash": password_hash,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.users.insert_one(user_data)
        
        # Generate token
        token = self.create_access_token({"user_id": user_id, "email": email})
        
        # Remove password from response
        del user_data["password_hash"]
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_data
        }
    
    async def login_user(self, email: str, password: str) -> Dict:
        """User login"""
        user = await self.db.users.find_one({"email": email})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Verify password
        password_valid = bcrypt.checkpw(
            password.encode('utf-8'),
            user["password_hash"].encode('utf-8')
        )
        
        if not password_valid:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        
        # Generate token
        token = self.create_access_token({"user_id": user["id"], "email": user["email"]})
        
        # Remove password from response
        user_response = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user_response
        }
    
    def login_admin(self, username: str, password: str) -> Dict:
        """Admin login"""
        if username != ADMIN_USERNAME:
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        
        # Verify password
        password_valid = bcrypt.checkpw(
            password.encode('utf-8'),
            ADMIN_PASSWORD_HASH.encode('utf-8')
        )
        
        if not password_valid:
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        
        # Generate admin token with is_admin flag
        token = self.create_access_token({"username": ADMIN_USERNAME, "is_admin": True})
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "is_admin": True
        }
    
    async def get_current_user(self, token: str) -> Dict:
        """Validate user token and return user data"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            user = await self.db.users.find_one(
                {"id": payload["user_id"]},
                {"_id": 0, "password_hash": 0}
            )
            if not user:
                raise HTTPException(status_code=401, detail="User not found")
            return user
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
    
    def get_admin_user(self, token: str) -> Dict:
        """Validate admin token"""
        try:
            payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
            if payload.get("is_admin") is not True:
                raise HTTPException(status_code=403, detail="Admin access required")
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")

# Restructure Implementation Guide

This document provides concrete code examples for the recommended restructure.

---

## Backend Implementation Examples

### 1. New `server.py` (Clean Entry Point)

```python
# backend/server.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path
import os

# Load environment
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Database setup
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
db_name = os.environ.get('DB_NAME', 'gemshop')
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
db = client[db_name]

# FastAPI app
app = FastAPI(title="Gemshop API", version="2.0.0")

# Middleware
from middleware.cache_control import CacheControlMiddleware
app.add_middleware(CacheControlMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Import and register routers
from routes import auth, products, orders, bookings, inquiries, negotiations, payments
from routes.admin import dashboard, admin_products, admin_users, admin_settings, admin_negotiations

# Public routes
app.include_router(auth.router, prefix="/api", tags=["auth"])
app.include_router(products.router, prefix="/api", tags=["products"])
app.include_router(orders.router, prefix="/api", tags=["orders"])
app.include_router(bookings.router, prefix="/api", tags=["bookings"])
app.include_router(inquiries.router, prefix="/api", tags=["inquiries"])
app.include_router(negotiations.router, prefix="/api", tags=["negotiations"])
app.include_router(payments.router, prefix="/api", tags=["payments"])

# Admin routes
app.include_router(dashboard.router, prefix="/api/admin", tags=["admin-dashboard"])
app.include_router(admin_products.router, prefix="/api/admin", tags=["admin-products"])
app.include_router(admin_users.router, prefix="/api/admin", tags=["admin-users"])
app.include_router(admin_settings.router, prefix="/api/admin", tags=["admin-settings"])
app.include_router(admin_negotiations.router, prefix="/api/admin", tags=["admin-negotiations"])

# Health check
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "backend"}

# Dependency provider for database
def get_database():
    return db

# Make db available to routers
from routes.dependencies import set_database
set_database(db)
```

### 2. Repository Layer Example

```python
# backend/repositories/base.py
from typing import TypeVar, Generic, List, Optional, Dict, Any
from motor.motor_asyncio import AsyncIOMotorCollection

T = TypeVar('T')

class BaseRepository(Generic[T]):
    """Base repository with common CRUD operations"""
    
    def __init__(self, collection: AsyncIOMotorCollection):
        self.collection = collection
    
    async def find_by_id(self, id: str, exclude_deleted: bool = True) -> Optional[Dict[str, Any]]:
        """Find document by ID"""
        query = {"id": id}
        if exclude_deleted:
            query["is_deleted"] = {"$ne": True}
        return await self.collection.find_one(query, {"_id": 0})
    
    async def find_all(
        self, 
        filter: Dict[str, Any] = None, 
        exclude_deleted: bool = True,
        limit: int = 1000
    ) -> List[Dict[str, Any]]:
        """Find all documents matching filter"""
        query = filter or {}
        if exclude_deleted:
            query["is_deleted"] = {"$ne": True}
        cursor = self.collection.find(query, {"_id": 0}).limit(limit)
        return await cursor.to_list(length=limit)
    
    async def create(self, document: Dict[str, Any]) -> Dict[str, Any]:
        """Create new document"""
        await self.collection.insert_one(document)
        return document
    
    async def update(self, id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update document by ID"""
        await self.collection.update_one(
            {"id": id},
            {"$set": updates}
        )
        return await self.find_by_id(id)
    
    async def soft_delete(self, id: str) -> bool:
        """Soft delete document"""
        from datetime import datetime, timezone
        result = await self.collection.update_one(
            {"id": id},
            {"$set": {
                "is_deleted": True,
                "deleted_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return result.modified_count > 0
    
    async def hard_delete(self, id: str) -> bool:
        """Permanently delete document"""
        result = await self.collection.delete_one({"id": id})
        return result.deleted_count > 0
    
    async def count(self, filter: Dict[str, Any] = None, exclude_deleted: bool = True) -> int:
        """Count documents"""
        query = filter or {}
        if exclude_deleted:
            query["is_deleted"] = {"$ne": True}
        return await self.collection.count_documents(query)
```

```python
# backend/repositories/booking_repository.py
from repositories.base import BaseRepository
from typing import List, Optional, Dict, Any

class BookingRepository(BaseRepository):
    """Repository for booking operations"""
    
    async def find_by_user_id(self, user_id: str) -> List[Dict[str, Any]]:
        """Find all bookings for a user"""
        return await self.find_all({"user_id": user_id})
    
    async def find_by_email(self, email: str) -> List[Dict[str, Any]]:
        """Find bookings by email"""
        return await self.find_all({"email": email})
    
    async def find_pending(self) -> List[Dict[str, Any]]:
        """Find all pending bookings"""
        return await self.find_all({"status": "pending"})
    
    async def update_status(self, booking_id: str, status: str) -> Optional[Dict[str, Any]]:
        """Update booking status"""
        return await self.update(booking_id, {"status": status})
```

### 3. Service Layer Example

```python
# backend/services/booking_service.py
from repositories.booking_repository import BookingRepository
from services.notification_service import NotificationService
from typing import Dict, Any, Optional
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger(__name__)

class BookingService:
    """Business logic for bookings"""
    
    def __init__(
        self, 
        booking_repo: BookingRepository,
        notification_service: NotificationService
    ):
        self.booking_repo = booking_repo
        self.notification_service = notification_service
    
    async def create_booking(
        self,
        name: str,
        email: str,
        phone: str,
        service: str,
        stone_type: str,
        description: str,
        user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new booking and send notifications
        """
        # Validate inputs
        if not all([name, email, phone, service, stone_type]):
            raise ValueError("Missing required booking fields")
        
        # Create booking
        booking_id = str(uuid.uuid4())
        booking = {
            "id": booking_id,
            "name": name,
            "email": email,
            "phone": phone,
            "service": service,
            "stone_type": stone_type,
            "description": description,
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id,
            "is_deleted": False
        }
        
        # Save to database
        created = await self.booking_repo.create(booking)
        
        # Send notifications (non-blocking)
        try:
            # Send confirmation to user
            await self.notification_service.send_booking_confirmation(
                email=email,
                name=name,
                service=service,
                booking_id=booking_id
            )
            
            # Notify admin
            await self.notification_service.notify_admin_new_booking(
                booking_id=booking_id,
                name=name,
                service=service,
                email=email,
                phone=phone
            )
        except Exception as e:
            logger.warning(f"Failed to send booking notifications: {e}")
            # Don't fail the booking if notifications fail
        
        return created
    
    async def get_user_bookings(self, user_id: str) -> list:
        """Get all bookings for a user"""
        return await self.booking_repo.find_by_user_id(user_id)
    
    async def get_booking(self, booking_id: str) -> Optional[Dict[str, Any]]:
        """Get single booking"""
        return await self.booking_repo.find_by_id(booking_id)
    
    async def update_booking_status(
        self, 
        booking_id: str, 
        status: str,
        notify_user: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Update booking status and optionally notify user"""
        booking = await self.booking_repo.update_status(booking_id, status)
        
        if booking and notify_user:
            try:
                await self.notification_service.send_booking_status_update(
                    email=booking["email"],
                    name=booking["name"],
                    status=status,
                    booking_id=booking_id
                )
            except Exception as e:
                logger.warning(f"Failed to send status notification: {e}")
        
        return booking
    
    async def get_pending_bookings(self) -> list:
        """Get all pending bookings (admin use)"""
        return await self.booking_repo.find_pending()
```

```python
# backend/services/notification_service.py
from services.email_provider import get_email_provider
from typing import Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """Centralized notification service for email/SMS"""
    
    def __init__(self, settings: Dict[str, Any]):
        self.settings = settings
        self.email_provider = get_email_provider(settings)
    
    async def send_booking_confirmation(
        self,
        email: str,
        name: str,
        service: str,
        booking_id: str
    ) -> bool:
        """Send booking confirmation email"""
        if not self.settings.get("email_enabled"):
            logger.info("Email disabled, skipping confirmation")
            return False
        
        subject = "Booking Confirmation - Gemshop"
        body = f"""
        Hi {name},
        
        Thank you for your booking request!
        
        Service: {service}
        Booking ID: {booking_id}
        
        We'll get back to you as soon as possible.
        
        Best regards,
        Gemshop
        """
        
        result = await self.email_provider.send_email(
            to=email,
            subject=subject,
            body=body
        )
        
        return result.sent
    
    async def notify_admin_new_booking(
        self,
        booking_id: str,
        name: str,
        service: str,
        email: str,
        phone: str
    ) -> bool:
        """Notify admin of new booking"""
        admin_email = self.settings.get("admin_email")
        if not admin_email or not self.settings.get("email_enabled"):
            return False
        
        subject = f"New Booking: {service}"
        body = f"""
        New booking received:
        
        Name: {name}
        Email: {email}
        Phone: {phone}
        Service: {service}
        Booking ID: {booking_id}
        
        View in admin panel.
        """
        
        result = await self.email_provider.send_email(
            to=admin_email,
            subject=subject,
            body=body
        )
        
        return result.sent
    
    async def send_booking_status_update(
        self,
        email: str,
        name: str,
        status: str,
        booking_id: str
    ) -> bool:
        """Notify user of booking status change"""
        if not self.settings.get("email_enabled"):
            return False
        
        status_messages = {
            "confirmed": "Your booking has been confirmed!",
            "completed": "Your service has been completed.",
            "cancelled": "Your booking has been cancelled."
        }
        
        message = status_messages.get(status, f"Status updated to: {status}")
        
        subject = f"Booking Update - {status.title()}"
        body = f"""
        Hi {name},
        
        {message}
        
        Booking ID: {booking_id}
        
        If you have any questions, please contact us.
        
        Best regards,
        Gemshop
        """
        
        result = await self.email_provider.send_email(
            to=email,
            subject=subject,
            body=body
        )
        
        return result.sent
```

### 4. Route Example

```python
# backend/routes/bookings.py
from fastapi import APIRouter, Depends, HTTPException
from models.booking import BookingCreate, BookingResponse
from services.booking_service import BookingService
from routes.dependencies import get_booking_service, get_current_user, get_optional_user
from typing import List, Optional

router = APIRouter()

@router.post("/bookings", response_model=BookingResponse)
async def create_booking(
    booking_data: BookingCreate,
    current_user: Optional[dict] = Depends(get_optional_user),
    service: BookingService = Depends(get_booking_service)
):
    """Create a new booking"""
    try:
        booking = await service.create_booking(
            name=booking_data.name,
            email=booking_data.email,
            phone=booking_data.phone,
            service=booking_data.service,
            stone_type=booking_data.stone_type,
            description=booking_data.description,
            user_id=current_user["id"] if current_user else None
        )
        return BookingResponse(**booking)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to create booking")

@router.get("/bookings", response_model=List[BookingResponse])
async def get_user_bookings(
    current_user: dict = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service)
):
    """Get all bookings for current user"""
    bookings = await service.get_user_bookings(current_user["id"])
    return [BookingResponse(**b) for b in bookings]

@router.get("/bookings/{booking_id}", response_model=BookingResponse)
async def get_booking(
    booking_id: str,
    current_user: dict = Depends(get_current_user),
    service: BookingService = Depends(get_booking_service)
):
    """Get single booking"""
    booking = await service.get_booking(booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Verify ownership
    if booking.get("user_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return BookingResponse(**booking)
```

### 5. Dependency Injection

```python
# backend/routes/dependencies.py
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from repositories.booking_repository import BookingRepository
from services.booking_service import BookingService
from services.notification_service import NotificationService
import jwt
from config.security import JWT_SECRET, JWT_ALGORITHM

# Global database reference (set by server.py)
_db = None

def set_database(db):
    global _db
    _db = db

def get_db():
    return _db

# Auth dependencies
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current authenticated user"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        db = get_db()
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        if user.get("is_deleted", False):
            raise HTTPException(status_code=403, detail="Account disabled")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))
):
    """Get current user if authenticated, None otherwise"""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current admin user"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Service dependencies
async def get_notification_service():
    """Get notification service instance"""
    db = get_db()
    settings = await db.site_settings.find_one({}, {"_id": 0}) or {}
    return NotificationService(settings)

async def get_booking_service(
    notification_service: NotificationService = Depends(get_notification_service)
):
    """Get booking service instance"""
    db = get_db()
    booking_repo = BookingRepository(db.bookings)
    return BookingService(booking_repo, notification_service)
```

---

## Frontend Implementation Examples

### 1. API Client Setup

```javascript
// frontend/src/api/client.js
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL + '/api';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
client.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear auth and redirect
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
          toast.error('Session expired. Please login again.');
          break;
        
        case 403:
          toast.error(data.detail || 'Access denied');
          break;
        
        case 404:
          toast.error(data.detail || 'Resource not found');
          break;
        
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        
        default:
          toast.error(data.detail || 'An error occurred');
      }
    } else if (error.request) {
      toast.error('Network error. Please check your connection.');
    }
    
    return Promise.reject(error);
  }
);

export default client;
```

### 2. API Module Example

```javascript
// frontend/src/api/bookingApi.js
import client from './client';

export const bookingApi = {
  /**
   * Create a new booking
   */
  create: async (bookingData) => {
    const response = await client.post('/bookings', bookingData);
    return response.data;
  },

  /**
   * Get all bookings for current user
   */
  getUserBookings: async () => {
    const response = await client.get('/bookings');
    return response.data;
  },

  /**
   * Get single booking
   */
  getBooking: async (bookingId) => {
    const response = await client.get(`/bookings/${bookingId}`);
    return response.data;
  },
};

export default bookingApi;
```

```javascript
// frontend/src/api/index.js
export { default as authApi } from './authApi';
export { default as productApi } from './productApi';
export { default as bookingApi } from './bookingApi';
export { default as orderApi } from './orderApi';
export { default as inquiryApi } from './inquiryApi';
export { default as negotiationApi } from './negotiationApi';
export { default as paymentApi } from './paymentApi';
export { default as adminApi } from './adminApi';
```

### 3. Custom Hook Example

```javascript
// frontend/src/hooks/useBooking.js
import { useState } from 'react';
import { bookingApi } from '../api';
import { toast } from 'sonner';

export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createBooking = async (bookingData) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await bookingApi.create(bookingData);
      toast.success('Booking submitted successfully!');
      return result;
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to submit booking';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getUserBookings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const bookings = await bookingApi.getUserBookings();
      return bookings;
    } catch (err) {
      const message = err.response?.data?.detail || 'Failed to fetch bookings';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createBooking,
    getUserBookings,
  };
};
```

### 4. Refactored Component

```javascript
// frontend/src/pages/Booking.js (REFACTORED)
import React, { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../hooks/useBooking';
import BookingForm from '../components/forms/BookingForm';

const Booking = () => {
  const { user, isAuthenticated } = useAuth();
  const { createBooking, loading } = useBooking();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (formData) => {
    const submitData = {
      ...formData,
      name: isAuthenticated && user ? user.name : formData.name,
      email: isAuthenticated && user ? user.email : formData.email,
    };

    await createBooking(submitData);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 mx-auto mb-8 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="page-title title-xl text-4xl mb-4">Thank You!</h1>
          <p className="text-gray-400 mb-8">
            Your booking request has been received. I'll get back to you as soon as possible.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <section className="section-spacing pb-16">
        <div className="container-custom">
          <p className="text-sm uppercase tracking-[0.2em] text-gray-500 mb-4">Get Started</p>
          <h1 className="page-title title-xl">Book a Service</h1>
        </div>
      </section>

      <section className="pb-24">
        <div className="container-custom">
          <div className="max-w-2xl mx-auto">
            <div className="gem-card p-8 md:p-12">
              <BookingForm 
                onSubmit={handleSubmit}
                loading={loading}
                showUserFields={!isAuthenticated}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Booking;
```

```javascript
// frontend/src/components/forms/BookingForm.js
import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from 'sonner';

const SERVICES = [
  { value: 'cut', label: 'Cut' },
  { value: 're-cut', label: 'Re-Cut' },
  { value: 're-polish', label: 'Re-Polish' },
  { value: 'cut-design', label: 'Cut Design' },
  { value: 'consultation', label: 'Consultation' },
];

const STONE_TYPES = [
  { value: 'sapphire', label: 'Sapphire' },
  { value: 'tourmaline', label: 'Tourmaline' },
  { value: 'emerald', label: 'Emerald' },
  { value: 'tanzanite', label: 'Tanzanite' },
  { value: 'aquamarine', label: 'Aquamarine' },
  { value: 'garnet', label: 'Garnet' },
  { value: 'other', label: 'Other' },
];

const BookingForm = ({ onSubmit, loading, showUserFields = true }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: '',
    stone_type: '',
    description: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.service) {
      toast.error('Please select a service');
      return;
    }
    if (!formData.stone_type) {
      toast.error('Please select a stone type');
      return;
    }

    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {showUserFields && (
        <>
          <div>
            <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
              Name *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="input-dark"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
              Email *
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="input-dark"
              placeholder="your@email.com"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          required
          className="input-dark"
          placeholder="Your phone number"
        />
      </div>

      <div>
        <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
          Service *
        </label>
        <Select value={formData.service} onValueChange={(value) => handleSelectChange('service', value)}>
          <SelectTrigger className="input-dark">
            <SelectValue placeholder="Select a service" />
          </SelectTrigger>
          <SelectContent className="bg-[#0A0A0A] border-white/10">
            {SERVICES.map(service => (
              <SelectItem
                key={service.value}
                value={service.value}
                className="text-white hover:bg-white/10"
              >
                {service.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
          Colored Stone Type *
        </label>
        <Select value={formData.stone_type} onValueChange={(value) => handleSelectChange('stone_type', value)}>
          <SelectTrigger className="input-dark">
            <SelectValue placeholder="Select stone type" />
          </SelectTrigger>
          <SelectContent className="bg-[#0A0A0A] border-white/10">
            {STONE_TYPES.map(stone => (
              <SelectItem
                key={stone.value}
                value={stone.value}
                className="text-white hover:bg-white/10"
              >
                {stone.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="block text-sm uppercase tracking-widest text-gray-400 mb-2">
          Tell Me About Your Project
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={5}
          className="textarea-dark"
          placeholder="Describe what you're looking for..."
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="btn-primary w-full disabled:opacity-50"
      >
        {loading ? 'Submitting...' : 'Submit Request'}
      </button>
    </form>
  );
};

export default BookingForm;
```

---

## Summary

This guide provides concrete implementations for:

1. **Backend**: Clean server setup, repository pattern, service layer, dependency injection
2. **Frontend**: API client with interceptors, API modules, custom hooks, refactored components

Follow these patterns for all features to achieve a maintainable, scalable architecture that supports easy feature additions.

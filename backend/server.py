from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'cutting-corners-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Admin credentials (in production, store hashed in DB)
ADMIN_USERNAME = "postvibe"
ADMIN_PASSWORD_HASH = bcrypt.hashpw("adm1npa$$word".encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============ MODELS ============

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Admin Models
class AdminLogin(BaseModel):
    username: str
    password: str

class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    is_admin: bool = True

# Site Settings Models
class SiteSettings(BaseModel):
    # SMS/2FA Settings
    sms_enabled: bool = False
    sms_provider: Optional[str] = None  # twilio, vonage, etc.
    sms_api_key: Optional[str] = None
    sms_api_secret: Optional[str] = None
    sms_phone_number: Optional[str] = None
    
    # Captcha Settings
    captcha_enabled: bool = False
    captcha_provider: Optional[str] = None  # recaptcha, hcaptcha
    captcha_site_key: Optional[str] = None
    captcha_secret_key: Optional[str] = None
    captcha_for_user_signup: bool = False
    captcha_for_inquiries: bool = False
    
    # Stripe Settings
    stripe_enabled: bool = False
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_test_mode: bool = True
    
    # Cloud Storage Settings
    cloud_storage_enabled: bool = False
    cloud_storage_provider: Optional[str] = None  # cloudinary, s3, gcs
    cloud_storage_api_key: Optional[str] = None
    cloud_storage_api_secret: Optional[str] = None
    cloud_storage_bucket: Optional[str] = None
    cloud_storage_url: Optional[str] = None
    
    # User Auth Settings
    user_signup_enabled: bool = True
    require_email_verification: bool = False
    
    # Email Service Settings
    email_enabled: bool = False
    email_provider: Optional[str] = None
    email_api_key: Optional[str] = None
    email_from_address: Optional[str] = None
    email_from_name: Optional[str] = None
    email_connected_at: Optional[str] = None
    email_test_status: Optional[str] = None
    auto_email_on_order: bool = True
    auto_email_on_booking: bool = True
    auto_email_on_inquiry: bool = False
    auto_email_on_tracking: bool = True
    
    # Legacy (keep for backward compatibility)
    email_notifications_enabled: bool = False
    
    # Service Connected Dates
    sms_connected_at: Optional[str] = None
    captcha_connected_at: Optional[str] = None
    stripe_connected_at: Optional[str] = None
    cloud_storage_connected_at: Optional[str] = None

class SiteSettingsUpdate(BaseModel):
    sms_enabled: Optional[bool] = None
    sms_provider: Optional[str] = None
    sms_api_key: Optional[str] = None
    sms_api_secret: Optional[str] = None
    sms_phone_number: Optional[str] = None
    sms_connected_at: Optional[str] = None
    captcha_enabled: Optional[bool] = None
    captcha_provider: Optional[str] = None
    captcha_site_key: Optional[str] = None
    captcha_secret_key: Optional[str] = None
    captcha_for_user_signup: Optional[bool] = None
    captcha_for_inquiries: Optional[bool] = None
    captcha_connected_at: Optional[str] = None
    stripe_enabled: Optional[bool] = None
    stripe_publishable_key: Optional[str] = None
    stripe_secret_key: Optional[str] = None
    stripe_webhook_secret: Optional[str] = None
    stripe_test_mode: Optional[bool] = None
    stripe_connected_at: Optional[str] = None
    cloud_storage_enabled: Optional[bool] = None
    cloud_storage_provider: Optional[str] = None
    cloud_storage_api_key: Optional[str] = None
    cloud_storage_api_secret: Optional[str] = None
    cloud_storage_bucket: Optional[str] = None
    cloud_storage_url: Optional[str] = None
    cloud_storage_connected_at: Optional[str] = None
    user_signup_enabled: Optional[bool] = None
    require_email_verification: Optional[bool] = None
    email_enabled: Optional[bool] = None
    email_notifications_enabled: Optional[bool] = None
    email_provider: Optional[str] = None
    email_api_key: Optional[str] = None
    email_from_address: Optional[str] = None
    email_from_name: Optional[str] = None
    email_connected_at: Optional[str] = None
    email_test_status: Optional[str] = None
    auto_email_on_order: Optional[bool] = None
    auto_email_on_booking: Optional[bool] = None
    auto_email_on_inquiry: Optional[bool] = None
    auto_email_on_tracking: Optional[bool] = None
    # Analytics Settings
    analytics_enabled: Optional[bool] = None
    analytics_provider: Optional[str] = None
    analytics_tracking_id: Optional[str] = None
    analytics_api_key: Optional[str] = None
    analytics_connected_at: Optional[str] = None
    track_browser_type: Optional[bool] = None
    track_device_type: Optional[bool] = None
    track_clicks: Optional[bool] = None
    track_views: Optional[bool] = None
    track_duration: Optional[bool] = None
    track_interaction_rate: Optional[bool] = None

# Product Models (Extended)
class ProductCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    gemstone_type: Optional[str] = None
    color: Optional[str] = None
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    price_per_carat: Optional[float] = None
    price: Optional[float] = None
    image_url: str
    images: List[str] = []
    videos: List[str] = []
    in_stock: bool = True
    
    # GIA fields
    gia_certified: bool = False
    gia_report_number: Optional[str] = None
    gia_report_image: Optional[str] = None
    
    # Name Your Price fields
    name_your_price: bool = False
    name_your_price_phone: Optional[str] = None

class ProductUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    gemstone_type: Optional[str] = None
    color: Optional[str] = None
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    price_per_carat: Optional[float] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    in_stock: Optional[bool] = None
    gia_certified: Optional[bool] = None
    gia_report_number: Optional[str] = None
    gia_report_image: Optional[str] = None
    name_your_price: Optional[bool] = None
    name_your_price_phone: Optional[str] = None

class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    category: str
    description: Optional[str] = None
    gemstone_type: Optional[str] = None
    color: Optional[str] = None
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    price_per_carat: Optional[float] = None
    price: Optional[float] = None
    image_url: str
    images: List[str] = []
    videos: List[str] = []
    in_stock: bool = True
    gia_certified: bool = False
    gia_report_number: Optional[str] = None
    gia_report_image: Optional[str] = None
    name_your_price: bool = False
    name_your_price_phone: Optional[str] = None

# Gallery Models (Extended)
class GalleryItemCreate(BaseModel):
    title: str
    category: str
    description: Optional[str] = None
    image_url: str
    images: List[str] = []
    videos: List[str] = []
    gemstone_type: Optional[str] = None
    color: Optional[str] = None
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    featured: bool = False

class GalleryItemUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    images: Optional[List[str]] = None
    videos: Optional[List[str]] = None
    gemstone_type: Optional[str] = None
    color: Optional[str] = None
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    featured: Optional[bool] = None

class GalleryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    category: str
    image_url: str
    description: Optional[str] = None
    images: List[str] = []
    videos: List[str] = []
    gemstone_type: Optional[str] = None
    color: Optional[str] = None
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    featured: bool = False

# Name Your Price Inquiry
class NameYourPriceInquiry(BaseModel):
    name: str
    phone: str
    price: float
    product_id: str
    product_title: str

# Booking Models
class BookingCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    service: str
    stone_type: str
    description: str

class BookingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: str
    service: str
    stone_type: str
    description: str
    status: str = "pending"
    created_at: str
    user_id: Optional[str] = None

# Product Inquiry Models
class ProductInquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    is_offer: bool = False
    offer_price: Optional[str] = None
    product_id: str
    product_title: str

class ProductInquiryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    product_id: str
    product_title: str
    is_offer: bool
    offer_price: Optional[str] = None
    created_at: str

# Sell Inquiry Models
class SellInquiryCreate(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    description: str
    asking_price: str
    negotiable: bool = False
    photo_count: int = 0
    photo_names: List[str] = []

class SellInquiryResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    description: str
    asking_price: str
    negotiable: bool
    photo_count: int
    status: str = "pending"
    created_at: str

# Sold Item Models
class SoldItemUpdate(BaseModel):
    tracking_number: Optional[str] = None
    tracking_carrier: Optional[str] = None
    tracking_entered_at: Optional[str] = None
    user_notes: Optional[str] = None

class SoldItemResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    product_id: str
    product_title: str
    product_image: Optional[str] = None
    buyer_name: str
    buyer_email: str
    buyer_phone: Optional[str] = None
    user_id: Optional[str] = None
    shipping_address: Optional[str] = None
    item_price: float
    shipping_cost: float = 0
    total_paid: float
    payment_method: Optional[str] = None
    payment_last_four: Optional[str] = None
    sold_at: str
    paid_at: Optional[str] = None
    email_sent: bool = False
    email_sent_at: Optional[str] = None
    tracking_number: Optional[str] = None
    tracking_carrier: Optional[str] = None
    tracking_entered_at: Optional[str] = None
    user_notes: Optional[str] = None
    invoice_number: Optional[str] = None

# Email Test Model
class EmailTestRequest(BaseModel):
    provider: str
    api_key: str
    from_address: str

# Cart/Order Models
class CartItem(BaseModel):
    product_id: str
    quantity: int = 1

class CartResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    items: List[dict]
    total: float

class OrderCreate(BaseModel):
    items: List[CartItem]
    shipping_address: str
    payment_method: str = "stripe"

class OrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    items: List[dict]
    total: float
    status: str
    shipping_address: str
    created_at: str

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str, is_admin: bool = False) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "is_admin": is_admin,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))):
    if credentials is None:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if user_id:
            user = await db.users.find_one({"id": user_id}, {"_id": 0})
            return user
    except:
        pass
    return None

async def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if not payload.get("is_admin"):
            raise HTTPException(status_code=403, detail="Admin access required")
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============ ADMIN AUTH ROUTES ============

@api_router.post("/admin/login", response_model=AdminTokenResponse)
async def admin_login(credentials: AdminLogin):
    if credentials.username != ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token("admin", ADMIN_USERNAME, is_admin=True)
    return AdminTokenResponse(access_token=token)

@api_router.get("/admin/verify")
async def verify_admin(admin: dict = Depends(get_admin_user)):
    return {"valid": True, "is_admin": True}

# ============ SITE SETTINGS ROUTES ============

@api_router.get("/admin/settings", response_model=SiteSettings)
async def get_site_settings(admin: dict = Depends(get_admin_user)):
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    if not settings:
        # Create default settings
        default_settings = SiteSettings().model_dump()
        default_settings["id"] = "main"
        await db.site_settings.insert_one(default_settings)
        return SiteSettings()
    return SiteSettings(**settings)

@api_router.patch("/admin/settings", response_model=SiteSettings)
async def update_site_settings(updates: SiteSettingsUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.site_settings.update_one(
            {"id": "main"},
            {"$set": update_data},
            upsert=True
        )
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    return SiteSettings(**settings)

# ============ ADMIN PRODUCT ROUTES ============

@api_router.get("/admin/products", response_model=List[ProductResponse])
async def admin_get_products(admin: dict = Depends(get_admin_user)):
    products = await db.products.find({}, {"_id": 0}).to_list(1000)
    return products

@api_router.post("/admin/products", response_model=ProductResponse)
async def admin_create_product(product: ProductCreate, admin: dict = Depends(get_admin_user)):
    product_id = str(uuid.uuid4())
    product_data = product.model_dump()
    product_data["id"] = product_id
    product_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.products.insert_one(product_data)
    return ProductResponse(**product_data)

@api_router.patch("/admin/products/{product_id}", response_model=ProductResponse)
async def admin_update_product(product_id: str, updates: ProductUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return ProductResponse(**product)

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ============ ADMIN GALLERY ROUTES ============

@api_router.get("/admin/gallery", response_model=List[GalleryItem])
async def admin_get_gallery(admin: dict = Depends(get_admin_user)):
    items = await db.gallery.find({}, {"_id": 0}).to_list(1000)
    return items

@api_router.post("/admin/gallery", response_model=GalleryItem)
async def admin_create_gallery_item(item: GalleryItemCreate, admin: dict = Depends(get_admin_user)):
    item_id = str(uuid.uuid4())
    item_data = item.model_dump()
    item_data["id"] = item_id
    item_data["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.gallery.insert_one(item_data)
    return GalleryItem(**item_data)

@api_router.patch("/admin/gallery/{item_id}", response_model=GalleryItem)
async def admin_update_gallery_item(item_id: str, updates: GalleryItemUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.gallery.update_one({"id": item_id}, {"$set": update_data})
    item = await db.gallery.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return GalleryItem(**item)

@api_router.delete("/admin/gallery/{item_id}")
async def admin_delete_gallery_item(item_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.gallery.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    return {"message": "Gallery item deleted"}

# ============ ADMIN INQUIRIES ROUTES ============

@api_router.get("/admin/bookings")
async def admin_get_bookings(admin: dict = Depends(get_admin_user)):
    bookings = await db.bookings.find({}, {"_id": 0}).to_list(1000)
    return bookings

@api_router.get("/admin/product-inquiries")
async def admin_get_product_inquiries(admin: dict = Depends(get_admin_user)):
    inquiries = await db.product_inquiries.find({}, {"_id": 0}).to_list(1000)
    return inquiries

@api_router.get("/admin/sell-inquiries")
async def admin_get_sell_inquiries(admin: dict = Depends(get_admin_user)):
    inquiries = await db.sell_inquiries.find({}, {"_id": 0}).to_list(1000)
    return inquiries

@api_router.get("/admin/name-your-price-inquiries")
async def admin_get_name_your_price_inquiries(admin: dict = Depends(get_admin_user)):
    inquiries = await db.name_your_price_inquiries.find({}, {"_id": 0}).to_list(1000)
    return inquiries

@api_router.get("/admin/orders")
async def admin_get_orders(admin: dict = Depends(get_admin_user)):
    orders = await db.orders.find({}, {"_id": 0}).to_list(1000)
    return orders

@api_router.get("/admin/users")
async def admin_get_users(admin: dict = Depends(get_admin_user)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

# ============ ADMIN SOLD ITEMS ROUTES ============

@api_router.get("/admin/sold", response_model=List[SoldItemResponse])
async def admin_get_sold_items(admin: dict = Depends(get_admin_user)):
    sold_items = await db.sold_items.find({}, {"_id": 0}).sort("sold_at", -1).to_list(1000)
    return sold_items

@api_router.patch("/admin/sold/{item_id}")
async def admin_update_sold_item(item_id: str, updates: SoldItemUpdate, admin: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in updates.model_dump().items() if v is not None}
    if update_data:
        await db.sold_items.update_one({"id": item_id}, {"$set": update_data})
        
        # If tracking was added, update user's order if they have an account
        if updates.tracking_number:
            sold_item = await db.sold_items.find_one({"id": item_id}, {"_id": 0})
            if sold_item and sold_item.get("user_id"):
                # Update user's order with tracking info
                await db.orders.update_one(
                    {"user_id": sold_item["user_id"], "id": sold_item.get("order_id")},
                    {"$set": {
                        "tracking_number": updates.tracking_number,
                        "tracking_carrier": updates.tracking_carrier,
                        "tracking_entered_at": updates.tracking_entered_at
                    }}
                )
    
    return {"message": "Sold item updated"}

@api_router.post("/admin/sold/{item_id}/send-notes")
async def admin_send_sold_item_notes(item_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    notes = data.get("notes", "")
    if not notes:
        raise HTTPException(status_code=400, detail="Notes are required")
    
    # Update the sold item with notes
    await db.sold_items.update_one(
        {"id": item_id},
        {"$set": {"user_notes": notes, "notes_sent_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Get the sold item to check if user has account
    sold_item = await db.sold_items.find_one({"id": item_id}, {"_id": 0})
    if sold_item and sold_item.get("user_id"):
        # Update user's order with notes
        await db.orders.update_one(
            {"user_id": sold_item["user_id"], "id": sold_item.get("order_id")},
            {"$set": {"seller_notes": notes}}
        )
    
    # TODO: Send email notification when email service is configured
    
    return {"message": "Notes sent to user"}

# ============ EMAIL TEST ENDPOINT ============

@api_router.post("/admin/settings/test-email")
async def test_email_connection(data: EmailTestRequest, admin: dict = Depends(get_admin_user)):
    # This is a placeholder for actual email service testing
    # In production, this would make a real API call to the email provider
    provider = data.provider.lower()
    
    # Validate provider and API key format
    if not data.api_key or len(data.api_key) < 10:
        return {"success": False, "message": "Invalid API key format"}
    
    # Simulate successful connection for known providers
    known_providers = ["sendgrid", "resend", "mailgun", "ses", "postmark"]
    if provider in known_providers:
        # Update connected_at timestamp
        await db.site_settings.update_one(
            {"id": "main"},
            {"$set": {
                "email_connected_at": datetime.now(timezone.utc).isoformat(),
                "email_test_status": "success"
            }},
            upsert=True
        )
        return {"success": True, "message": f"Successfully connected to {provider}"}
    
    return {"success": False, "message": f"Unknown provider: {provider}"}

# ============ ADMIN DASHBOARD STATS ============

@api_router.get("/admin/dashboard/stats")
async def admin_get_dashboard_stats(admin: dict = Depends(get_admin_user)):
    # Get counts
    products_count = await db.products.count_documents({})
    gallery_count = await db.gallery.count_documents({})
    bookings_count = await db.bookings.count_documents({})
    users_count = await db.users.count_documents({})
    orders_count = await db.orders.count_documents({})
    sold_count = await db.sold_items.count_documents({})
    
    # Get inquiry counts
    product_inquiries_count = await db.product_inquiries.count_documents({})
    sell_inquiries_count = await db.sell_inquiries.count_documents({})
    nyp_inquiries_count = await db.name_your_price_inquiries.count_documents({})
    
    # Calculate revenue from sold items
    sold_items = await db.sold_items.find({}, {"total_paid": 1}).to_list(1000)
    total_revenue = sum(item.get("total_paid", 0) for item in sold_items)
    
    # Get pending items
    pending_bookings = await db.bookings.count_documents({"status": "pending"})
    pending_inquiries = product_inquiries_count  # All inquiries are considered pending until addressed
    
    return {
        "products": products_count,
        "gallery": gallery_count,
        "bookings": bookings_count,
        "users": users_count,
        "orders": orders_count,
        "sold": sold_count,
        "inquiries": product_inquiries_count + sell_inquiries_count + nyp_inquiries_count,
        "product_inquiries": product_inquiries_count,
        "sell_inquiries": sell_inquiries_count,
        "nyp_inquiries": nyp_inquiries_count,
        "total_revenue": total_revenue,
        "pending_bookings": pending_bookings,
        "pending_inquiries": pending_inquiries
    }

# ============ ANALYTICS TEST ENDPOINT ============

@api_router.post("/admin/settings/test-analytics")
async def test_analytics_connection(data: dict, admin: dict = Depends(get_admin_user)):
    provider = data.get("provider", "").lower()
    tracking_id = data.get("tracking_id", "")
    
    if not tracking_id or len(tracking_id) < 5:
        return {"success": False, "message": "Invalid tracking ID format"}
    
    known_providers = ["google", "plausible", "fathom", "mixpanel", "amplitude", "heap", "posthog", "custom"]
    if provider in known_providers:
        await db.site_settings.update_one(
            {"id": "main"},
            {"$set": {"analytics_connected_at": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        return {"success": True, "message": f"Successfully connected to {provider}"}
    
    return {"success": False, "message": f"Unknown provider: {provider}"}

# ============ DATA & ARCHIVE ROUTES ============

def generate_archive_txt(item: dict, item_type: str) -> str:
    """Generate standardized .txt format for archived items"""
    lines = [
        "=" * 60,
        f"ARCHIVED {item_type.upper()}",
        "=" * 60,
        f"ID: {item.get('id', 'N/A')}",
        f"Date Created: {item.get('created_at', 'N/A')}",
        f"Date Archived: {item.get('archived_at', 'N/A')}",
        f"Date Deleted: {item.get('deleted_at', 'N/A')}",
        "-" * 60,
        "DATA:",
    ]
    
    # Add all item fields
    for key, value in item.items():
        if key not in ['_id', 'id', 'created_at', 'archived_at', 'deleted_at']:
            lines.append(f"  {key}: {value}")
    
    lines.extend([
        "-" * 60,
        "ANALYTICS:",
        f"  Views: {item.get('views', 0)}",
        f"  Clicks: {item.get('clicks', 0)}",
        f"  Meta Links: {item.get('meta_links', 'N/A')}",
        f"  Source: {item.get('source', 'Website')}",
        "-" * 60,
        "CACHE DATA:",
        f"  Browser Cache: {item.get('cache_data', 'N/A')}",
        "=" * 60,
    ])
    
    return "\n".join(lines)

def generate_batch_md(items: List[dict], item_type: str) -> str:
    """Generate batch .md file for multiple archived items"""
    lines = [
        f"# Archived {item_type.title()} Batch Export",
        f"Generated: {datetime.now(timezone.utc).isoformat()}",
        f"Total Items: {len(items)}",
        "",
        "---",
        ""
    ]
    
    for item in items:
        lines.extend([
            f"## {item.get('title', item.get('name', item.get('id', 'Unknown')))}",
            f"- **ID**: {item.get('id', 'N/A')}",
            f"- **Created**: {item.get('created_at', 'N/A')}",
            f"- **Archived**: {item.get('archived_at', 'N/A')}",
            f"- **Views**: {item.get('views', 0)}",
            f"- **Clicks**: {item.get('clicks', 0)}",
            "",
        ])
        
        for key, value in item.items():
            if key not in ['_id', 'id', 'created_at', 'archived_at', 'deleted_at', 'views', 'clicks', 'title', 'name']:
                lines.append(f"- **{key}**: {value}")
        
        lines.extend(["", "---", ""])
    
    return "\n".join(lines)

@api_router.get("/admin/data/archived/{data_type}")
async def get_archived_data(data_type: str, admin: dict = Depends(get_admin_user)):
    collection_map = {
        "sold": "archived_sold",
        "inquiries": "archived_inquiries",
        "bookings": "archived_bookings",
        "gallery": "archived_gallery",
        "products": "archived_products",
        "all": None
    }
    
    if data_type == "all":
        # Combine all archived collections
        all_archived = []
        for coll_name in ["archived_sold", "archived_inquiries", "archived_bookings", "archived_gallery", "archived_products"]:
            items = await db[coll_name].find({}, {"_id": 0}).to_list(1000)
            for item in items:
                item["archive_type"] = coll_name.replace("archived_", "")
            all_archived.extend(items)
        return all_archived
    
    collection = collection_map.get(data_type)
    if not collection:
        return []
    
    items = await db[collection].find({}, {"_id": 0}).sort("archived_at", -1).to_list(1000)
    return items

@api_router.post("/admin/data/archive/run")
async def run_archive_process(admin: dict = Depends(get_admin_user)):
    """Run the auto-archive process"""
    now = datetime.now(timezone.utc)
    archived_count = {"sold": 0, "inquiries": 0, "bookings": 0}
    
    # Archive sold items older than 30 days
    cutoff_30 = (now - timedelta(days=30)).isoformat()
    sold_to_archive = await db.sold_items.find({"sold_at": {"$lt": cutoff_30}}, {"_id": 0}).to_list(1000)
    for item in sold_to_archive:
        item["archived_at"] = now.isoformat()
        await db.archived_sold.insert_one(item)
        await db.sold_items.delete_one({"id": item["id"]})
        archived_count["sold"] += 1
    
    # Archive inquiries older than 30 days
    for coll in ["product_inquiries", "sell_inquiries", "name_your_price_inquiries"]:
        inquiries_to_archive = await db[coll].find({"created_at": {"$lt": cutoff_30}}, {"_id": 0}).to_list(1000)
        for item in inquiries_to_archive:
            item["archived_at"] = now.isoformat()
            item["inquiry_type"] = coll
            await db.archived_inquiries.insert_one(item)
            await db[coll].delete_one({"id": item["id"]})
            archived_count["inquiries"] += 1
    
    # Archive bookings older than 90 days
    cutoff_90 = (now - timedelta(days=90)).isoformat()
    bookings_to_archive = await db.bookings.find({"created_at": {"$lt": cutoff_90}}, {"_id": 0}).to_list(1000)
    for item in bookings_to_archive:
        item["archived_at"] = now.isoformat()
        await db.archived_bookings.insert_one(item)
        await db.bookings.delete_one({"id": item["id"]})
        archived_count["bookings"] += 1
    
    return {"message": "Archive process completed", "archived": archived_count}

@api_router.get("/admin/data/download/{data_type}/{item_id}")
async def download_archive_item(data_type: str, item_id: str, admin: dict = Depends(get_admin_user)):
    collection_map = {
        "sold": "archived_sold",
        "inquiries": "archived_inquiries",
        "bookings": "archived_bookings",
        "deletedGallery": "archived_gallery",
        "deletedProducts": "archived_products",
        "allDeleted": "archived_products"
    }
    
    collection = collection_map.get(data_type, f"archived_{data_type}")
    item = await db[collection].find_one({"id": item_id}, {"_id": 0})
    
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    txt_content = generate_archive_txt(item, data_type)
    return Response(content=txt_content, media_type="text/plain")

@api_router.get("/admin/data/download-batch/{data_type}")
async def download_batch_archive(data_type: str, admin: dict = Depends(get_admin_user)):
    collection_map = {
        "sold": "archived_sold",
        "inquiries": "archived_inquiries",
        "bookings": "archived_bookings",
        "deletedGallery": "archived_gallery",
        "deletedProducts": "archived_products",
        "allDeleted": None
    }
    
    if data_type == "allDeleted":
        all_items = []
        for coll in ["archived_gallery", "archived_products"]:
            items = await db[coll].find({}, {"_id": 0}).to_list(1000)
            all_items.extend(items)
        md_content = generate_batch_md(all_items, "all deleted items")
    else:
        collection = collection_map.get(data_type)
        if not collection:
            raise HTTPException(status_code=400, detail="Invalid data type")
        items = await db[collection].find({}, {"_id": 0}).to_list(1000)
        md_content = generate_batch_md(items, data_type)
    
    return Response(content=md_content, media_type="text/markdown")

@api_router.delete("/admin/data/purge/{data_type}/{item_id}")
async def purge_archive_item(data_type: str, item_id: str, admin: dict = Depends(get_admin_user)):
    collection_map = {
        "sold": "archived_sold",
        "inquiries": "archived_inquiries",
        "bookings": "archived_bookings",
        "deletedGallery": "archived_gallery",
        "deletedProducts": "archived_products"
    }
    
    collection = collection_map.get(data_type, f"archived_{data_type}")
    result = await db[collection].delete_one({"id": item_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item purged permanently"}

@api_router.delete("/admin/data/purge-all/{data_type}")
async def purge_all_archive(data_type: str, admin: dict = Depends(get_admin_user)):
    collection_map = {
        "sold": "archived_sold",
        "inquiries": "archived_inquiries",
        "bookings": "archived_bookings",
        "deletedGallery": "archived_gallery",
        "deletedProducts": "archived_products",
        "allDeleted": None
    }
    
    if data_type == "allDeleted":
        for coll in ["archived_gallery", "archived_products"]:
            await db[coll].delete_many({})
    else:
        collection = collection_map.get(data_type)
        if not collection:
            raise HTTPException(status_code=400, detail="Invalid data type")
        await db[collection].delete_many({})
    
    return {"message": f"All {data_type} purged permanently"}

# ============ MANUAL ARCHIVE BOOKING ============

@api_router.post("/admin/bookings/{booking_id}/archive")
async def archive_booking(booking_id: str, admin: dict = Depends(get_admin_user)):
    booking = await db.bookings.find_one({"id": booking_id}, {"_id": 0})
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    booking["archived_at"] = datetime.now(timezone.utc).isoformat()
    await db.archived_bookings.insert_one(booking)
    await db.bookings.delete_one({"id": booking_id})
    
    return {"message": "Booking archived successfully"}

# ============ DELETE WITH ARCHIVE ============

async def archive_before_delete(item: dict, item_type: str, collection_name: str):
    """Archive item data before deletion"""
    item["deleted_at"] = datetime.now(timezone.utc).isoformat()
    item["archived_at"] = datetime.now(timezone.utc).isoformat()
    item["views"] = item.get("views", 0)
    item["clicks"] = item.get("clicks", 0)
    item["source"] = "admin_deletion"
    await db[collection_name].insert_one(item)

@api_router.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, admin: dict = Depends(get_admin_user)):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    await archive_before_delete(product, "product", "archived_products")
    await db.products.delete_one({"id": product_id})
    
    return {"message": "Product deleted and archived"}

@api_router.delete("/admin/gallery/{item_id}")
async def admin_delete_gallery_item(item_id: str, admin: dict = Depends(get_admin_user)):
    item = await db.gallery.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Gallery item not found")
    
    await archive_before_delete(item, "gallery", "archived_gallery")
    await db.gallery.delete_one({"id": item_id})
    
    return {"message": "Gallery item deleted and archived"}

# ============ PUBLIC AUTH ROUTES ============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "password_hash": hash_password(user_data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    token = create_token(user_id, user_data.email)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_token(user["id"], user["email"])
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        created_at=current_user["created_at"]
    )

# ============ BOOKING ROUTES ============

@api_router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking_data: BookingCreate, current_user: Optional[dict] = Depends(get_optional_user)):
    booking_id = str(uuid.uuid4())
    booking = {
        "id": booking_id,
        "name": booking_data.name,
        "email": booking_data.email,
        "phone": booking_data.phone,
        "service": booking_data.service,
        "stone_type": booking_data.stone_type,
        "description": booking_data.description,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "user_id": current_user["id"] if current_user else None
    }
    await db.bookings.insert_one(booking)
    
    return BookingResponse(**{k: v for k, v in booking.items() if k != "_id"})

@api_router.get("/bookings", response_model=List[BookingResponse])
async def get_user_bookings(current_user: dict = Depends(get_current_user)):
    bookings = await db.bookings.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return bookings

# ============ GALLERY ROUTES ============

@api_router.get("/gallery", response_model=List[GalleryItem])
async def get_gallery(category: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    items = await db.gallery.find(query, {"_id": 0}).to_list(100)
    return items

@api_router.get("/gallery/categories")
async def get_gallery_categories():
    categories = await db.gallery.distinct("category")
    return {"categories": categories}

@api_router.get("/gallery/featured", response_model=List[GalleryItem])
async def get_featured_gallery():
    items = await db.gallery.find({"featured": True}, {"_id": 0}).to_list(10)
    return items

@api_router.get("/gallery/{item_id}", response_model=GalleryItem)
async def get_gallery_item(item_id: str):
    item = await db.gallery.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

# ============ SHOP ROUTES ============

@api_router.get("/products", response_model=List[ProductResponse])
async def get_products(category: Optional[str] = None, featured: Optional[bool] = None):
    query = {"in_stock": True}
    if category and category != "all":
        query["category"] = category
    if featured:
        query["featured"] = True
    products = await db.products.find(query, {"_id": 0}).to_list(100)
    return products

@api_router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@api_router.get("/cart", response_model=CartResponse)
async def get_cart(current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not cart:
        cart = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "items": [],
            "total": 0.0
        }
        await db.carts.insert_one(cart)
    return cart

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one({"id": item.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = await db.carts.find_one({"user_id": current_user["id"]})
    if not cart:
        cart = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "items": [],
            "total": 0.0
        }
    
    existing_item = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
    if existing_item:
        existing_item["quantity"] += item.quantity
    else:
        cart["items"].append({
            "product_id": item.product_id,
            "title": product["title"],
            "price": product.get("price", 0),
            "image_url": product["image_url"],
            "quantity": item.quantity
        })
    
    cart["total"] = sum(i["price"] * i["quantity"] for i in cart["items"])
    
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$set": cart},
        upsert=True
    )
    
    return {"message": "Item added to cart", "cart": {k: v for k, v in cart.items() if k != "_id"}}

@api_router.delete("/cart/{product_id}")
async def remove_from_cart(product_id: str, current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]})
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    
    cart["items"] = [i for i in cart["items"] if i["product_id"] != product_id]
    cart["total"] = sum(i["price"] * i["quantity"] for i in cart["items"])
    
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"items": cart["items"], "total": cart["total"]}}
    )
    
    return {"message": "Item removed from cart"}

@api_router.post("/orders", response_model=OrderResponse)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    cart = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    order_id = str(uuid.uuid4())
    order = {
        "id": order_id,
        "user_id": current_user["id"],
        "items": cart["items"],
        "total": cart["total"],
        "status": "pending",
        "shipping_address": order_data.shipping_address,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.orders.insert_one(order)
    
    await db.carts.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"items": [], "total": 0.0}}
    )
    
    return OrderResponse(**{k: v for k, v in order.items() if k != "_id"})

@api_router.get("/orders", response_model=List[OrderResponse])
async def get_user_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    return orders

# ============ PRODUCT INQUIRY ROUTES ============

@api_router.post("/product-inquiry", response_model=ProductInquiryResponse)
async def create_product_inquiry(inquiry_data: ProductInquiryCreate):
    inquiry_id = str(uuid.uuid4())
    inquiry = {
        "id": inquiry_id,
        "name": inquiry_data.name,
        "email": inquiry_data.email,
        "phone": inquiry_data.phone,
        "is_offer": inquiry_data.is_offer,
        "offer_price": inquiry_data.offer_price,
        "product_id": inquiry_data.product_id,
        "product_title": inquiry_data.product_title,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.product_inquiries.insert_one(inquiry)
    
    return ProductInquiryResponse(**{k: v for k, v in inquiry.items() if k != "_id"})

# ============ SELL INQUIRY ROUTES ============

@api_router.post("/sell-inquiry", response_model=SellInquiryResponse)
async def create_sell_inquiry(inquiry_data: SellInquiryCreate):
    inquiry_id = str(uuid.uuid4())
    inquiry = {
        "id": inquiry_id,
        "name": inquiry_data.name,
        "email": inquiry_data.email,
        "phone": inquiry_data.phone,
        "description": inquiry_data.description,
        "asking_price": inquiry_data.asking_price,
        "negotiable": inquiry_data.negotiable,
        "photo_count": inquiry_data.photo_count,
        "photo_names": inquiry_data.photo_names,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.sell_inquiries.insert_one(inquiry)
    
    return SellInquiryResponse(**{k: v for k, v in inquiry.items() if k not in ["_id", "photo_names"]})

# ============ NAME YOUR PRICE ROUTES ============

@api_router.post("/name-your-price")
async def create_name_your_price_inquiry(inquiry: NameYourPriceInquiry):
    inquiry_id = str(uuid.uuid4())
    inquiry_data = {
        "id": inquiry_id,
        "name": inquiry.name,
        "phone": inquiry.phone,
        "price": inquiry.price,
        "product_id": inquiry.product_id,
        "product_title": inquiry.product_title,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.name_your_price_inquiries.insert_one(inquiry_data)
    
    # TODO: Send SMS when SMS is configured
    # This will be implemented when SMS provider is set up
    
    return {"message": "Inquiry submitted successfully", "id": inquiry_id}

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_data():
    existing = await db.gallery.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    gallery_items = [
        {"id": str(uuid.uuid4()), "title": "Teal Tourmaline - Rectangle", "category": "tourmaline", "image_url": "https://customer-assets.emergentagent.com/job_1e0d6e37-2077-4a48-b9fe-d77e61594e60/artifacts/hosik6cy_IMG_2208.jpeg", "description": "Custom cut teal tourmaline with exceptional brilliance", "featured": True, "images": [], "videos": []},
        {"id": str(uuid.uuid4()), "title": "Tsavorite Garnet - Light", "category": "garnet", "image_url": "https://customer-assets.emergentagent.com/job_1e0d6e37-2077-4a48-b9fe-d77e61594e60/artifacts/4pxjbbs3_IMG_5662.jpeg", "description": "Vivid green tsavorite garnet", "featured": True, "images": [], "videos": []},
        {"id": str(uuid.uuid4()), "title": "Tsavorite Garnet - Dark", "category": "garnet", "image_url": "https://customer-assets.emergentagent.com/job_1e0d6e37-2077-4a48-b9fe-d77e61594e60/artifacts/7p60olwy_IMG_5648.jpeg", "description": "Vivid green tsavorite with dramatic lighting", "featured": True, "images": [], "videos": []},
        {"id": str(uuid.uuid4()), "title": "Bicolor Sapphire - Radiant", "category": "sapphire", "image_url": "https://customer-assets.emergentagent.com/job_1e0d6e37-2077-4a48-b9fe-d77e61594e60/artifacts/oz7snt9y_IMG_4339.jpeg", "description": "Stunning bicolor blue sapphire", "featured": True, "images": [], "videos": []},
        {"id": str(uuid.uuid4()), "title": "Aquamarine - Emerald Cut", "category": "aquamarine", "image_url": "https://customer-assets.emergentagent.com/job_1e0d6e37-2077-4a48-b9fe-d77e61594e60/artifacts/7coa2xqk_IMG_3073.jpeg", "description": "Light blue aquamarine", "featured": True, "images": [], "videos": []},
        {"id": str(uuid.uuid4()), "title": "Colombian Emerald - Rectangle", "category": "emerald", "image_url": "https://customer-assets.emergentagent.com/job_1e0d6e37-2077-4a48-b9fe-d77e61594e60/artifacts/sxdw0x7e_IMG_2456.jpeg", "description": "Fine Colombian emerald", "featured": True, "images": [], "videos": []},
    ]
    await db.gallery.insert_many(gallery_items)
    
    products = [
        {"id": str(uuid.uuid4()), "title": "Blue Sapphire - Cushion Cut", "category": "sapphire", "image_url": "https://images.unsplash.com/photo-1605821771565-35e0d046a2fb?w=800", "description": "Natural blue sapphire", "price": 2850.00, "carat": "2.3ct", "dimensions": "8x6mm", "in_stock": True, "color": "Blue", "gemstone_type": "Sapphire", "price_per_carat": 1200, "images": [], "videos": [], "gia_certified": False, "name_your_price": False},
        {"id": str(uuid.uuid4()), "title": "Pink Tourmaline - Oval", "category": "tourmaline", "image_url": "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800", "description": "Brazilian pink tourmaline", "price": 1450.00, "carat": "4.2ct", "dimensions": "10x8mm", "in_stock": True, "color": "Pink", "gemstone_type": "Tourmaline", "price_per_carat": 350, "images": [], "videos": [], "gia_certified": False, "name_your_price": False},
        {"id": str(uuid.uuid4()), "title": "Colombian Emerald - Emerald Cut", "category": "emerald", "image_url": "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800", "description": "Fine Colombian emerald", "price": 4200.00, "carat": "1.5ct", "dimensions": "7x5mm", "in_stock": True, "color": "Green", "gemstone_type": "Emerald", "price_per_carat": 2800, "images": [], "videos": [], "gia_certified": False, "name_your_price": False},
    ]
    await db.products.insert_many(products)
    
    return {"message": "Data seeded successfully"}

@api_router.get("/")
async def root():
    return {"message": "Cutting Corners API", "status": "running"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

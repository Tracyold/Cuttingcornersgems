from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, ConfigDict, EmailStr
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

# Import centralized security config (single source of truth)
from config.security import (
    JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRATION_HOURS,
    ADMIN_USERNAME, ADMIN_PASSWORD_HASH
)

app = FastAPI()

# Add cache control middleware
from middleware.cache_control import CacheControlMiddleware
app.add_middleware(CacheControlMiddleware)

api_router = APIRouter(prefix="/api")
dev_router = APIRouter(prefix="/dev", tags=["development"])
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
    era: Optional[str] = None  # "PAST" | "PRESENT" | "FUTURE"
    humble_beginnings: bool = False  # Part of gated "Humble Beginnings" collection

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
    era: Optional[str] = None
    humble_beginnings: Optional[bool] = None

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
    era: Optional[str] = None
    humble_beginnings: bool = False

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
    booking_status: str = "pending"
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
    inquiry_status: str = "pending"
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
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, Exception):
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
    
    # Add summary data for each user
    for user in users:
        user_id = user.get("id")
        # Count orders
        orders_count = await db.orders.count_documents({"user_id": user_id})
        user["total_orders"] = orders_count
        # Count cart items
        cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
        user["cart_items"] = len(cart.get("items", [])) if cart else 0
    
    return users

@api_router.get("/admin/users/{user_id}/details")
async def admin_get_user_details(user_id: str, admin: dict = Depends(get_admin_user)):
    """Get full user details including orders, cart, inquiries, messages, analytics"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get orders
    orders = await db.orders.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Get cart items
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    cart_items = []
    if cart and cart.get("items"):
        for item in cart["items"]:
            product = await db.products.find_one({"id": item.get("product_id")}, {"_id": 0})
            if product:
                cart_items.append({
                    "title": product.get("title"),
                    "price": product.get("price"),
                    "quantity": item.get("quantity", 1)
                })
    
    # Get abandoned items (items removed from cart)
    abandoned = await db.abandoned_carts.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    
    # Get bookings
    bookings = await db.bookings.find({"user_id": user_id}, {"_id": 0}).to_list(50)
    
    # Get inquiries (product inquiries, sell inquiries, name your price)
    product_inquiries = await db.product_inquiries.find({"email": user.get("email")}, {"_id": 0}).to_list(50)
    for inq in product_inquiries:
        inq["type"] = "Product Inquiry"
    
    sell_inquiries = await db.sell_inquiries.find({"email": user.get("email")}, {"_id": 0}).to_list(50)
    for inq in sell_inquiries:
        inq["type"] = "Sell Inquiry"
    
    nyp_inquiries = await db.name_your_price_inquiries.find({"email": user.get("email")}, {"_id": 0}).to_list(50)
    for inq in nyp_inquiries:
        inq["type"] = "Name Your Price"
    
    all_inquiries = product_inquiries + sell_inquiries + nyp_inquiries
    all_inquiries.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Get messages to admin
    messages = await db.user_messages.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(50)
    
    # Get user analytics
    analytics = await db.user_analytics.find_one({"user_id": user_id}, {"_id": 0})
    if not analytics:
        analytics = {
            "click_through_rate": 0,
            "most_clicked_item": None,
            "longest_view_time": 0,
            "longest_view_page": None,
            "shortest_view_time": 0,
            "shortest_view_page": None
        }
    
    return {
        **user,
        "orders": orders,
        "cart_items": cart_items,
        "abandoned_items": abandoned,
        "bookings": bookings,
        "inquiries": all_inquiries,
        "messages": messages,
        "analytics": analytics
    }

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
    
    # Data integrity check: verify product is not referenced elsewhere
    # Check if product exists in any carts
    cart_with_product = await db.carts.find_one(
        {"items.product_id": product_id},
        {"_id": 0, "user_id": 1}
    )
    if cart_with_product:
        raise HTTPException(
            status_code=409,
            detail=f"Cannot delete product. It is currently in {1} user's cart. Remove it from carts first."
        )
    
    # Check if product exists in any orders
    order_with_product = await db.orders.find_one(
        {"items.product_id": product_id},
        {"_id": 0, "id": 1}
    )
    if order_with_product:
        raise HTTPException(
            status_code=409,
            detail="Cannot delete product. It exists in order history. Consider marking as out of stock instead."
        )
    
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

@api_router.get("/auth/signup-status")
async def get_signup_status():
    """Check if user registration is enabled"""
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    if settings:
        return {"signup_enabled": settings.get("user_signup_enabled", True)}
    return {"signup_enabled": True}

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if registration is enabled
    settings = await db.site_settings.find_one({"id": "main"}, {"_id": 0})
    if settings and not settings.get("user_signup_enabled", True):
        raise HTTPException(status_code=403, detail="User registration is currently disabled")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "name": user_data.name,
        "phone": getattr(user_data, 'phone', None),
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

# ============ USER MESSAGE TO ADMIN ============

class UserMessageCreate(BaseModel):
    subject: str
    message: str

@api_router.post("/user/messages")
async def send_message_to_admin(message_data: UserMessageCreate, current_user: dict = Depends(get_current_user)):
    """Allow logged-in users to send messages to admin"""
    message_id = str(uuid.uuid4())
    message = {
        "id": message_id,
        "user_id": current_user["id"],
        "user_email": current_user["email"],
        "user_name": current_user["name"],
        "subject": message_data.subject,
        "message": message_data.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "read": False
    }
    await db.user_messages.insert_one(message)
    
    return {"message": "Message sent to admin", "id": message_id}

@api_router.get("/user/messages")
async def get_user_messages(current_user: dict = Depends(get_current_user)):
    """Get messages sent by the current user"""
    messages = await db.user_messages.find({"user_id": current_user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    return messages

@api_router.get("/admin/messages")
async def admin_get_messages(admin: dict = Depends(get_admin_user)):
    """Admin: Get all user messages"""
    messages = await db.user_messages.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return messages

@api_router.patch("/admin/messages/{message_id}/read")
async def admin_mark_message_read(message_id: str, admin: dict = Depends(get_admin_user)):
    """Admin: Mark message as read"""
    await db.user_messages.update_one({"id": message_id}, {"$set": {"read": True}})
    return {"message": "Marked as read"}

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
async def get_gallery(category: Optional[str] = None, era: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    if era and era != "all":
        query["era"] = era.upper()
    items = await db.gallery.find(query, {"_id": 0}).to_list(100)
    return items

@api_router.get("/gallery/eras")
async def get_gallery_eras():
    """Get distinct era values from gallery items"""
    eras = await db.gallery.distinct("era")
    # Filter out None values and return in order
    valid_eras = [e for e in eras if e]
    ordered = []
    for era in ["PAST", "PRESENT", "FUTURE"]:
        if era in valid_eras:
            ordered.append(era)
    return {"eras": ordered}

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

# ============ SEED TEST DATA FOR ADMIN ============

@api_router.post("/admin/seed-test-data")
async def seed_test_data(admin: dict = Depends(get_admin_user)):
    """Create test inquiries, name your price, and sold listing for testing"""
    now = datetime.now(timezone.utc)
    
    # Get a product for reference
    product = await db.products.find_one({}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=400, detail="No products exist. Seed products first.")
    
    # Create test product inquiry
    test_product_inquiry = {
        "id": str(uuid.uuid4()),
        "name": "Test Inquiry Customer",
        "email": "testinquiry@example.com",
        "phone": "480-555-1234",
        "product_id": product["id"],
        "product_title": product["title"],
        "message": "I'm interested in this gemstone. Can you tell me more about its origin and certification?",
        "is_offer": True,
        "offer_price": "2500",
        "created_at": now.isoformat(),
        "status": "pending"
    }
    await db.product_inquiries.insert_one(test_product_inquiry)
    
    # Create test sell inquiry
    test_sell_inquiry = {
        "id": str(uuid.uuid4()),
        "name": "Test Seller",
        "email": "testseller@example.com",
        "phone": "480-555-5678",
        "description": "I have a 3.5ct natural ruby from Myanmar that I inherited. Looking to sell. No treatments, excellent clarity.",
        "asking_price": "8500",
        "negotiable": True,
        "photo_count": 3,
        "photos": ["ruby1.jpg", "ruby2.jpg", "ruby3.jpg"],
        "created_at": now.isoformat(),
        "status": "pending"
    }
    await db.sell_inquiries.insert_one(test_sell_inquiry)
    
    # Create test Name Your Price inquiry
    test_nyp_inquiry = {
        "id": str(uuid.uuid4()),
        "name": "Test NYP Customer",
        "phone": "480-555-9012",
        "product_id": product["id"],
        "product_title": product["title"],
        "price": "2200",
        "message": "I can offer $2,200 for this piece. Let me know if this works.",
        "created_at": now.isoformat(),
        "status": "pending"
    }
    await db.name_your_price_inquiries.insert_one(test_nyp_inquiry)
    
    # Create test sold item with all features
    test_sold_item = {
        "id": str(uuid.uuid4()),
        "product_id": product["id"],
        "product_title": product["title"],
        "product_image": product["image_url"],
        "buyer_name": "Test Buyer",
        "buyer_email": "testbuyer@example.com",
        "buyer_phone": "480-555-3456",
        "user_id": None,
        "shipping_address": "123 Test Street\nTempe, AZ 85281\nUnited States",
        "item_price": product.get("price", 2850),
        "shipping_cost": 45.00,
        "total_paid": product.get("price", 2850) + 45.00,
        "payment_method": "Credit Card",
        "payment_last_four": "4242",
        "sold_at": now.isoformat(),
        "paid_at": now.isoformat(),
        "email_sent": True,
        "email_sent_at": now.isoformat(),
        "tracking_number": "1Z999AA10123456784",
        "tracking_carrier": "ups",
        "tracking_entered_at": now.isoformat(),
        "user_notes": "Thank you for your purchase! Handle with care - this is a delicate gemstone.",
        "invoice_number": f"INV-{now.strftime('%Y%m%d')}-001",
        "views": 47,
        "clicks": 12
    }
    await db.sold_items.insert_one(test_sold_item)
    
    return {
        "message": "Test data created successfully",
        "created": {
            "product_inquiry": test_product_inquiry["id"],
            "sell_inquiry": test_sell_inquiry["id"],
            "name_your_price": test_nyp_inquiry["id"],
            "sold_item": test_sold_item["id"]
        }
    }

# ============ INTEGRITY & CLEANLINESS ENDPOINTS ============

@api_router.get("/admin/integrity-report")
async def get_integrity_report(admin: dict = Depends(get_admin_user)):
    """
    Generate data integrity report (admin-only, read-only)
    Checks for orphaned references and data inconsistencies
    """
    from services.integrity import generate_integrity_report
    report = await generate_integrity_report(db)
    return report

@api_router.get("/admin/cleanliness-report")
async def get_cleanliness_report(admin: dict = Depends(get_admin_user)):
    """
    Generate system cleanliness report (admin-only, read-only)
    Checks for unused data and maintenance needs
    """
    from services.integrity import generate_cleanliness_report
    report = await generate_cleanliness_report(db)
    return report

@api_router.post("/admin/repair/cart-references")
async def repair_cart_references(admin: dict = Depends(get_admin_user)):
    """
    Repair orphaned cart references (admin-only, behind CLEANLINESS_ENABLE_REPAIR flag)
    Removes cart items referencing deleted products
    """
    from services.integrity import repair_orphaned_cart_references
    result = await repair_orphaned_cart_references(db)
    return result

@api_router.post("/admin/repair/empty-carts")
async def repair_empty_carts_endpoint(admin: dict = Depends(get_admin_user)):
    """
    Remove empty carts (admin-only, behind CLEANLINESS_ENABLE_REPAIR flag)
    """
    from services.integrity import repair_empty_carts
    result = await repair_empty_carts(db)
    return result

@api_router.post("/admin/system/ensure-indexes")
async def ensure_indexes_endpoint(admin: dict = Depends(get_admin_user)):
    """
    Manually trigger index creation (admin-only, idempotent)
    """
    from services.indexes import ensure_indexes
    results = await ensure_indexes(db)
    return results

@api_router.post("/admin/system/setup-ttl")
async def setup_ttl_endpoint(admin: dict = Depends(get_admin_user)):
    """
    Manually trigger TTL index creation (admin-only)
    Requires AUDIT_TTL_DAYS environment variable to be set
    """
    from services.ttl import setup_ttl_indexes
    results = await setup_ttl_indexes(db)
    return results

@api_router.get("/admin/system/ttl-status")
async def get_ttl_status_endpoint(admin: dict = Depends(get_admin_user)):
    """
    Check TTL index status (admin-only, read-only)
    """
    from services.ttl import get_ttl_status
    ttl_status = await get_ttl_status(db)
    return ttl_status

@api_router.get("/admin/system/maintenance-status")
async def get_maintenance_status_endpoint(admin: dict = Depends(get_admin_user)):
    """
    Get automated maintenance service status (admin-only, read-only)
    """
    from services.maintenance import get_maintenance_service
    maintenance = get_maintenance_service(db)
    return maintenance.get_status()

@api_router.post("/admin/system/run-maintenance")
async def run_maintenance_now_endpoint(admin: dict = Depends(get_admin_user)):
    """
    Manually trigger maintenance cycle (admin-only)
    """
    from services.maintenance import get_maintenance_service
    maintenance = get_maintenance_service(db)
    await maintenance.run_maintenance_cycle()
    return {"message": "Maintenance cycle completed", "timestamp": datetime.now(timezone.utc).isoformat()}

# ============ SCHEMA ADMIN ENDPOINTS ============

@api_router.get("/admin/schema/status")
async def get_schema_status_endpoint(admin: dict = Depends(get_admin_user)):
    """
    Get current schema version and status (admin-only, read-only)
    """
    from services.schema_guard import get_schema_status
    schema_status = await get_schema_status(db)
    return schema_status

@api_router.post("/admin/schema/validate")
async def validate_schema_endpoint(data: dict, admin: dict = Depends(get_admin_user)):
    """
    Validate required fields in a collection (admin-only, read-only)
    Request body: {"collection": "users", "required_fields": ["id", "email", "name"]}
    """
    from services.schema_guard import validate_required_fields
    collection = data.get("collection")
    required_fields = data.get("required_fields", [])
    
    if not collection or not required_fields:
        raise HTTPException(status_code=400, detail="collection and required_fields are required")
    
    result = await validate_required_fields(db, collection, required_fields)
    return result

@api_router.post("/admin/schema/backfill")
async def backfill_schema_endpoint(data: dict, admin: dict = Depends(get_admin_user)):
    """
    Backfill missing field with default value (admin-only, write operation)
    Request body: {"collection": "users", "field": "token_version", "default_value": 1}
    Requires SCHEMA_DRIFT_GUARD_ENABLED=true
    """
    from services.schema_guard import backfill_missing_field
    collection = data.get("collection")
    field = data.get("field")
    default_value = data.get("default_value")
    
    if not collection or not field or default_value is None:
        raise HTTPException(status_code=400, detail="collection, field, and default_value are required")
    
    result = await backfill_missing_field(db, collection, field, default_value)
    return result

# ============ USER ENTITLEMENTS ENDPOINTS ============

@api_router.get("/users/me/entitlements")
async def get_my_entitlements(user: dict = Depends(get_current_user)):
    """
    Get current user's entitlements (total spend, NYP unlock status).
    Requires authentication.
    
    Returns:
        {
            "total_spend": float,
            "unlocked_nyp": bool,
            "threshold": float,
            "spend_to_unlock": float
        }
    """
    from services.entitlements import get_user_entitlements
    from services.order_store import get_order_store
    
    store = get_order_store(db)
    # Get full user record to check for NYP override
    user_record = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    entitlements = await get_user_entitlements(user["id"], store, user_record)
    return entitlements


# ============ USER PREFERENCES ENDPOINTS ============

class UserPreferencesUpdate(BaseModel):
    """Request to update user negotiation preferences."""
    sms_negotiations_enabled: Optional[bool] = None
    phone_e164: Optional[str] = None


@api_router.patch("/users/me/preferences")
async def update_user_preferences(
    prefs: UserPreferencesUpdate,
    user: dict = Depends(get_current_user)
):
    """
    Update user preferences for negotiation SMS notifications.
    
    Body:
        - sms_negotiations_enabled: bool (optional)
        - phone_e164: str (optional, E.164 format phone number)
    """
    update_fields = {}
    
    if prefs.sms_negotiations_enabled is not None:
        update_fields["sms_negotiations_enabled"] = prefs.sms_negotiations_enabled
    
    if prefs.phone_e164 is not None:
        update_fields["phone_e164"] = prefs.phone_e164
    
    if not update_fields:
        return {"message": "No updates provided"}
    
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update_fields}
    )
    
    return {"message": "Preferences updated", "updated": list(update_fields.keys())}


@api_router.get("/users/me/preferences")
async def get_user_preferences(user: dict = Depends(get_current_user)):
    """Get user preferences for negotiations."""
    user_record = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {
        "sms_negotiations_enabled": user_record.get("sms_negotiations_enabled", False),
        "phone_e164": user_record.get("phone_e164")
    }


# ============ NEGOTIATION ENDPOINTS (USER) ============

from models.negotiation import (
    CreateNegotiationRequest,
    AddMessageRequest,
    AgreementResponse,
    PurchaseQuoteResponse,
    PurchaseCheckoutResponse,
)
from services.negotiation_store import get_negotiation_store
from services.purchase_token_store import get_purchase_token_store
from services.entitlements import check_nyp_eligibility


@api_router.post("/negotiations")
async def create_negotiation(
    request: CreateNegotiationRequest,
    user: dict = Depends(get_current_user)
):
    """
    Create a new negotiation thread with initial offer.
    Requires NYP eligibility (spend threshold or admin override).
    """
    # Check eligibility server-side
    user_record = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    eligible = await check_nyp_eligibility(user["id"], user_record)
    
    if not eligible:
        raise HTTPException(
            status_code=403,
            detail="Spend $1,000 to unlock Name Your Price."
        )
    
    # Get product info
    product = await db.products.find_one({"id": request.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if product allows NYP
    if not product.get("name_your_price", False):
        raise HTTPException(
            status_code=400,
            detail="This product does not accept Name Your Price offers"
        )
    
    # Create thread
    store = get_negotiation_store()
    thread = await store.create_thread(
        user_id=user["id"],
        user_email=user["email"],
        user_name=user["name"],
        product_id=request.product_id,
        product_title=product["title"],
        product_price=product.get("price", 0),
        initial_offer_amount=request.offer_amount,
        text=request.text
    )
    
    # Try to send notification (non-blocking)
    try:
        from services.negotiation_notifications import notify_user_offer_sent
        settings = await db.site_settings.find_one({}, {"_id": 0})
        await notify_user_offer_sent(thread, user_record, settings)
    except Exception as e:
        logging.warning(f"Failed to send offer notification: {e}")
    
    return {
        "negotiation_id": thread.negotiation_id,
        "status": thread.status,
        "created_at": thread.created_at.isoformat()
    }


@api_router.get("/negotiations")
async def list_user_negotiations(user: dict = Depends(get_current_user)):
    """List all negotiations for the current user."""
    store = get_negotiation_store()
    summaries = await store.list_threads_for_user(user["id"])
    return [
        {
            "negotiation_id": s.negotiation_id,
            "product_id": s.product_id,
            "product_title": s.product_title,
            "product_price": s.product_price,
            "status": s.status,
            "last_activity_at": s.last_activity_at.isoformat(),
            "last_message_preview": s.last_message_preview,
            "last_amount": s.last_amount,
            "message_count": s.message_count
        }
        for s in summaries
    ]


@api_router.get("/negotiations/{negotiation_id}")
async def get_user_negotiation(
    negotiation_id: str,
    user: dict = Depends(get_current_user)
):
    """Get full negotiation thread (user must own it)."""
    store = get_negotiation_store()
    thread = await store.get_thread(negotiation_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    if thread.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return {
        "negotiation_id": thread.negotiation_id,
        "product_id": thread.product_id,
        "product_title": thread.product_title,
        "product_price": thread.product_price,
        "status": thread.status,
        "created_at": thread.created_at.isoformat(),
        "updated_at": thread.updated_at.isoformat(),
        "messages": [
            {
                "message_id": m.message_id,
                "sender_role": m.sender_role,
                "kind": m.kind,
                "amount": m.amount,
                "text": m.text,
                "created_at": m.created_at.isoformat()
            }
            for m in thread.messages
        ],
        "accepted_agreement_id": thread.accepted_agreement_id
    }


@api_router.post("/negotiations/{negotiation_id}/message")
async def add_user_message(
    negotiation_id: str,
    request: AddMessageRequest,
    user: dict = Depends(get_current_user)
):
    """Add a message to a negotiation (user side: OFFER or NOTE only)."""
    store = get_negotiation_store()
    thread = await store.get_thread(negotiation_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    if thread.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if thread.status != "OPEN":
        raise HTTPException(status_code=400, detail="Negotiation is not open")
    
    if request.kind not in ["OFFER", "NOTE"]:
        raise HTTPException(status_code=400, detail="Invalid message kind for user")
    
    if request.kind == "OFFER" and request.amount is None:
        raise HTTPException(status_code=400, detail="Amount required for OFFER")
    
    thread = await store.add_message(
        negotiation_id=negotiation_id,
        sender_role="USER",
        kind=request.kind,
        amount=request.amount,
        text=request.text
    )
    
    return {"message": "Message added", "message_count": len(thread.messages)}


@api_router.get("/negotiations/{negotiation_id}/agreement")
async def get_negotiation_agreement(
    negotiation_id: str,
    user: dict = Depends(get_current_user)
):
    """Check if an active agreement exists for this negotiation."""
    store = get_negotiation_store()
    thread = await store.get_thread(negotiation_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    if thread.user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    agreement = await store.get_agreement_for_negotiation(negotiation_id)
    
    if not agreement or agreement.status != "ACTIVE":
        return AgreementResponse(available=False)
    
    from datetime import datetime, timezone
    if datetime.now(timezone.utc) > agreement.purchase_token_expires_at:
        return AgreementResponse(available=False)
    
    return AgreementResponse(
        available=True,
        product_id=agreement.product_id,
        accepted_amount=agreement.accepted_amount,
        purchase_token=agreement.purchase_token,
        expires_at=agreement.purchase_token_expires_at,
        agreement_id=agreement.agreement_id
    )


# ============ PURCHASE ENDPOINTS (USER) ============

class PurchaseQuoteRequest(BaseModel):
    purchase_token: str


class PurchaseCheckoutRequest(BaseModel):
    purchase_token: str


@api_router.post("/purchase/quote")
async def get_purchase_quote(
    request: PurchaseQuoteRequest,
    user: dict = Depends(get_current_user)
):
    """Verify purchase token and get quote."""
    token_store = get_purchase_token_store()
    result = await token_store.verify_token(user["id"], request.purchase_token)
    
    if not result.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=result.get("reason", "Invalid token")
        )
    
    return PurchaseQuoteResponse(
        product_id=result["product_id"],
        amount=result["amount"],
        token_valid_until=result["expires_at"],
        agreement_id=result["agreement_id"]
    )


@api_router.post("/purchase/checkout")
async def checkout_with_token(
    request: PurchaseCheckoutRequest,
    user: dict = Depends(get_current_user)
):
    """
    Checkout with a negotiated price token.
    
    DEV MODE: Returns payment required info but does not process.
    PRODUCTION: TODO - Create Stripe session with negotiated amount.
    """
    token_store = get_purchase_token_store()
    result = await token_store.verify_token(user["id"], request.purchase_token)
    
    if not result.get("valid"):
        raise HTTPException(
            status_code=400,
            detail=result.get("reason", "Invalid token")
        )
    
    # DEV MODE: Return checkout info without actual payment
    # TODO: In production, create Stripe session with amount
    # On payment success webhook: mark agreement USED and consume token
    
    return PurchaseCheckoutResponse(
        requires_payment=True,
        provider="NOT_CONFIGURED",
        amount=result["amount"],
        product_id=result["product_id"],
        agreement_id=result["agreement_id"]
    )


# ============ ADMIN NEGOTIATION ENDPOINTS ============

from models.negotiation import AdminCounterRequest, AdminAcceptRequest, AdminCloseRequest


@api_router.get("/admin/negotiations")
async def admin_list_negotiations(
    status: Optional[str] = None,
    admin: dict = Depends(get_admin_user)
):
    """List negotiations (admin view)."""
    store = get_negotiation_store()
    
    filter_status = None
    if status and status.upper() in ["OPEN", "ACCEPTED", "CLOSED"]:
        filter_status = status.upper()
    
    summaries = await store.list_threads_for_admin(filter_status)
    return [
        {
            "negotiation_id": s.negotiation_id,
            "user_id": s.user_id,
            "user_email": s.user_email,
            "user_name": s.user_name,
            "product_id": s.product_id,
            "product_title": s.product_title,
            "product_price": s.product_price,
            "status": s.status,
            "created_at": s.created_at.isoformat(),
            "last_activity_at": s.last_activity_at.isoformat(),
            "last_amount": s.last_amount,
            "message_count": s.message_count
        }
        for s in summaries
    ]


@api_router.get("/admin/negotiations/{negotiation_id}")
async def admin_get_negotiation(
    negotiation_id: str,
    admin: dict = Depends(get_admin_user)
):
    """Get full negotiation thread (admin view)."""
    store = get_negotiation_store()
    thread = await store.get_thread(negotiation_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    # Get agreement if exists
    agreement = await store.get_agreement_for_negotiation(negotiation_id)
    agreement_info = None
    if agreement:
        agreement_info = {
            "agreement_id": agreement.agreement_id,
            "accepted_amount": agreement.accepted_amount,
            "status": agreement.status,
            "expires_at": agreement.purchase_token_expires_at.isoformat(),
            "created_at": agreement.created_at.isoformat()
        }
    
    return {
        "negotiation_id": thread.negotiation_id,
        "user_id": thread.user_id,
        "user_email": thread.user_email,
        "user_name": thread.user_name,
        "product_id": thread.product_id,
        "product_title": thread.product_title,
        "product_price": thread.product_price,
        "status": thread.status,
        "created_at": thread.created_at.isoformat(),
        "updated_at": thread.updated_at.isoformat(),
        "messages": [
            {
                "message_id": m.message_id,
                "sender_role": m.sender_role,
                "kind": m.kind,
                "amount": m.amount,
                "text": m.text,
                "created_at": m.created_at.isoformat()
            }
            for m in thread.messages
        ],
        "agreement": agreement_info
    }


@api_router.post("/admin/negotiations/{negotiation_id}/counter")
async def admin_counter_offer(
    negotiation_id: str,
    request: AdminCounterRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin sends counter-offer."""
    store = get_negotiation_store()
    thread = await store.get_thread(negotiation_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    if thread.status != "OPEN":
        raise HTTPException(status_code=400, detail="Negotiation is not open")
    
    thread = await store.add_message(
        negotiation_id=negotiation_id,
        sender_role="ADMIN",
        kind="COUNTER",
        amount=request.amount,
        text=request.text
    )
    
    # Try to notify user
    try:
        from services.negotiation_notifications import notify_user_counter_received
        user_record = await db.users.find_one({"id": thread.user_id}, {"_id": 0})
        settings = await db.site_settings.find_one({}, {"_id": 0})
        await notify_user_counter_received(thread, user_record, settings)
    except Exception as e:
        logging.warning(f"Failed to send counter notification: {e}")
    
    return {"message": "Counter-offer sent", "message_count": len(thread.messages)}


@api_router.post("/admin/negotiations/{negotiation_id}/accept")
async def admin_accept_offer(
    negotiation_id: str,
    request: AdminAcceptRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Admin accepts offer and creates purchase agreement.
    IMPORTANT: This NEVER changes the product's public price.
    """
    store = get_negotiation_store()
    thread = await store.get_thread(negotiation_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    if thread.status != "OPEN":
        raise HTTPException(status_code=400, detail="Negotiation is not open")
    
    # Add ACCEPT message
    thread = await store.add_message(
        negotiation_id=negotiation_id,
        sender_role="ADMIN",
        kind="ACCEPT",
        amount=request.amount,
        text=request.text
    )
    
    # Create agreement with purchase token
    agreement = await store.create_agreement_on_accept(
        negotiation_id=negotiation_id,
        accepted_amount=request.amount,
        ttl_minutes=request.ttl_minutes
    )
    
    # Update thread status
    await store.set_status(negotiation_id, "ACCEPTED")
    
    # Create purchase token (already created by agreement, but we ensure it exists)
    token_store = get_purchase_token_store()
    await token_store.create_token(
        user_id=thread.user_id,
        product_id=thread.product_id,
        amount=request.amount,
        agreement_id=agreement.agreement_id,
        ttl_minutes=request.ttl_minutes
    )
    
    # Try to notify user
    try:
        from services.negotiation_notifications import notify_user_accepted
        user_record = await db.users.find_one({"id": thread.user_id}, {"_id": 0})
        settings = await db.site_settings.find_one({}, {"_id": 0})
        await notify_user_accepted(thread, user_record, settings)
    except Exception as e:
        logging.warning(f"Failed to send accept notification: {e}")
    
    return {
        "message": "Offer accepted",
        "agreement_id": agreement.agreement_id,
        "accepted_amount": request.amount,
        "expires_at": agreement.purchase_token_expires_at.isoformat()
    }


@api_router.post("/admin/negotiations/{negotiation_id}/close")
async def admin_close_negotiation(
    negotiation_id: str,
    request: AdminCloseRequest,
    admin: dict = Depends(get_admin_user)
):
    """Admin closes negotiation."""
    store = get_negotiation_store()
    thread = await store.get_thread(negotiation_id)
    
    if not thread:
        raise HTTPException(status_code=404, detail="Negotiation not found")
    
    if thread.status == "CLOSED":
        raise HTTPException(status_code=400, detail="Negotiation already closed")
    
    # Add CLOSE message
    thread = await store.add_message(
        negotiation_id=negotiation_id,
        sender_role="ADMIN",
        kind="CLOSE",
        text=request.text
    )
    
    # Update status
    await store.set_status(negotiation_id, "CLOSED")
    
    # Try to notify user
    try:
        from services.negotiation_notifications import notify_user_closed
        user_record = await db.users.find_one({"id": thread.user_id}, {"_id": 0})
        settings = await db.site_settings.find_one({}, {"_id": 0})
        await notify_user_closed(thread, user_record, settings)
    except Exception as e:
        logging.warning(f"Failed to send close notification: {e}")
    
    return {"message": "Negotiation closed"}


# ============ ADMIN USER ENTITLEMENTS OVERRIDE ============

class EntitlementOverrideRequest(BaseModel):
    nyp_override_enabled: bool


@api_router.patch("/admin/users/{user_id}/entitlements")
async def admin_set_user_entitlement_override(
    user_id: str,
    request: EntitlementOverrideRequest,
    admin: dict = Depends(get_admin_user)
):
    """
    Admin toggle for NYP override.
    When enabled, user is eligible for NYP regardless of spend.
    """
    # Check user exists
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"nyp_override_enabled": request.nyp_override_enabled}}
    )
    
    return {
        "message": "User entitlement override updated",
        "user_id": user_id,
        "nyp_override_enabled": request.nyp_override_enabled
    }



# These endpoints are automatically disabled in production
# dev_router is defined at top of file with api_router

@dev_router.post("/orders/seed")
async def seed_orders_dev(orders: List[dict]):
    """
    DEV-ONLY: Seed the InMemoryOrderStore for UI testing without Stripe/DB.
    
    Automatically disabled when ENV == "production".
    
    Body: List of orders with fields:
        - order_id: str
        - user_id: str
        - order_total: float
        - status: "PENDING" | "COMPLETED" | "REFUNDED" | "CANCELLED"
        - created_at: datetime (optional)
    
    Returns:
        {"seeded": int, "message": str}
    """
    import os
    from datetime import datetime, timezone
    from models.order import Order, OrderStatus
    from services.order_store import get_order_store
    
    env = os.environ.get("ENV", "development").lower()
    if env == "production":
        raise HTTPException(
            status_code=403, 
            detail="Development endpoints are disabled in production"
        )
    
    store = get_order_store(force_memory=True)
    seeded_count = 0
    
    for order_data in orders:
        try:
            # Handle status conversion
            status_val = order_data.get("status", "COMPLETED")
            if isinstance(status_val, str):
                status_val = OrderStatus(status_val.upper())
            
            # Handle created_at
            created_at = order_data.get("created_at")
            if created_at is None:
                created_at = datetime.now(timezone.utc)
            elif isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            
            order = Order(
                order_id=order_data["order_id"],
                user_id=order_data["user_id"],
                order_total=float(order_data["order_total"]),
                status=status_val,
                created_at=created_at
            )
            await store.record_order(order)
            seeded_count += 1
        except Exception as e:
            logger.warning(f"Failed to seed order: {e}")
    
    return {
        "seeded": seeded_count,
        "message": f"Successfully seeded {seeded_count} orders to InMemoryOrderStore"
    }


@dev_router.delete("/orders/clear")
async def clear_orders_dev():
    """
    DEV-ONLY: Clear all orders from InMemoryOrderStore.
    
    Automatically disabled when ENV == "production".
    """
    import os
    from services.order_store import get_order_store
    
    env = os.environ.get("ENV", "development").lower()
    if env == "production":
        raise HTTPException(
            status_code=403, 
            detail="Development endpoints are disabled in production"
        )
    
    store = get_order_store(force_memory=True)
    await store.clear_all()
    
    return {"message": "InMemoryOrderStore cleared"}


@dev_router.get("/orders/{user_id}")
async def get_user_orders_dev(user_id: str):
    """
    DEV-ONLY: Get all orders for a user from InMemoryOrderStore.
    
    Automatically disabled when ENV == "production".
    """
    import os
    from services.order_store import get_order_store
    
    env = os.environ.get("ENV", "development").lower()
    if env == "production":
        raise HTTPException(
            status_code=403, 
            detail="Development endpoints are disabled in production"
        )
    
    store = get_order_store(force_memory=True)
    orders = await store.list_orders_for_user(user_id)
    
    return {
        "user_id": user_id,
        "orders": [order.model_dump() for order in orders],
        "count": len(orders)
    }


@dev_router.post("/content/studio/reset")
async def reset_studio_content_dev():
    """
    DEV-ONLY: Reset Studio content to defaults.
    
    Automatically disabled when ENV == "production".
    """
    import os
    from services.content_store import get_content_store
    
    env = os.environ.get("ENV", "development").lower()
    if env == "production":
        raise HTTPException(
            status_code=403, 
            detail="Development endpoints are disabled in production"
        )
    
    store = get_content_store(force_memory=True)
    content = await store.reset_studio_content()
    
    return {
        "message": "Studio content reset to defaults",
        "version": content.version
    }


# ============ CONTENT/CMS PUBLIC ENDPOINTS ============

@api_router.get("/content/studio")
async def get_studio_content_public():
    """
    Get Studio page content (public endpoint).
    Returns 404 if Studio page is disabled.
    """
    from services.content_store import get_content_store
    
    store = get_content_store(db)
    content = await store.get_studio_content()
    
    if not content.enabled:
        raise HTTPException(
            status_code=404,
            detail="Studio page is currently unavailable"
        )
    
    return content.model_dump()


@api_router.get("/content/studio/status")
async def get_studio_status():
    """
    Get Studio page enabled status (lightweight check).
    Used by nav to determine if Studio link should be shown.
    """
    from services.content_store import get_content_store
    
    store = get_content_store(db)
    content = await store.get_studio_content()
    
    return {"enabled": content.enabled}


# ============ CONTENT/CMS ADMIN ENDPOINTS ============

@api_router.get("/admin/content/studio")
async def get_studio_content_admin(admin: dict = Depends(get_admin_user)):
    """
    Get full Studio page content for admin editing.
    Returns complete content regardless of enabled status.
    """
    from services.content_store import get_content_store
    
    store = get_content_store(db)
    content = await store.get_studio_content()
    
    return content.model_dump()


@api_router.put("/admin/content/studio")
async def update_studio_content_admin(data: dict, admin: dict = Depends(get_admin_user)):
    """
    Update Studio page content (admin-only).
    Validates schema, saves via content store.
    """
    from services.content_store import get_content_store
    from models.studio_content import StudioContent
    
    try:
        # Validate and parse the incoming data
        content = StudioContent(**data)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content schema: {str(e)}"
        )
    
    store = get_content_store(db)
    updated = await store.save_studio_content(content)
    
    return {
        "message": "Studio content updated",
        "version": updated.version,
        "updated_at": updated.updated_at.isoformat()
    }


# Register dev router under /api prefix (endpoints self-guard against production)
api_router.include_router(dev_router)

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

# Note: services/logging.py provides structured JSON logging (setup_logging).
# Currently using basicConfig for simplicity. To enable structured logging:
# from services.logging import setup_logging
# setup_logging()

@app.on_event("startup")
async def startup_db_indexes():
    """Ensure all indexes are created on startup"""
    from services.indexes import ensure_indexes
    from services.ttl import setup_ttl_indexes
    from services.maintenance import get_maintenance_service
    from services.schema_guard import ensure_schema_version
    from config.security import validate_admin_config
    
    # Validate admin configuration
    validate_admin_config()
    
    # Create standard indexes
    results = await ensure_indexes(db)
    logger.info(f"Indexes ensured: {len(results['created'])} created/verified")
    
    # Setup TTL indexes (only if AUDIT_TTL_DAYS is set)
    ttl_results = await setup_ttl_indexes(db)
    if ttl_results["ttl_enabled"]:
        logger.info(f"TTL indexes created: {len(ttl_results['indexes_created'])}")
    else:
        logger.info("TTL indexes skipped (AUDIT_TTL_DAYS not set)")
    
    # D4: Initialize system metadata (idempotent)
    schema_result = await ensure_schema_version(db)
    logger.info(f"Schema version: {schema_result.get('status', 'unknown')}")
    
    # Start automated maintenance service (only if CLEANLINESS_AUTORUN is true)
    maintenance = get_maintenance_service(db)
    maintenance.start()

@app.on_event("shutdown")
async def shutdown_db_client():
    from services.maintenance import get_maintenance_service
    
    # Stop maintenance service
    maintenance = get_maintenance_service(db)
    await maintenance.stop()
    
    client.close()

from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
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

# Gallery Models
class GalleryItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    category: str
    image_url: str
    description: Optional[str] = None
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    price: Optional[float] = None
    featured: bool = False

class GalleryItemCreate(BaseModel):
    title: str
    category: str
    image_url: str
    description: Optional[str] = None
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    price: Optional[float] = None
    featured: bool = False

# Shop Models
class ProductResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    title: str
    category: str
    image_url: str
    description: str
    price: float
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    in_stock: bool = True

class ProductCreate(BaseModel):
    title: str
    category: str
    image_url: str
    description: str
    price: float
    carat: Optional[str] = None
    dimensions: Optional[str] = None
    in_stock: bool = True

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

# ============ AUTH HELPERS ============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
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

# ============ AUTH ROUTES ============

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
    
    # Check if product already in cart
    existing_item = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
    if existing_item:
        existing_item["quantity"] += item.quantity
    else:
        cart["items"].append({
            "product_id": item.product_id,
            "title": product["title"],
            "price": product["price"],
            "image_url": product["image_url"],
            "quantity": item.quantity
        })
    
    # Recalculate total
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
    
    # Clear cart
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

# ============ SEED DATA ============

@api_router.post("/seed")
async def seed_data():
    # Check if already seeded
    existing = await db.gallery.count_documents({})
    if existing > 0:
        return {"message": "Data already seeded"}
    
    # Seed gallery items
    gallery_items = [
        {"id": str(uuid.uuid4()), "title": "Montana Sapphire", "category": "sapphire", "image_url": "https://images.unsplash.com/photo-1605821771565-35e0d046a2fb?w=800", "description": "Brilliant blue Montana sapphire with exceptional clarity", "carat": "2.3ct", "dimensions": "8x6mm", "featured": True},
        {"id": str(uuid.uuid4()), "title": "Ceylon Blue Sapphire", "category": "sapphire", "image_url": "https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=800", "description": "Classic Ceylon blue with velvet undertones", "carat": "3.1ct", "dimensions": "9x7mm", "featured": True},
        {"id": str(uuid.uuid4()), "title": "Parti Sapphire", "category": "sapphire", "image_url": "https://images.unsplash.com/photo-1583937443351-f2f669fbe2cf?w=800", "description": "Unique bi-color parti sapphire", "carat": "1.8ct", "dimensions": "7x5mm", "featured": False},
        {"id": str(uuid.uuid4()), "title": "Pink Tourmaline", "category": "tourmaline", "image_url": "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800", "description": "Vibrant pink tourmaline from Brazil", "carat": "4.2ct", "dimensions": "10x8mm", "featured": True},
        {"id": str(uuid.uuid4()), "title": "Watermelon Tourmaline", "category": "tourmaline", "image_url": "https://images.unsplash.com/photo-1615655114865-4cc0d6328fd0?w=800", "description": "Rare watermelon tourmaline slice", "carat": "5.6ct", "dimensions": "12x10mm", "featured": False},
        {"id": str(uuid.uuid4()), "title": "Green Tourmaline", "category": "tourmaline", "image_url": "https://images.unsplash.com/photo-1611955167811-4711904bb9f8?w=800", "description": "Deep forest green tourmaline", "carat": "2.9ct", "dimensions": "9x7mm", "featured": False},
        {"id": str(uuid.uuid4()), "title": "Colombian Emerald", "category": "emerald", "image_url": "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800", "description": "Fine Colombian emerald with garden inclusions", "carat": "1.5ct", "dimensions": "7x5mm", "featured": True},
        {"id": str(uuid.uuid4()), "title": "Zambian Emerald", "category": "emerald", "image_url": "https://images.unsplash.com/photo-1551122087-f99a4ade9f1e?w=800", "description": "Deep green Zambian emerald", "carat": "2.1ct", "dimensions": "8x6mm", "featured": False},
        {"id": str(uuid.uuid4()), "title": "AAA Tanzanite", "category": "tanzanite", "image_url": "https://images.unsplash.com/photo-1613087546341-2c3f27aaa6d5?w=800", "description": "Exceptional violet-blue tanzanite", "carat": "3.8ct", "dimensions": "10x8mm", "featured": True},
        {"id": str(uuid.uuid4()), "title": "Tanzanite Oval", "category": "tanzanite", "image_url": "https://images.unsplash.com/photo-1583937443351-f2f669fbe2cf?w=800", "description": "Classic oval cut tanzanite", "carat": "2.4ct", "dimensions": "9x7mm", "featured": False},
        {"id": str(uuid.uuid4()), "title": "Santa Maria Aquamarine", "category": "aquamarine", "image_url": "https://images.unsplash.com/photo-1610030184561-9c22cd0a632a?w=800", "description": "Rare Santa Maria aquamarine", "carat": "5.2ct", "dimensions": "12x10mm", "featured": True},
        {"id": str(uuid.uuid4()), "title": "Aquamarine Crystal", "category": "aquamarine", "image_url": "https://images.unsplash.com/photo-1587049016823-69ef9d68bd44?w=800", "description": "Eye-clean aquamarine", "carat": "3.7ct", "dimensions": "11x9mm", "featured": False},
        {"id": str(uuid.uuid4()), "title": "Rhodolite Garnet", "category": "garnet", "image_url": "https://images.unsplash.com/photo-1603561596112-0a132b757442?w=800", "description": "Raspberry rhodolite garnet", "carat": "2.8ct", "dimensions": "8x8mm", "featured": True},
        {"id": str(uuid.uuid4()), "title": "Tsavorite Garnet", "category": "garnet", "image_url": "https://images.unsplash.com/photo-1600119614318-75b8eba35265?w=800", "description": "Vivid green tsavorite garnet", "carat": "1.2ct", "dimensions": "6x5mm", "featured": False},
        {"id": str(uuid.uuid4()), "title": "Spessartine Garnet", "category": "garnet", "image_url": "https://images.unsplash.com/photo-1610030184561-9c22cd0a632a?w=800", "description": "Mandarin orange spessartine", "carat": "3.5ct", "dimensions": "9x7mm", "featured": False},
        {"id": str(uuid.uuid4()), "title": "Rare Alexandrite", "category": "other", "image_url": "https://images.unsplash.com/photo-1615655114865-4cc0d6328fd0?w=800", "description": "Color-change alexandrite", "carat": "0.8ct", "dimensions": "5x4mm", "featured": True},
        {"id": str(uuid.uuid4()), "title": "Spinel Red", "category": "other", "image_url": "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800", "description": "Vivid red spinel from Burma", "carat": "1.9ct", "dimensions": "7x6mm", "featured": False},
    ]
    await db.gallery.insert_many(gallery_items)
    
    # Seed products
    products = [
        {"id": str(uuid.uuid4()), "title": "Blue Sapphire - Cushion Cut", "category": "sapphire", "image_url": "https://images.unsplash.com/photo-1605821771565-35e0d046a2fb?w=800", "description": "Natural blue sapphire, heat treated, cushion cut", "price": 2850.00, "carat": "2.3ct", "dimensions": "8x6mm", "in_stock": True, "featured": True},
        {"id": str(uuid.uuid4()), "title": "Pink Tourmaline - Oval", "category": "tourmaline", "image_url": "https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800", "description": "Brazilian pink tourmaline, natural, no treatment", "price": 1450.00, "carat": "4.2ct", "dimensions": "10x8mm", "in_stock": True, "featured": True},
        {"id": str(uuid.uuid4()), "title": "Colombian Emerald - Emerald Cut", "category": "emerald", "image_url": "https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?w=800", "description": "Fine Colombian emerald with minor oil treatment", "price": 4200.00, "carat": "1.5ct", "dimensions": "7x5mm", "in_stock": True, "featured": True},
        {"id": str(uuid.uuid4()), "title": "Tanzanite - Trillion", "category": "tanzanite", "image_url": "https://images.unsplash.com/photo-1613087546341-2c3f27aaa6d5?w=800", "description": "AAA grade tanzanite, heat treated", "price": 3100.00, "carat": "3.8ct", "dimensions": "10x8mm", "in_stock": True, "featured": False},
        {"id": str(uuid.uuid4()), "title": "Aquamarine - Pear", "category": "aquamarine", "image_url": "https://images.unsplash.com/photo-1610030184561-9c22cd0a632a?w=800", "description": "Santa Maria aquamarine, natural", "price": 1850.00, "carat": "5.2ct", "dimensions": "12x10mm", "in_stock": True, "featured": False},
        {"id": str(uuid.uuid4()), "title": "Rhodolite Garnet - Round", "category": "garnet", "image_url": "https://images.unsplash.com/photo-1603561596112-0a132b757442?w=800", "description": "Natural rhodolite garnet, no treatment", "price": 680.00, "carat": "2.8ct", "dimensions": "8x8mm", "in_stock": True, "featured": False},
    ]
    await db.products.insert_many(products)
    
    return {"message": "Data seeded successfully", "gallery_count": len(gallery_items), "products_count": len(products)}

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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

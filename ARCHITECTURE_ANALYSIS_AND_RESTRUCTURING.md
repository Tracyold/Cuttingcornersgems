# Website Architecture Analysis & Restructuring Recommendations

**Date:** February 20, 2026  
**Status:** Critical - Features Broken

---

## Executive Summary

After analyzing the codebase, I've identified significant architectural issues causing feature failures. The main problems are:

1. **Backend monolith** - 4060-line `server.py` with mixed concerns
2. **Incomplete service layer** - Services referenced but not properly implemented
3. **Scattered business logic** - No clear separation of concerns
4. **Frontend coupling** - Direct API calls instead of service layer
5. **Missing error boundaries** - No consistent error handling
6. **Inadequate state management** - Context not properly structured

**Impact:** Negotiations, payments, bookings, and inquiries are all broken or unreliable.

---

## Current Architecture Issues

### 1. Backend Structure Problems

#### Issue: Monolithic `server.py` (4060 lines)
**Location:** `/backend/server.py`

**Problems:**
- All routes, models, business logic, and helpers in one file
- Mixed concerns: auth, products, payments, negotiations, admin
- Impossible to maintain or debug
- High coupling, low cohesion
- Services imported but not separated

**Example of the mess:**
```python
# Lines 1-736: Imports, models, auth helpers all mixed
# Lines 614-1178: Admin routes mixed with public routes  
# Lines 2027-2329: Bookings, orders, payments all interleaved
# Lines 2878-3288: Negotiations scattered throughout
```

#### Issue: Services Referenced But Not Implemented
**Location:** Multiple service imports in `server.py`

```python
from services.email_provider import get_email_provider, NullEmailProvider
from services.negotiation_notifications import notify_user_offer_sent
from services.payment_provider import get_payment_provider
```

**Problems:**
- Services exist but are called from wrong context
- No proper dependency injection
- Error handling happens in routes instead of services
- Business logic leaks into controllers

### 2. Frontend Structure Problems

#### Issue: Direct API Calls in Components
**Location:** `/frontend/src/pages/*.js`

**Example from `Booking.js`:**
```javascript
await axios.post(`${API_URL}/bookings`, submitData);
```

**Problems:**
- No API abstraction layer
- Error handling duplicated in every component
- Token management scattered
- No request/response interceptors
- Difficult to mock for testing

#### Issue: Context Overload
**Location:** `/frontend/src/context/`

**Problems:**
- AuthContext, CartContext, AdminContext doing too much
- Business logic in context providers
- No separation between state and operations
- Difficult to test

#### Issue: Missing Service Layer
**Location:** `/frontend/src/api/` (only has `adminApi.js`)

**Problems:**
- Only admin API abstracted
- Public APIs still use direct axios calls
- No consistent error handling
- No request retry logic
- No caching strategy

### 3. Feature-Specific Issues

#### Negotiations (Broken)
**Backend:** Lines 2878-3288 in `server.py`
**Frontend:** `Shop.js`, `Dashboard.js`

**Problems:**
- Negotiation store referenced but implementation unclear
- SMS notifications called but may fail silently
- Token store not abstracted
- No transaction boundaries
- Frontend doesn't handle all response states

#### Payments (Broken)
**Backend:** Lines 2302-2400, 3188-3288 in `server.py`
**Frontend:** `Cart.js`, `Dashboard.js`

**Problems:**
- Payment provider logic in routes
- No payment state machine
- Stripe integration incomplete
- Order/payment state synchronization broken
- No webhook handling visible
- Manual payment flow unclear

#### Bookings (Broken)
**Backend:** Lines 2027-2049 in `server.py`
**Frontend:** `Booking.js`

**Problems:**
- Simple POST with no validation
- No email confirmation logic
- SMS integration referenced but not implemented
- No booking state management
- Success but no follow-up workflow

#### Product Inquiries (Broken)
**Backend:** Lines 2465-2483 in `server.py`
**Frontend:** `Shop.js`

**Problems:**
- Just inserts to database, no processing
- No email/SMS notifications
- No admin notification system
- User gets success message but nothing happens
- No inquiry tracking or follow-up

---

## Recommended Architecture Restructure

### Phase 1: Backend Reorganization (High Priority)

#### New Directory Structure

```
backend/
├── server.py                    # FastAPI app initialization only (~100 lines)
├── config/
│   ├── __init__.py
│   ├── settings.py              # Environment & app config
│   └── security.py              # Already exists, keep as-is
├── models/
│   ├── __init__.py
│   ├── user.py                  # User models
│   ├── product.py               # Product models
│   ├── order.py                 # Order/cart models
│   ├── booking.py               # Booking models
│   ├── inquiry.py               # Inquiry models
│   └── negotiation.py           # Already exists, verify
├── routes/                      # NEW - Route handlers only
│   ├── __init__.py
│   ├── auth.py                  # Auth routes
│   ├── products.py              # Product CRUD
│   ├── orders.py                # Order/cart routes
│   ├── bookings.py              # Booking routes
│   ├── inquiries.py             # All inquiry routes
│   ├── negotiations.py          # Negotiation routes
│   ├── payments.py              # Payment routes
│   └── admin/
│       ├── __init__.py
│       ├── dashboard.py
│       ├── products.py
│       ├── users.py
│       ├── settings.py
│       └── negotiations.py
├── services/                    # Business logic layer
│   ├── __init__.py
│   ├── auth_service.py          # Authentication logic
│   ├── user_service.py          # User operations
│   ├── product_service.py       # Product business logic
│   ├── order_service.py         # Order processing
│   ├── booking_service.py       # Booking processing
│   ├── inquiry_service.py       # Inquiry handling
│   ├── negotiation_service.py   # Negotiation logic
│   ├── payment_service.py       # Payment processing
│   ├── notification_service.py  # Email/SMS notifications
│   ├── email_provider.py        # Already exists
│   └── payment_provider.py      # Already exists
├── repositories/                # NEW - Data access layer
│   ├── __init__.py
│   ├── base.py                  # Base repository pattern
│   ├── user_repository.py
│   ├── product_repository.py
│   ├── order_repository.py
│   ├── booking_repository.py
│   ├── inquiry_repository.py
│   └── negotiation_repository.py
├── middleware/
│   └── cache_control.py         # Already exists
├── utils/                       # Shared utilities
│   ├── __init__.py
│   ├── validators.py
│   ├── helpers.py
│   └── exceptions.py            # Custom exception classes
└── tests/                       # Already exists
```

#### Migration Strategy

**Step 1: Extract Models (2 hours)**
- Move all Pydantic models from `server.py` to `models/` files
- Keep backward compatibility imports in `server.py`

**Step 2: Create Repository Layer (3 hours)**
- Abstract database operations
- Implement base repository with CRUD operations
- Create specific repositories for each domain

**Step 3: Create Service Layer (4 hours)**
- Move business logic from routes to services
- Implement proper error handling
- Add transaction management
- Wire up notification services

**Step 4: Refactor Routes (3 hours)**
- Move route handlers to route files
- Keep routes thin - delegate to services
- Register all routers in `server.py`

**Step 5: Wire Everything Together (2 hours)**
- Update `server.py` to import and register routers
- Ensure all dependencies properly injected
- Test each feature endpoint

### Phase 2: Frontend Reorganization (Medium Priority)

#### New Directory Structure

```
frontend/src/
├── api/                         # API layer (abstraction)
│   ├── index.js                 # Export all APIs
│   ├── client.js                # Axios instance with interceptors
│   ├── authApi.js               # Auth endpoints
│   ├── productApi.js            # Product endpoints
│   ├── orderApi.js              # Order/cart endpoints
│   ├── bookingApi.js            # Booking endpoints
│   ├── inquiryApi.js            # Inquiry endpoints
│   ├── negotiationApi.js        # Negotiation endpoints
│   ├── paymentApi.js            # Payment endpoints
│   └── adminApi.js              # Already exists
├── services/                    # NEW - Business logic
│   ├── authService.js           # Auth operations
│   ├── cartService.js           # Cart operations
│   ├── notificationService.js   # Toast/notification wrapper
│   └── validationService.js     # Form validation
├── context/
│   ├── AuthContext.js           # Keep - auth state only
│   ├── CartContext.js           # Simplify - state only
│   └── AdminContext.js          # Keep - admin state only
├── hooks/                       # Custom React hooks
│   ├── useAuth.js
│   ├── useCart.js
│   ├── useApi.js                # Generic API hook
│   ├── useForm.js               # Form handling
│   └── useNegotiations.js
├── components/
│   ├── ui/                      # Shadcn components
│   ├── common/                  # NEW - Shared components
│   │   ├── ErrorBoundary.js
│   │   ├── LoadingSpinner.js
│   │   └── ErrorMessage.js
│   ├── forms/                   # NEW - Form components
│   │   ├── BookingForm.js
│   │   ├── InquiryForm.js
│   │   └── NegotiationForm.js
│   ├── Layout.js
│   └── ...
├── pages/
│   ├── Booking.js               # Refactored
│   ├── Cart.js                  # Refactored
│   ├── Shop.js                  # Refactored
│   └── admin/
│       └── ...
└── utils/
    ├── constants.js
    ├── formatters.js
    └── validators.js
```

#### Migration Strategy

**Step 1: Create API Layer (2 hours)**
- Create `api/client.js` with configured axios instance
- Add request/response interceptors
- Implement error handling
- Create API modules for each domain

**Step 2: Refactor Contexts (1 hour)**
- Remove business logic from contexts
- Keep only state and setState
- Use API layer for operations

**Step 3: Create Custom Hooks (2 hours)**
- Extract API calls to custom hooks
- Implement loading/error states
- Add caching where appropriate

**Step 4: Refactor Components (3 hours)**
- Update components to use new API layer
- Use custom hooks instead of direct API calls
- Add error boundaries
- Improve loading states

### Phase 3: Feature-Specific Fixes

#### Negotiations Fix

**Backend Changes:**
```python
# services/negotiation_service.py
class NegotiationService:
    def __init__(self, db, notification_service):
        self.store = get_negotiation_store(db)
        self.notification_service = notification_service
    
    async def create_negotiation(self, user_id, product_id, offer_amount, text):
        # Validate eligibility
        # Create thread
        # Send notifications
        # Return thread
        pass
    
    async def send_message(self, negotiation_id, user_id, message):
        # Validate ownership
        # Add message
        # Notify other party
        pass
```

**Frontend Changes:**
```javascript
// api/negotiationApi.js
export const createNegotiation = async (productId, offerAmount, text) => {
  const response = await client.post('/negotiations', {
    product_id: productId,
    offer_amount: offerAmount,
    text
  });
  return response.data;
};

// hooks/useNegotiations.js
export const useNegotiations = () => {
  const [negotiations, setNegotiations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const create = async (productId, offerAmount, text) => {
    setLoading(true);
    setError(null);
    try {
      const result = await negotiationApi.createNegotiation(productId, offerAmount, text);
      // Update state
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };
  
  return { negotiations, loading, error, create };
};
```

#### Payments Fix

**Backend Changes:**
```python
# services/payment_service.py
class PaymentService:
    def __init__(self, db, payment_provider, order_service):
        self.db = db
        self.provider = payment_provider
        self.order_service = order_service
    
    async def create_checkout_session(self, order_id, user_id):
        # Validate order
        # Create payment session
        # Return checkout URL
        pass
    
    async def handle_webhook(self, payload, signature):
        # Verify signature
        # Process payment event
        # Update order status
        # Mark products sold
        # Send confirmation
        pass
    
    async def mark_paid_manually(self, order_id):
        # Admin manual payment
        # Update order
        # Mark products sold
        pass
```

**Frontend Changes:**
```javascript
// api/paymentApi.js
export const createCheckoutSession = async (orderId) => {
  const response = await client.post('/payments/checkout-session', {
    order_id: orderId
  });
  return response.data;
};

// hooks/usePayment.js
export const usePayment = () => {
  const checkout = async (orderId) => {
    const session = await paymentApi.createCheckoutSession(orderId);
    if (session.checkout_url) {
      window.location.href = session.checkout_url;
    } else {
      throw new Error('Payment provider not configured');
    }
  };
  
  return { checkout };
};
```

#### Bookings Fix

**Backend Changes:**
```python
# services/booking_service.py
class BookingService:
    def __init__(self, db, notification_service):
        self.db = db
        self.notification_service = notification_service
    
    async def create_booking(self, booking_data, user_id=None):
        # Validate data
        # Create booking
        # Send confirmation email
        # Notify admin
        # Return booking
        pass
    
    async def update_status(self, booking_id, status):
        # Update booking
        # Notify user of status change
        pass
```

#### Inquiries Fix

**Backend Changes:**
```python
# services/inquiry_service.py
class InquiryService:
    def __init__(self, db, notification_service):
        self.db = db
        self.notification_service = notification_service
    
    async def create_product_inquiry(self, inquiry_data):
        # Create inquiry
        # Send confirmation to user
        # Notify admin
        # Return inquiry
        pass
    
    async def create_sell_inquiry(self, inquiry_data):
        # Create inquiry
        # Send confirmation
        # Notify admin
        pass
```

---

## Implementation Plan

### Week 1: Backend Foundation
- **Day 1-2:** Extract models and create repository layer
- **Day 3-4:** Create service layer with proper business logic
- **Day 5:** Refactor routes to use services

### Week 2: Backend Features
- **Day 1:** Fix bookings and inquiries with notifications
- **Day 2:** Fix negotiations flow
- **Day 3:** Fix payments and webhooks
- **Day 4:** Fix admin operations
- **Day 5:** Testing and bug fixes

### Week 3: Frontend Refactor
- **Day 1-2:** Create API layer and client setup
- **Day 3:** Create custom hooks
- **Day 4-5:** Refactor components to use new architecture

### Week 4: Integration & Testing
- **Day 1-2:** End-to-end testing of all features
- **Day 3:** Performance optimization
- **Day 4:** Documentation
- **Day 5:** Final deployment preparation

---

## Key Principles for New Architecture

### 1. Separation of Concerns
- **Routes:** Handle HTTP only (validation, serialization)
- **Services:** Business logic and orchestration
- **Repositories:** Data access only
- **Models:** Data structure only

### 2. Dependency Injection
```python
# Good
def get_booking_service(db=Depends(get_db)):
    notification_service = get_notification_service(db)
    return BookingService(db, notification_service)

@router.post("/bookings")
async def create_booking(
    data: BookingCreate,
    service: BookingService = Depends(get_booking_service)
):
    return await service.create_booking(data)
```

### 3. Error Handling
```python
# services/base_service.py
class BaseService:
    async def _execute(self, operation, error_message):
        try:
            return await operation()
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"{error_message}: {e}")
            raise HTTPException(status_code=500, detail=error_message)
```

### 4. Frontend API Pattern
```javascript
// api/client.js
const client = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL + '/api',
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Clear auth and redirect
    }
    return Promise.reject(error);
  }
);
```

### 5. Testing Strategy
- **Unit tests:** Services and repositories
- **Integration tests:** Routes with mocked services
- **E2E tests:** Critical user flows

---

## Immediate Actions (Today)

### Critical Fixes (Can be done now without full refactor)

1. **Fix Bookings - Add Notifications**
```python
# In server.py booking route, add:
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
    
    # ADD THIS: Send notification
    try:
        settings = await db.site_settings.find_one({}, {"_id": 0})
        if settings and settings.get("email_enabled"):
            from services.email_provider import get_email_provider
            provider = get_email_provider(settings)
            # Send confirmation to user
            await provider.send_email(
                to=booking_data.email,
                subject="Booking Confirmation",
                body=f"Your booking for {booking_data.service} has been received."
            )
    except Exception as e:
        logging.warning(f"Failed to send booking confirmation: {e}")
    
    return BookingResponse(**{k: v for k, v in booking.items() if k != "_id"})
```

2. **Fix Inquiries - Add Notifications**
Similar pattern for product inquiries and sell inquiries.

3. **Fix Negotiations - Add Error Handling**
```python
# Add better error messages in negotiation creation
```

4. **Fix Payments - Add State Validation**
```python
# In checkout endpoint, validate order state properly
```

---

## Conclusion

The current architecture is unsustainable. The monolithic `server.py` makes debugging impossible, and the lack of service layer means business logic is scattered everywhere.

**Recommended Path Forward:**
1. **Immediate:** Apply critical fixes to bookings/inquiries (2-3 hours)
2. **Week 1:** Backend restructure (foundation)
3. **Week 2:** Backend features (fix all flows)
4. **Week 3:** Frontend restructure
5. **Week 4:** Integration testing

**Alternative (Faster but Technical Debt):**
- Fix each broken feature in-place in `server.py`
- Add notification calls where missing
- Add proper error handling
- This will work but makes future changes harder

The proper restructure will take ~4 weeks but will make the codebase maintainable and allow easy feature additions (like chat threads to admin).

# D3: MUTATION CENTRALIZATION POLICY

## Purpose
Prevent "logic copies" where business logic is duplicated across route handlers, leading to inconsistent behavior and maintenance burden.

---

## Policy: Thin Route Handlers

### Rule: Route handlers must be thin

**Route handlers should only**:
- Validate authentication/authorization
- Parse request parameters
- Call service layer function
- Return response

**Route handlers must NOT**:
- Contain business logic
- Directly manipulate database
- Duplicate validation logic
- Implement complex algorithms

---

## Current Implementation Status

### ✅ Compliant Services

All new features added in Items 1-7 follow this pattern:

**Example: Integrity Report**
```python
# Route handler (thin)
@api_router.get("/admin/integrity-report")
async def get_integrity_report(admin: dict = Depends(get_admin_user)):
    from services.integrity import generate_integrity_report
    report = await generate_integrity_report(db)
    return report

# Business logic (service layer)
# Location: /app/backend/services/integrity.py
async def generate_integrity_report(db: AsyncIOMotorDatabase) -> Dict[str, Any]:
    # All business logic here
    # Reusable, testable, maintainable
```

**Services Following Pattern**:
- `services/integrity.py` - Data integrity checks
- `services/indexes.py` - Database indexing
- `services/ttl.py` - TTL management
- `services/maintenance.py` - Automated maintenance
- `services/logging.py` - Structured logging
- `services/redaction.py` - PII redaction

---

## Legacy Code (Pre-Refactor)

### ⚠️ Monolithic Route Handlers

**File**: `/app/backend/server.py`

Legacy endpoints contain business logic directly in route handlers. Examples:

**Cart Operations** (Lines ~667-720):
```python
@api_router.post("/cart/add")
async def add_to_cart(request: AddToCartRequest, current_user: dict = Depends(get_current_user)):
    # Business logic mixed with route handling
    product = await db.products.find_one({"id": request.product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    cart = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    # ... more business logic ...
```

**Order Creation** (Lines ~741-760):
```python
@api_router.post("/orders")
async def create_order(current_user: dict = Depends(get_current_user)):
    # Business logic in route handler
    cart = await db.carts.find_one({"user_id": current_user["id"]}, {"_id": 0})
    # ... order creation logic ...
```

---

## Migration Plan (Future)

### Phase 1: Create Service Modules (✅ Complete)
- Created `/app/backend/services/` directory
- Established pattern with new features

### Phase 2: Extract Legacy Logic (Future)
Move legacy business logic to services:

**Target Services**:
1. `services/cart.py`
   - `add_to_cart()`
   - `remove_from_cart()`
   - `update_cart_quantity()`
   - `clear_cart()`

2. `services/orders.py`
   - `create_order()`
   - `get_user_orders()`
   - `get_order_details()`

3. `services/products.py`
   - `list_products()`
   - `get_product()`
   - `create_product()`
   - `update_product()`
   - `delete_product()`

4. `services/gallery.py`
   - `list_gallery_items()`
   - `get_gallery_item()`
   - `create_gallery_item()`
   - `update_gallery_item()`
   - `delete_gallery_item()`

### Phase 3: Update Route Handlers (Future)
Make route handlers thin:

```python
# Before (business logic in handler)
@api_router.post("/cart/add")
async def add_to_cart(request: AddToCartRequest, current_user: dict = Depends(get_current_user)):
    product = await db.products.find_one(...)
    cart = await db.carts.find_one(...)
    # ... 20 lines of business logic ...
    
# After (thin handler)
@api_router.post("/cart/add")
async def add_to_cart(request: AddToCartRequest, current_user: dict = Depends(get_current_user)):
    from services.cart import add_to_cart_service
    result = await add_to_cart_service(db, current_user["id"], request.product_id, request.quantity)
    return result
```

---

## Benefits

### 1. Single Source of Truth
- Each invariant has ONE canonical location
- Fix in one place = fixed everywhere
- No "fix here but forgot there" bugs

### 2. Testability
- Service functions can be unit tested
- No need to mock HTTP requests
- Easy to test edge cases

### 3. Reusability
- Services can be called from:
  - Route handlers
  - Background jobs
  - Admin scripts
  - Other services

### 4. Maintainability
- Clear separation of concerns
- Easy to find business logic
- Route handlers become self-documenting

---

## Anti-Patterns (Prohibited)

### ❌ Logic Duplication
```python
# BAD: Same logic in two handlers
@api_router.post("/cart/add")
async def add_to_cart(...):
    product = await db.products.find_one(...)
    # validation logic
    cart = await db.carts.find_one(...)
    # cart update logic

@api_router.post("/cart/bulk-add")
async def bulk_add_to_cart(...):
    # DUPLICATE validation logic
    # DUPLICATE cart update logic
```

### ❌ Mixed Responsibilities
```python
# BAD: Business logic + HTTP handling + DB access all mixed
@api_router.post("/orders")
async def create_order(...):
    cart = await db.carts.find_one(...)  # DB access
    if not cart["items"]:                 # Business logic
        raise HTTPException(...)          # HTTP handling
    total = sum(...)                      # Business logic
    order_id = str(uuid.uuid4())          # Business logic
    await db.orders.insert_one(...)       # DB access
    return {"order_id": order_id}         # HTTP handling
```

### ❌ Copy-Paste Programming
```python
# BAD: Copying logic instead of calling service
# Handler A
product = await db.products.find_one({"id": id, "in_stock": True})

# Handler B
product = await db.products.find_one({"id": id, "in_stock": True})

# Handler C
product = await db.products.find_one({"id": id, "in_stock": True})

# SHOULD BE: One service function called by all three
```

---

## Enforcement

### Code Review Checklist
- [ ] New route handlers are thin (< 10 lines)
- [ ] Business logic is in services/
- [ ] No duplicate logic between handlers
- [ ] Service functions are reusable
- [ ] One canonical location per invariant

### Automatic Detection
Future: Add linter rule to detect:
- Route handlers > 20 lines
- Direct DB access outside services/
- Duplicate code patterns

---

## Success Metrics

- **Average route handler size**: < 10 lines
- **Code duplication**: Trending toward zero
- **Service coverage**: All mutations in services/
- **Test coverage**: Services have unit tests

---

## Current Status

**New Code**: ✅ Follows pattern  
**Legacy Code**: ⚠️ Needs refactoring (future work)  
**Pattern Established**: ✅ Yes  
**Documentation**: ✅ This file

**Next Steps**: 
1. Continue pattern for all new features
2. Gradually refactor legacy code
3. Add automated detection

---

**Policy Established**: 2026-02-09  
**Pattern Source**: Items 1-7 implementation  
**Reference**: `/app/backend/services/` directory

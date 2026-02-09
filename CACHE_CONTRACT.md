# CACHE CONTRACT (C4)

**Purpose**: Explicit contract for future CDN/Redis additions  
**Status**: Documentation only (no runtime implementation)  
**Created**: P_cache phase

---

## CACHEABLE RESOURCES

### Public Gallery (READ-ONLY)

**Endpoints**:
- GET `/api/gallery`
- GET `/api/gallery/{item_id}`
- GET `/api/gallery/categories`
- GET `/api/gallery/featured`

**Cache Policy**:
- TTL: 60 seconds
- Scope: Public
- Invalidation: On gallery item create/update/delete

**Headers** (set by middleware):
```
Cache-Control: public, max-age=60
```

---

### Public Products (READ-ONLY)

**Endpoints**:
- GET `/api/products`
- GET `/api/products/{product_id}`

**Cache Policy**:
- TTL: 60 seconds
- Scope: Public
- Invalidation: On product create/update/delete

**Headers** (set by middleware):
```
Cache-Control: public, max-age=60
```

---

## NEVER CACHEABLE RESOURCES

### Admin Data (ALL ENDPOINTS)

**Endpoints**: All `/api/admin/*`

**Policy**: NEVER cache
- Real-time data required
- User-specific views
- State-changing operations

**Headers** (set by middleware):
```
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Vary: Authorization
```

---

### Authenticated User Data

**Endpoints**: 
- `/api/cart`, `/api/cart/*`
- `/api/orders`, `/api/orders/*`
- `/api/user/*`

**Policy**: NEVER cache
- User-specific data
- Privacy requirement
- Real-time accuracy needed

**Headers** (set by middleware):
```
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Vary: Authorization
```

---

## INVALIDATION TRIGGERS

### Product Changes

**Trigger Events**:
- POST `/api/admin/products` (create)
- PATCH `/api/admin/products/{id}` (update)
- DELETE `/api/admin/products/{id}` (delete)

**Invalidation Required**:
- Flush: `/api/products` cache
- Flush: `/api/products/{affected_id}` cache
- Purge by tag: `products:all`

**Future Implementation**:
```python
# After product mutation
await cache.invalidate_pattern("/api/products*")
await cache.invalidate_tag("products:all")
```

---

### Gallery Changes

**Trigger Events**:
- POST `/api/admin/gallery` (create)
- PATCH `/api/admin/gallery/{id}` (update)
- DELETE `/api/admin/gallery/{id}` (delete)

**Invalidation Required**:
- Flush: `/api/gallery` cache
- Flush: `/api/gallery/{affected_id}` cache
- Flush: `/api/gallery/categories` cache (category list may change)
- Flush: `/api/gallery/featured` cache (if featured flag changed)
- Purge by tag: `gallery:all`

**Future Implementation**:
```python
# After gallery mutation
await cache.invalidate_pattern("/api/gallery*")
await cache.invalidate_tag("gallery:all")
```

---

## CDN INTEGRATION (FUTURE)

### Requirements

When adding CDN (CloudFlare, Fastly, etc.):

1. **Configure Purge API**
   - Store CDN API credentials in `site_settings`
   - Add purge function to `services/cache.py`

2. **Hook Purge to Mutations**
   - After product create/update/delete → CDN purge
   - After gallery create/update/delete → CDN purge

3. **Respect Cache Headers**
   - CDN should honor `Cache-Control: no-store` for admin/auth
   - CDN should cache public endpoints per `max-age`

4. **Vary Header Handling**
   - CDN must respect `Vary: Authorization`
   - Prevents serving cached auth responses to different users

---

## REDIS INTEGRATION (FUTURE)

### Requirements

When adding Redis cache layer:

1. **Cache Key Pattern**
   - Products: `products:all`, `products:{category}`, `product:{id}`
   - Gallery: `gallery:all`, `gallery:{category}`, `gallery:featured`, `gallery:{id}`

2. **TTL Configuration**
   - Match HTTP cache TTL: 60 seconds
   - Background refresh: Optional (refresh at 50 seconds)

3. **Invalidation**
   - After mutation: Delete matching keys
   - Pattern delete: `redis.delete("products:*")`
   - Tag-based: Use Redis Sets for tag tracking

4. **Fallback**
   - Cache miss: Query MongoDB
   - Redis down: Direct MongoDB queries
   - No hard dependency on Redis

---

## ANTI-PATTERNS (PROHIBITED)

### ❌ Caching Private Data

```python
# BAD: Caching user-specific data
await cache.set(f"cart:{user_id}", cart_data, ttl=3600)

# Result: Privacy violation, stale data
```

### ❌ Infinite Cache TTL

```python
# BAD: Never-expiring cache
await cache.set("products", data, ttl=None)

# Result: Stale data forever
```

### ❌ Forgetting Invalidation

```python
# BAD: Update product without invalidating cache
await db.products.update_one(...)
# Cache still has old data!

# CORRECT:
await db.products.update_one(...)
await cache.invalidate("products:*")
```

### ❌ Cache as Source of Truth

```python
# BAD: Querying cache without DB fallback
product = await cache.get(f"product:{id}")
if not product:
    raise HTTPException(404)  # Product might exist in DB!

# CORRECT:
product = await cache.get(f"product:{id}")
if not product:
    product = await db.products.find_one({"id": id})
    if product:
        await cache.set(f"product:{id}", product)
```

---

## TESTING REQUIREMENTS (FUTURE)

When implementing cache layer:

### Test Cases
1. Cache hit: Verify data served from cache
2. Cache miss: Verify fallback to DB
3. Cache invalidation: Verify stale data removed
4. Cache expiration: Verify TTL honored
5. Private data: Verify admin/auth not cached
6. Authorization variance: Verify user A can't get user B's cached data

### Monitoring
- Cache hit rate
- Cache miss rate
- Invalidation frequency
- Memory usage
- Stale serve incidents (should be zero)

---

## CURRENT IMPLEMENTATION

### Active
- ✅ HTTP cache headers (middleware)
- ✅ Cache-Control by endpoint class
- ✅ Admin/auth: no-store
- ✅ Public: max-age=60

### Not Implemented (Future)
- ❌ CDN integration
- ❌ Redis cache layer
- ❌ Purge API
- ❌ Cache invalidation hooks

---

## SUMMARY

**Contract Established**: ✅  
**Runtime Implementation**: Header-only  
**CDN/Redis Ready**: Yes (contract defined)  
**Prevents Future Junk**: Yes (clear rules)

This document serves as the authoritative cache contract for any future caching layer additions.

---

**Last Updated**: 2026-02-09  
**Next Review**: When CDN or Redis is added

# L3: RETENTION + SIZE BOUNDING

## Status: Already Implemented

### Audit Log TTL
- **Implemented in**: Item 4 (P_cache Item 4)
- **File**: `/app/backend/services/ttl.py`
- **Policy**: Controlled by `AUDIT_TTL_DAYS` environment variable
- **Default**: Not set (no TTL, preserves all data)
- **Collections with TTL support**:
  - `archived_bookings`
  - `archived_inquiries`
  - `archived_products`
  - `archived_gallery`
  - `user_messages`
  - `bookings`

### Log Volume Guard
- **Implemented in**: `/app/backend/services/redaction.py`
- **Constant**: `MAX_LOG_ITEMS = 10`
- **Behavior**: Log counts and IDs only for collections > 10 items
- **Function**: `safe_log_collection()`

### App Logs Rotation
- **Responsibility**: Platform (Emergent/Kubernetes)
- **Backend compliance**: JSON line format for easy rotation
- **No per-item payloads**: Logs use counts and IDs only

### Archived Data
- **Policy**: No TTL on `archived_*` collections (explicit non-TTL)
- **Separation**: Kept separate from audit logs
- **Rationale**: Long-term storage for compliance/reference

## Conclusion

✅ L3 requirements already satisfied by existing implementation
- TTL indexes: Configurable via `AUDIT_TTL_DAYS`
- Volume guards: Implemented in redaction utility
- Platform rotation: Delegated appropriately

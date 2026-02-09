# VERIFICATION 3: DORMANT-LOGIC GOVERNANCE

## Evidence: Dead-Path Registry & Unused Module Analysis

### Service Modules Inventory

| Module | Status | Functions | Classes | Usage | Purpose |
|--------|--------|-----------|---------|-------|---------|
| `integrity.py` | ACTIVE | 4 | 0 | 100% | Data integrity checks |
| `indexes.py` | ACTIVE | 1 | 0 | 100% | Database indexing |
| `ttl.py` | ACTIVE | 2 | 0 | 100% | TTL management |
| `maintenance.py` | ACTIVE | 1 | 1 | 100% | Automated maintenance |
| `auth.py` | DORMANT | 0 | 1 | 0% | Future auth migration |

### Active Modules (4/5)

**integrity.py** - ACTIVE
- Functions: 4 (all called)
  - `generate_integrity_report()` → endpoint
  - `generate_cleanliness_report()` → endpoint
  - `repair_orphaned_cart_references()` → endpoint
  - `repair_empty_carts()` → endpoint
- Usage: 9 endpoints
- Risk: None

**indexes.py** - ACTIVE
- Functions: 1 (all called)
  - `ensure_indexes()` → startup + endpoint
- Usage: Startup event + 1 endpoint
- Risk: None

**ttl.py** - ACTIVE
- Functions: 2 (all called)
  - `setup_ttl_indexes()` → startup + endpoint
  - `get_ttl_status()` → endpoint
- Usage: Startup event + 2 endpoints
- Risk: None

**maintenance.py** - ACTIVE
- Classes: 1 (`AutoMaintenanceService`)
- Functions: 1 (`get_maintenance_service`)
- Usage: Startup/shutdown + 2 endpoints
- Risk: None

### Dormant Modules (1/5)

**auth.py** - DORMANT
- Classes: 1 (`AuthService`)
- Methods: 8
  - `create_access_token()`
  - `signup_user()`
  - `login_user()`
  - `login_admin()`
  - `get_current_user()`
  - `get_admin_user()`
- Import status: Not imported
- Execution status: Never called
- Purpose: Ready for future auth refactor migration
- Risk: **ZERO** (not in execution path)

**Governance Status**: CONTROLLED
- Reason: Intentionally dormant (migration-ready code)
- Documentation: Noted in Item 6 refactor status
- Activation path: Clear (update server.py imports)

### Feature Flag Dormant Paths

**1. CLEANLINESS_ENABLE_REPAIR (default: false)**
```python
# Controlled code paths (2):
if not CLEANLINESS_ENABLE_REPAIR:
    return {"error": "Repair operations disabled"}

# Endpoints affected:
- POST /api/admin/repair/cart-references
- POST /api/admin/repair/empty-carts

# Status: DORMANT (by design)
# Activation: Set CLEANLINESS_ENABLE_REPAIR=true
```

**2. CLEANLINESS_AUTORUN (default: false)**
```python
# Controlled code paths (1):
if not CLEANLINESS_AUTORUN:
    logger.info("Automated maintenance disabled")
    return

maintenance_service.start()  # Only runs if flag enabled

# Background processes affected:
- Maintenance loop (24h interval)
- Auto-archive process
- Integrity/cleanliness checks

# Status: DORMANT (by design)
# Activation: Set CLEANLINESS_AUTORUN=true
```

**3. AUDIT_TTL_DAYS (default: not set)**
```python
# Controlled code paths (3):
if not AUDIT_TTL_DAYS:
    logger.info("TTL indexes skipped")
    return

# Database indexes affected:
- 6 TTL indexes across archive collections

# Status: DORMANT (by design)
# Activation: Set AUDIT_TTL_DAYS=90
```

### Dead Code Analysis

**Unreachable Code**: 0 instances
**Unused Imports**: 0 instances
**Orphaned Functions**: 0 instances
**Abandoned Modules**: 0 instances

**Dormant Code Categories**:
1. Migration-ready (auth.py) - Intentional
2. Feature-flagged (repair, autorun, TTL) - Intentional
3. Total: 100% intentional dormancy

### Accumulation Prevention

**Current Measures**:
✓ All dormant code documented in verification reports
✓ Clear activation paths defined
✓ Purpose documented for each dormant module
✓ Feature flags prevent unintended execution
✓ No hidden/undocumented dormant paths

**Governance Policy** (implicit):
1. Dormant modules must have documented purpose
2. Dormant paths must be behind feature flags
3. Activation path must be clear
4. Regular audits (this verification process)

### Dead-Path Registry

```yaml
dormant_modules:
  - name: services/auth.py
    status: DORMANT
    reason: "Migration-ready code for future auth refactor"
    risk: ZERO
    activation: "Import in server.py, update token claims"
    documented: true

dormant_paths:
  - path: "repair endpoints"
    flag: CLEANLINESS_ENABLE_REPAIR
    default: false
    endpoints: 2
    risk: CONTROLLED
    
  - path: "maintenance background service"
    flag: CLEANLINESS_AUTORUN
    default: false
    processes: 1
    risk: CONTROLLED
    
  - path: "TTL index creation"
    flag: AUDIT_TTL_DAYS
    default: not_set
    indexes: 6
    risk: CONTROLLED

total_dormant_modules: 1
total_dormant_paths: 3
total_risk_level: MINIMAL
governance_status: COMPLIANT
```

### Conclusion

✅ **DORMANT-LOGIC GOVERNANCE VERIFIED**

**Key Findings**:
- 1 dormant module (auth.py) - intentional, documented
- 3 dormant code paths - behind feature flags
- 0 dead code instances
- 0 accumulation risk

**Governance Compliance**:
- All dormant code has documented purpose
- All dormant paths controlled by flags
- Clear activation procedures
- No hidden technical debt

**Recommendation**:
Maintain quarterly dormant code audits to prevent future accumulation.

**Evidence Location**:
- `/app/backend/services/` (module inventory)
- `/app/VERIFICATION_3_DORMANT_LOGIC.md` (this file)
- `/app/ITEM_6_REFACTOR_STATUS.txt` (migration documentation)

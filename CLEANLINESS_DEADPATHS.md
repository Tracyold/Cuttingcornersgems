# CLEANLINESS DEADPATHS REGISTRY

**Purpose**: Track all dormant code per G6 Guardrail  
**Updated**: 2026-02-09  
**Review Interval**: Quarterly

---

## DORMANT MODULES (5)

### 1. services/auth.py
- **Status**: DORMANT
- **Purpose**: Auth service migration-ready code
- **Created**: Item 6 (canonical services refactor)
- **Activation**: Import in server.py, update token claims
- **Risk**: None (not in execution path)
- **Review**: Next review on 2026-05-09

### 2. services/logging.py
- **Status**: DORMANT
- **Purpose**: Structured JSON logging with stream separation
- **Created**: P_log L1
- **Activation**: Import in server.py, replace logging calls
- **Risk**: None (not in execution path)
- **Review**: Next review on 2026-05-09

### 3. services/redaction.py
- **Status**: DORMANT
- **Purpose**: Secret/PII redaction for logs
- **Created**: P_log L2
- **Activation**: Use in logging calls throughout application
- **Risk**: None (not in execution path)
- **Review**: Next review on 2026-05-09

### 4. frontend/src/utils/revalidation.js
- **Status**: DORMANT
- **Purpose**: Post-mutation refetch utilities for React contexts
- **Created**: P_cache C3
- **Activation**: Import in admin contexts, wrap mutation functions
- **Risk**: None (utility functions only)
- **Review**: Next review on 2026-05-09

### 5. services/schema_guard.py (PARTIAL)
- **Status**: PARTIALLY ACTIVE
- **Active Functions**:
  - `ensure_schema_version()` - Runs on startup
  - `get_schema_status()` - Called by cleanliness-report
- **Dormant Functions**:
  - `backfill_missing_field()` - Manual use only
  - `validate_required_fields()` - Manual use only
  - `register_migration()` - Manual use only
- **Purpose**: Schema drift prevention and migration tracking
- **Created**: P_code D4
- **Activation**: Call dormant functions as needed for migrations
- **Risk**: None (dormant functions not in execution path)
- **Review**: Next review on 2026-05-09

---

## DORMANT CODE PATHS (3)

### 1. Repair Operations
- **Flag**: `CLEANLINESS_ENABLE_REPAIR`
- **Default**: false
- **Endpoints Affected**: 2
  - POST `/api/admin/repair/cart-references`
  - POST `/api/admin/repair/empty-carts`
- **Status**: DORMANT (disabled by default)
- **Purpose**: Data cleanup operations (opt-in)
- **Activation**: Set `CLEANLINESS_ENABLE_REPAIR=true`
- **Review**: Active usage logged when enabled

### 2. Automated Maintenance
- **Flag**: `CLEANLINESS_AUTORUN`
- **Default**: false
- **Processes Affected**: Background maintenance loop
- **Status**: DORMANT (disabled by default)
- **Purpose**: Scheduled integrity checks and archiving
- **Activation**: Set `CLEANLINESS_AUTORUN=true`
- **Review**: Monitor logs when enabled

### 3. TTL Indexes
- **Flag**: `AUDIT_TTL_DAYS`
- **Default**: not set
- **Collections Affected**: 6 archive collections
- **Status**: DORMANT (no TTL by default)
- **Purpose**: Automatic expiration of old archived data
- **Activation**: Set `AUDIT_TTL_DAYS=90` (or desired days)
- **Review**: Check TTL status via cleanliness-report

---

## COMPATIBILITY BRIDGES (0)

**Current**: No compatibility bridges exist

**Policy**: See `/app/COMPATIBILITY_BRIDGE_SUNSET_POLICY.md`

When bridges are added, register here with:
- Bridge name
- Created date
- Expiration date (created + 90 days)
- Removal condition
- Usage tracking

---

## GOVERNANCE NOTES

### Activation Procedures

All dormant code has clear activation paths:
1. Set environment variable / feature flag
2. Restart service (if needed)
3. Verify functionality
4. Monitor logs for errors

### Review Schedule

- **Weekly**: Automated deadpath report via cleanliness-report
- **Monthly**: Manual review of this document
- **Quarterly**: Full dormant code audit

### Removal Criteria

Dormant code can be removed when:
- Purpose no longer needed
- Feature flag unused for 180+ days
- No activation planned
- Documented in CHANGELOG.md

---

**Last Updated**: 2026-02-09  
**Next Review**: 2026-05-09

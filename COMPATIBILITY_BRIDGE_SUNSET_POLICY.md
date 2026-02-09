# COMPATIBILITY BRIDGE SUNSET POLICY

## Purpose
Prevent permanent accumulation of compatibility flags and bridges by establishing clear lifecycle rules.

---

## Policy Rules

### Rule 1: Every Bridge Must Have Metadata

All compatibility flags must be documented with:
- `created_at`: Date flag was introduced
- `expires_at`: Maximum date flag can remain enabled
- `removal_condition`: Criteria for safe removal
- `deprecation_notice`: User-facing message

### Rule 2: Default Sunset Window

**Default lifecycle**: 90 days from creation

After 90 days:
1. Flag must be reviewed for removal
2. If still needed, explicit extension must be documented
3. Extension requires justification in CHANGELOG.md

### Rule 3: Removal Criteria

A flag can be removed when:
- Zero usage logged for 30 consecutive days
- No production errors related to flag in 30 days
- All users migrated to new behavior
- Explicit approval from maintainer

### Rule 4: Weekly Expired Flag Report

System must generate report showing:
- Flags past `expires_at` date
- Flags enabled beyond default 90-day window
- Flags with zero usage in last 30 days

**Report location**: Included in GET /api/admin/cleanliness-report under `expired_flags` key

---

## Current Flags Inventory

### Feature Flags (Not Compatibility Bridges)

| Flag | Type | Created | Expires | Removal Condition |
|------|------|---------|---------|-------------------|
| CLEANLINESS_ENABLE_REPAIR | Feature | 2026-02-09 | N/A | Never (permanent feature toggle) |
| CLEANLINESS_AUTORUN | Feature | 2026-02-09 | N/A | Never (permanent feature toggle) |
| AUDIT_TTL_DAYS | Config | 2026-02-09 | N/A | Never (configuration parameter) |

**Note**: Feature flags are NOT compatibility bridges. They have no expiration.

### Compatibility Bridges (None Currently)

No compatibility bridges currently exist in the system.

**Future bridges must follow this policy.**

---

## Example Future Bridge

```python
# Example of a properly documented compatibility bridge
AUTH_STRICT_TOKENS = os.environ.get('AUTH_STRICT_TOKENS', 'false').lower() == 'true'

# Metadata (stored in COMPATIBILITY_BRIDGES.md)
{
  "flag": "AUTH_STRICT_TOKENS",
  "created_at": "2026-03-01",
  "expires_at": "2026-05-30",  # 90 days
  "removal_condition": "Zero legacy-token rejections logged for 30 days in production",
  "deprecation_notice": "Legacy token format support will be removed by 2026-05-30. Migrate to new format.",
  "usage_tracking": "Log AUTH.TOKEN_REJECT_VERSION when legacy token detected"
}
```

---

## Enforcement Mechanism

### Automated Checks

1. **Weekly Report** (via cleanliness-report):
   - Lists all bridges past `expires_at`
   - Shows days since last usage
   - Flags overdue for removal

2. **Log Signal** (when bridge is used):
   ```python
   log_security_event(
       logger,
       SecurityEvents.COMPATIBILITY_BRIDGE_USED,
       bridge_name="AUTH_STRICT_TOKENS",
       expires_at="2026-05-30"
   )
   ```

3. **Manual Review** (maintainer responsibility):
   - Review weekly report
   - Decide: extend, remove, or keep
   - Document decision in CHANGELOG.md

---

## Removal Process

### Step 1: Deprecation Warning (30 days before expiry)
- Add warning to logs when bridge is used
- Update documentation with removal date
- Notify users (if applicable)

### Step 2: Monitor Usage
- Check logs for bridge usage
- Verify removal condition is met
- Document evidence in removal PR

### Step 3: Remove Code
- Remove flag from code
- Remove from environment variables
- Remove from documentation
- Add to CHANGELOG.md

### Step 4: Verify
- Run regression tests
- Confirm no functionality changes
- Verify flag removal doesn't break anything

---

## Anti-Patterns (Prohibited)

❌ **Permanent compatibility bridges**
- Bridges must have expiration dates
- No "just in case" bridges kept forever

❌ **Undocumented bridges**
- All bridges must have metadata
- No mystery flags

❌ **Silent bridge accumulation**
- Weekly reports prevent this
- Must actively review and remove

❌ **Bridge-on-bridge layering**
- Don't create bridges to fix old bridges
- Remove old bridge, don't patch it

---

## Success Metrics

- **Bridge count**: Trending toward zero
- **Average bridge lifespan**: < 90 days
- **Expired bridges**: Zero
- **Undocumented bridges**: Zero

---

## Review Schedule

- **Weekly**: Automated report in cleanliness-report
- **Monthly**: Manual review of all active bridges
- **Quarterly**: Policy effectiveness review

---

**Policy Established**: 2026-02-09  
**Policy Owner**: System Maintainer  
**Next Review**: 2026-05-09 (90 days)

# Continuity Gate Trigger Rules

## Purpose

The **Preflight Continuity Gate** (`tools/preflight_continuity_gate.py`) is a lightweight regression barrier that validates key architectural invariants before they can drift.

## When to Run

### 1. Backend Structural Changes

Run the gate after ANY of these changes:

| Change Type | Examples |
|-------------|----------|
| Auth logic changes | Login flow, token generation, password handling |
| New services/modules added | New files in `services/`, new routers |
| Config/security changes | Any edit to `config/security.py`, `.env` schema |
| Schema or DB collection changes | New collections, field changes, migration logic |
| Import/wiring changes | New dependencies between modules |

### 2. Integration Steps

Run the gate when:

- External APIs are integrated (Stripe, email, etc.)
- Database connections are modified
- New environment variables are introduced
- Staging or deployment setup begins

### 3. Milestone Checkpoints

Run the gate at these development milestones:

| Checkpoint | Rationale |
|------------|-----------|
| Before merging major backend branches | Prevent regression into main |
| Before staging or deployment | Catch issues before they reach prod |
| End of backend-heavy dev session | Validate day's work before context switch |

---

## When NOT Required

Do NOT run during:

- UI-only changes (React components, styling)
- Frontend CSS/Tailwind work
- Documentation-only changes
- Non-backend file edits

---

## How to Run

```bash
cd /app/backend
python tools/preflight_continuity_gate.py
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed |
| `1` | One or more checks failed — review output |

---

## Checks Performed

| Check | Invariant |
|-------|-----------|
| CHECK 1 | No plaintext admin passwords in source |
| CHECK 2 | JWT_SECRET has no unconditional fallback |
| CHECK 3 | Security symbols defined only in `config/security.py` |
| CHECK 4 | Schema guard uses `SCHEMA_COLLECTION` constant |
| CHECK 5 | No imports from quarantined `_draft/` modules |

---

## Failure Response

If the gate fails:

1. **Read the failure output** — it shows file:line and issue
2. **Fix the violation** — restore the invariant
3. **Re-run the gate** — confirm fix
4. **Do not bypass** — these invariants prevent production incidents

---

## Integration with CI (Future)

When CI is configured, add this to the pipeline:

```yaml
backend-preflight:
  script:
    - cd backend && python tools/preflight_continuity_gate.py
  rules:
    - if: '$CI_COMMIT_BRANCH == "main"'
    - if: '$CI_PIPELINE_SOURCE == "merge_request_event"'
      changes:
        - backend/**/*
```

# D5: ARCHIVE/TEXT-DOCUMENT PLANE RECONCILIATION

## Problem Statement

Current system may have two "truths" for archived data:
1. **MongoDB records** (in `archived_*` collections)
2. **Text documents** (if ever exported to files)

This creates risk of:
- Divergence (which is authoritative?)
- Ambiguity (restore from DB or text?)
- Maintenance burden (keep both in sync)

---

## Solution: Mongo as Single Source of Truth

### Policy: MongoDB is Authoritative

**Rule**: All archived data lives primarily in MongoDB.

Text documents (if created) are:
- **Immutable evidence artifacts**
- **Not the source of truth**
- **Referenced by MongoDB records**

---

## Implementation: Archive Artifact Pointers

### Schema Extension (Optional Fields)

Add to all `archived_*` collections:

```python
{
  # ... existing fields ...
  
  # NEW: Archive artifact metadata (optional)
  "archive_artifact_type": "text_doc" | "json_export" | None,
  "archive_artifact_ref": "<path or URL>",  # Where artifact is stored
  "archive_artifact_hash": "<sha256>",      # Integrity check
  "archived_at": "2026-02-09T...",          # When archived
  "archived_by": "system" | "admin_user_id" # Who archived
}
```

### Example Record

```json
{
  "id": "booking-uuid-123",
  "name": "John Doe",
  "email": "john@example.com",
  "service": "Custom Cut",
  "status": "completed",
  "created_at": "2025-12-01T10:00:00Z",
  
  // Archive metadata
  "archived_at": "2026-01-15T08:00:00Z",
  "archived_by": "system",
  
  // Optional: Text artifact reference
  "archive_artifact_type": "text_doc",
  "archive_artifact_ref": "/archives/2026-01/booking-uuid-123.txt",
  "archive_artifact_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```

---

## Restore Process

### Rule: Always Restore from MongoDB

```python
# CORRECT: Restore from DB
archived_booking = await db.archived_bookings.find_one({"id": booking_id})
restored_booking = {k: v for k, v in archived_booking.items() 
                    if k not in ["archived_at", "archived_by", "archive_artifact_*"]}
await db.bookings.insert_one(restored_booking)

# Optional: Verify against text artifact if exists
if archived_booking.get("archive_artifact_hash"):
    verify_artifact_integrity(archived_booking)
```

**Never**: Parse text document to restore data

---

## Text Document Purpose

Text documents (if created) serve ONLY as:

1. **Audit Evidence**
   - Regulatory compliance
   - Human-readable records
   - Legal discovery

2. **Disaster Recovery Backup**
   - If MongoDB is lost
   - Secondary backup location

3. **Integrity Verification**
   - Hash stored in MongoDB
   - Can verify MongoDB data matches artifact

---

## Benefits

### 1. Single Source of Truth
- MongoDB is authoritative
- No ambiguity about where to restore from
- No sync issues

### 2. Immutable Evidence
- Text artifacts never change
- Hash proves integrity
- MongoDB points to artifact

### 3. Clean Restore
- Restore from structured data (MongoDB)
- No parsing text files
- Deterministic outcome

### 4. Optional Text Artifacts
- Can be created or not
- Doesn't affect restore process
- Purely supplementary

---

## Current System Status

### Current Implementation

**Archiving** (in `/app/backend/server.py` lines ~935-976):
```python
# Current code moves data to archived_* collections
archived_booking = booking.copy()
archived_booking["archived_at"] = now.isoformat()
await db.archived_bookings.insert_one(archived_booking)
await db.bookings.delete_one({"id": booking["id"]})
```

**Status**: ✅ Follows policy (MongoDB is source of truth)

**Missing**: Archive artifact metadata fields (optional, not critical)

---

## Future Enhancement (Optional)

If text document export is added later:

### Step 1: Create Text Artifact
```python
import hashlib
import json

# Export to text
text_content = json.dumps(archived_booking, indent=2)
file_path = f"/archives/{year}-{month}/{booking_id}.json"

# Save file
with open(file_path, 'w') as f:
    f.write(text_content)

# Calculate hash
file_hash = hashlib.sha256(text_content.encode()).hexdigest()
```

### Step 2: Update MongoDB Record
```python
await db.archived_bookings.update_one(
    {"id": booking_id},
    {"$set": {
        "archive_artifact_type": "json_export",
        "archive_artifact_ref": file_path,
        "archive_artifact_hash": file_hash
    }}
)
```

### Step 3: Restore Process Unchanged
```python
# Still restore from MongoDB, not from file
archived_booking = await db.archived_bookings.find_one({"id": booking_id})
# ... restore process ...

# Optional: Verify integrity
if archived_booking.get("archive_artifact_ref"):
    with open(archived_booking["archive_artifact_ref"]) as f:
        content = f.read()
        hash = hashlib.sha256(content.encode()).hexdigest()
        assert hash == archived_booking["archive_artifact_hash"]
```

---

## Anti-Patterns (Prohibited)

### ❌ Restoring from Text Files
```python
# BAD: Parsing text file to restore
with open(f"/archives/booking-{id}.json") as f:
    booking = json.load(f)
await db.bookings.insert_one(booking)
```

### ❌ Keeping Text Files as Source of Truth
```python
# BAD: Text file is newer than DB
# Which is correct?
db_booking = await db.archived_bookings.find_one(...)
file_booking = json.load(open(...))
# ??? Which to use?
```

### ❌ Modifying Text Artifacts
```python
# BAD: Editing text file after creation
with open(artifact_path, 'w') as f:
    f.write(modified_content)  # Breaks hash!
```

---

## Migration Guide (If Needed)

If system currently has text artifacts without MongoDB pointers:

### Step 1: Audit Existing Artifacts
```python
# Find text files
text_files = glob.glob("/archives/**/*.json")

# Find MongoDB records
archived_records = await db.archived_bookings.find({}).to_list(1000)

# Compare: which records have artifacts?
```

### Step 2: Add Pointers to MongoDB
```python
for text_file in text_files:
    booking_id = extract_id_from_filename(text_file)
    
    # Calculate hash
    with open(text_file) as f:
        content = f.read()
        file_hash = hashlib.sha256(content.encode()).hexdigest()
    
    # Update MongoDB record
    await db.archived_bookings.update_one(
        {"id": booking_id},
        {"$set": {
            "archive_artifact_type": "json_export",
            "archive_artifact_ref": text_file,
            "archive_artifact_hash": file_hash
        }}
    )
```

### Step 3: Verify Reconciliation
```python
# All archived records should now have pointers
records_with_artifacts = await db.archived_bookings.count_documents({
    "archive_artifact_ref": {"$exists": True}
})

print(f"Reconciliation complete: {records_with_artifacts} records linked to artifacts")
```

---

## Success Metrics

- **MongoDB as source**: 100% of restores from DB
- **Artifact integrity**: 100% of artifacts match hash
- **No divergence**: MongoDB and artifacts always match
- **Clean restores**: Zero parsing errors

---

## Current Status

**System**: ✅ Follows policy
- Archives stored in MongoDB
- Restore from MongoDB
- No text artifacts currently created

**Enhancement Needed**: No (working correctly)

**Future**: If text export added, follow schema extension pattern above

---

**Policy Established**: 2026-02-09  
**Implementation Status**: Compliant  
**Text Artifacts**: Not currently created  
**Recommendation**: No changes needed unless text export is required

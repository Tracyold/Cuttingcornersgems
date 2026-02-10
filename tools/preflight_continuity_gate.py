#!/usr/bin/env python3
"""
Preflight Continuity Gate
=========================
Deterministic invariant checks to prevent regression reintroduction.
Must pass before any deployment or phase completion.

Checks:
1. NO PLAINTEXT ADMIN PASSWORD
2. NO PRODUCTION JWT FALLBACK
3. SINGLE SOURCE OF TRUTH FOR SECURITY SYMBOLS
4. SCHEMA COLLECTION INVARIANT
5. QUARANTINE BOUNDARY (no imports from services._draft)

Exit code 0 = PASS, Exit code 1 = FAIL
"""

import os
import re
import sys
from pathlib import Path

# Colors for terminal output
RED = "\033[91m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

# Root directory (backend)
BACKEND_DIR = Path(__file__).parent.parent / "backend"

# Directories/files to exclude
EXCLUDE_DIRS = {"tests", "services/_draft", "_draft", "__pycache__", ".git", "tools"}
EXCLUDE_FILES = {"__pycache__"}


def get_python_files(root_dir: Path, exclude_draft: bool = True) -> list:
    """Get all Python files, excluding specified directories."""
    files = []
    for py_file in root_dir.rglob("*.py"):
        rel_path = py_file.relative_to(root_dir)
        parts = rel_path.parts
        
        # Skip excluded directories
        skip = False
        for part in parts:
            if part in EXCLUDE_DIRS:
                skip = True
                break
            if exclude_draft and "_draft" in part:
                skip = True
                break
        
        if not skip:
            files.append(py_file)
    
    return files


def check_1_no_plaintext_admin_password() -> tuple:
    """
    CHECK 1 — NO PLAINTEXT ADMIN PASSWORD
    Scan *.py files for hardcoded admin passwords.
    Excludes tests/ and services/_draft/.
    """
    failures = []
    
    # Patterns that indicate plaintext password
    patterns = [
        (r'admin.*password\s*=\s*["\'][^"\']+["\']', "Hardcoded admin password"),
        (r'ADMIN_PASSWORD\s*=\s*["\'][^"\']+["\']', "Hardcoded ADMIN_PASSWORD constant"),
        (r'password.*=\s*["\']admin', "Password set to 'admin' variant"),
    ]
    
    # Patterns that are OK (environment variables, hashing)
    safe_patterns = [
        r'os\.environ\.get\s*\(',
        r'password_hash',
        r'bcrypt\.hashpw',
        r'hash_password',
        r'verify_password',
        r'#.*password',  # Comments
        r'\"\"\".*password',  # Docstrings
    ]
    
    for py_file in get_python_files(BACKEND_DIR):
        try:
            content = py_file.read_text()
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                line_lower = line.lower()
                
                # Skip if line contains safe patterns
                if any(re.search(p, line, re.IGNORECASE) for p in safe_patterns):
                    continue
                
                for pattern, desc in patterns:
                    if re.search(pattern, line, re.IGNORECASE):
                        # Additional check: is this in config/security.py with proper env fallback?
                        if "config/security.py" in str(py_file) and "os.environ" in content:
                            continue
                        failures.append((py_file, i, line.strip()[:80], desc))
        except Exception as e:
            pass
    
    return len(failures) == 0, failures


def check_2_no_production_jwt_fallback() -> tuple:
    """
    CHECK 2 — NO PRODUCTION JWT FALLBACK
    Reject os.environ.get(..., "default") for JWT_SECRET without non-prod gate.
    """
    failures = []
    
    # Pattern for dangerous default values in get()
    pattern = r'os\.environ\.get\s*\(\s*["\']JWT_SECRET["\'].*,\s*["\'][^"\']+["\']'
    
    for py_file in get_python_files(BACKEND_DIR):
        try:
            content = py_file.read_text()
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                if re.search(pattern, line):
                    # Check if there's a production guard nearby (within 10 lines before)
                    context_start = max(0, i - 10)
                    context = '\n'.join(lines[context_start:i])
                    
                    # Safe patterns that indicate dev-only fallback
                    safe_guards = [
                        'PRODUCTION',
                        'production',
                        'NOT FOR PRODUCTION',
                        'development',
                        'DEBUG',
                        'if.*environ.*prod',
                    ]
                    
                    has_guard = any(g in context for g in safe_guards)
                    
                    if not has_guard:
                        failures.append((py_file, i, line.strip()[:80], "JWT_SECRET fallback without production guard"))
        except Exception:
            pass
    
    return len(failures) == 0, failures


def check_3_security_symbols_single_source() -> tuple:
    """
    CHECK 3 — SINGLE SOURCE OF TRUTH FOR SECURITY SYMBOLS
    Assignments to JWT_SECRET, JWT_ALGORITHM, ADMIN_USERNAME, ADMIN_PASSWORD_HASH
    should only occur in config/security.py.
    """
    failures = []
    
    security_symbols = [
        "JWT_SECRET",
        "JWT_ALGORITHM", 
        "ADMIN_USERNAME",
        "ADMIN_PASSWORD_HASH",
    ]
    
    # Pattern for assignment (not import or usage)
    assignment_pattern = r'^[^#]*\b({symbol})\s*='
    
    security_config_path = BACKEND_DIR / "config" / "security.py"
    
    for py_file in get_python_files(BACKEND_DIR):
        # Skip the config/security.py itself
        if py_file == security_config_path:
            continue
        
        try:
            content = py_file.read_text()
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                for symbol in security_symbols:
                    pattern = assignment_pattern.format(symbol=symbol)
                    if re.search(pattern, line):
                        # Check if it's an import statement
                        if "from config.security import" in line or "import" in line.split('=')[0]:
                            continue
                        failures.append((py_file, i, line.strip()[:80], f"Assignment to {symbol} outside config/security.py"))
        except Exception:
            pass
    
    return len(failures) == 0, failures


def check_4_schema_collection_invariant() -> tuple:
    """
    CHECK 4 — SCHEMA COLLECTION INVARIANT
    schema_guard must use SCHEMA_COLLECTION constant.
    Reject raw db.schema_version and raw "system_metadata" in schema operations.
    """
    failures = []
    
    # Patterns that violate the invariant
    bad_patterns = [
        (r'db\.schema_version', "Direct db.schema_version usage (use SCHEMA_COLLECTION)"),
        (r'db\[["\']schema_version["\']\]', "Direct db['schema_version'] usage"),
        (r'["\']system_metadata["\'].*schema', "Raw 'system_metadata' in schema context"),
    ]
    
    for py_file in get_python_files(BACKEND_DIR):
        try:
            content = py_file.read_text()
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                # Skip comments
                if line.strip().startswith('#'):
                    continue
                
                for pattern, desc in bad_patterns:
                    if re.search(pattern, line):
                        # Allow if SCHEMA_COLLECTION is defined/used nearby
                        if "SCHEMA_COLLECTION" in line:
                            continue
                        failures.append((py_file, i, line.strip()[:80], desc))
        except Exception:
            pass
    
    return len(failures) == 0, failures


def check_5_quarantine_boundary() -> tuple:
    """
    CHECK 5 — QUARANTINE BOUNDARY
    No imports from services._draft in non-draft code.
    """
    failures = []
    
    # Pattern for draft imports
    draft_import_patterns = [
        r'from\s+services\._draft',
        r'from\s+services\.\_draft',
        r'import\s+services\._draft',
        r'from\s+\.\_draft',
    ]
    
    for py_file in get_python_files(BACKEND_DIR, exclude_draft=True):
        # Double-check we're not in draft directory
        if "_draft" in str(py_file):
            continue
        
        try:
            content = py_file.read_text()
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                for pattern in draft_import_patterns:
                    if re.search(pattern, line):
                        failures.append((py_file, i, line.strip()[:80], "Import from _draft in non-draft code"))
        except Exception:
            pass
    
    return len(failures) == 0, failures


def run_all_checks():
    """Run all continuity gate checks and report results."""
    print(f"\n{BOLD}{'='*60}{RESET}")
    print(f"{BOLD}   PREFLIGHT CONTINUITY GATE{RESET}")
    print(f"{BOLD}{'='*60}{RESET}\n")
    
    checks = [
        ("CHECK 1", "NO PLAINTEXT ADMIN PASSWORD", check_1_no_plaintext_admin_password),
        ("CHECK 2", "NO PRODUCTION JWT FALLBACK", check_2_no_production_jwt_fallback),
        ("CHECK 3", "SECURITY SYMBOLS SINGLE SOURCE", check_3_security_symbols_single_source),
        ("CHECK 4", "SCHEMA COLLECTION INVARIANT", check_4_schema_collection_invariant),
        ("CHECK 5", "QUARANTINE BOUNDARY", check_5_quarantine_boundary),
    ]
    
    all_passed = True
    results = []
    
    for check_id, check_name, check_func in checks:
        passed, failures = check_func()
        results.append((check_id, check_name, passed, failures))
        
        if passed:
            print(f"  {GREEN}✓{RESET} {check_id} — {check_name}")
        else:
            print(f"  {RED}✗{RESET} {check_id} — {check_name}")
            all_passed = False
    
    print(f"\n{BOLD}{'='*60}{RESET}")
    
    # Print detailed failures
    if not all_passed:
        print(f"\n{RED}{BOLD}FAILURES DETECTED:{RESET}\n")
        
        for check_id, check_name, passed, failures in results:
            if not passed:
                print(f"{YELLOW}{check_id}: {check_name}{RESET}")
                for py_file, line_num, snippet, desc in failures:
                    rel_path = py_file.relative_to(BACKEND_DIR)
                    print(f"  {RED}•{RESET} {rel_path}:{line_num}")
                    print(f"    {desc}")
                    print(f"    {YELLOW}>{RESET} {snippet}")
                print()
        
        print(f"\n{RED}{BOLD}GATE STATUS: FAIL{RESET}")
        print(f"Exit code: 1\n")
        return 1
    else:
        print(f"\n{GREEN}{BOLD}GATE STATUS: PASS{RESET}")
        print(f"Exit code: 0\n")
        return 0


if __name__ == "__main__":
    sys.exit(run_all_checks())

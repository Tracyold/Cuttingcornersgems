#!/usr/bin/env python3
"""
Preflight Continuity Gate
=========================
Fails fast if key architectural invariants regress.
Run before merges, deployments, or after significant backend changes.

Exit codes:
  0 - All checks pass
  1 - One or more checks failed

Usage:
  python tools/preflight_continuity_gate.py
"""

import os
import re
import sys
from pathlib import Path

# Configuration
BACKEND_ROOT = Path(__file__).parent.parent
EXCLUDED_DIRS = {"tests", "services/_draft", "_draft", "__pycache__", ".git"}
SECURITY_CONFIG_PATH = BACKEND_ROOT / "config" / "security.py"


class CheckResult:
    def __init__(self, name: str):
        self.name = name
        self.passed = True
        self.failures = []

    def fail(self, message: str, file: str = None, line: int = None):
        self.passed = False
        loc = f"{file}:{line}" if file and line else (file or "unknown")
        self.failures.append({"location": loc, "message": message})

    def __str__(self):
        status = "PASS" if self.passed else "FAIL"
        return f"[{status}] {self.name}"


def get_python_files(root: Path, exclude_dirs: set) -> list:
    """Get all .py files excluding specified directories."""
    files = []
    for path in root.rglob("*.py"):
        # Check if any parent is in excluded dirs
        parts = path.relative_to(root).parts
        if not any(excl in parts for excl in exclude_dirs):
            files.append(path)
    return files


def read_file_with_lines(filepath: Path) -> list:
    """Read file and return list of (line_number, line_content) tuples."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return list(enumerate(f.readlines(), start=1))
    except Exception:
        return []


# ==============================================================================
# CHECK 1: No plaintext admin password
# ==============================================================================
def check_no_plaintext_password(files: list) -> CheckResult:
    """
    Fail if plaintext admin password literals appear in any .py file.
    Excludes tests/ and services/_draft/.
    """
    result = CheckResult("CHECK 1 — NO PLAINTEXT ADMIN PASSWORD")
    
    # Common password patterns to detect
    password_patterns = [
        r'["\']adm1npa\$\$word["\']',
        r'password\s*=\s*["\'][^"\']{6,}["\']',  # password = "something"
        r'ADMIN_PASSWORD\s*=\s*["\'][^"\']+["\']',
    ]
    
    for filepath in files:
        # Skip security config (it's allowed to have conditional logic)
        if "config/security.py" in str(filepath):
            continue
            
        lines = read_file_with_lines(filepath)
        for line_num, line in lines:
            # Check for plaintext password patterns
            for pattern in password_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    # Skip if it's reading from env
                    if "os.environ" in line or "getenv" in line:
                        continue
                    result.fail(
                        f"Potential plaintext password: {line.strip()[:60]}...",
                        str(filepath.relative_to(BACKEND_ROOT)),
                        line_num
                    )
    
    return result


# ==============================================================================
# CHECK 2: No production JWT fallback
# ==============================================================================
def check_jwt_no_unconditional_fallback(files: list) -> CheckResult:
    """
    Fail if JWT_SECRET has an unconditional fallback default.
    Allow fallback ONLY if explicitly gated by non-production environment.
    """
    result = CheckResult("CHECK 2 — NO PRODUCTION JWT FALLBACK")
    
    for filepath in files:
        content = filepath.read_text(encoding="utf-8")
        lines = read_file_with_lines(filepath)
        
        for line_num, line in lines:
            # Look for JWT_SECRET assignment with fallback
            if "JWT_SECRET" in line and "=" in line:
                # Check for unconditional os.environ.get with fallback
                if re.search(r'os\.environ\.get\s*\(\s*["\']JWT_SECRET["\']\s*,\s*["\'][^"\']+["\']\s*\)', line):
                    # This is a fallback - check if file has environment gate
                    if "IS_PRODUCTION" not in content and "ENV" not in content:
                        result.fail(
                            "JWT_SECRET has fallback without production gate",
                            str(filepath.relative_to(BACKEND_ROOT)),
                            line_num
                        )
    
    return result


# ==============================================================================
# CHECK 3: Single source of security symbols
# ==============================================================================
def check_single_source_security(files: list) -> CheckResult:
    """
    ADMIN_USERNAME, ADMIN_PASSWORD_HASH, JWT_SECRET must be assigned
    only in /config/security.py. Fail if any other module assigns them.
    """
    result = CheckResult("CHECK 3 — SINGLE SOURCE OF SECURITY SYMBOLS")
    
    security_symbols = ["ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "JWT_SECRET"]
    
    for filepath in files:
        # Skip the canonical security config
        if "config/security.py" in str(filepath):
            continue
        
        lines = read_file_with_lines(filepath)
        for line_num, line in lines:
            for symbol in security_symbols:
                # Look for direct assignment (not import, not comparison)
                pattern = rf'^[^#]*\b{symbol}\s*='
                if re.search(pattern, line):
                    # Skip if it's an import statement
                    if "from " in line or "import " in line:
                        continue
                    # Skip if it's a function parameter default
                    if "def " in line:
                        continue
                    result.fail(
                        f"{symbol} assigned outside config/security.py",
                        str(filepath.relative_to(BACKEND_ROOT)),
                        line_num
                    )
    
    return result


# ==============================================================================
# CHECK 4: Schema collection invariant
# ==============================================================================
def check_schema_collection_invariant() -> CheckResult:
    """
    services/schema_guard.py must use only SCHEMA_COLLECTION constant.
    Fail if raw "schema_version" or other literal collection names appear.
    """
    result = CheckResult("CHECK 4 — SCHEMA COLLECTION INVARIANT")
    
    schema_guard_path = BACKEND_ROOT / "services" / "schema_guard.py"
    if not schema_guard_path.exists():
        result.fail("schema_guard.py not found", "services/schema_guard.py")
        return result
    
    lines = read_file_with_lines(schema_guard_path)
    
    has_constant = False
    for line_num, line in lines:
        # Check for SCHEMA_COLLECTION constant definition
        if 'SCHEMA_COLLECTION' in line and '=' in line and '"system_metadata"' in line:
            has_constant = True
        
        # Check for raw collection literals (bad)
        if 'db.schema_version' in line or 'db["schema_version"]' in line:
            result.fail(
                "Raw 'schema_version' collection reference",
                "services/schema_guard.py",
                line_num
            )
        
        # Check for system_metadata used directly instead of constant
        if 'db.system_metadata' in line or 'db["system_metadata"]' in line:
            result.fail(
                "Direct 'system_metadata' reference - use SCHEMA_COLLECTION constant",
                "services/schema_guard.py",
                line_num
            )
    
    if not has_constant:
        result.fail(
            "SCHEMA_COLLECTION constant not found or not set to 'system_metadata'",
            "services/schema_guard.py"
        )
    
    return result


# ==============================================================================
# CHECK 5: Quarantine boundary
# ==============================================================================
def check_quarantine_boundary(files: list) -> CheckResult:
    """
    Fail if any non-draft module imports from services._draft.
    """
    result = CheckResult("CHECK 5 — QUARANTINE BOUNDARY")
    
    for filepath in files:
        # Skip files within _draft
        if "_draft" in str(filepath):
            continue
        
        lines = read_file_with_lines(filepath)
        for line_num, line in lines:
            if "services._draft" in line or "services/_draft" in line:
                if "from " in line or "import " in line:
                    result.fail(
                        f"Import from quarantined _draft module: {line.strip()[:50]}",
                        str(filepath.relative_to(BACKEND_ROOT)),
                        line_num
                    )
    
    return result


# ==============================================================================
# MAIN
# ==============================================================================
def main():
    print("=" * 60)
    print("PREFLIGHT CONTINUITY GATE")
    print("=" * 60)
    print()
    
    # Get all Python files
    files = get_python_files(BACKEND_ROOT, EXCLUDED_DIRS)
    print(f"Scanning {len(files)} Python files...")
    print()
    
    # Run all checks
    checks = [
        check_no_plaintext_password(files),
        check_jwt_no_unconditional_fallback(files),
        check_single_source_security(files),
        check_schema_collection_invariant(),
        check_quarantine_boundary(files),
    ]
    
    # Print results
    print("-" * 60)
    print("RESULTS")
    print("-" * 60)
    
    all_passed = True
    for check in checks:
        print(str(check))
        if not check.passed:
            all_passed = False
            for failure in check.failures:
                print(f"   └─ {failure['location']}: {failure['message']}")
    
    print()
    print("-" * 60)
    
    if all_passed:
        print("✓ ALL CHECKS PASSED")
        print("-" * 60)
        return 0
    else:
        failed_count = sum(1 for c in checks if not c.passed)
        print(f"✗ {failed_count} CHECK(S) FAILED")
        print("-" * 60)
        return 1


if __name__ == "__main__":
    sys.exit(main())

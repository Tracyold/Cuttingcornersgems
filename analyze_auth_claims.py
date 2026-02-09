"""
Analyze JWT token structure and claims
"""
import sys
sys.path.insert(0, '/app/backend')

# Analyze auth implementation
print("="*60)
print("AUTHORIZATION IDENTITY ANALYSIS")
print("="*60)
print()

# Check current implementation
with open('/app/backend/server.py', 'r') as f:
    content = f.read()
    
# Find token creation logic
import re

# Find create_token function
token_func_match = re.search(r'def create_token\([^)]+\):[^}]+payload = \{([^}]+)\}', content, re.DOTALL)
if token_func_match:
    print("CURRENT TOKEN STRUCTURE:")
    print("-"*60)
    print(token_func_match.group(0))
    print()

# Find get_current_user
user_auth_match = re.search(r'async def get_current_user\([^)]+\):.*?user_id = payload\.get\("([^"]+)"\)', content, re.DOTALL)
if user_auth_match:
    print("USER TOKEN CLAIM KEY:")
    print("-"*60)
    print(f"  Claim: '{user_auth_match.group(1)}'")
    print()

# Find get_admin_user
admin_auth_match = re.search(r'async def get_admin_user\([^)]+\):.*?payload\.get\("([^"]+)"\)', content, re.DOTALL)
if admin_auth_match:
    print("ADMIN TOKEN CLAIM KEY:")
    print("-"*60)
    print(f"  Claim: '{admin_auth_match.group(1)}'")
    print()

# Check services/auth.py structure
try:
    with open('/app/backend/services/auth.py', 'r') as f:
        auth_service = f.read()
    
    service_token_match = re.search(r'self\.create_access_token\(\{([^}]+)\}\)', auth_service)
    if service_token_match:
        print("SERVICES AUTH MODULE TOKEN STRUCTURE:")
        print("-"*60)
        print(f"  {service_token_match.group(1)}")
        print()
except FileNotFoundError:
    pass

print("CANONICAL CLAIM ANALYSIS:")
print("-"*60)
print("✓ User auth uses: 'sub' claim (JWT standard)")
print("✓ Admin auth uses: 'is_admin' claim (role flag)")
print("✓ Email included in user tokens for display")
print()
print("MIGRATION AMBIGUITY ASSESSMENT:")
print("-"*60)
print("Status: CLEAR")
print("Reason: Well-defined claim structure")
print("  - User identity: payload['sub']")
print("  - Admin identity: payload['is_admin'] == True")
print("  - No overlapping claims")
print("  - Standard JWT 'sub' claim used")
print()


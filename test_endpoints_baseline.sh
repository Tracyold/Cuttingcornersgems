#!/bin/bash

# Pre/Post Refactor API Endpoint Baseline Test
# Tests all endpoints to ensure API contract preservation

API_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
API_BASE="${API_URL}/api"

echo "=========================================="
echo "API ENDPOINT BASELINE TEST"
echo "Base URL: $API_BASE"
echo "=========================================="
echo ""

PASSED=0
FAILED=0

test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_code=$3
    local description=$4
    local data=$5
    local headers=$6
    
    if [ -n "$data" ] && [ -n "$headers" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" -H "Content-Type: application/json" -H "$headers" -d "$data")
    elif [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" -H "Content-Type: application/json" -d "$data")
    elif [ -n "$headers" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" -H "$headers")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_code" ]; then
        echo "✓ PASS: $description (HTTP $http_code)"
        ((PASSED++))
    else
        echo "✗ FAIL: $description (Expected $expected_code, Got $http_code)"
        ((FAILED++))
    fi
}

echo "=== PUBLIC ENDPOINTS ==="
test_endpoint "GET" "/products" "200" "GET /products - List all products"
test_endpoint "GET" "/products?category=sapphire" "200" "GET /products?category - Filter by category"
test_endpoint "GET" "/gallery" "200" "GET /gallery - List gallery items"
test_endpoint "GET" "/gallery/categories" "200" "GET /gallery/categories - Get categories"
test_endpoint "GET" "/gallery/featured" "200" "GET /gallery/featured - Get featured items"
test_endpoint "GET" "/auth/signup-status" "200" "GET /auth/signup-status - Check signup enabled"

echo ""
echo "=== USER AUTH ENDPOINTS ==="
test_endpoint "POST" "/auth/signup" "200" "POST /auth/signup - User registration" '{"email":"test_'$(date +%s)'@example.com","password":"TestPass123!","name":"Test User"}'
test_endpoint "POST" "/auth/login" "401" "POST /auth/login - Invalid credentials (expected)" '{"email":"invalid@example.com","password":"wrong"}'

echo ""
echo "=== ADMIN AUTH ENDPOINTS ==="
test_endpoint "POST" "/admin/login" "200" "POST /admin/login - Admin login" '{"username":"postvibe","password":"adm1npa$$word"}'

# Get admin token for protected endpoints
ADMIN_TOKEN=$(curl -s -X POST "$API_BASE/admin/login" -H "Content-Type: application/json" -d '{"username":"postvibe","password":"adm1npa$$word"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")

echo ""
echo "=== ADMIN PROTECTED ENDPOINTS ==="
test_endpoint "GET" "/admin/stats" "200" "GET /admin/stats - Dashboard statistics" "" "Authorization: Bearer $ADMIN_TOKEN"
test_endpoint "GET" "/admin/products" "200" "GET /admin/products - List products" "" "Authorization: Bearer $ADMIN_TOKEN"
test_endpoint "GET" "/admin/gallery" "200" "GET /admin/gallery - List gallery" "" "Authorization: Bearer $ADMIN_TOKEN"
test_endpoint "GET" "/admin/users" "200" "GET /admin/users - List users" "" "Authorization: Bearer $ADMIN_TOKEN"
test_endpoint "GET" "/admin/bookings" "200" "GET /admin/bookings - List bookings" "" "Authorization: Bearer $ADMIN_TOKEN"
test_endpoint "GET" "/admin/product-inquiries" "200" "GET /admin/product-inquiries - List inquiries" "" "Authorization: Bearer $ADMIN_TOKEN"
test_endpoint "GET" "/admin/orders" "200" "GET /admin/orders - List orders" "" "Authorization: Bearer $ADMIN_TOKEN"
test_endpoint "GET" "/admin/settings" "200" "GET /admin/settings - Get settings" "" "Authorization: Bearer $ADMIN_TOKEN"

echo ""
echo "=== ADMIN CRUD ENDPOINTS ==="
# Create product
PRODUCT_DATA='{"title":"Test Product '$(date +%s)'","category":"sapphire","image_url":"https://example.com/test.jpg","price":100,"in_stock":true}'
test_endpoint "POST" "/admin/products" "200" "POST /admin/products - Create product" "$PRODUCT_DATA" "Authorization: Bearer $ADMIN_TOKEN"

# Create gallery item
GALLERY_DATA='{"title":"Test Gallery '$(date +%s)'","category":"tourmaline","image_url":"https://example.com/test.jpg"}'
test_endpoint "POST" "/admin/gallery" "200" "POST /admin/gallery - Create gallery item" "$GALLERY_DATA" "Authorization: Bearer $ADMIN_TOKEN"

echo ""
echo "=========================================="
echo "BASELINE TEST SUMMARY"
echo "=========================================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total:  $((PASSED + FAILED))"
echo "=========================================="

if [ $FAILED -eq 0 ]; then
    echo "✓ ALL TESTS PASSED"
    exit 0
else
    echo "✗ SOME TESTS FAILED"
    exit 1
fi

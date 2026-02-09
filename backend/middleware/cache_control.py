"""
HTTP Cache Control Middleware
Sets explicit cache headers by endpoint class to prevent stale data
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
import hashlib
import json


class CacheControlMiddleware(BaseHTTPMiddleware):
    """
    Middleware that sets cache headers deterministically by endpoint class
    
    Rules:
    - Admin endpoints (/api/admin/*): no-store, no-cache
    - Authenticated endpoints with Authorization header: no-store
    - Public endpoints (products, gallery): public, max-age=60
    """
    
    async def dispatch(self, request: Request, call_next):
        # Process request
        response = await call_next(request)
        
        # Get request path
        path = request.url.path
        
        # Check for Authorization header
        has_auth = request.headers.get("authorization") is not None
        
        # Determine cache policy
        if path.startswith("/api/admin/"):
            # Admin endpoints: never cache
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Vary"] = "Authorization"
            
        elif has_auth and path.startswith("/api/"):
            # Authenticated API calls: never cache
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Vary"] = "Authorization"
            
        elif path in [
            "/api/products",
            "/api/gallery",
            "/api/gallery/featured",
            "/api/gallery/categories"
        ] or path.startswith("/api/products/") or path.startswith("/api/gallery/"):
            # Public endpoints: short cache (60 seconds)
            response.headers["Cache-Control"] = "public, max-age=60"
            
            # ETag generation frozen - header-only, no 304 response code changes
            # Future: Add ETag header without response code modification
        
        return response

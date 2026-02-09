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
            
            # Add ETag for conditional requests
            if response.status_code == 200 and hasattr(response, "body"):
                try:
                    # Generate ETag from response body
                    body_hash = hashlib.md5(response.body).hexdigest()
                    etag = f'"{body_hash}"'
                    response.headers["ETag"] = etag
                    
                    # Check If-None-Match header
                    if_none_match = request.headers.get("if-none-match")
                    if if_none_match == etag:
                        # Return 304 Not Modified
                        response.status_code = 304
                        response.body = b""
                except:
                    pass  # If body processing fails, skip ETag
        
        return response

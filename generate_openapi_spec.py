"""
Generate OpenAPI specification from FastAPI app
"""
import sys
import json
sys.path.insert(0, '/app/backend')

from server import app

# Get OpenAPI schema
openapi_schema = app.openapi()

# Extract endpoint signatures
endpoints = {}
for path, methods in openapi_schema.get("paths", {}).items():
    for method, details in methods.items():
        endpoint_key = f"{method.upper()} {path}"
        endpoints[endpoint_key] = {
            "parameters": details.get("parameters", []),
            "requestBody": details.get("requestBody", {}),
            "responses": details.get("responses", {}),
            "summary": details.get("summary", ""),
            "operationId": details.get("operationId", "")
        }

# Output as JSON
print(json.dumps({
    "openapi_version": openapi_schema.get("openapi"),
    "title": openapi_schema.get("info", {}).get("title"),
    "version": openapi_schema.get("info", {}).get("version"),
    "total_endpoints": len(endpoints),
    "endpoints": endpoints
}, indent=2))

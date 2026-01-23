"""CRUD API for records management."""

import json
from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
from _utils.db import get_supabase_client


def cors_headers():
    """Return CORS headers for API responses."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    }


def send_response(handler, status_code, body):
    """Send JSON response with CORS headers."""
    handler.send_response(status_code)
    for key, value in cors_headers().items():
        handler.send_header(key, value)
    handler.end_headers()
    handler.wfile.write(json.dumps(body).encode())


def parse_body(handler):
    """Parse JSON body from request."""
    content_length = int(handler.headers.get("Content-Length", 0))
    if content_length == 0:
        return {}
    body = handler.rfile.read(content_length)
    return json.loads(body.decode())


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """Handle CORS preflight requests."""
        self.send_response(200)
        for key, value in cors_headers().items():
            self.send_header(key, value)
        self.end_headers()

    def do_GET(self):
        """List all records or get a single record by ID."""
        try:
            supabase = get_supabase_client()
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            record_id = params.get("id", [None])[0]

            if record_id:
                # Get single record
                result = supabase.table("records").select("*").eq("id", record_id).single().execute()
                if result.data:
                    send_response(self, 200, {"success": True, "data": result.data})
                else:
                    send_response(self, 404, {"success": False, "error": "Record not found"})
            else:
                # List all records
                result = supabase.table("records").select("*").order("id").execute()
                send_response(self, 200, {"success": True, "data": result.data})
        except Exception as e:
            send_response(self, 500, {"success": False, "error": str(e)})

    def do_POST(self):
        """Create a new record."""
        try:
            supabase = get_supabase_client()
            body = parse_body(self)

            # Validate required fields
            required = ["id", "title", "division", "medium", "year", "status"]
            missing = [f for f in required if not body.get(f)]
            if missing:
                send_response(self, 400, {
                    "success": False,
                    "error": f"Missing required fields: {', '.join(missing)}"
                })
                return

            # Insert record
            result = supabase.table("records").insert(body).execute()
            send_response(self, 201, {"success": True, "data": result.data[0] if result.data else body})
        except Exception as e:
            error_msg = str(e)
            if "duplicate key" in error_msg.lower() or "unique" in error_msg.lower():
                send_response(self, 409, {"success": False, "error": "Record with this ID already exists"})
            else:
                send_response(self, 500, {"success": False, "error": error_msg})

    def do_PUT(self):
        """Update an existing record."""
        try:
            supabase = get_supabase_client()
            body = parse_body(self)

            record_id = body.get("id")
            if not record_id:
                send_response(self, 400, {"success": False, "error": "Record ID is required"})
                return

            # Update record
            result = supabase.table("records").update(body).eq("id", record_id).execute()
            if result.data:
                send_response(self, 200, {"success": True, "data": result.data[0]})
            else:
                send_response(self, 404, {"success": False, "error": "Record not found"})
        except Exception as e:
            send_response(self, 500, {"success": False, "error": str(e)})

    def do_DELETE(self):
        """Delete a record by ID."""
        try:
            supabase = get_supabase_client()
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            record_id = params.get("id", [None])[0]

            if not record_id:
                send_response(self, 400, {"success": False, "error": "Record ID is required"})
                return

            # Delete record
            result = supabase.table("records").delete().eq("id", record_id).execute()
            if result.data:
                send_response(self, 200, {"success": True, "data": result.data[0]})
            else:
                send_response(self, 404, {"success": False, "error": "Record not found"})
        except Exception as e:
            send_response(self, 500, {"success": False, "error": str(e)})

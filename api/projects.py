"""CRUD API for projects management."""

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
        """List all projects or get a single project by ID."""
        try:
            supabase = get_supabase_client()
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            project_id = params.get("id", [None])[0]

            if project_id:
                # Get single project
                result = supabase.table("projects").select("*").eq("id", project_id).single().execute()
                if result.data:
                    send_response(self, 200, {"success": True, "data": result.data})
                else:
                    send_response(self, 404, {"success": False, "error": "Project not found"})
            else:
                # List all projects
                result = supabase.table("projects").select("*").order("id").execute()
                send_response(self, 200, {"success": True, "data": result.data})
        except Exception as e:
            send_response(self, 500, {"success": False, "error": str(e)})

    def do_POST(self):
        """Create a new project."""
        try:
            supabase = get_supabase_client()
            body = parse_body(self)

            # Validate required fields
            required = ["id", "name", "status"]
            missing = [f for f in required if not body.get(f)]
            if missing:
                send_response(self, 400, {
                    "success": False,
                    "error": f"Missing required fields: {', '.join(missing)}"
                })
                return

            # Insert project
            result = supabase.table("projects").insert(body).execute()
            send_response(self, 201, {"success": True, "data": result.data[0] if result.data else body})
        except Exception as e:
            error_msg = str(e)
            if "duplicate key" in error_msg.lower() or "unique" in error_msg.lower():
                send_response(self, 409, {"success": False, "error": "Project with this ID already exists"})
            else:
                send_response(self, 500, {"success": False, "error": error_msg})

    def do_PUT(self):
        """Update an existing project."""
        try:
            supabase = get_supabase_client()
            body = parse_body(self)

            project_id = body.get("id")
            if not project_id:
                send_response(self, 400, {"success": False, "error": "Project ID is required"})
                return

            # Update project
            result = supabase.table("projects").update(body).eq("id", project_id).execute()
            if result.data:
                send_response(self, 200, {"success": True, "data": result.data[0]})
            else:
                send_response(self, 404, {"success": False, "error": "Project not found"})
        except Exception as e:
            send_response(self, 500, {"success": False, "error": str(e)})

    def do_DELETE(self):
        """Delete a project by ID."""
        try:
            supabase = get_supabase_client()
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            project_id = params.get("id", [None])[0]

            if not project_id:
                send_response(self, 400, {"success": False, "error": "Project ID is required"})
                return

            # Delete project
            result = supabase.table("projects").delete().eq("id", project_id).execute()
            if result.data:
                send_response(self, 200, {"success": True, "data": result.data[0]})
            else:
                send_response(self, 404, {"success": False, "error": "Project not found"})
        except Exception as e:
            send_response(self, 500, {"success": False, "error": str(e)})

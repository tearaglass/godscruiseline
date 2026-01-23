from http.server import BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import json
import os
from supabase import create_client


def get_supabase():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(url, key)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        try:
            supabase = get_supabase()
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            record_id = params.get("id", [None])[0]

            if record_id:
                result = supabase.table("records").select("*").eq("id", record_id).single().execute()
                if result.data:
                    self._send_json(200, {"success": True, "data": result.data})
                else:
                    self._send_json(404, {"success": False, "error": "Record not found"})
            else:
                result = supabase.table("records").select("*").order("id").execute()
                self._send_json(200, {"success": True, "data": result.data})
        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})

    def do_POST(self):
        try:
            supabase = get_supabase()
            body = self._parse_body()

            required = ["id", "title", "division", "medium", "year", "status"]
            missing = [f for f in required if not body.get(f)]
            if missing:
                self._send_json(400, {"success": False, "error": f"Missing required fields: {', '.join(missing)}"})
                return

            result = supabase.table("records").insert(body).execute()
            self._send_json(201, {"success": True, "data": result.data[0] if result.data else body})
        except Exception as e:
            error_msg = str(e)
            if "duplicate key" in error_msg.lower() or "unique" in error_msg.lower():
                self._send_json(409, {"success": False, "error": "Record with this ID already exists"})
            else:
                self._send_json(500, {"success": False, "error": error_msg})

    def do_PUT(self):
        try:
            supabase = get_supabase()
            body = self._parse_body()

            record_id = body.get("id")
            if not record_id:
                self._send_json(400, {"success": False, "error": "Record ID is required"})
                return

            result = supabase.table("records").update(body).eq("id", record_id).execute()
            if result.data:
                self._send_json(200, {"success": True, "data": result.data[0]})
            else:
                self._send_json(404, {"success": False, "error": "Record not found"})
        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})

    def do_DELETE(self):
        try:
            supabase = get_supabase()
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            record_id = params.get("id", [None])[0]

            if not record_id:
                self._send_json(400, {"success": False, "error": "Record ID is required"})
                return

            result = supabase.table("records").delete().eq("id", record_id).execute()
            if result.data:
                self._send_json(200, {"success": True, "data": result.data[0]})
            else:
                self._send_json(404, {"success": False, "error": "Record not found"})
        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})

    def _parse_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        return json.loads(self.rfile.read(content_length).decode())

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

"""Authentication API for access control."""

import json
import os
from http.server import BaseHTTPRequestHandler


def cors_headers():
    """Return CORS headers for API responses."""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    def do_POST(self):
        """Validate a passphrase and return the granted access level."""
        try:
            body = parse_body(self)
            passphrase = body.get("passphrase", "").strip()

            if not passphrase:
                send_response(self, 400, {"success": False, "error": "Passphrase required"})
                return

            # Get passphrases from environment variables
            witness_passphrase = os.environ.get("WITNESS_PASSPHRASE", "")
            admin_passphrase = os.environ.get("ADMIN_PASSPHRASE", "")

            # Check admin first (higher privilege)
            if admin_passphrase and passphrase == admin_passphrase:
                send_response(self, 200, {
                    "success": True,
                    "level": "admin"
                })
                return

            # Check witness
            if witness_passphrase and passphrase == witness_passphrase:
                send_response(self, 200, {
                    "success": True,
                    "level": "witness"
                })
                return

            # Invalid passphrase
            send_response(self, 200, {
                "success": True,
                "level": None
            })

        except Exception as e:
            send_response(self, 500, {"success": False, "error": str(e)})

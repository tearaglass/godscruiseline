from http.server import BaseHTTPRequestHandler
import json
import os


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = {}
            if content_length > 0:
                body = json.loads(self.rfile.read(content_length).decode())

            passphrase = body.get("passphrase", "").strip()

            if not passphrase:
                self._send_json(400, {"success": False, "error": "Passphrase required"})
                return

            witness_passphrase = os.environ.get("WITNESS_PASSPHRASE", "")
            admin_passphrase = os.environ.get("ADMIN_PASSPHRASE", "")

            if admin_passphrase and passphrase == admin_passphrase:
                self._send_json(200, {"success": True, "level": "admin"})
                return

            if witness_passphrase and passphrase == witness_passphrase:
                self._send_json(200, {"success": True, "level": "witness"})
                return

            self._send_json(200, {"success": True, "level": None})

        except Exception as e:
            self._send_json(500, {"success": False, "error": str(e)})

    def do_GET(self):
        self._send_json(200, {"success": True, "message": "Auth API ready. Use POST to validate."})

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

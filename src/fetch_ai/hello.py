from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "message": "Hello World from Vercel!",
            "status": "success",
            "path": self.path
        }
        
        self.wfile.write(json.dumps(response).encode())
        
    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            "message": "Hello World POST from Vercel!",
            "status": "success",
            "path": self.path
        }
        
        self.wfile.write(json.dumps(response).encode())
from http.server import HTTPServer, SimpleHTTPRequestHandler

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        self.wfile.write(b"<h1>Hello! Server is working.</h1>")

if __name__ == "__main__":
    port = 8000
    server = HTTPServer(("0.0.0.0", port), Handler)
    print(f"Server running on http://localhost:{port}")
    server.serve_forever()

from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        mirrors = [
            "https://nettruyen.gg/trang-chu",
            "https://nettruyennew.com/trang-chu",
            "https://nettruyenco.vn/trang-chu",
            "https://nettruyentt.com/trang-chu",
            "https://nettruyenmax.com/trang-chu",
            "https://nettruyenking.com/trang-chu"
        ]
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
        }
        
        results = {}
        for m in mirrors:
            try:
                req = urllib.request.Request(m, headers=headers)
                with urllib.request.urlopen(req, timeout=8) as response:
                    results[m] = {
                        "status": response.status,
                        "length": len(response.read()),
                        "success": True
                    }
            except Exception as e:
                results[m] = {
                    "error": str(e),
                    "success": False
                }
                
        res_data = json.dumps(results).encode('utf-8')
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(res_data)

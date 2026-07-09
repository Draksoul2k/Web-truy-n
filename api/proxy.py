from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import hashlib

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed_path.query)
        image_url = query.get('url', [None])[0]
        
        if not image_url:
            self.send_error(400, "Missing 'url' parameter")
            return
            
        try:
            req = urllib.request.Request(image_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
                'Referer': 'https://nettruyen.gg/'
            })
            with urllib.request.urlopen(req, timeout=15) as response:
                img_data = response.read()
                content_type = response.headers.get('Content-Type', 'image/jpeg')
                
                # Tính toán MD5 hash của ảnh phục vụ bộ lọc QC trên Vercel
                img_hash = hashlib.md5(img_data).hexdigest()
                
                self.send_response(200)
                self.send_header('Content-Type', content_type)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Expose-Headers', 'X-Image-Hash')
                self.send_header('X-Image-Hash', img_hash)
                self.send_header('Cache-Control', 'public, max-age=86400') # Cache ảnh 24h trên CDN của Vercel
                self.end_headers()
                self.wfile.write(img_data)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

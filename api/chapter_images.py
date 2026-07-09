from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import re
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed_path.query)
        chapter_url = query.get('url', [None])[0]
        
        if not chapter_url:
            self.send_error(400, "Missing 'url' parameter")
            return
            
        try:
            req = urllib.request.Request(chapter_url, headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            })
            with urllib.request.urlopen(req, timeout=15) as response:
                html = response.read().decode('utf-8')
            
            pattern = r"class=['\"]page-chapter['\"][^>]*>\s*<img[^>]+data-src=['\"]([^'\"]+)['\"]"
            images = re.findall(pattern, html)
            
            if not images:
                pattern_fallback = r"<img[^>]+class=['\"][^'\"]*lozad[^'\"]*['\"][^>]+data-src=['\"]([^'\"]+)['\"]"
                images = re.findall(pattern_fallback, html)
            
            path_parts = urllib.parse.urlparse(chapter_url).path.split('/')
            comic_slug = ""
            for part in path_parts:
                if part and part != "truyen-tranh":
                    comic_slug = part
                    break
            
            filtered_images = []
            for img in images:
                if comic_slug and (f"/{comic_slug}/" in img or comic_slug in img):
                    filtered_images.append(img)
                    
            res_data = json.dumps(filtered_images).encode('utf-8')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(res_data)
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'text/plain')
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

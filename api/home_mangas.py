from http.server import BaseHTTPRequestHandler
import urllib.request
import re
import json

BASE_URL = "https://nettruyenz.com"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
}

def parse_manga_figures(html):
    figures = re.findall(r'<figure class="clearfix">.*?</figure>', html, re.DOTALL)
    mangas = []
    for fig in figures:
        link_match = re.search(r'<h3>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', fig, re.DOTALL)
        if not link_match:
            link_match = re.search(r'<figcaption>.*?<h3>\s*<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', fig, re.DOTALL)
            
        if link_match:
            href = link_match.group(1).strip()
            title = re.sub(r'<[^>]+>', '', link_match.group(2)).strip()
            
            slug_match = re.search(r'truyen-tranh/([^/"]+)', href)
            slug = slug_match.group(1).strip() if slug_match else ""
            
            img_match = re.search(r'<img[^>]+data-original="([^"]+)"', fig)
            cover_image = img_match.group(1).strip() if img_match else ""
            
            chap_match = re.search(r'<li class="chapter[^"]*".*?<a[^>]+>(.*?)</a>', fig, re.DOTALL)
            last_chapter = chap_match.group(1).strip() if chap_match else "Chương mới"
            
            views_match = re.search(r'<i class="fa fa-eye"></i>\s*([^\s<]+)', fig)
            views = views_match.group(1).strip() if views_match else "100K"
            
            mangas.append({
                "title": title,
                "slug": slug,
                "cover_image": cover_image,
                "last_chapter": last_chapter,
                "views": views
            })
    return mangas

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            url = f"{BASE_URL}/"
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as response:
                html = response.read().decode('utf-8')
            
            mangas = parse_manga_figures(html)
            res_data = json.dumps(mangas).encode('utf-8')
            
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

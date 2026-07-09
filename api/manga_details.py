from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse
import re
import json

BASE_URL = "https://nettruyenz.com"
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8'
}

def get_chapters_list_from_html(html):
    table_match = re.search(r'<table class="chapter-table">.*?</table>', html, re.DOTALL)
    chaps = []
    if table_match:
        table_html = table_match.group(0)
        links = re.findall(r'<a[^>]+href="([^"]+)"[^>]*>(.*?)</a>', table_html, re.DOTALL)
        for href, text in links:
            path_parts = urllib.parse.urlparse(href).path.strip('/').split('/')
            if len(path_parts) >= 2:
                chapter_slug = path_parts[1]
            elif len(path_parts) == 1:
                chapter_slug = path_parts[0]
            else:
                chapter_slug = ""
                
            if chapter_slug:
                num_match = re.search(r'chap-(\d+[\d,.]*)', chapter_slug)
                chapter_num = num_match.group(1) if num_match else "0"
                chaps.append({
                    "chapter_name": re.sub(r'<[^>]+>', '', text).strip(),
                    "chapter_slug": chapter_slug,
                    "chapter_num": chapter_num
                })
        chaps.reverse()
    return chaps

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        query = urllib.parse.parse_qs(parsed_path.query)
        slug = query.get('slug', [''])[0]
        
        if not slug:
            self.send_error(400, "Missing 'slug' parameter")
            return
            
        try:
            detail_url = f"{BASE_URL}/truyen-tranh/{slug}"
            req = urllib.request.Request(detail_url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=15) as response:
                html = response.read().decode('utf-8')
            
            # Title
            title_match = re.search(r'class="comic-detail-title"[^>]*>(.*?)</h1>', html)
            title = title_match.group(1).strip() if title_match else "Chưa cập nhật"
            
            # Cover image
            cover_match = re.search(fr'<img[^>]+src=["\']([^"\']+)["\'][^>]+alt=["\']{re.escape(title)}["\']', html)
            if not cover_match:
                cover_match = re.search(r'src=["\'](https://img\.otruyenapi\.com/uploads/comics/[^"\']+)["\']', html)
            cover_image = cover_match.group(1).strip() if cover_match else ""
            
            # Description
            import html as html_lib
            desc_match = re.search(r'class="fs-13 mt-2"[^>]*>(.*?)</div>', html, re.DOTALL)
            description = ""
            if desc_match:
                raw_desc = html_lib.unescape(desc_match.group(1))
                description = re.sub(r'<[^>]+>', '', raw_desc).strip()
                
            # Author
            author_match = re.search(r'Tác giả</dt><dd>(.*?)</dd>', html)
            author = author_match.group(1).strip() if author_match else "Đang cập nhật"
            
            # Status
            status_match = re.search(r'Trạng thái</dt><dd>(.*?)</dd>', html)
            status = status_match.group(1).strip() if status_match else "Đang tiến hành"
            
            # Views
            views_match = re.search(r'Lượt xem</dt><dd>(.*?)</dd>', html)
            views = views_match.group(1).strip() if views_match else "100K"
            
            # Follows
            follows = "10K"
            
            # Chapters
            chapters = get_chapters_list_from_html(html)
            
            manga_details = {
                "title": title,
                "slug": slug,
                "cover_image": cover_image,
                "description": description,
                "author": author,
                "status": status,
                "views": views,
                "follows": follows,
                "chapters": chapters
            }
            
            res_data = json.dumps(manga_details).encode('utf-8')
            
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

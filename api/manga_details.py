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

def get_chapters_list(slug):
    api_url = f"{BASE_URL}/Comic/Services/ComicService.asmx/ChapterList?slug={slug}"
    req = urllib.request.Request(api_url, headers={
        'User-Agent': HEADERS['User-Agent'],
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
    })
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            content = response.read().decode('utf-8')
            data = json.loads(content)
            raw_chaps = data.get("data", [])
            chaps = []
            for c in raw_chaps:
                chaps.append({
                    "chapter_name": c["chapter_name"],
                    "chapter_slug": c["chapter_slug"],
                    "chapter_num": c["chapter_num"]
                })
            def get_num(x):
                try:
                    return float(x.get("chapter_num", 0))
                except:
                    return 0.0
            chaps.sort(key=get_num)
            return chaps
    except Exception as e:
        print(f"Error fetching chapters list for {slug}: {e}")
        return []

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
            title_match = re.search(r'<h1 class="title-detail"[^>]*>(.*?)</h1>', html, re.DOTALL)
            title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else "Chưa cập nhật"
            
            # Cover image (fixed regex with multi-class support)
            cover_match = re.search(r'class=["\'][^"\']*col-image[^"\']*["\'].*?<img[^>]+(?:data-src|data-original|src)=["\']([^"\']+)["\']', html, re.DOTALL)
            cover_image = cover_match.group(1).strip() if cover_match else ""
            
            # Description
            desc_match = re.search(r'<div class="detail-content"[^>]*>(.*?)</div>', html, re.DOTALL)
            description = ""
            if desc_match:
                description = re.sub(r'<[^>]+>', '', desc_match.group(1)).strip()
                
            # Author
            author_match = re.search(r'class="author[^"]*".*?<div class="col-xs-8"[^>]*>(.*?)</div>', html, re.DOTALL)
            author = re.sub(r'<[^>]+>', '', author_match.group(1)).strip() if author_match else "Cập nhật"
            
            # Status
            status_match = re.search(r'class="status[^"]*".*?<div class="col-xs-8"[^>]*>(.*?)</div>', html, re.DOTALL)
            status = re.sub(r'<[^>]+>', '', status_match.group(1)).strip() if status_match else "Đang tiến hành"
            
            # Views
            views_match = re.search(r'class="views[^"]*".*?<div class="col-xs-8"[^>]*>(.*?)</div>', html, re.DOTALL)
            views = re.sub(r'<[^>]+>', '', views_match.group(1)).strip() if views_match else "100K"
            
            # Follows
            follows_match = re.search(r'<b>(\d+[\d,.]*)</b> người đã theo dõi', html)
            follows = "10K"
            if follows_match:
                follows = follows_match.group(1).strip()
            else:
                follows_match_alt = re.search(r'Theo dõi:\s*<strong>(\d+[\d,.]*)</strong>', html)
                if follows_match_alt:
                    follows = follows_match_alt.group(1).strip()
            
            # Chapters
            chapters = get_chapters_list(slug)
            
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

import http.server
import socketserver
import urllib.request
import urllib.parse
import os
import re
import json
import mimetypes
import hashlib

# Khắc phục lỗi Windows Registry nhận diện sai MIME type của file CSS/JS thành text/plain
mimetypes.add_type('text/css', '.css')
mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/json', '.json')

PORT = 3000

# Base URL của nguồn truyện hoạt động ổn định trên cả local và đám mây (Vercel)
BASE_URL = "https://nettruyenz.com"

# Headers mặc định giả lập trình duyệt
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
                # Chuyển đổi định dạng số chương
                chapter_num = num_match.group(1) if num_match else "0"
                chaps.append({
                    "chapter_name": re.sub(r'<[^>]+>', '', text).strip(),
                    "chapter_slug": chapter_slug,
                    "chapter_num": chapter_num
                })
        chaps.reverse()
    return chaps

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
            if not slug_match:
                # Fallback cho nettruyenz
                path_parts = urllib.parse.urlparse(href).path.strip('/').split('/')
                slug = path_parts[0] if path_parts else ""
            else:
                slug = slug_match.group(1).strip()
            
            img_match = re.search(r'<img[^>]+data-original="([^"]+)"', fig)
            if not img_match:
                img_match = re.search(r'<img[^>]+src="([^"]+)"', fig)
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

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed_path = urllib.parse.urlparse(self.path)
        
        # 1. Image Proxy
        if parsed_path.path == '/proxy':
            query = urllib.parse.parse_qs(parsed_path.query)
            image_url = query.get('url', [None])[0]
            
            if not image_url:
                self.send_error(400, "Missing 'url' parameter")
                return
                
            try:
                req = urllib.request.Request(image_url, headers={
                    'User-Agent': HEADERS['User-Agent'],
                    'Referer': f'{BASE_URL}/'
                })
                with urllib.request.urlopen(req, timeout=15) as response:
                    img_data = response.read()
                    content_type = response.headers.get('Content-Type', 'image/jpeg')
                    
                    img_hash = hashlib.md5(img_data).hexdigest()
                    
                    self.send_response(200)
                    self.send_header('Content-Type', content_type)
                    self.send_header('Access-Control-Allow-Origin', '*')
                    self.send_header('Access-Control-Expose-Headers', 'X-Image-Hash')
                    self.send_header('X-Image-Hash', img_hash)
                    self.send_header('Content-Length', str(len(img_data)))
                    self.end_headers()
                    self.wfile.write(img_data)
            except Exception as e:
                self.send_error(500, f"Error proxying image: {e}")
                
        # 2. Get Home Mangas (Newly Updated)
        elif parsed_path.path == '/api/home-mangas':
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
                self.send_error(500, f"Error fetching home mangas: {e}")
                
        # 3. Get Top Rank Mangas
        elif parsed_path.path == '/api/top-mangas':
            query = urllib.parse.parse_qs(parsed_path.query)
            rank_type = query.get('type', ['week'])[0]
            
            sort_map = {'day': '13', 'week': '12', 'month': '11', 'year': '10'}
            sort_val = sort_map.get(rank_type, '12')
            
            try:
                url = f"{BASE_URL}/tim-truyen?sort={sort_val}"
                req = urllib.request.Request(url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=15) as response:
                    html = response.read().decode('utf-8')
                
                mangas = parse_manga_figures(html)
                mangas = mangas[:10]
                res_data = json.dumps(mangas).encode('utf-8')
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(res_data)
            except Exception as e:
                self.send_error(500, f"Error fetching top mangas: {e}")
                
        # 4. Search Manga
        elif parsed_path.path == '/api/search-manga':
            query = urllib.parse.parse_qs(parsed_path.query)
            keyword = query.get('q', [''])[0]
            
            try:
                encoded_kw = urllib.parse.quote(keyword)
                url = f"{BASE_URL}/tim-truyen?keyword={encoded_kw}"
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
                self.send_error(500, f"Error searching mangas: {e}")
                
        # 5. Get Manga Details (dynamic fetch for any manga)
        elif parsed_path.path == '/api/manga-details':
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
                
                # Trích xuất thông tin chi tiết
                title_match = re.search(r'<h1 class="title-detail"[^>]*>(.*?)</h1>', html, re.DOTALL)
                title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip() if title_match else "Chưa cập nhật"
                
                cover_match = re.search(r'class=["\'][^"\']*col-image[^"\']*["\'].*?<img[^>]+(?:data-src|data-original|src)=["\']([^"\']+)["\']', html, re.DOTALL)
                cover_image = cover_match.group(1).strip() if cover_match else ""
                
                desc_match = re.search(r'<div class="detail-content"[^>]*>(.*?)</div>', html, re.DOTALL)
                description = ""
                if desc_match:
                    description = re.sub(r'<[^>]+>', '', desc_match.group(1)).strip()
                    
                author_match = re.search(r'class="author[^"]*".*?<div class="col-xs-8"[^>]*>(.*?)</div>', html, re.DOTALL)
                author = re.sub(r'<[^>]+>', '', author_match.group(1)).strip() if author_match else "Cập nhật"
                
                status_match = re.search(r'class="status[^"]*".*?<div class="col-xs-8"[^>]*>(.*?)</div>', html, re.DOTALL)
                status = re.sub(r'<[^>]+>', '', status_match.group(1)).strip() if status_match else "Đang tiến hành"
                
                views_match = re.search(r'class="views[^"]*".*?<div class="col-xs-8"[^>]*>(.*?)</div>', html, re.DOTALL)
                views = re.sub(r'<[^>]+>', '', views_match.group(1)).strip() if views_match else "100K"
                
                follows_match = re.search(r'<b>(\d+[\d,.]*)</b> người đã theo dõi', html)
                follows = "10K"
                if follows_match:
                    follows = follows_match.group(1).strip()
                else:
                    follows_match_alt = re.search(r'Theo dõi:\s*<strong>(\d+[\d,.]*)</strong>', html)
                    if follows_match_alt:
                        follows = follows_match_alt.group(1).strip()
                
                # Lấy danh sách chương trực tiếp từ HTML
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
                self.send_error(500, f"Error fetching manga details: {e}")
                
        # 6. Chapter Page Images
        elif parsed_path.path == '/api/chapter-images':
            query = urllib.parse.parse_qs(parsed_path.query)
            chapter_url = query.get('url', [None])[0]
            
            if not chapter_url:
                self.send_error(400, "Missing 'url' parameter")
                return
                
            try:
                req = urllib.request.Request(chapter_url, headers=HEADERS)
                with urllib.request.urlopen(req, timeout=15) as response:
                    html = response.read().decode('utf-8')
                
                # Bóc tách ảnh trên nettruyenz (các ảnh có alt="page")
                img_tags = re.findall(r'<img[^>]+>', html)
                filtered_images = []
                for tag in img_tags:
                    if 'alt="page"' in tag or "alt='page'" in tag:
                        src_match = re.search(r'src=["\']([^"\']+)["\']', tag)
                        if src_match:
                            filtered_images.append(src_match.group(1).strip())
                
                # Dự phòng định dạng NetTruyen cũ
                if not filtered_images:
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
                self.send_error(500, f"Error fetching chapter images: {e}")
        else:
            # Phục vụ các file tĩnh thông thường (HTML, CSS, JS, JSON)
            super().do_GET()

# Thiết lập thư mục làm việc chính là thư mục chứa file server.py
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# Cho phép chạy lại cổng cũ nhanh chóng
socketserver.ThreadingTCPServer.allow_reuse_address = True

with socketserver.ThreadingTCPServer(("", PORT), ProxyHandler) as httpd:
    print("==================================================")
    print(f" Web Server dang chay tai: http://localhost:{PORT}")
    print("==================================================")
    print("Nhan Ctrl+C de dung server.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nDang dung server...")

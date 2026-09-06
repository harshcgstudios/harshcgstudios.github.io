import http.server
import os
import threading
import urllib.parse
import urllib.request
import json
import zipfile
import io
import time
import re

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))
if os.name == 'nt':
    NETWORK_PATH = r"\\synology\DATA\3d\CTscans"
    RISD_PATH = r"\\synology\DATA\3d\Models\sketchfab\RISD Nature Lab"
    NAS_PORTFOLIO_DIR = r"\\synology\DATA\3d\portfolio\anatomy"
    ANATOMY_WEB_DIR = r"d:\AI\Antigravity\anatomyWeb"
else:
    NETWORK_PATH = "/volume1/DATA/3d/CTscans"
    RISD_PATH = "/volume1/DATA/3d/Models/sketchfab/RISD Nature Lab"
    NAS_PORTFOLIO_DIR = "/volume1/DATA/3d/portfolio/anatomy"
    ANATOMY_WEB_DIR = "/volume1/DATA/3d/portfolio/anatomyWeb"

import datetime

STATS_FILE = os.path.join(DIRECTORY, "stats_data.json")
STATS_KEY_FILE = os.path.join(DIRECTORY, "stats_key.txt")
stats_lock = threading.Lock()

if not os.path.exists(STATS_KEY_FILE):
    try:
        with open(STATS_KEY_FILE, "w", encoding="utf-8") as sf:
            sf.write("admin123")
    except Exception as e:
        print(f"Error creating stats key file: {e}")

def load_stats():
    if not os.path.exists(STATS_FILE):
        return {"total_hits": 0, "hits_by_page": {}, "hits_by_date": {}, "recent_visits": []}
    try:
        with open(STATS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading stats: {e}")
        return {"total_hits": 0, "hits_by_page": {}, "hits_by_date": {}, "recent_visits": []}

def save_stats(data):
    try:
        with open(STATS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
    except Exception as e:
        print(f"Error saving stats: {e}")

def start_nas_sync_watcher(src_dir, dest_dirs):
    import shutil
    import time
    
    def sync_file(src_path, dest_path):
        try:
            os.makedirs(os.path.dirname(dest_path), exist_ok=True)
            shutil.copy2(src_path, dest_path)
            print(f"[Auto-Sync] {os.path.relpath(src_path, src_dir)} -> {os.path.basename(os.path.dirname(dest_path)) or dest_path}")
        except Exception as e:
            print(f"[Auto-Sync Error] Failed to copy {src_path}: {e}")

    def scan_and_sync():
        exclude_dirs = {"cache", "temp_gila_extracted"}
        for root, dirs, files in os.walk(src_dir):
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext not in (".html", ".css", ".js", ".json", ".png", ".jpg", ".jpeg", ".gif", ".py"):
                    continue
                src_path = os.path.join(root, f)
                rel_path = os.path.relpath(src_path, src_dir)
                
                try:
                    mtime = os.path.getmtime(src_path)
                    for dest_dir in dest_dirs:
                        if not dest_dir or not os.path.exists(os.path.dirname(dest_dir)):
                            continue
                        dest_path = os.path.join(dest_dir, rel_path)
                        # Sync if destination doesn't exist, is older, or differs in size
                        if not os.path.exists(dest_path) or os.path.getmtime(dest_path) < mtime or os.path.getsize(dest_path) != os.path.getsize(src_path):
                            sync_file(src_path, dest_path)
                except Exception:
                    pass

    def watch_loop():
        time.sleep(1)
        print(f"[Auto-Sync] Started watcher thread. Target destinations: {dest_dirs}")
        while True:
            try:
                scan_and_sync()
            except Exception as e:
                print(f"[Auto-Sync Error] Watch loop exception: {e}")
            time.sleep(2)

    import threading
    t = threading.Thread(target=watch_loop, daemon=True)
    t.start()

class DualRouteHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        # Route: Stats data (unrestricted)
        if self.path.startswith("/api/stats/data"):
            with stats_lock:
                data = load_stats()
            
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(data).encode('utf-8'))
            return

        # Route: Verify Stats password (always return valid)
        if self.path.startswith("/api/stats/verify"):
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"valid": True}).encode('utf-8'))
            return

        # Route: Get server version (for troubleshooting)
        if self.path == "/api/version":
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"version": "1.32"}).encode('utf-8'))
            return

        # Route: Sketchfab Proxy
        if "/api/sketchfab/collection/" in self.path:
            parts = self.path.split("/api/sketchfab/collection/")
            collection_uid = parts[1].split('?')[0].strip('/')
            if collection_uid:
                self.handle_sketchfab_collection(collection_uid)
                return
            else:
                self.send_error(400, "Missing Collection UID in request path.")
                return

        # Route: MorphoSource Proxy Download
        prefix = "/api/morphosource/download/"
        if self.path.startswith(prefix):
            media_id_raw = self.path[len(prefix):].split('?')[0]
            media_id = media_id_raw.split('.')[0]
            if media_id:
                self.handle_morphosource_download(media_id)
                return
            else:
                self.send_error(400, "Missing Media ID in request path.")
                return

        # Route: ArtStation Embed URL Proxy (redirects to fresh signed URL)
        prefix_artstation = "/api/artstation/embed-url/"
        if self.path.startswith(prefix_artstation):
            parts = self.path[len(prefix_artstation):].split('/')
            if len(parts) >= 2:
                hash_id = parts[0].strip()
                asset_id_raw = parts[1].split('?')[0].strip()
                try:
                    asset_id = int(asset_id_raw)
                    self.handle_artstation_embed_redirect(hash_id, asset_id)
                    return
                except ValueError:
                    pass
            self.send_error(400, "Invalid Request Path parameters.")
            return
        
        # Default behavior
        super().do_GET()

    def do_POST(self):
        if self.path == "/api/stats/record":
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                payload = json.loads(post_data.decode('utf-8'))
                page = payload.get("page", "unknown")
                timestamp = payload.get("timestamp", datetime.datetime.now().isoformat())
                date_str = timestamp.split("T")[0]
                ip = self.client_address[0]
                
                with stats_lock:
                    data = load_stats()
                    data["total_hits"] = data.get("total_hits", 0) + 1
                    
                    hits_by_page = data.setdefault("hits_by_page", {})
                    hits_by_page[page] = hits_by_page.get(page, 0) + 1
                    
                    hits_by_date = data.setdefault("hits_by_date", {})
                    hits_by_date[date_str] = hits_by_date.get(date_str, 0) + 1
                    
                    recent = data.setdefault("recent_visits", [])
                    recent.insert(0, {
                        "page": page,
                        "timestamp": timestamp,
                        "ip": ip
                    })
                    # Keep only last 50 visits
                    data["recent_visits"] = recent[:50]
                    
                    save_stats(data)
                
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success"}).encode('utf-8'))
                return
            except Exception as e:
                print(f"[Stats Error] record failed: {e}")
                self.send_error(500, f"Error recording stats: {e}")
                return
        
        self.send_error(404, "Not Found")

    def translate_path(self, path):
        # Strip query parameters and fragment identifier first
        path_clean = path.split('?', 1)[0].split('#', 1)[0]
        # Decode the requested path
        decoded_path = urllib.parse.unquote(path_clean)
        # Check if the path points to the network folder
        prefix = "/anatomy/models/Network/"
        if decoded_path.startswith(prefix):
            # Strip the prefix and map to the network path
            rel_path = decoded_path[len(prefix):]
            target_path = os.path.join(NETWORK_PATH, rel_path)
            # Ensure path separators are correct for the OS
            return os.path.normpath(target_path)

        prefix_risd = "/anatomy/models/RISD/"
        if decoded_path.startswith(prefix_risd):
            # Strip the prefix and map to the RISD network path
            rel_path = decoded_path[len(prefix_risd):]
            target_path = os.path.join(RISD_PATH, rel_path)
            return os.path.normpath(target_path)

        return super().translate_path(path_clean)

    def handle_artstation_embed_redirect(self, hash_id, asset_id):
        cache_dir = os.path.join(DIRECTORY, "scratch", "cache_artstation")
        os.makedirs(cache_dir, exist_ok=True)
        cache_file = os.path.join(cache_dir, f"{hash_id}.json")
        
        project_data = None
        # Cache duration: 15 minutes (900 seconds)
        if os.path.exists(cache_file) and (time.time() - os.path.getmtime(cache_file) < 900):
            try:
                with open(cache_file, "r", encoding="utf-8") as f:
                    project_data = json.load(f)
            except Exception:
                pass
                
        if not project_data:
            # Fetch fresh from ArtStation
            url = f"https://www.artstation.com/projects/{hash_id}.json"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'application/json, text/plain, */*',
                'Referer': 'https://www.artstation.com/harshcg'
            }
            req = urllib.request.Request(url, headers=headers)
            try:
                print(f"[ArtStation Proxy] Fetching fresh signed URL for project {hash_id}...")
                with urllib.request.urlopen(req, timeout=10) as response:
                    data = response.read().decode('utf-8')
                    project_data = json.loads(data)
                    # Save to cache
                    with open(cache_file, "w", encoding="utf-8") as f:
                        json.dump(project_data, f, ensure_ascii=False, indent=4)
            except Exception as e:
                print(f"[ArtStation Proxy Error] Failed to fetch project {hash_id}: {e}")
                
        if not project_data:
            # Fallback to expired cache if fetch failed
            if os.path.exists(cache_file):
                try:
                    with open(cache_file, "r", encoding="utf-8") as f:
                        project_data = json.load(f)
                except Exception:
                    pass
                    
        if not project_data:
            self.send_error(502, f"Failed to fetch live project data from ArtStation for {hash_id}.")
            return
            
        assets = project_data.get("assets", [])
        target_asset = None
        for asset in assets:
            if asset.get("id") == asset_id:
                target_asset = asset
                break
                
        if not target_asset:
            self.send_error(404, f"Asset ID {asset_id} not found in project {hash_id}.")
            return
            
        player_embedded = target_asset.get("player_embedded")
        if not player_embedded:
            self.send_error(404, f"Asset ID {asset_id} does not contain an embedded player.")
            return
            
        match = re.search(r"src=['\"](.*?)['\"]", player_embedded)
        if not match:
            self.send_error(500, "Could not parse src URL from embedded player HTML.")
            return
            
        embed_url = match.group(1).replace('&amp;', '&')
        
        # Respond with 302 Found redirecting to the fresh signed URL
        self.send_response(302)
        self.send_header('Location', embed_url)
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.end_headers()

    def handle_sketchfab_collection(self, collection_uid):
        url = f"https://api.sketchfab.com/v3/collections/{collection_uid}/models"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req) as response:
                data = response.read()
                
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            print(f"[Proxy Error] Failed to fetch Sketchfab collection {collection_uid}: {e}")
            self.send_error(500, f"Failed to fetch Sketchfab collection: {e}")

    def handle_morphosource_download(self, media_id):
        # Cache directory setup
        cache_dir = os.path.join(DIRECTORY, "anatomy", "models", "cache")
        os.makedirs(cache_dir, exist_ok=True)
        
        # Check cache for existing file
        cached_file = None
        for f in os.listdir(cache_dir):
            if f.startswith(f"morphosource_{media_id}"):
                cached_file = os.path.join(cache_dir, f)
                break
                
        if cached_file:
            print(f"[Proxy Cache] Serving {media_id} from cache...")
            self.serve_file(cached_file)
            return

        print(f"[Proxy Download] Fetching {media_id} from MorphoSource API...")
        
        # Retrieve API key from file or default fallback
        api_key = "sVdrcLEGwdUtRDJic7hRsiKw"
        key_path = os.path.join(DIRECTORY, "morpho_api_key.txt")
        if os.path.exists(key_path):
            try:
                with open(key_path, "r", encoding="utf-8") as kf:
                    api_key = kf.read().strip()
            except Exception as e:
                print(f"Warning: Could not read morpho_api_key.txt: {e}")

        # Step 1: POST to agree to terms and get download URL
        headers = {
            "Authorization": api_key,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        data = {
            "use_statement": "This dataset is being loaded dynamically into an educational 3D anatomy viewer web application for morphological studies.",
            "use_categories": ["Research"],
            "agreements_accepted": True
        }
        json_data = json.dumps(data).encode('utf-8')
        url = f"https://www.morphosource.org/api/download/{media_id}"
        
        try:
            req = urllib.request.Request(url, data=json_data, headers=headers, method='POST')
            with urllib.request.urlopen(req) as response:
                res_json = json.loads(response.read().decode('utf-8'))
                download_url = res_json["response"]["media"]["download_url"]
        except Exception as e:
            print(f"[Proxy Error] Failed to POST to get download URL for {media_id}: {e}")
            self.send_error(500, f"Failed to get download URL: {e}")
            return
            
        # Step 2: GET request to fetch ZIP file
        try:
            req2 = urllib.request.Request(download_url, headers={"Authorization": api_key})
            with urllib.request.urlopen(req2) as response:
                zip_data = response.read()
        except Exception as e:
            print(f"[Proxy Error] Failed to GET zip file for {media_id}: {e}")
            self.send_error(500, f"Failed to download zip: {e}")
            return
            
        # Step 3: Extract the 3D model file from ZIP in memory and save to cache
        try:
            with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
                model_file = None
                for name in z.namelist():
                    if name.lower().endswith(('.ply', '.stl', '.nrrd', '.nii', '.nii.gz')):
                        model_file = name
                        break
                if not model_file:
                    print(f"[Proxy Error] No 3D model found inside zip for {media_id}")
                    self.send_error(404, "No 3D model found inside the downloaded ZIP archive.")
                    return
                    
                # Extract and write to cache
                ext = os.path.splitext(model_file)[1]
                cache_path = os.path.join(cache_dir, f"morphosource_{media_id}{ext}")
                with open(cache_path, "wb") as f:
                    f.write(z.read(model_file))
                
                print(f"[Proxy Cache] Saved {media_id} to cache: {cache_path}")
                self.serve_file(cache_path)
        except Exception as e:
            print(f"[Proxy Error] Failed to unzip and extract for {media_id}: {e}")
            self.send_error(500, f"Failed to unzip and extract: {e}")

    def serve_file(self, file_path):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        
        # Determine content type
        if file_path.endswith('.ply'):
            self.send_header('Content-Type', 'application/octet-stream')
        elif file_path.endswith('.stl'):
            self.send_header('Content-Type', 'application/octet-stream')
        elif file_path.endswith('.nrrd'):
            self.send_header('Content-Type', 'application/octet-stream')
        else:
            self.send_header('Content-Type', 'application/octet-stream')
        
        stat = os.stat(file_path)
        self.send_header('Content-Length', str(stat.st_size))
        self.end_headers()
        
        try:
            with open(file_path, "rb") as f:
                self.wfile.write(f.read())
        except Exception as e:
            print(f"[Proxy Error] Error writing file to socket: {e}")

if __name__ == "__main__":
    # Auto-update models list on startup
    try:
        import subprocess
        app_dir = os.path.join(DIRECTORY, "anatomy")
        py_exe = "python" if os.name == "nt" else "python3"
        subprocess.run([py_exe, os.path.join(app_dir, "generate_models_json.py")], cwd=app_dir)
    except Exception as e:
        print(f"Warning: Could not auto-generate models_list.json on startup: {e}")

    # Start the NAS & Local Workspace auto-sync watcher
    try:
        app_dir = os.path.join(DIRECTORY, "anatomy")
        start_nas_sync_watcher(app_dir, [NAS_PORTFOLIO_DIR, ANATOMY_WEB_DIR])
    except Exception as e:
        print(f"Warning: Could not start auto-sync watcher: {e}")

    import socketserver
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("", PORT), DualRouteHandler) as httpd:
        print(f"Serving website files and network share on port {PORT}...")
        httpd.serve_forever()

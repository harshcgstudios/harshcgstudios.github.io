import streamlit as st
import streamlit.components.v1 as components
import requests
import pandas as pd
from PIL import Image
from io import BytesIO
import threading
import socket
import http.server
import socketserver
import os

# 1. Background server to host the 3D Anatomy Viewer static files
def start_static_server():
    port = 8080
    # Try to bind to port 8080 to check if it's available
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.bind(("0.0.0.0", port))
        s.close()
        
        # Enable CORS for the local server
        class CORSRequestHandler(http.server.SimpleHTTPRequestHandler):
            def end_headers(self):
                self.send_header('Access-Control-Allow-Origin', '*')
                super().end_headers()
                
        # Set working directory to the current app folder
        class MyHandler(CORSRequestHandler):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)

            def translate_path(self, path):
                import urllib.parse
                path_clean = path.split('?', 1)[0].split('#', 1)[0]
                decoded_path = urllib.parse.unquote(path_clean)
                
                # Check for Network models prefix
                prefix_net = "/models/Network/"
                if decoded_path.startswith(prefix_net):
                    rel_path = decoded_path[len(prefix_net):]
                    base_path = r"\\synology\DATA\3d\CTscans" if os.name == 'nt' else "/volume1/DATA/3d/CTscans"
                    return os.path.normpath(os.path.join(base_path, rel_path))
                    
                # Check for RISD models prefix
                prefix_risd = "/models/RISD/"
                if decoded_path.startswith(prefix_risd):
                    rel_path = decoded_path[len(prefix_risd):]
                    base_path = r"\\synology\DATA\3d\Models\sketchfab\RISD Nature Lab" if os.name == 'nt' else "/volume1/DATA/3d/Models/sketchfab/RISD Nature Lab"
                    return os.path.normpath(os.path.join(base_path, rel_path))
                    
                return super().translate_path(path_clean)

            def do_GET(self):
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
                
                # Default behavior
                super().do_GET()

            def handle_sketchfab_collection(self, collection_uid):
                import urllib.request
                import json
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
                app_dir = os.path.dirname(os.path.abspath(__file__))
                cache_dir = os.path.join(app_dir, "models", "cache")
                os.makedirs(cache_dir, exist_ok=True)
                
                # Check cache for existing file
                cached_file = None
                for f in os.listdir(cache_dir):
                    if f.startswith(f"morphosource_{media_id}"):
                        cached_file = os.path.join(cache_dir, f)
                        break
                        
                if cached_file:
                    self.serve_file(cached_file)
                    return

                # Retrieve API key
                api_key = "sVdrcLEGwdUtRDJic7hRsiKw"
                parent_dir = os.path.dirname(app_dir)
                key_path = os.path.join(parent_dir, "morpho_api_key.txt")
                if os.path.exists(key_path):
                    try:
                        with open(key_path, "r", encoding="utf-8") as kf:
                            api_key = kf.read().strip()
                    except Exception:
                        pass

                # POST to agree to terms and get download URL
                import urllib.request
                import json
                import zipfile
                import io
                
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
                    self.send_error(500, f"Failed to get download URL: {e}")
                    return
                    
                # GET request to fetch ZIP
                try:
                    req2 = urllib.request.Request(download_url, headers={"Authorization": api_key})
                    with urllib.request.urlopen(req2) as response:
                        zip_data = response.read()
                except Exception as e:
                    self.send_error(500, f"Failed to download zip: {e}")
                    return
                    
                # Extract and write to cache
                try:
                    with zipfile.ZipFile(io.BytesIO(zip_data)) as z:
                        model_file = None
                        for name in z.namelist():
                            if name.lower().endswith(('.ply', '.stl', '.nrrd', '.nii', '.nii.gz')):
                                model_file = name
                                break
                        if not model_file:
                            self.send_error(404, "No 3D model found inside the downloaded ZIP archive.")
                            return
                            
                        ext = os.path.splitext(model_file)[1]
                        cache_path = os.path.join(cache_dir, f"morphosource_{media_id}{ext}")
                        with open(cache_path, "wb") as f:
                            f.write(z.read(model_file))
                        
                        self.serve_file(cache_path)
                except Exception as e:
                    self.send_error(500, f"Failed to unzip: {e}")

            def serve_file(self, file_path):
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                
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
                except Exception:
                    pass

        socketserver.ThreadingTCPServer.allow_reuse_address = True
        server = socketserver.ThreadingTCPServer(("0.0.0.0", port), MyHandler)
        server.serve_forever()
    except OSError:
        # Port is already in use, which means the server is already running
        pass

# Start the background server in a daemon thread
threading.Thread(target=start_static_server, daemon=True).start()

# Auto-update models list on startup
try:
    import subprocess
    app_dir = os.path.dirname(os.path.abspath(__file__))
    py_exe = "python" if os.name == "nt" else "python3"
    subprocess.run([py_exe, os.path.join(app_dir, "generate_models_json.py")], cwd=app_dir)
except Exception as e:
    print(f"Warning: Could not auto-generate models_list.json on startup: {e}")

# Configuration
TCIA_API_BASE = "https://services.cancerimagingarchive.net/nbia-api/services/v1"
COLLECTION = "COVID-19-NY-SBU"  # Example public collection

st.set_page_config(page_title="Anatomy3D & Scan Archive", layout="wide")

# Navigation Sidebar
st.sidebar.title("Navigation")
app_mode = st.sidebar.radio("Go to", ["🧬 Global CT Scan Browser", "💀 3D Anatomy Viewer"])

if app_mode == "🧬 Global CT Scan Browser":
    st.title("🧬 Global CT Scan Browser")
    st.sidebar.header("Filters")
    
    # Fetch Series Data from TCIA
    @st.cache_data
    def get_series(collection):
        url = f"{TCIA_API_BASE}/getSeries?Collection={collection}&Modality=CT"
        response = requests.get(url)
        return response.json()
    
    # Function to Download a Series
    def download_series(series_id):
        url = f"{TCIA_API_BASE}/getImage?SeriesInstanceUID={series_id}"
        response = requests.get(url, stream=True)
        return response.content
    
    try:
        series_data = get_series(COLLECTION)
        search_query = st.sidebar.text_input("Search by Patient ID", "")
        
        # Filter data based on search
        filtered_data = [s for s in series_data if search_query.lower() in s['PatientID'].lower()]
        
        # Grid Layout for Thumbnails
        cols = st.columns(3)
        
        for i, series in enumerate(filtered_data[:12]):  # Limiting to 12 for performance
            series_id = series['SeriesInstanceUID']
            patient_id = series['PatientID']
            
            with cols[i % 3]:
                st.subheader(f"Patient: {patient_id}")
                
                # Display placeholder or real thumbnail
                st.image("https://via.placeholder.com/300x200.png?text=CT+Scan+Preview", use_container_width=True)
                st.write(f"Series UID: ...{series_id[-6:]}")
                
                # Download Button
                if st.button(f"Download DICOM Zip", key=series_id):
                    with st.spinner("Bundling DICOM files..."):
                        zip_data = download_series(series_id)
                        st.download_button(
                            label="Click to Save to PC",
                            data=zip_data,
                            file_name=f"{series_id}.zip",
                            mime="application/zip"
                        )
        st.info("Note: This GUI accesses Public Collections. No login required.")
    except Exception as e:
        st.error(f"Error fetching data from TCIA: {e}")

elif app_mode == "💀 3D Anatomy Viewer":
    st.title("💀 Volumetric 3D Anatomy Viewer")
    st.markdown("Peel back skin and muscle layers in real time using the slider below to reveal bones and dense inner organs.")
    
    # Embed the local 3D viewer served on port 8080
    from streamlit.web.server.websocket_headers import _get_websocket_headers
    headers = _get_websocket_headers()
    host_header = headers.get("Host", "localhost:8501")
    hostname = host_header.split(":")[0] if ":" in host_header else host_header
    components.iframe(src=f"http://{hostname}:8080/index.html?v=12.10", height=780, scrolling=False)
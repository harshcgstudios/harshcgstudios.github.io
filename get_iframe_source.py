import urllib.request
import json
import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.artstation.com/'
}

# Fetch project raw details
project_url = "https://www.artstation.com/projects/rla1PG.json"
req = urllib.request.Request(project_url, headers=headers)
try:
    with urllib.request.urlopen(req) as resp:
        project_data = json.loads(resp.read().decode('utf-8'))
        video_clip_assets = [a for a in project_data.get("assets", []) if a.get("asset_type") == "video_clip"]
        if not video_clip_assets:
            print("No video_clip assets found.")
            sys.exit(0)
            
        asset = video_clip_assets[0]
        iframe_tag = asset.get("player_embedded")
        print("Raw iframe tag:", iframe_tag)
        
        # Extract src attribute
        match = re.search(r"src=['\"]([^'\"]+)['\"]", iframe_tag)
        if not match:
            print("Could not extract iframe src.")
            sys.exit(0)
            
        iframe_url = match.group(1)
        print("Extracted URL:", iframe_url)
        
        # Fetch the iframe page content
        iframe_req = urllib.request.Request(iframe_url, headers=headers)
        with urllib.request.urlopen(iframe_req) as iframe_resp:
            html = iframe_resp.read().decode('utf-8')
            print("\nFetched iframe HTML length:", len(html))
            
            # Print any video source or script content that looks like a video url
            print("\nSearching for video files in HTML...")
            mp4_matches = re.findall(r"['\"](https?://[^\'\"]+\.mp4[^\'\"]*)['\"]", html)
            for m in mp4_matches:
                print("Found MP4 URL:", m)
                
            # Also print script tags that contain source configurations
            scripts = re.findall(r"<script[^>]*>(.*?)</script>", html, re.DOTALL)
            for s in scripts:
                if "video" in s or "source" in s or "hls" in s or "m3u8" in s:
                    print("\nFound Script with video references:")
                    print(s[:1000])
                    
except Exception as e:
    print("Error:", e)

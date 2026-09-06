import json
import urllib.request
import urllib.error
import time
import os
import sys

# Ensure UTF-8 console output
sys.stdout.reconfigure(encoding='utf-8')

# Create directories if they don't exist
os.makedirs("assets/data", exist_ok=True)

# Load the project list
if not os.path.exists("artstation_projects.json"):
    print("Error: artstation_projects.json not found.")
    sys.exit(1)

with open("artstation_projects.json", "r", encoding="utf-8") as f:
    project_list_data = json.load(f)

projects = project_list_data.get("data", [])
print(f"Loaded {len(projects)} projects from list.")

consolidated_portfolio = []

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.5',
    'Referer': 'https://www.artstation.com/harshcg'
}

for i, p in enumerate(projects):
    hash_id = p.get('hash_id')
    title = p.get('title')
    print(f"[{i+1}/{len(projects)}] Fetching details for '{title}' (Hash: {hash_id})...")
    
    url = f"https://www.artstation.com/projects/{hash_id}.json"
    req = urllib.request.Request(url, headers=headers)
    
    success = False
    retries = 3
    while retries > 0 and not success:
        try:
            with urllib.request.urlopen(req) as response:
                detail_data = response.read().decode('utf-8')
                detail_json = json.loads(detail_data)
                
                # Extract clean info
                project_detail = {
                    "id": detail_json.get("id"),
                    "title": detail_json.get("title"),
                    "hash_id": hash_id,
                    "description": detail_json.get("description"),
                    "created_at": detail_json.get("created_at"),
                    "views_count": detail_json.get("views_count"),
                    "likes_count": detail_json.get("likes_count"),
                    "software_items": [s.get("name") for s in detail_json.get("software_items", [])],
                    "tags": detail_json.get("tags", []),
                    "categories": [c.get("name") for c in detail_json.get("categories", [])],
                    # Extract assets
                    "assets": []
                }
                
                for asset in detail_json.get("assets", []):
                    asset_type = asset.get("asset_type")
                    if asset_type in ["image", "video", "video_clip"]:
                        asset_info = {
                            "id": asset.get("id"),
                            "title": asset.get("title"),
                            "asset_type": asset_type,
                            "width": asset.get("width"),
                            "height": asset.get("height"),
                            "image_url": asset.get("image_url"), # High-res direct link
                            "viewport_type": asset.get("viewport_type"),
                            # Video embedding parameters
                            "has_embedded_player": asset.get("has_embedded_player", False),
                            "player_embedded": asset.get("player_embedded")
                        }
                        project_detail["assets"].append(asset_info)
                
                consolidated_portfolio.append(project_detail)
                success = True
                print(f"  -> Successfully fetched! Assets: {len(project_detail['assets'])}")
                
            # Rest to prevent rate limiting
            time.sleep(1.0)
            
        except urllib.error.HTTPError as e:
            print(f"  -> HTTP Error: {e.code}")
            retries -= 1
            time.sleep(2.0)
        except Exception as e:
            print(f"  -> Error: {e}")
            retries -= 1
            time.sleep(2.0)
            
    if not success:
        print(f"  -> Failed to fetch {title} after retries. Using list data as fallback.")
        # Fallback to basic list data
        fallback = {
            "title": title,
            "hash_id": hash_id,
            "description": "",
            "software_items": [],
            "tags": [],
            "categories": [],
            "assets": [{
                "title": title,
                "asset_type": "image",
                "image_url": p.get("cover", {}).get("large_image_url") or p.get("cover", {}).get("medium_image_url")
            }]
        }
        consolidated_portfolio.append(fallback)

# Save the consolidated portfolio
output_path = "assets/data/portfolio.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(consolidated_portfolio, f, indent=4, ensure_ascii=False)

print(f"\nConsolidated portfolio saved to {output_path}. Total projects: {len(consolidated_portfolio)}")

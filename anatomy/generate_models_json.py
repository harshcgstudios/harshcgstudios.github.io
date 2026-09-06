import os
import json

script_dir = os.path.dirname(os.path.abspath(__file__))
LOCAL_DIR = os.path.join(script_dir, "models")
if os.name == 'nt':
    NETWORK_DIR = r"\\synology\DATA\3d\CTscans"
else:
    NETWORK_DIR = "/volume1/DATA/3d/CTscans"
OUTPUT_JSON = os.path.join(script_dir, "models_list.json")

# Key word mappings to assign beautiful thumbnails in priority order
THUMBNAIL_RULES = [
    ("12025abab5", "atlas_120_thumbnail.png"),
    ("bf178a41b2", "atlas_bf_thumbnail.png"),
    ("psma_pelvis", "psma_pelvis_thumbnail.png"),
    ("4 bone 0.5 non -contrast", "bone_ct_thumbnail.png"),
    ("2 sinus  1.5  j80s", "sinus_scan_thumbnail.png"),
    ("301 face nav 1.2x0.6 bone thins", "face_nav_thumbnail.png"),
    ("ankle", "vhp_ankle_thumbnail.png"),
    ("knee", "vhp_knee_thumbnail.png"),
    ("hip", "vhp_hip_thumbnail.png"),
    ("shoulder", "vhp_shoulder_thumbnail.png"),
    ("shapemed", "shapemed_knee_thumbnail.png"),
    ("gila_monster", "gila_monster_ct_thumbnail.png"),
    ("wolf", "thumb_sheep_ct.png"),
    ("pfote", "thumb_paw.png"),
    ("paw", "thumb_paw.png"),
    ("psma", "thumb_volume_ct.png"),
    ("atlas", "thumb_volume_ct.png"),
    ("mantis", "thumb_mantis_ct.png"),
    ("felis", "thumb_cat_ct.png"),
    ("ovis", "thumb_sheep_ct.png"),
    ("eagle", "bald_eagle_ct_thumbnail.png"),
    ("bat", "vampire_bat_ct_thumbnail.png"),
    ("egret", "thumb_bird.png"),
    ("swift", "thumb_bird.png"),
    ("skimmer", "thumb_bird.png"),
    ("puffin", "thumb_bird.png"),
    ("gull", "thumb_bird.png"),
    ("alligator", "thumb_bone_ct.png"),
    ("varanus", "thumb_bone_ct.png"),
    ("rabbit", "thumb_bone_ct.png"),
    ("anaconda", "thumb_bone_ct.png"),
    ("rattlesnake", "thumb_bone_ct.png"),
    ("gecko", "thumb_bone_ct.png"),
    ("python", "thumb_bone_ct.png"),
    ("lizard", "thumb_bone_ct.png"),
    ("toad", "thumb_bone_ct.png"),
    ("frog", "thumb_bone_ct.png"),
    ("cerebralcranio", "thumb_skull_mesh.png"),
    ("malocclusion", "thumb_skull_vol.png"),

    ("tuatara", "thumb_bone_ct.png"),
    ("ceromacra", "thumb_bird.png"),
    ("visiblehuman", "thumb_human_head.png"),
    ("human_head", "thumb_human_head.png"),
    ("stent", "thumb_stent.png"),
    ("aorta", "thumb_stent.png"),
    ("segmentation", "thumb_stent.png"),
    ("sinus", "thumb_sinus.png"),
    ("brain", "thumb_brain.png"),
    ("cerebral", "thumb_brain.png"),
    ("sag", "thumb_brain.png"),
    ("contraste", "thumb_brain.png"),
    ("face", "thumb_face_nav.png"),
    ("bone", "thumb_bone_ct.png"),
    ("volume", "thumb_volume_ct.png"),
    ("skull_vol", "thumb_skull_vol.png"),
    ("skull_mesh", "thumb_skull_mesh.png"),
    ("gorilla", "thumb_cranium.png"),
    ("pan", "thumb_cranium.png"),
    ("pongo", "thumb_cranium.png"),
    ("symphalangus", "thumb_cranium.png"),
    ("macaca", "thumb_cranium.png"),
    ("cranio", "thumb_skull_vol.png"),
    ("cranium", "thumb_cranium.png"),
    ("pig", "thumb_sheep_ct.png"),
    ("skull", "thumb_skull_vol.png"),
    ("cat", "thumb_cat_ct.png"),
    ("sheep", "thumb_sheep_ct.png"),
    ("bird", "thumb_bird.png")
]

# Nice titles for specific files or keywords
TITLE_CLEANERS = [
    ("American_Alligator_Volume.nrrd", "American Alligator (Volume CT)"),
    ("Green_Varanus_Volume.nrrd", "Green Varanus (Volume CT)"),
    ("Arctic_Wolf_Volume.nrrd", "Arctic Wolf (Volume CT)"),
    ("Gila_Monster_Volume.nrrd", "Gila Monster (Volume CT)"),
    ("1 Exported volume.nrrd", "Human Body Volume"),
    ("Atlas_CT_12025abab5.nrrd", "Atlas CT Scan (Subject 12025abab5)"),
    ("Atlas_CT_bf178a41b2.nrrd", "Atlas CT Scan (Subject bf178a41b2)"),
    ("Class_3_Malocclusion.nrrd", "Class 3 Malocclusion (MediModel CT)"),
    ("Mouse_Healthy_CT_1h.nrrd", "Mouse CT Scan (1h Post-Injection)"),
    ("Mouse_Healthy_CT_24h.nrrd", "Mouse CT Scan (24h Post-Injection)"),
    ("Mouse_Healthy_CT_72h.nrrd", "Mouse CT Scan (72h Post-Injection)"),
    ("PSMA_Pelvis_CT.nrrd", "PSMA Pelvis CT Scan"),
    ("136779921_3Pfote060Br60rechts_nrrd.23995d6796d5862d50de83f66451d463_WHR1WM.stl", "Cat's Right Paw (Mesh)"),
    ("2 Sinus  1.5  J80s.nrrd", "Sinus Scan"),
    ("301 FACE NAV 1.2x0.6 Bone Thins.nrrd", "Facial Navigation"),
    ("4 Bone 0.5 Non -Contrast.nrrd", "Bone CT Scan"),
    ("625769938_6CerebralCranio2.0CE_nrrd.79662c667146985d1f667b9b31087f9f_N1GGXC.stl", "Cat's Cerebral Cranium (Mesh)"),
    ("FMNH_B_315708_Ceromacra.nrrd", "Ceromacra Bird"),
    ("Felis_catus.nrrd", "Cat Skull (Volume)"),
    ("Ovis_aries_Sheep.nrrd", "Sheep Skull (Volume)"),
    ("VisibleHuman_Head.nrrd", "Human Head (Volume)"),
    ("skull.nrrd", "Human Skull (Volume)"),
    ("skull.stl", "Skull Mesh (STL)"),
    ("AnyConv.com__ct scan.stl", "CT Scan Mesh (STL)"),
    ("human_head.nrrd", "Human Head (Three.js)"),
    ("stent.nrrd", "Aorta Stent (Volume)"),
    ("Mantis_Publication_V1.stl", "Praying Mantis Mesh"),
    ("Symphalangus_syndactylus_000532547.ply", "Siamang Cranium Mesh"),
    ("NTM_U8048_Caloprymnus_campestris_cranium_M.ply_3mill-000748181.ply", "Rat-Kangaroo Mesh"),
    ("cranium.ply", "Rat-Kangaroo Mesh"),
    ("minipig_cranium_export.stl", "Minipig Cranium (Mesh)"),
    ("visible_human_whole_body_highres.nrrd", "Visible Human Male (CT)"),
    ("visible_human_female_whole_body_highres.nrrd", "Visible Human Female (CT)"),
    ("visible_human_whole_body.nrrd", "Visible Human Male (Downsampled 10MB)"),
    ("visible_human_female_whole_body.nrrd", "Visible Human Female (Downsampled 10MB)"),
    ("Segmentation_Segment_1.stl", "human skull"),
    ("green_tree_python_whole_skeleton_000680185.ply", "Green Tree Python (Whole Skeleton)"),
    ("spotted_gliding_lizard_full_skeleton_000036116.stl", "Spotted Gliding Lizard (Full Skeleton)"),
    ("suriname_toad_full_body_000012417.stl", "Suriname Toad (Full Body)"),
    ("tuatara_whole_body_000011010.stl", "Tuatara (Whole Body)")
]

def clean_title(filename):
    if filename.endswith('_Volume.nrrd'):
        name = filename[:-12].replace('_', ' ')
        return f"{name} (Volume CT)"
        
    for orig, clean in TITLE_CLEANERS:
        if filename.lower() == orig.lower():
            return clean
        if orig.lower() in filename.lower():
            return clean
            
    # Fallback to smart formatting
    base = os.path.splitext(filename)[0]
    base = base.replace("_", " ").replace("-", " ")
    # Capitalize words
    return " ".join([w.capitalize() for w in base.split()])

def get_thumbnail(filename):
    fname_lower = filename.lower()
    if fname_lower == "human_head.nrrd":
        return "images/thumb_brain.png"
    if fname_lower == "segmentation_segment_1.stl":
        return "images/thumb_skull_mesh.png"
    for key, thumb in THUMBNAIL_RULES:
        if key in fname_lower:
            return f"images/{thumb}"
    return "images/thumb_volume_ct.png" # default fallback

def scan_models():
    models = []
    seen_sizes = set()
    seen_names = set()

    # 1. Scan Local Directory recursively
    print("Scanning local models recursively...")
    if os.path.exists(LOCAL_DIR):
        for r, d, fs in os.walk(LOCAL_DIR):
            # Skip the proxy cache folder
            rel_sub_path = os.path.relpath(r, LOCAL_DIR)
            if "cache" in rel_sub_path.split(os.sep):
                continue
                
            for f in fs:
                ext = os.path.splitext(f)[1].lower()
                if ext in ['.nrrd', '.nii', '.ply', '.stl']:
                    # Skip preset versions in the main library list
                    if any(suffix in f.lower() for suffix in ['_sharp', '_balanced', '_smooth', '_highres', 'highres']):
                        continue
                    fpath = os.path.join(r, f)
                    size_bytes = os.path.getsize(fpath)
                    size_mb = size_bytes / (1024 * 1024)
                    
                    # Check for duplicates by size
                    if size_bytes in seen_sizes:
                        print(f"  -> Skipping local duplicate: {f} (same size as another)")
                        continue
                    seen_sizes.add(size_bytes)
                    
                    title = clean_title(f)
                    seen_names.add(title.lower())
                    
                    rel_path = os.path.relpath(fpath, LOCAL_DIR).replace("\\", "/")
                    models.append({
                        "title": title,
                        "url": f"models/{rel_path}",
                        "size": f"{size_mb:.1f}MB" if size_mb >= 0.1 else f"{size_bytes/1024:.0f}KB",
                        "thumbnail": get_thumbnail(f),
                        "isLocal": True
                    })

    # 2. Scan Network Directory
    print("Scanning network models...")
    if os.path.exists(NETWORK_DIR):
        for r, d, fs in os.walk(NETWORK_DIR):
            for f in fs:
                ext = os.path.splitext(f)[1].lower()
                if ext in ['.nrrd', '.nii', '.ply', '.stl']:
                    # Skip preset versions in the main library list
                    if any(suffix in f.lower() for suffix in ['_sharp', '_balanced', '_smooth', '_highres', 'highres']):
                        continue
                    fpath = os.path.join(r, f)
                    size_bytes = os.path.getsize(fpath)
                    size_mb = size_bytes / (1024 * 1024)
                    
                    # Deduplicate: skip if exact size is already seen or if we already added a duplicate title
                    if size_bytes in seen_sizes:
                        print(f"  -> Skipping network duplicate by size: {f}")
                        continue
                    
                    title = clean_title(f)
                    if title.lower() in seen_names:
                        print(f"  -> Skipping network duplicate by title: {f} ({title})")
                        continue
                        
                    seen_sizes.add(size_bytes)
                    seen_names.add(title.lower())
                    
                    # Relpath from network dir
                    rel_path = os.path.relpath(fpath, NETWORK_DIR).replace("\\", "/")
                    
                    models.append({
                        "title": title,
                        "url": f"models/Network/{rel_path}",
                        "size": f"{size_mb:.0f}MB",
                        "thumbnail": get_thumbnail(f),
                        "isLocal": False
                    })

    # Sort: put Visible Human Male first, Female second, then local models, then rest
    def sort_key(x):
        is_vh_male = (x["title"] == "Visible Human Male (CT)")
        is_vh_female = (x["title"] == "Visible Human Female (CT)")
        priority = 0 if is_vh_male else (1 if is_vh_female else 2)
        return (priority, not x["isLocal"], x["title"])
    models.sort(key=sort_key)
    
    print(f"Found {len(models)} unique models.")
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(models, f, indent=2)
    print(f"Wrote scans list to {OUTPUT_JSON}")

if __name__ == "__main__":
    scan_models()

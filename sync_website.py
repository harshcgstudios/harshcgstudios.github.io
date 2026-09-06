import os
import shutil

src_dir = r"D:\AI\Antigravity\website\anatomy"
dest_dirs = [
    r"\\synology\DATA\3d\portfolio\anatomy",
    r"d:\AI\Antigravity\anatomyWeb"
]

def sync():
    print("Starting manual sync...")
    if not os.path.exists(src_dir):
        print(f"Error: Source directory {src_dir} does not exist.")
        return

    exclude_dirs = {"cache", "temp_gila_extracted"}
    copy_count = 0
    
    for root, dirs, files in os.walk(src_dir):
        # Prune excluded directories
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
                    
                    # Copy if destination doesn't exist, is older, or differs in size
                    if not os.path.exists(dest_path) or os.path.getmtime(dest_path) < mtime or os.path.getsize(dest_path) != os.path.getsize(src_path):
                        os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                        shutil.copy2(src_path, dest_path)
                        print(f"  [Synced] {rel_path} -> {dest_dir}")
                        copy_count += 1
            except Exception as e:
                print(f"  [Error] Failed to sync {rel_path}: {e}")
                
    print(f"Manual sync complete. Synced {copy_count} files.")

if __name__ == "__main__":
    sync()

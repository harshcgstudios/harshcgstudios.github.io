import urllib.request
import zipfile
import os
import sys

class RemoteFile:
    def __init__(self, url):
        self.url = url
        self.pos = 0
        req = urllib.request.Request(self.url, method='HEAD')
        req.add_header('User-Agent', 'Mozilla/5.0')
        with urllib.request.urlopen(req) as r:
            self.size = int(r.headers['Content-Length'])
            print(f"Connected to remote zip. Size: {self.size / (1024*1024*1024):.2f} GB")
            
    def seek(self, pos, whence=0):
        if whence == 0:
            self.pos = pos
        elif whence == 1:
            self.pos += pos
        elif whence == 2:
            self.pos = self.size + pos
            
    def tell(self):
        return self.pos
        
    def seekable(self):
        return True
        
    def read(self, size=-1):
        if size == -1:
            size = self.size - self.pos
        if size <= 0:
            return b""
        end = self.pos + size - 1
        req = urllib.request.Request(self.url)
        req.add_header('User-Agent', 'Mozilla/5.0')
        req.add_header('Range', f'bytes={self.pos}-{end}')
        with urllib.request.urlopen(req) as r:
            data = r.read()
        self.pos += len(data)
        return data


def download_member(zip_url, zip_path, output_path):
    print(f"\nTargeting: {zip_path}")
    print(f"Output: {output_path}")
    
    # Ensure parent dir exists
    parent = os.path.dirname(output_path)
    if parent:
        os.makedirs(parent, exist_ok=True)
        
    stream = RemoteFile(zip_url)
    with zipfile.ZipFile(stream) as z:
        info = z.getinfo(zip_path)
        print(f"Compressed size: {info.compress_size / (1024*1024):.2f} MB")
        print(f"Uncompressed size: {info.file_size / (1024*1024):.2f} MB")
        
        print("Downloading file data...")
        with z.open(zip_path) as member:
            content = member.read()
            with open(output_path, "wb") as f:
                f.write(content)
                
    disk_size = os.path.getsize(output_path) / (1024 * 1024)
    print(f"[SUCCESS] Download completed! Saved {disk_size:.2f} MB to {output_path}")


if __name__ == "__main__":
    zip_url = "https://huggingface.co/datasets/YongchengYAO/autoPET-III-Lite/resolve/main/Images-CT.zip"
    
    # 1. First scan
    zip_path_1 = "Images-CT/fdg_12025abab5_11-01-2004-NA-PET-CT Ganzkoerper  primaer mit KM-18831_0000.nii.gz"
    out_path_1 = r"\\synology\DATA\3d\CTscans\Atlas\AutoPET_12025abab5_18831_0000.nii.gz"
    
    # 2. Second scan
    zip_path_2 = "Images-CT/fdg_bf178a41b2_06-08-2002-NA-PET-CT Ganzkoerper  primaer mit KM-45943_0000.nii.gz"
    out_path_2 = r"\\synology\DATA\3d\CTscans\Atlas\AutoPET_bf178a41b2_45943_0000.nii.gz"
    
    try:
        download_member(zip_url, zip_path_1, out_path_1)
        download_member(zip_url, zip_path_2, out_path_2)
    except Exception as e:
        print(f"Error downloading: {e}")
        sys.exit(1)

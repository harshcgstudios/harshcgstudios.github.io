import urllib.request
import subprocess
import os
import sys
import time

# Configuration
URL = "http://127.0.0.1:8000/api/version"
DIRECTORY = "/volume1/DATA/3d/portfolio" # Adjust if your path is different
RESTART_SCRIPT = "restart.py"

def is_server_up():
    try:
        with urllib.request.urlopen(URL, timeout=5) as response:
            return response.getcode() == 200
    except Exception:
        return False

def restart_server():
    print(f"[{time.ctime()}] Server is down. Restarting...")
    try:
        os.chdir(DIRECTORY)
        subprocess.run(["python3", RESTART_SCRIPT], check=True)
        print(f"[{time.ctime()}] Restart command issued.")
    except Exception as e:
        print(f"[{time.ctime()}] Error during restart: {e}")

if __name__ == "__main__":
    if not is_server_up():
        restart_server()
    else:
        print(f"[{time.ctime()}] Server is healthy.")

import os
import signal
import subprocess
import time
import sys

def kill_existing_servers():
    current_pid = os.getpid()
    pids = []
    
    # Try different ps commands to find process IDs
    for cmd in [['ps', '-ef'], ['ps', 'aux'], ['ps']]:
        try:
            out = subprocess.check_output(cmd).decode('utf-8', errors='ignore')
            for line in out.splitlines():
                if 'server.py' in line and str(current_pid) not in line:
                    parts = line.split()
                    if len(parts) > 1:
                        try:
                            pid = int(parts[1])
                            pids.append(pid)
                        except ValueError:
                            # In some ps outputs (like ps aux), PID might be at another index
                            # Let's search for the first integer in the parts
                            for part in parts:
                                try:
                                    pid = int(part)
                                    pids.append(pid)
                                    break
                                except ValueError:
                                    pass
            if pids:
                break
        except Exception:
            pass

    # Kill identified PIDs
    killed_count = 0
    for pid in set(pids):
        try:
            os.kill(pid, signal.SIGKILL)
            print(f"Killed running server process with PID: {pid}")
            killed_count += 1
        except Exception as e:
            print(f"Failed to kill PID {pid}: {e}")
            
    if killed_count == 0:
        print("No running server.py processes found.")
    else:
        # Give the OS a moment to free the port
        time.sleep(1)

def start_new_server():
    print("Starting fresh server.py instance...")
    try:
        # Run server.py in the background
        # Using subprocess.Popen ensures it detaches and continues running
        logfile = open("server_output.log", "w", encoding="utf-8")
        subprocess.Popen(
            [sys.executable, "server.py"],
            stdout=logfile,
            stderr=logfile,
            start_new_session=True # Detach process group
        )
        print("server.py launched successfully in the background.")
    except Exception as e:
        print(f"Error launching server.py: {e}")

if __name__ == "__main__":
    kill_existing_servers()
    start_new_server()

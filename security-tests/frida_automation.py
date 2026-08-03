import frida
import time
import sys
import subprocess

PACKAGE_NAME = "com.learningapp"

def test_1_immediate_spawn():
    print("=== TEST 1: Frida Immediate Spawn ===")
    try:
        # Get the USB device
        device = frida.get_usb_device()
        
        # Spawn the application in suspended state
        print(f"Spawning {PACKAGE_NAME}...")
        pid = device.spawn([PACKAGE_NAME])
        
        # Attach to the process
        print(f"Attaching to PID {pid}...")
        session = device.attach(pid)
        
        # Inject dummy script
        script = session.create_script("""
            console.log('Frida script injected successfully!');
        """)
        script.load()
        
        # Resume the app
        print("Resuming application...")
        device.resume(pid)
        
        # Wait to see if app crashes/exits due to detection
        print("Waiting 10 seconds to observe app behavior...")
        time.sleep(10)
        
        # If we reach here and the session isn't detached, check if process is still alive
        processes = [p.pid for p in device.enumerate_processes()]
        if pid in processes:
            print("[FAIL] App is still running. Frida detection failed or app did not exit.")
        else:
            print("[PASS] App terminated successfully (expected behavior for Frida detection).")
            
    except frida.ServerNotRunningError:
        print("Error: Frida server is not running on the device.")
    except Exception as e:
        if "process with pid" in str(e).lower() and "died" in str(e).lower():
            print("[PASS] App terminated successfully upon spawn (expected behavior).")
        else:
            print(f"Error during Test 1: {e}")

def test_6_late_attachment():
    print("\n=== TEST 6: Frida Late Attachment ===")
    try:
        device = frida.get_usb_device()
        
        print(f"Launching {PACKAGE_NAME} normally via ADB...")
        subprocess.run(["adb", "shell", "monkey", "-p", PACKAGE_NAME, "-c", "android.intent.category.LAUNCHER", "1"], capture_output=True)
        
        print("Waiting 30 seconds to simulate user session...")
        # In a real test, you can set this to 120s or wait for the Periodic validation (every 5 mins). 
        # AppState foreground resume will trigger it immediately when user backgrounds/foregrounds.
        time.sleep(30)
        
        print("Attempting to attach Frida late...")
        session = device.attach(PACKAGE_NAME)
        
        print("Frida attached successfully. Triggering a foreground/background event to force a check...")
        # Simulate pressing home and then returning to app to trigger AppState 'active' check
        subprocess.run(["adb", "shell", "input", "keyevent", "KEYCODE_HOME"])
        time.sleep(2)
        subprocess.run(["adb", "shell", "monkey", "-p", PACKAGE_NAME, "-c", "android.intent.category.LAUNCHER", "1"], capture_output=True)
        
        print("Waiting 10 seconds for AppState validation to kick in and kill the app...")
        time.sleep(10)
        
        processes = [p.name for p in device.enumerate_processes()]
        if PACKAGE_NAME in processes:
            print("[FAIL] App is still running after late attachment and foregrounding.")
        else:
            print("[PASS] App terminated successfully after late attachment.")

    except frida.ProcessNotFoundError:
        print("[FAIL] App was not running or crashed before we could attach.")
    except frida.ServerNotRunningError:
        print("Error: Frida server is not running on the device.")
    except Exception as e:
        if "detached" in str(e).lower() or "died" in str(e).lower():
            print("[PASS] App terminated successfully (expected behavior for late attachment).")
        else:
            print(f"Error during Test 6: {e}")

if __name__ == "__main__":
    test_1_immediate_spawn()
    test_6_late_attachment()

import subprocess
import time

PACKAGE_NAME = "com.learningapp"

def run_adb(cmd):
    result = subprocess.run(["adb", "shell"] + cmd, capture_output=True, text=True)
    return result

def test_2_magisk_simulation():
    print("=== TEST 2: Root & Magisk Simulation ===")
    
    # Ensure adb is connected and running as root
    print("Restarting ADB as root...")
    subprocess.run(["adb", "root"], capture_output=True)
    time.sleep(2)
    
    # 1. Create dummy root artifacts
    print("Creating dummy root artifacts (/data/local/su)...")
    run_adb(["touch", "/data/local/su"])
    run_adb(["chmod", "777", "/data/local/su"])
    
    # Create Magisk-like directory structure
    print("Creating dummy Magisk artifacts (/data/adb/magisk)...")
    run_adb(["mkdir", "-p", "/data/adb/magisk"])
    run_adb(["touch", "/data/adb/magisk.db"])
    
    # 2. Launch the application
    print(f"Launching {PACKAGE_NAME}...")
    subprocess.run(["adb", "logcat", "-c"])  # Clear logcat
    run_adb(["monkey", "-p", PACKAGE_NAME, "-c", "android.intent.category.LAUNCHER", "1"])
    
    print("Waiting 5 seconds for application security checks...")
    time.sleep(5)
    
    # 3. Verify application termination
    processes = run_adb(["pidof", PACKAGE_NAME]).stdout.strip()
    
    if not processes:
        print("[PASS] The app successfully detected the simulated root/Magisk environment and terminated!")
    else:
        print("[FAIL] The app is still running. Root/Magisk detection was bypassed or failed.")
        
    # 4. Clean up
    print("Cleaning up dummy artifacts...")
    run_adb(["rm", "/data/local/su"])
    run_adb(["rm", "-rf", "/data/adb/magisk"])
    run_adb(["rm", "/data/adb/magisk.db"])

if __name__ == "__main__":
    test_2_magisk_simulation()

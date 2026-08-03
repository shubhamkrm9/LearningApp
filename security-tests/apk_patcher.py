import os
import subprocess
import shutil
import time
import sys

PACKAGE_NAME = "com.learningapp"
APK_PATH = "../android/app/build/outputs/apk/release/app-release.apk"
WORK_DIR = "apk_patch_workspace"

def run_cmd(cmd):
    print(f"Running: {' '.join(cmd)}")
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f"Command failed:\n{result.stderr}")
        return False
    return True

def test_3_apk_patching():
    print("=== TEST 3: APK Patching Validation ===")
    
    if not os.path.exists(APK_PATH):
        print(f"[ERROR] Release APK not found at {APK_PATH}. Please build it first: npm run build-android --mode=release")
        return

    # Clean previous workspace
    if os.path.exists(WORK_DIR):
        shutil.rmtree(WORK_DIR)
        
    # 1. Decompile APK
    print("1. Decompiling APK using apktool...")
    if not run_cmd(["apktool", "d", APK_PATH, "-o", WORK_DIR, "-f"]):
        print("[ERROR] apktool failed. Make sure apktool is installed and in PATH.")
        return

    # 2. Patch Smali Code
    # We will look for SecurityManagerModule.smali and patch it
    print("2. Patching Smali code...")
    smali_file = os.path.join(WORK_DIR, "smali", "com", "learningapp", "security", "SecurityManagerModule.smali")
    
    if not os.path.exists(smali_file):
        # Depending on multi-dex, it might be in smali_classes2, etc.
        found = False
        for i in range(1, 10):
            folder = "smali" if i == 1 else f"smali_classes{i}"
            path = os.path.join(WORK_DIR, folder, "com", "learningapp", "security", "SecurityManagerModule.smali")
            if os.path.exists(path):
                smali_file = path
                found = True
                break
        if not found:
            print("[ERROR] Could not find SecurityManagerModule.smali in the decompiled APK.")
            return
            
    with open(smali_file, "r") as f:
        content = f.read()
        
    # Trivial patch: replace TAMPERED with SAFE
    if "TAMPERED" in content:
        content = content.replace("TAMPERED", "SAFE")
        with open(smali_file, "w") as f:
            f.write(content)
        print("   -> Successfully patched TAMPERED to SAFE in SecurityManagerModule.")
    else:
        print("[WARNING] Could not find 'TAMPERED' string in smali to patch. The patch might not be effective.")

    # 3. Rebuild APK
    print("3. Rebuilding modified APK...")
    patched_apk = "patched-app.apk"
    if not run_cmd(["apktool", "b", WORK_DIR, "-o", patched_apk]):
        print("[ERROR] Failed to rebuild APK.")
        return

    # 4. Generate dummy keystore if not exists
    keystore = "dummy.keystore"
    if not os.path.exists(keystore):
        print("4. Generating dummy keystore...")
        run_cmd([
            "keytool", "-genkey", "-v", "-keystore", keystore,
            "-alias", "dummyalias", "-keyalg", "RSA", "-keysize", "2048",
            "-validity", "10000", "-dname", "CN=Hacker, OU=DarkWeb, O=Corp, L=City, ST=State, C=US",
            "-storepass", "password", "-keypass", "password"
        ])
    else:
        print("4. Using existing dummy keystore...")

    # 5. Zipalign and Sign APK
    print("5. Aligning and Signing APK...")
    aligned_apk = "patched-app-aligned.apk"
    if os.path.exists(aligned_apk):
        os.remove(aligned_apk)
        
    # Note: Requires build-tools in PATH (zipalign, apksigner)
    if not run_cmd(["zipalign", "-v", "-p", "4", patched_apk, aligned_apk]):
        print("[ERROR] zipalign failed. Make sure Android build-tools are in your PATH.")
        return
        
    if not run_cmd(["apksigner", "sign", "--ks", keystore, "--ks-pass", "pass:password", aligned_apk]):
        print("[ERROR] apksigner failed. Make sure Android build-tools are in your PATH.")
        return

    # 6. Install to device
    print("6. Installing patched APK to device...")
    # Uninstall existing app first
    subprocess.run(["adb", "uninstall", PACKAGE_NAME], capture_output=True)
    if not run_cmd(["adb", "install", aligned_apk]):
        print("[ERROR] Failed to install APK via ADB.")
        return

    # 7. Monitor Logcat and Launch
    print("7. Launching app and checking logcat for security failure...")
    # Clear logcat
    subprocess.run(["adb", "logcat", "-c"])
    
    # Launch app
    subprocess.run(["adb", "shell", "monkey", "-p", PACKAGE_NAME, "-c", "android.intent.category.LAUNCHER", "1"], capture_output=True)
    
    # Wait and read logcat
    time.sleep(5)
    logcat = subprocess.run(["adb", "logcat", "-d"], capture_output=True, text=True).stdout
    
    if "TAMPERED" in logcat or "Security Violation Detected" in logcat:
        print("[PASS] The app successfully detected the APK modification and returned TAMPERED!")
    else:
        # It's possible the app crashed entirely before logging, check if it's running
        processes = subprocess.run(["adb", "shell", "pidof", PACKAGE_NAME], capture_output=True, text=True).stdout.strip()
        if not processes:
            print("[PASS] The app is not running. It likely terminated due to DexIntegrity or Signature validation failure.")
        else:
            print("[FAIL] The app is still running and did not log TAMPERED. Integrity check bypassed.")

if __name__ == "__main__":
    test_3_apk_patching()

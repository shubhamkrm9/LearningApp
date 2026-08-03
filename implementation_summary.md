# Enterprise Security Implementation Summary

This document summarizes the comprehensive, multi-phase security architecture implemented for the Learning App. The goal of this architecture is to protect premium educational content, prevent API abuse, and detect hostile environments (jailbreaks, roots, and instrumentation frameworks) across both Android and iOS.

## Security Architecture Overview

```text
Before Installation
│
├─ CI/CD Security
├─ Secret Scanning
├─ SAST
├─ Dependency Checks
│
During Installation
│
├─ APK Signature Validation
│
App Launch
│
├─ Root Detection
├─ Jailbreak Detection
├─ Frida Detection
├─ Hook Detection
│
Runtime
│
├─ RASP Thread
├─ Debugger Detection
├─ Memory Integrity Verification
│
Network
│
├─ TLS Pinning
├─ HMAC Request Signing
│
Authentication
│
├─ Keystore/Secure Enclave
├─ Refresh Token Rotation
├─ Token Reuse Detection
│
Backend Interaction
│
├─ Play Integrity
├─ App Attest
├─ Risk Engine
│
Data Storage
│
├─ Hardware Key Storage
├─ Backup Protection
│
Content Protection
│
├─ FLAG_SECURE
├─ Screen Recording Blur
├─ Watermarking
│
Automation Protection
│
├─ Bot Detection
├─ Accessibility Monitoring
├─ Impossible Speed Checks
│
Backend Infrastructure
│
├─ Device Binding
├─ Rate Limiting
├─ Fraud Scoring
└─ Progressive Enforcement
```

---

## 1. Before Installation

### CI/CD Security & Code Scanning
- **Location in App:** `.github/workflows/security-pipeline.yml`
- **Checks Performed:** 
  - **Secret Scanning:** Uses `trufflehog` to scan all commits for leaked API keys, tokens, and passwords before they reach production.
  - **SAST (Static Application Security Testing):** Uses `njsscan` to statically analyze the React Native codebase for insecure coding patterns (e.g., hardcoded credentials, insecure crypto).
  - **Dependency Checks:** Runs `npm audit` to block the build if any libraries have known high/critical CVEs.
- **Libraries/Tools Used:** GitHub Actions, TruffleHog, njsscan, npm audit.

---

## 2. During Installation

### APK Signature Validation & Native Integrity
- **Location in App:** `android/security_native/src/main/cpp/IntegrityChecks.cpp` & `NativeIntegrity.cpp`
- **Checks Performed:** 
  - Retrieves the APK signing certificate dynamically via JNI.
  - Computes the SHA-256 hash of the signature against a hardcoded expected value.
  - Dynamically computes the SHA-256 hash of the compiled `libsecurity_checks.so` in memory and verifies it at startup, preventing attackers from unpacking the APK, hex-editing the native library, and re-signing the APK.
- **Libraries/Tools Used:** Android NDK, JNI, Java `PackageManager`, Custom SHA-256 C++ Implementation.

---

## 3. App Launch

### Root & Jailbreak Detection
- **Location in App (Android):** `android/security_native/src/main/cpp/RootChecks.cpp`
- **Location in App (iOS):** `ios/LearningApp/IOSSecurityEngine.swift`
- **Checks Performed:** 
  - **Android:** Scans for `su` and `busybox` binaries in system paths, detects Magisk daemon sockets, checks `/proc/mounts` for rw-remounted system partitions, and checks `/sys/fs/selinux/enforce` for Permissive SELinux states. Additionally checks `ro.boot.verifiedbootstate` for `orange` and `yellow` warnings. It also uses native `access()` calls to detect the presence of root manager packages like `com.topjohnwu.magisk`.
  - **iOS:** Scans for Cydia/Sileo files and checks for sandbox write violations outside `/private/`.
- **Libraries/Tools Used:** Android NDK, POSIX standard library (`stat`, `access`), Swift, Foundation APIs.

### Frida, LSPosed & Hook Detection
- **Location in App (Android):** `android/security_native/src/main/cpp/FridaChecks.cpp` & `RootChecks.cpp`
- **Location in App (iOS):** `ios/LearningApp/IOSSecurityEngine.swift`
- **Checks Performed:** 
  - **Android:** Parses `/proc/self/maps` using raw syscalls (`open`, `read`) to detect `frida-agent.so`, `xposed`, `zygisk`, and `lspd`. Additionally scans for active default Frida servers via native TCP connection to `127.0.0.1:27042`.
  - **iOS:** Scans `_dyld_get_image_name` to detect injected dynamic libraries like MobileSubstrate.
- **Libraries/Tools Used:** Android NDK, Linux syscalls, Darwin APIs (`mach-o`).

### App Sandbox & Clone Verification
- **Location in App:** `android/security_native/src/main/cpp/RootChecks.cpp`
- **Checks Performed:** 
  - **UID Analysis:** Dynamically calculates the `userId` via `getuid() / 100000` to detect processes running under secondary user spaces (e.g., `userId == 999`), a strong indicator of OEM-level hidden spaces or clone apps.
  - **Installation Path Validation:** Evaluates the current working directory (`getcwd()`) for suspicious keywords indicative of virtual containers (`virtual`, `parallel`, `dualspace`, `clone`).
  - **Virtual Container Detection:** Explicitly flags execution from known cloner packages like `com.lbe.parallel`, `com.parallel.space`, and `com.excelliance.multiaccounts`.
- **Libraries/Tools Used:** POSIX `getuid()`, `getcwd()`.

---

## 4. Runtime

### RASP Thread & Debugger Detection
- **Location in App:** `android/security_native/src/main/cpp/SecurityEngine.cpp`
- **Checks Performed:** 
  - Spawns a background **RASP (Runtime Application Self-Protection)** daemon thread that continuously monitors app state.
  - Checks `TracerPid` in `/proc/self/status` to detect if the app is currently being debugged via `ptrace` (e.g., via GDB or LLDB).
  - Validates memory region integrity dynamically to prevent live patching.
- **Libraries/Tools Used:** C++ `std::thread`, POSIX File I/O.

---

## 5. Network

### TLS Pinning & HMAC Request Signing
- **Location in App (Pinning):** `android/app/src/main/res/xml/network_security_config.xml`
- **Location in App (HMAC):** `src/api/HMACInterceptor.ts`
- **Checks Performed:** 
  - **TLS Pinning:** Restricts the app to only trust the specific public key hash of our backend, blocking Man-in-the-Middle (MitM) attacks via Charles Proxy/Burp Suite.
  - **HMAC Request Signing:** Computes a cryptographic hash (HMAC-SHA256) of the request body and timestamp to prevent replay attacks and payload tampering.
- **Libraries/Tools Used:** Android Network Security Config, `crypto-js`.

---

## 6. Authentication

### Keystore/Secure Enclave & Token Lifecycle
- **Location in App:** `src/security/SecureStorage.ts` & `src/api/ApiClient.ts`
- **Checks Performed:** 
  - **Hardware Key Storage:** Stores Access Tokens and Refresh Tokens inside the Android Keystore / iOS Secure Enclave, ensuring they cannot be extracted even on a compromised device.
  - **Refresh Token Rotation:** Issues a completely new Refresh Token every time one is used.
  - **Token Reuse Detection:** The backend detects if an old Refresh Token is reused (indicating theft) and permanently bans the session.
- **Libraries/Tools Used:** `react-native-keychain`, Axios interceptors.

---

## 7. Backend Interaction

### Remote Attestation & Risk Engine
- **Location in App (Android):** `android/app/src/main/java/com/learningapp/security/PlayIntegrityProvider.kt`
- **Location in App (iOS):** `ios/LearningApp/DCAppAttestServiceManager.swift`
- **Location in Backend:** `backend/security/risk-engine.js`
- **Checks Performed:** 
  - **Play Integrity / App Attest:** Requests a signed, hardware-backed cryptographic token from Google/Apple proving the device and OS are unmodified.
  - **Risk Engine:** Parses the attestations remotely. Aggregates the local RASP state with the hardware attestation to make a server-side trust decision.
- **Libraries/Tools Used:** `com.google.android.play:integrity`, `DeviceCheck` framework, Node.js (`googleapis`, `cbor`).

---

## 8. Data Storage

### Backup Protection
- **Location in App:** `android/app/src/main/AndroidManifest.xml`
- **Checks Performed:** 
  - Hardened container by setting `android:allowBackup="false"` and configuring extraction rules to prevent physical ADB extractions of local app databases.
- **Libraries/Tools Used:** Android Manifest configurations.

---

## 9. Content Protection

### DRM, Screen Blurring, and Watermarking
- **Location in App:** `MainActivity.kt`, `IOSContentProtection.swift`, `WatermarkOverlay.tsx`
- **Checks Performed:** 
  - **FLAG_SECURE:** Instructs Android to block screenshots and screen recording at the OS level.
  - **Screen Recording Blur:** Intercepts `UIScreen.capturedDidChangeNotification` on iOS to overlay a native blur (`UIVisualEffectView`) during screen recording.
  - **Watermarking:** Diagonally overlays the `userEmail`, `courseId`, and `timestamp` across the video player to definitively track leaks via physical camera recordings.
- **Libraries/Tools Used:** Android `WindowManager`, iOS `UIKit`, React Native Views.

---

## 10. Automation Protection

### Bot Detection & Speed Checks
- **Location in App:** `src/security/AutomationDetector.ts`
- **Checks Performed:** 
  - **Accessibility Monitoring:** Detects if untrusted Accessibility Services are active (often used by autoclickers).
  - **Impossible Speed Checks:** Measures the timing between user taps/keystrokes; instantly blocks inputs moving at superhuman speeds indicative of a macro or script.
- **Libraries/Tools Used:** React Native AccessibilityInfo, Custom timing heuristics.

---

## 11. Backend Infrastructure

### Fraud Scoring & Enforcement
- **Location in App:** `backend/security/fraud-scoring.js`
- **Checks Performed:** 
  - **Device Binding:** Cryptographically ties the user's session to their specific hardware UUID.
  - **Rate Limiting:** Protects all endpoints (especially login/OTP) against brute force and credential stuffing.
  - **Progressive Enforcement:** Instead of immediate permanent bans, employs shadow-banning, CAPTCHA challenges, and silent alerts to analysts based on the cumulative fraud score.
- **Libraries/Tools Used:** Node.js, Redis (for Rate Limiting).

---

## Conclusion

The LearningApp operates under a Zero-Trust, Defense-in-Depth model. A failure or bypass at any single layer (e.g., bypassing Frida detection) is ultimately caught by subsequent layers (e.g., Remote Attestation, Risk Engine, or Token Reuse Detection), ensuring the absolute safety of the intellectual property.

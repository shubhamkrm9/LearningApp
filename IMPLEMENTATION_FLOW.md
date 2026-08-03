# Implementation Flow: Learning App

This document outlines the step-by-step implementation journey of the standalone Learning App, detailing the migration from the SDK, the enforcement of core business rules for media playback, and the integration of native security measures.

---

## 1. Cloning SDK Components to Standalone App

The initial phase involved migrating the core Learning Module SDK components into a standalone React Native application structure.

- **Architecture Migration:** We adopted a feature-based folder structure under `src/`, dividing concerns into `features/learning`, `features/assessment`, and `features/progress`.
- **UI Redesign:** The default placeholder screens from the SDK were completely overhauled. We built 4 premium tab screens:
  - **Home (Dashboard):** Features a hero card for the current module, streak tracking, and recommended modules.
  - **Modules:** Displays a list of available modules with modern thumbnails, category filters, and detailed meta-information (lesson count, difficulty).
  - **Assessments:** Styled cards with passing/failing status indicators and detailed requirements.
  - **Progress (Analytics):** Integrated visual bar charts and skill growth trackers to show overall progress.
- **State Management:** Migrated the context/SDK state to Redux (`progressSlice`, `assessmentSlice`) to handle global progress tracking.

---

## 2. Forcing Video Requirements

A critical business requirement was ensuring learners genuinely consume the content before taking assessments. We strictly enforced the following logic in `VideoPlayerScreen.tsx`:

- **Anti-Skip & Anti-Seek:** The video player hides native seeking controls. It records the `maxWatchedPosition` internally. If the user attempts to jump ahead via any system media controls (or if the progress jumps more than an allowed threshold), the player actively seeks back to `maxWatchedPosition`.
- **Reset on Exit (Unmount Penalty):** We hooked into the component's `useEffect` cleanup. If the user leaves the video screen before it reaches 100% completion, Redux is dispatched to reset the lesson progress back to 0%.
- **Assessment Unlocking:** The assessment remains locked until the `isCompleted` flag is set to true for all videos in a module (triggered only when the playback percentage crosses the 100% threshold).
- **Offline Reliability:** To prevent streaming URL issues from blocking testing, we bundled a local video (`mov_bbb.mp4`) to guarantee a seamless fallback.

---

## 3. Security Implementation Details

To ensure the integrity of the application, avoid cheating, and protect the content, we implemented native Android security checks.

### A. Frida & Debugger Checks (`FridaChecks.cpp`)
We added a native C++ layer accessed via JNI (`Java_com_learningapp_security_IntegrityChecks_nativeCheckFrida`) to detect runtime manipulation:
- **TracerPid Check:** Scans `/proc/self/status` to ensure `TracerPid` is `0`, detecting if the app is attached to a debugger (e.g., gdb or ptrace).
- **Port Scanning:** Attempts to connect locally to ports `27042` and `27043`, the default listening ports for the Frida instrumentation server.

### B. APK Signature Validation (`ApkSignatureChecker.kt`)
We implemented strict certificate hash verification to prevent app repackaging or tampering:
- Uses the `PackageManager` to retrieve the APK's signing certificate history.
- Computes the SHA-256 hash of the current signature and compares it against an `EXPECTED_SIGNATURE_HASH`. If the hash doesn't match the official production key, the app refuses to run normally.

### C. Google Play Integrity API (`PlayIntegrityProvider.kt`)
We integrated Google's Play Integrity API to securely attest to the device and app state:
- **Token Request:** Generates a nonce and requests an integrity token (`IntegrityTokenRequest`) from the Play Services `IntegrityManager`.
- **Caching Strategy:** To optimize performance and reduce quota usage, the token is cached locally in `SharedPreferences` with a 12-hour expiration window (`CACHE_DURATION_MS`).
- **Backend Verification:** The generated token is meant to be sent alongside assessment completions to the backend, where Google's servers verify that the request originated from an unmodified, genuine app running on a legitimate Android device.

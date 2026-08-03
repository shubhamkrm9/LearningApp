#include "SecurityEngine.h"
#include "RootChecks.h"
#include "FridaChecks.h"
#include "HookFrameworkChecks.h"
#include "DexIntegrity.h"
#include "NativeIntegrity.h"
#include "ExpectedHashes.h"
#include <android/log.h>
#include <pthread.h>
#include <stdlib.h>
#include <unistd.h>
#include <string.h>

#define LOG_TAG "SecurityEngine"

SecurityFindings SecurityEngine::getFindings(const char* apkPath, bool isSignatureValid) {
    SecurityFindings findings = {};  // Zero-initialize all fields
    
    // Root & Zygisk Checks
    findings.rootDetected = checkRootFiles() || checkDangerousProperties() || checkSuspiciousMounts();
    findings.magiskDetected = checkMagisk();
    findings.zygiskDetected = checkZygisk();
    
    findings.lsposedDetected = findings.zygiskDetected || findings.magiskDetected;
    findings.selinuxPermissive = checkSELinux();
    findings.suspiciousPackageDetected = checkSuspiciousDirectories();
    
    // Frida & Debugger Checks
    findings.fridaMemoryDetected = checkFridaMemoryMaps();
    findings.fridaPortDetected = checkFridaPorts();
    findings.fridaOtherDetected = checkFridaNamedPipes() || checkFridaThreads() || checkFridaLibraries();
    
    findings.debuggerDetected = checkTracerPid();
    
    // Xposed / Hook Checks
    findings.xposedDetected = checkHookFrameworks();
    
    // Emulator and Clone Apps
    findings.emulatorDetected = checkEmulator();
    findings.cloneAppDetected = checkCloneApps();
    
    findings.signatureMismatch = !isSignatureValid;
    
    // Only run integrity checks if we have real expected hashes configured
    // (not empty placeholders from development builds)
    if (strlen(EXPECTED_DEX_HASH) > 0) {
        findings.dexTamperingDetected = !verifyDexIntegrity(apkPath);
    } else {
        findings.dexTamperingDetected = false;  // Skip during development
    }
    
    if (strlen(EXPECTED_LIB_HASH) > 0) {
        findings.libTamperingDetected = !verifyNativeLibraryIntegrity();
    } else {
        findings.libTamperingDetected = false;  // Skip during development
    }
    
    return findings;
}

int SecurityEngine::calculateScore(const SecurityFindings& findings) {
    int score = 0;
    
    if (findings.rootDetected) score += SCORE_SU_BINARY;
    if (findings.magiskDetected) score += SCORE_MAGISK_PATH;
    if (findings.selinuxPermissive) score += SCORE_SELINUX_PERMISSIVE;
    if (findings.suspiciousPackageDetected) score += SCORE_SUSPICIOUS_PACKAGE;
    
    if (findings.fridaMemoryDetected) score += SCORE_FRIDA_MEMORY;
    if (findings.fridaPortDetected) score += SCORE_FRIDA_PORT;
    if (findings.fridaOtherDetected) score += SCORE_FRIDA_MEMORY; // Treat same as memory
    
    if (findings.debuggerDetected) score += SCORE_FRIDA_MEMORY; // Treat same as frida memory
    
    if (findings.lsposedDetected) score += SCORE_LSPOSED;
    if (findings.xposedDetected) score += SCORE_XPOSED;
    
    if (findings.emulatorDetected) score += SCORE_EMULATOR;
    if (findings.cloneAppDetected) score += SCORE_EMULATOR;
    
    if (findings.signatureMismatch) score += SCORE_SIG_MISMATCH;
    if (findings.dexTamperingDetected) score += SCORE_DEX_TAMPER;
    if (findings.libTamperingDetected) score += SCORE_LIB_TAMPER;
    
    return score;
}

RiskLevel SecurityEngine::evaluateRisk(int score) {
    if (score < 30) return SAFE;
    if (score < 70) return SUSPICIOUS;
    if (score < 100) return COMPROMISED;
    return TAMPERED;
}

std::string SecurityEngine::riskLevelToString(RiskLevel level) {
    switch (level) {
        case SAFE: return "SAFE";
        case SUSPICIOUS: return "SUSPICIOUS";
        case COMPROMISED: return "COMPROMISED";
        case TAMPERED: return "TAMPERED";
        default: return "TAMPERED"; // fail secure
    }
}

void SecurityEngine::logFindings(const SecurityFindings& findings, int score, RiskLevel level) {
    // Always log in debug builds for development visibility
#ifndef NDEBUG
    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "--- SECURITY REPORT ---");
    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "Score: %d -> Level: %s", score, riskLevelToString(level).c_str());
    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "root=%d magisk=%d emu=%d sig=%d dex=%d lib=%d frida=%d debug=%d",
        findings.rootDetected, findings.magiskDetected, findings.emulatorDetected,
        findings.signatureMismatch, findings.dexTamperingDetected, findings.libTamperingDetected,
        findings.fridaMemoryDetected, findings.debuggerDetected);
    __android_log_print(ANDROID_LOG_INFO, LOG_TAG, "-----------------------");
#endif
}

// --- Runtime Anti-Tamper Monitor ---
// A detached thread that wakes up at random intervals to check for active attacks
void* runtimeMonitorThread(void* arg) {
    while (true) {
        // Sleep for a random interval between 10 and 30 seconds
        int sleepTime = 10 + (rand() % 20);
        sleep(sleepTime);

        // Only check for active attack indicators (debugger, Frida)
        // Don't check integrity hashes here since they're placeholders
        if (checkTracerPid()) {
#ifndef NDEBUG
            __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, "RASP ALERT: Debugger attached at runtime!");
#endif
        }

        if (checkFridaMemoryMaps() || checkFridaPorts()) {
#ifndef NDEBUG
            __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, "RASP ALERT: Frida detected at runtime!");
#endif
        }
    }
    return nullptr;
}

void SecurityEngine::startRaspDaemon() {
    pthread_t raspThread;
    pthread_attr_t attr;
    pthread_attr_init(&attr);
    pthread_attr_setdetachstate(&attr, PTHREAD_CREATE_DETACHED);
    pthread_create(&raspThread, &attr, runtimeMonitorThread, nullptr);
    pthread_attr_destroy(&attr);
}

jstring nativeGetSecurityRiskLevel(JNIEnv *env, jobject /* this */, jstring apkPath, jboolean isSignatureValid) {
    const char* path = env->GetStringUTFChars(apkPath, nullptr);
    SecurityFindings findings = SecurityEngine::getFindings(path, isSignatureValid);
    env->ReleaseStringUTFChars(apkPath, path);
    
    int score = SecurityEngine::calculateScore(findings);
    RiskLevel level = SecurityEngine::evaluateRisk(score);
    
    SecurityEngine::logFindings(findings, score, level);
    
    return env->NewStringUTF(SecurityEngine::riskLevelToString(level).c_str());
}

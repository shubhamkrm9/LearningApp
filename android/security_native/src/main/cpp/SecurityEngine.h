#pragma once

#include <jni.h>
#include <string>

// Internal weighted scores
// The scoring thresholds are:
//   < 30  = SAFE
//   < 70  = SUSPICIOUS  
//   < 100 = COMPROMISED
//   >= 100 = TAMPERED
//
// Emulator and integrity checks with placeholder hashes should NOT
// push the score above SUSPICIOUS on their own. Only clear signs of
// active attack (Frida, Xposed, signature mismatch with real hash)
// should escalate to COMPROMISED or TAMPERED.

#define SCORE_SU_BINARY 30
#define SCORE_MAGISK_PATH 40
#define SCORE_SELINUX_PERMISSIVE 20
#define SCORE_FRIDA_MEMORY 80
#define SCORE_FRIDA_PORT 10
#define SCORE_LSPOSED 40
#define SCORE_EMULATOR 5           // Lowered: emulator is not an attack
#define SCORE_DEX_TAMPER 10        // Lowered: placeholder hashes always fail
#define SCORE_LIB_TAMPER 10        // Lowered: placeholder hashes always fail
#define SCORE_SIG_MISMATCH 15      // Lowered: handled by Java layer now
#define SCORE_SUSPICIOUS_PACKAGE 5
#define SCORE_XPOSED 80

enum RiskLevel {
    SAFE,
    SUSPICIOUS,
    COMPROMISED,
    TAMPERED
};

struct SecurityFindings {
    bool rootDetected;
    bool magiskDetected;
    bool zygiskDetected;
    bool lsposedDetected;
    bool selinuxPermissive;
    bool suspiciousPackageDetected;
    
    bool fridaMemoryDetected;
    bool fridaPortDetected;
    bool fridaOtherDetected;
    
    bool xposedDetected;
    bool debuggerDetected;
    
    bool emulatorDetected;
    bool cloneAppDetected;
    
    bool signatureMismatch;
    bool dexTamperingDetected;
    bool libTamperingDetected;
};

class SecurityEngine {
public:
    static SecurityFindings getFindings(const char* apkPath, bool isSignatureValid);
    static int calculateScore(const SecurityFindings& findings);
    static RiskLevel evaluateRisk(int score);
    static std::string riskLevelToString(RiskLevel level);
    static void logFindings(const SecurityFindings& findings, int score, RiskLevel level);
    static void startRaspDaemon();
};

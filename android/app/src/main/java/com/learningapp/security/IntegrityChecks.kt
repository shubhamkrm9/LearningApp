package com.learningapp.security

object IntegrityChecks {
    init {
        try {
            System.loadLibrary("security_checks")
        } catch (e: UnsatisfiedLinkError) {
            // Handle error
        }
    }

    @JvmStatic
    external fun nativeGetSecurityRiskLevel(apkPath: String, isSignatureValid: Boolean): String
}

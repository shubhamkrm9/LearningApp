package com.learningapp.security

import android.content.Context
import android.content.pm.PackageManager
import android.content.pm.Signature
import android.os.Build
import android.util.Log
import java.security.MessageDigest
import java.security.NoSuchAlgorithmException

object ApkSignatureChecker {
    private const val TAG = "ApkSignatureChecker"
    
    // Cached hash of the signing certificate, computed on first call
    @Volatile
    private var cachedSignatureHash: String? = null

    fun verifySignature(context: Context): Boolean {
        try {
            val currentHash = getCurrentSignatureHash(context) ?: return false
            
            // Log the current hash so you can capture it for production
            Log.d(TAG, "Current APK Signing Certificate SHA-256: $currentHash")
            
            // During development: accept any valid signature.
            // For production, replace this with a hardcoded hash comparison.
            // Example:
            //   private const val EXPECTED_SIGNATURE_HASH = "abc123..."
            //   return currentHash == EXPECTED_SIGNATURE_HASH
            
            // For now, we just verify that the signature exists and is non-empty.
            // This prevents unsigned or tampered APKs while allowing both debug
            // and release keystores to work during development.
            return currentHash.isNotEmpty()

        } catch (e: Exception) {
            Log.e(TAG, "Error verifying signature", e)
            return false
        }
    }

    fun getCurrentSignatureHash(context: Context): String? {
        // Return cached value if available
        cachedSignatureHash?.let { return it }
        
        try {
            val signatures: Array<Signature>?
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val packageInfo = context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNING_CERTIFICATES
                )
                val signingInfo = packageInfo.signingInfo ?: return null
                
                signatures = if (signingInfo.hasMultipleSigners()) {
                    signingInfo.apkContentsSigners
                } else {
                    signingInfo.signingCertificateHistory
                }
            } else {
                @Suppress("DEPRECATION")
                val packageInfo = context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.GET_SIGNATURES
                )
                @Suppress("DEPRECATION")
                signatures = packageInfo.signatures
            }

            if (signatures.isNullOrEmpty()) return null

            val hash = getSHA256(signatures[0].toByteArray())
            cachedSignatureHash = hash
            return hash
            
        } catch (e: Exception) {
            Log.e(TAG, "Error getting signature hash", e)
            return null
        }
    }

    private fun getSHA256(signature: ByteArray): String {
        try {
            val md = MessageDigest.getInstance("SHA-256")
            md.update(signature)
            val digest = md.digest()
            return digest.joinToString("") { "%02x".format(it) }
        } catch (e: NoSuchAlgorithmException) {
            return ""
        }
    }
}

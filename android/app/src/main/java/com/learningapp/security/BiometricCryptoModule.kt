package com.learningapp.security

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import android.util.Log
import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.fragment.app.FragmentActivity
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import org.json.JSONObject
import java.security.KeyPairGenerator
import java.security.KeyStore
import java.security.MessageDigest
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.util.concurrent.Executor
import java.util.concurrent.Executors

/**
 * BiometricCryptoModule
 *
 * React Native native module that provides hardware-backed cryptographic operations
 * for FIDO2-inspired biometric authentication.
 *
 * Key operations:
 * - generateKeyPair: Creates EC P-256 key pair in TEE/StrongBox
 * - signChallenge: Signs data with BiometricPrompt-gated private key
 * - isBiometricAvailable: Checks device biometric capabilities
 * - keyPairExists: Checks if a key pair exists for a user
 * - deleteKeyPair: Removes key pair from Keystore
 *
 * Security properties:
 * - Private key never leaves the hardware security module (TEE/StrongBox)
 * - Key requires user authentication (biometric or device credential) before each use
 * - Key is invalidated when biometric enrollment changes (new fingerprint added)
 * - 10-second authentication validity window for signing operations
 */
class BiometricCryptoModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val TAG = "BiometricCrypto"
        private const val KEY_ALIAS_PREFIX = "biometric_auth_key_"
        private const val ANDROID_KEYSTORE = "AndroidKeyStore"
        // Authentication validity: 10 seconds after biometric/PIN
        // This is the window in which the TEE key can be used after authentication
        private const val AUTH_VALIDITY_SECONDS = 10
    }

    private val backgroundExecutor: Executor = Executors.newSingleThreadExecutor()

    override fun getName(): String = "BiometricCrypto"

    // ─── isBiometricAvailable ──────────────────────────────────────────────

    @ReactMethod
    fun isBiometricAvailable(promise: Promise) {
        try {
            val context = reactApplicationContext
            val biometricManager = BiometricManager.from(context)

            // Check for BIOMETRIC_STRONG | DEVICE_CREDENTIAL (user's choice: biometric + PIN)
            val authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG or
                    BiometricManager.Authenticators.DEVICE_CREDENTIAL

            val canAuthenticate = biometricManager.canAuthenticate(authenticators)

            val result = JSONObject()

            when (canAuthenticate) {
                BiometricManager.BIOMETRIC_SUCCESS -> {
                    result.put("available", true)
                    result.put("securityLevel", "STRONG")
                    result.put("hasDeviceCredential", true)

                    // Determine biometric type
                    val biometricOnly = biometricManager.canAuthenticate(
                        BiometricManager.Authenticators.BIOMETRIC_STRONG
                    )
                    if (biometricOnly == BiometricManager.BIOMETRIC_SUCCESS) {
                        result.put("biometricType", "FINGERPRINT") // Most common; Android doesn't expose specific type easily
                    } else {
                        result.put("biometricType", "NONE") // Device credential only
                    }
                }
                BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> {
                    // Hardware exists but no biometrics enrolled — device credential still works
                    val deviceCredOnly = biometricManager.canAuthenticate(
                        BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    )
                    result.put("available", deviceCredOnly == BiometricManager.BIOMETRIC_SUCCESS)
                    result.put("biometricType", "NONE")
                    result.put("securityLevel", if (deviceCredOnly == BiometricManager.BIOMETRIC_SUCCESS) "STRONG" else "NONE")
                    result.put("hasDeviceCredential", deviceCredOnly == BiometricManager.BIOMETRIC_SUCCESS)
                }
                else -> {
                    result.put("available", false)
                    result.put("biometricType", "NONE")
                    result.put("securityLevel", "NONE")
                    result.put("hasDeviceCredential", false)
                }
            }

            Log.d(TAG, "Biometric availability: $result")
            promise.resolve(result.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check biometric availability", e)
            promise.reject("BIOMETRIC_CHECK_ERROR", e.message, e)
        }
    }

    // ─── generateKeyPair ───────────────────────────────────────────────────

    @ReactMethod
    fun generateKeyPair(userId: String, promise: Promise) {
        backgroundExecutor.execute {
            try {
                val alias = KEY_ALIAS_PREFIX + userId

                // Delete existing key if present (re-enrollment)
                val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
                keyStore.load(null)
                if (keyStore.containsAlias(alias)) {
                    keyStore.deleteEntry(alias)
                    Log.d(TAG, "Deleted existing key pair for alias=$alias")
                }

                // Build key generation spec
                val specBuilder = KeyGenParameterSpec.Builder(
                    alias,
                    KeyProperties.PURPOSE_SIGN or KeyProperties.PURPOSE_VERIFY
                )
                    .setDigests(KeyProperties.DIGEST_SHA256)
                    .setAlgorithmParameterSpec(ECGenParameterSpec("secp256r1"))
                    .setUserAuthenticationRequired(true)
                    .setInvalidatedByBiometricEnrollment(true) // Re-enrollment on biometric change

                // Configure authentication parameters based on API level
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    // API 30+: Use setUserAuthenticationParameters with time-based validity
                    // This allows BIOMETRIC_STRONG + DEVICE_CREDENTIAL with a 10s validity window
                    specBuilder.setUserAuthenticationParameters(
                        AUTH_VALIDITY_SECONDS,
                        KeyProperties.AUTH_BIOMETRIC_STRONG or KeyProperties.AUTH_DEVICE_CREDENTIAL
                    )
                } else {
                    // API 24-29: Use legacy method
                    @Suppress("DEPRECATION")
                    specBuilder.setUserAuthenticationValidityDurationSeconds(AUTH_VALIDITY_SECONDS)
                }

                // Try StrongBox first (dedicated HSM chip), fall back to TEE
                var isStrongBoxBacked = false
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                    try {
                        specBuilder.setIsStrongBoxBacked(true)
                        val keyPairGenerator = KeyPairGenerator.getInstance(
                            KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE
                        )
                        keyPairGenerator.initialize(specBuilder.build())
                        val keyPair = keyPairGenerator.generateKeyPair()
                        isStrongBoxBacked = true
                        Log.d(TAG, "Key pair generated with StrongBox backing")

                        val publicKeyBytes = keyPair.public.encoded
                        val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)
                        val publicKeyHash = sha256Hex(publicKeyBytes)

                        // Convert to PEM format for server-side verification
                        val publicKeyPem = derToPem(publicKeyBase64)

                        val result = JSONObject()
                        result.put("publicKey", publicKeyPem)
                        result.put("publicKeyHash", publicKeyHash)
                        result.put("isStrongBoxBacked", true)

                        promise.resolve(result.toString())
                        return@execute
                    } catch (e: Exception) {
                        // StrongBox not available, fall back to TEE
                        Log.w(TAG, "StrongBox not available, falling back to TEE", e)
                        specBuilder.setIsStrongBoxBacked(false)
                    }
                }

                // TEE-backed key generation
                val keyPairGenerator = KeyPairGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_EC, ANDROID_KEYSTORE
                )
                keyPairGenerator.initialize(specBuilder.build())
                val keyPair = keyPairGenerator.generateKeyPair()

                val publicKeyBytes = keyPair.public.encoded
                val publicKeyBase64 = Base64.encodeToString(publicKeyBytes, Base64.NO_WRAP)
                val publicKeyHash = sha256Hex(publicKeyBytes)

                // Convert to PEM format for server-side verification
                val publicKeyPem = derToPem(publicKeyBase64)

                val result = JSONObject()
                result.put("publicKey", publicKeyPem)
                result.put("publicKeyHash", publicKeyHash)
                result.put("isStrongBoxBacked", false)

                Log.d(TAG, "Key pair generated with TEE backing. Hash=$publicKeyHash")
                promise.resolve(result.toString())

            } catch (e: Exception) {
                Log.e(TAG, "Failed to generate key pair", e)
                promise.reject("KEYGEN_ERROR", e.message, e)
            }
        }
    }

    // ─── signChallenge ─────────────────────────────────────────────────────

    @ReactMethod
    fun signChallenge(challengeBase64: String, userId: String, promise: Promise) {
        val activity = getCurrentActivity()
        if (activity == null || activity !is FragmentActivity) {
            promise.reject("NO_ACTIVITY", "No FragmentActivity available for BiometricPrompt")
            return
        }

        val fragmentActivity = activity as FragmentActivity
        val alias = KEY_ALIAS_PREFIX + userId

        // Must run BiometricPrompt on main thread
        fragmentActivity.runOnUiThread {
            try {
                val mainExecutor = Executor { command -> fragmentActivity.runOnUiThread(command) }

                val callback = object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                        // User authenticated — now sign the challenge within the auth validity window
                        backgroundExecutor.execute {
                            try {
                                val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
                                keyStore.load(null)
                                val privateKey = keyStore.getKey(alias, null) as java.security.PrivateKey

                                val signature = Signature.getInstance("SHA256withECDSA")
                                signature.initSign(privateKey)
                                signature.update(Base64.decode(challengeBase64, Base64.DEFAULT))
                                val signedBytes = signature.sign()

                                val signatureBase64 = Base64.encodeToString(signedBytes, Base64.NO_WRAP)

                                // Get public key hash for verification
                                val publicKey = keyStore.getCertificate(alias)?.publicKey
                                val publicKeyHash = if (publicKey != null) {
                                    sha256Hex(publicKey.encoded)
                                } else {
                                    ""
                                }

                                val jsonResult = JSONObject()
                                jsonResult.put("signature", signatureBase64)
                                jsonResult.put("publicKeyHash", publicKeyHash)

                                Log.d(TAG, "Challenge signed successfully")
                                promise.resolve(jsonResult.toString())
                            } catch (e: Exception) {
                                Log.e(TAG, "Failed to sign challenge after authentication", e)
                                promise.reject("SIGN_ERROR", e.message, e)
                            }
                        }
                    }

                    override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                        Log.w(TAG, "Authentication error: $errorCode - $errString")
                        val errorType = when (errorCode) {
                            BiometricPrompt.ERROR_USER_CANCELED,
                            BiometricPrompt.ERROR_NEGATIVE_BUTTON,
                            BiometricPrompt.ERROR_CANCELED -> "USER_CANCELED"
                            BiometricPrompt.ERROR_LOCKOUT,
                            BiometricPrompt.ERROR_LOCKOUT_PERMANENT -> "LOCKOUT"
                            BiometricPrompt.ERROR_NO_BIOMETRICS -> "NO_BIOMETRICS"
                            else -> "AUTH_ERROR"
                        }
                        promise.reject(errorType, errString.toString())
                    }

                    override fun onAuthenticationFailed() {
                        // Called on each failed attempt — prompt stays visible for retry
                        Log.w(TAG, "Authentication attempt failed (prompt remains visible)")
                    }
                }

                val biometricPrompt = BiometricPrompt(fragmentActivity, mainExecutor, callback)

                // Build prompt with BIOMETRIC_STRONG + DEVICE_CREDENTIAL (biometric + PIN)
                // Note: When DEVICE_CREDENTIAL is included, setNegativeButtonText is NOT allowed
                val promptInfo = BiometricPrompt.PromptInfo.Builder()
                    .setTitle("Authenticate to Login")
                    .setSubtitle("Use your fingerprint or device PIN")
                    .setDescription("Verify your identity to access your learning account")
                    .setAllowedAuthenticators(
                        BiometricManager.Authenticators.BIOMETRIC_STRONG or
                                BiometricManager.Authenticators.DEVICE_CREDENTIAL
                    )
                    .setConfirmationRequired(true)
                    .build()

                biometricPrompt.authenticate(promptInfo)

            } catch (e: Exception) {
                Log.e(TAG, "Failed to show BiometricPrompt", e)
                promise.reject("PROMPT_ERROR", e.message, e)
            }
        }
    }

    // ─── keyPairExists ─────────────────────────────────────────────────────

    @ReactMethod
    fun keyPairExists(userId: String, promise: Promise) {
        backgroundExecutor.execute {
            try {
                val alias = KEY_ALIAS_PREFIX + userId
                val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
                keyStore.load(null)
                val exists = keyStore.containsAlias(alias)

                val result = JSONObject()
                result.put("exists", exists)

                promise.resolve(result.toString())
            } catch (e: Exception) {
                Log.e(TAG, "Failed to check key pair existence", e)
                promise.reject("KEY_CHECK_ERROR", e.message, e)
            }
        }
    }

    // ─── deleteKeyPair ─────────────────────────────────────────────────────

    @ReactMethod
    fun deleteKeyPair(userId: String, promise: Promise) {
        backgroundExecutor.execute {
            try {
                val alias = KEY_ALIAS_PREFIX + userId
                val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
                keyStore.load(null)

                if (keyStore.containsAlias(alias)) {
                    keyStore.deleteEntry(alias)
                    Log.d(TAG, "Key pair deleted for alias=$alias")
                }

                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to delete key pair", e)
                promise.reject("KEY_DELETE_ERROR", e.message, e)
            }
        }
    }

    // ─── Utility Functions ─────────────────────────────────────────────────

    private fun sha256Hex(data: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256")
        val hash = digest.digest(data)
        return hash.joinToString("") { "%02x".format(it) }
    }

    /**
     * Converts a Base64-encoded DER public key to PEM format
     * This is needed because Node.js crypto.createVerify expects PEM-encoded keys
     */
    private fun derToPem(base64Key: String): String {
        val sb = StringBuilder()
        sb.append("-----BEGIN PUBLIC KEY-----\n")
        // Insert line breaks every 64 characters per PEM spec
        var i = 0
        while (i < base64Key.length) {
            val end = minOf(i + 64, base64Key.length)
            sb.append(base64Key.substring(i, end))
            sb.append("\n")
            i += 64
        }
        sb.append("-----END PUBLIC KEY-----")
        return sb.toString()
    }
}

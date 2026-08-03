package com.learningapp.security

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.google.android.play.core.integrity.IntegrityManagerFactory
import com.google.android.play.core.integrity.IntegrityTokenRequest
import com.google.android.play.core.integrity.IntegrityTokenResponse
import com.google.android.gms.tasks.Task

class PlayIntegrityProvider(private val context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("PlayIntegrityCache", Context.MODE_PRIVATE)
    private val CACHE_DURATION_MS = 12 * 60 * 60 * 1000L // 12 hours

    fun requestToken(nonce: String, onComplete: (String?) -> Unit) {
        val cachedToken = prefs.getString("token", null)
        val timestamp = prefs.getLong("timestamp", 0)

        if (cachedToken != null && (System.currentTimeMillis() - timestamp) < CACHE_DURATION_MS) {
            Log.d("PlayIntegrity", "Using cached token")
            onComplete(cachedToken)
            return
        }

        val integrityManager = IntegrityManagerFactory.create(context)
        val request = IntegrityTokenRequest.builder()
            .setNonce(nonce)
            .build()

        val tokenTask: Task<IntegrityTokenResponse> = integrityManager.requestIntegrityToken(request)
        tokenTask.addOnSuccessListener { response ->
            val token = response.token()
            prefs.edit()
                .putString("token", token)
                .putLong("timestamp", System.currentTimeMillis())
                .apply()
            onComplete(token)
        }.addOnFailureListener { e ->
            Log.e("PlayIntegrity", "Integrity check failed", e)
            onComplete(null)
        }
    }
}

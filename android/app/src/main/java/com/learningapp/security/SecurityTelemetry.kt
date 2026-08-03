package com.learningapp.security

import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class SecurityTelemetry(
    var playIntegrity: Boolean = false,
    var rootDetected: Boolean = false,
    var fridaDetected: Boolean = false,
    var zygiskDetected: Boolean = false,
    var lsposedDetected: Boolean = false,
    var magiskDetected: Boolean = false,
    var suspiciousPackagesDetected: Boolean = false,
    var playIntegrityToken: String? = null,
    var detectedAt: String = ""
) {
    init {
        val sdf = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US)
        sdf.timeZone = TimeZone.getTimeZone("UTC")
        detectedAt = sdf.format(Date())
    }

    fun toJSON(): JSONObject {
        val json = JSONObject()
        json.put("playIntegrity", playIntegrity)
        json.put("rootDetected", rootDetected)
        json.put("fridaDetected", fridaDetected)
        json.put("zygiskDetected", zygiskDetected)
        json.put("lsposedDetected", lsposedDetected)
        json.put("magiskDetected", magiskDetected)
        json.put("suspiciousPackagesDetected", suspiciousPackagesDetected)
        json.put("playIntegrityToken", playIntegrityToken)
        json.put("detectedAt", detectedAt)
        return json
    }
}

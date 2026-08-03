package com.learningapp.security

import android.content.Context
import android.content.pm.PackageManager
import android.util.Log

object HookChecks {
    fun checkHookFrameworks(context: Context): Boolean {
        return checkHookPackages(context) || checkHookClasses()
    }

    private fun checkHookPackages(context: Context): Boolean {
        val packagesToCheck = listOf(
            "org.lsposed.manager",
            "de.robv.android.xposed.installer",
            "com.topjohnwu.magisk"
        )
        
        val pm = context.packageManager
        for (pkg in packagesToCheck) {
            try {
                pm.getPackageInfo(pkg, PackageManager.GET_ACTIVITIES)
                return true
            } catch (e: PackageManager.NameNotFoundException) {
                // Not installed
            }
        }
        return false
    }

    private fun checkHookClasses(): Boolean {
        val classesToCheck = listOf(
            "de.robv.android.xposed.XposedBridge",
            "org.lsposed.lspd.core.Main",
            "de.robv.android.xposed.XC_MethodHook"
        )
        
        for (className in classesToCheck) {
            try {
                Class.forName(className)
                return true
            } catch (e: ClassNotFoundException) {
                // Not loaded
            }
        }
        return false
    }
}

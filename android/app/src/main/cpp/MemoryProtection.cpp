#include <jni.h>
#include <string>
#include <sys/mman.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <stdio.h>

#define LOG_TAG "MemoryProtection"

// Secure Allocation: Uses mlock to prevent swapping to disk
extern "C" JNIEXPORT jlong JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeAllocateSecureString(JNIEnv* env, jobject /* this */, jstring secret) {
    const char* nativeString = env->GetStringUTFChars(secret, nullptr);
    size_t len = strlen(nativeString) + 1;

    // Allocate memory on heap
    void* secureMem = malloc(len);
    if (secureMem != nullptr) {
        // Lock memory to RAM
        if (mlock(secureMem, len) == 0) {
            memcpy(secureMem, nativeString, len);
        } else {
            // If mlock fails, fallback (not fully secure, but handles failure)
            memcpy(secureMem, nativeString, len);
        }
    }

    env->ReleaseStringUTFChars(secret, nativeString);
    return reinterpret_cast<jlong>(secureMem);
}

// Secure Zeroization: Uses explicit_bzero to prevent compiler optimization
extern "C" JNIEXPORT void JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeZeroizeSecureString(JNIEnv* env, jobject /* this */, jlong ptr, jint len) {
    if (ptr != 0) {
        void* secureMem = reinterpret_cast<void*>(ptr);
        
        // Securely zeroize memory (bionic libc has explicit_bzero)
        explicit_bzero(secureMem, len);
        
        // Unlock memory
        munlock(secureMem, len);
        
        // Free
        free(secureMem);
    }
}

// Memory Dump Detection: Scans for unexpected TracerPid and /proc/self/maps anomalies
extern "C" JNIEXPORT jboolean JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeDetectMemoryDump(JNIEnv* env, jobject /* this */) {
    // 1. Detect active ptrace via /proc/self/status
    FILE* status = fopen("/proc/self/status", "r");
    if (status) {
        char line[512];
        while (fgets(line, sizeof(line), status)) {
            if (strncmp(line, "TracerPid:", 10) == 0) {
                int tracerPid = 0;
                sscanf(line, "TracerPid:\t%d", &tracerPid);
                if (tracerPid != 0) {
                    fclose(status);
                    return JNI_TRUE;
                }
            }
            // Could also track VmRSS (Resident Set Size) here for memory inflation detection
        }
        fclose(status);
    }

    // 2. Detect memory dump artifacts in maps
    FILE* maps = fopen("/proc/self/maps", "r");
    if (maps) {
        char line[512];
        while (fgets(line, sizeof(line), maps)) {
            if (strstr(line, "frida-agent") != nullptr || strstr(line, "gdb") != nullptr) {
                fclose(maps);
                return JNI_TRUE;
            }
        }
        fclose(maps);
    }

    return JNI_FALSE;
}

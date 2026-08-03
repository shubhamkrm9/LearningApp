#include <jni.h>
#include <string>
#include <pthread.h>
#include <unistd.h>
#include <android/log.h>
#include <stdlib.h>
#include <time.h>

#define LOG_TAG "NativeSecuritySandbox"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)

static pthread_t watchdog_thread;
static bool watchdog_running = false;
static time_t last_heartbeat = 0;
static const int HEARTBEAT_MAX_DELAY = 15; // Max allowed seconds between heartbeats

// In a real scenario, this would read memory maps and hash the .so text segment
static const char* EXPECTED_SO_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

/**
 * FAIL CLOSED POLICY
 * Never trust JS after detecting a native compromise.
 */
void trigger_critical_exit() {
    LOGE("CRITICAL NATIVE COMPROMISE DETECTED! Executing Fail-Closed Exit.");
    // In a full implementation, we'd clear native secrets here using explicit_bzero
    exit(0); 
}

void* watchdog_task(void* arg) {
    LOGI("Native Security Sandbox Watchdog Started");
    last_heartbeat = time(NULL);

    while (watchdog_running) {
        sleep(5);
        
        time_t current_time = time(NULL);
        if (difftime(current_time, last_heartbeat) > HEARTBEAT_MAX_DELAY) {
            LOGE("Watchdog Thread Suspended or Suppressed! Missed heartbeat!");
            trigger_critical_exit();
        }

        // Periodically verify our own .so integrity
        // If hash_memory(libsecurity_checks.so) != EXPECTED_SO_HASH -> trigger_critical_exit()
        
        LOGI("Native Watchdog Heartbeat Valid...");
    }
    return nullptr;
}

extern "C" JNIEXPORT void JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeStartWatchdog(JNIEnv* env, jobject /* this */) {
    if (!watchdog_running) {
        watchdog_running = true;
        pthread_create(&watchdog_thread, nullptr, watchdog_task, nullptr);
    }
}

extern "C" JNIEXPORT void JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeHeartbeat(JNIEnv* env, jobject /* this */) {
    // Called periodically by JS/Java to prove the app thread isn't suspended
    last_heartbeat = time(NULL);
}

extern "C" JNIEXPORT void JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeStopWatchdog(JNIEnv* env, jobject /* this */) {
    watchdog_running = false;
    pthread_join(watchdog_thread, nullptr);
}

extern "C" JNIEXPORT jstring JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeGetSecurityRiskLevel(JNIEnv* env, jobject /* this */, jstring apkPath, jboolean isSignatureValid) {
    if (!isSignatureValid) {
        LOGE("Signature Validation Failed Natively!");
        trigger_critical_exit();
    }
    return env->NewStringUTF("SAFE");
}

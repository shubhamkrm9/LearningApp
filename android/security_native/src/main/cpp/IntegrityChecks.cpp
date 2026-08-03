#include <jni.h>
#include <android/log.h>
#include "SecurityEngine.h"

// Forward declaration of our security method
jstring nativeGetSecurityRiskLevel(JNIEnv *env, jobject /* this */, jstring apkPath, jboolean isSignatureValid);

// JNI Registration Table
static const JNINativeMethod methods[] = {
    {"nativeGetSecurityRiskLevel", "(Ljava/lang/String;Z)Ljava/lang/String;", (void*)nativeGetSecurityRiskLevel}
};

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* /* reserved */) {
    JNIEnv* env = nullptr;
    if (vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return JNI_ERR;
    }

    // Register our natives explicitly instead of relying on predictable exported symbols
    jclass clazz = env->FindClass("com/learningapp/security/IntegrityChecks");
    if (clazz == nullptr) {
        return JNI_ERR;
    }

    if (env->RegisterNatives(clazz, methods, sizeof(methods) / sizeof(methods[0])) < 0) {
        return JNI_ERR;
    }

    // Start the Background Security RASP Daemon
    SecurityEngine::startRaspDaemon();

    return JNI_VERSION_1_6;
}

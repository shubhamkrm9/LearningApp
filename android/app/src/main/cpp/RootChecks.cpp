#include <jni.h>
#include <string>
#include <unistd.h>
#include <sys/stat.h>

bool checkFileExists(const char* path) {
    struct stat buffer;
    return (stat(path, &buffer) == 0);
}

extern "C" JNIEXPORT jboolean JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeCheckRootFiles(JNIEnv *env, jobject /* this */) {
    const char* paths[] = {
        "/data/adb/magisk",
        "/sbin/.magisk",
        "/system/bin/su",
        "/system/xbin/su",
        "/data/local/su",
        "/data/local/bin/su",
        "/data/local/xbin/su",
        "/sbin/su",
        "/su/bin/su"
    };
    
    for (const char* path : paths) {
        if (checkFileExists(path)) {
            return JNI_TRUE;
        }
    }
    return JNI_FALSE;
}

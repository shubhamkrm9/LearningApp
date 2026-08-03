#include <jni.h>
#include <string>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <netinet/in.h>

extern "C" JNIEXPORT jboolean JNICALL
Java_com_learningapp_security_IntegrityChecks_nativeCheckFrida(JNIEnv *env, jobject /* this */) {
    // 1. TracerPid Check
    FILE* status_file = fopen("/proc/self/status", "r");
    if (status_file) {
        char line[256];
        while (fgets(line, sizeof(line), status_file)) {
            if (strncmp(line, "TracerPid:", 10) == 0) {
                int tracerPid;
                if (sscanf(line, "TracerPid:\t%d", &tracerPid) == 1 && tracerPid != 0) {
                    fclose(status_file);
                    return JNI_TRUE;
                }
                break;
            }
        }
        fclose(status_file);
    }
    
    // 2. Port Scan (27042, 27043)
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock >= 0) {
        struct sockaddr_in addr;
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
        
        // Check 27042
        addr.sin_port = htons(27042);
        if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) != -1) {
            close(sock);
            return JNI_TRUE;
        }
        
        // Check 27043
        addr.sin_port = htons(27043);
        if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) != -1) {
            close(sock);
            return JNI_TRUE;
        }
        
        close(sock);
    }

    return JNI_FALSE;
}

#include "FridaChecks.h"
#include <jni.h>
#include <string>
#include <unistd.h>
#include <stdio.h>
#include <string.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <android/log.h>
#include <dlfcn.h>
#include <link.h>
#include <dirent.h>
#include "Obfuscate.h"

bool checkTracerPid() {
    FILE* status_file = fopen(OBFUSCATE_STR("/proc/self/status").c_str(), "r");
    if (status_file) {
        char line[256];
        std::string tracerStr = OBFUSCATE_STR("TracerPid:");
        std::string tracerFormat = OBFUSCATE_STR("TracerPid:\t%d");
        while (fgets(line, sizeof(line), status_file)) {
            if (strncmp(line, tracerStr.c_str(), 10) == 0) {
                int tracerPid;
                if (sscanf(line, tracerFormat.c_str(), &tracerPid) == 1 && tracerPid != 0) {
                    fclose(status_file);
                    return true;
                }
                break;
            }
        }
        fclose(status_file);
    }
    return false;
}

bool checkFridaPorts() {
    int sock = socket(AF_INET, SOCK_STREAM, 0);
    if (sock >= 0) {
        struct sockaddr_in addr;
        addr.sin_family = AF_INET;
        addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
        
        addr.sin_port = htons(27042);
        if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) != -1) {
            close(sock);
            return true;
        }
        
        addr.sin_port = htons(27043);
        if (connect(sock, (struct sockaddr*)&addr, sizeof(addr)) != -1) {
            close(sock);
            return true;
        }
        
        close(sock);
    }
    return false;
}

bool checkFridaMemoryMaps() {
    FILE* fp = fopen(OBFUSCATE_STR("/proc/self/maps").c_str(), "r");
    if (fp) {
        char line[512];
        std::string agent = OBFUSCATE_STR("frida-agent.so");
        std::string gadget = OBFUSCATE_STR("frida-gadget");
        std::string libfrida = OBFUSCATE_STR("libfrida");
        while (fgets(line, sizeof(line), fp)) {
            if (strstr(line, agent.c_str()) != nullptr || 
                strstr(line, gadget.c_str()) != nullptr ||
                strstr(line, libfrida.c_str()) != nullptr) {
                fclose(fp);
                return true;
            }
        }
        fclose(fp);
    }
    return false;
}

bool checkFridaNamedPipes() {
    if (access(OBFUSCATE_STR("/tmp/frida").c_str(), F_OK) == 0) return true;
    if (access(OBFUSCATE_STR("/re.frida.server").c_str(), F_OK) == 0) return true;
    return false;
}

bool checkFridaThreads() {
    DIR *dir = opendir(OBFUSCATE_STR("/proc/self/task").c_str());
    if (dir != nullptr) {
        struct dirent *entry;
        while ((entry = readdir(dir)) != nullptr) {
            if (entry->d_name[0] == '.') continue;
            
            char path[256];
            snprintf(path, sizeof(path), OBFUSCATE_STR("/proc/self/task/%s/comm").c_str(), entry->d_name);
            FILE *fp = fopen(path, "r");
            if (fp) {
                char name[256];
                std::string gum = OBFUSCATE_STR("gum-js-loop");
                std::string gmain = OBFUSCATE_STR("gmain");
                if (fgets(name, sizeof(name), fp)) {
                    if (strstr(name, gum.c_str()) != nullptr || strstr(name, gmain.c_str()) != nullptr) {
                        fclose(fp);
                        closedir(dir);
                        return true;
                    }
                }
                fclose(fp);
            }
        }
        closedir(dir);
    }
    return false;
}

static int dl_iterate_callback(struct dl_phdr_info *info, size_t size, void *data) {
    if (info->dlpi_name == nullptr) return 0;
    
    std::string frida = OBFUSCATE_STR("frida");
    std::string gum = OBFUSCATE_STR("gum-js-loop");
    if (strstr(info->dlpi_name, frida.c_str()) != nullptr || 
        strstr(info->dlpi_name, gum.c_str()) != nullptr) {
        *(bool*)data = true;
        return 1;
    }
    return 0;
}

bool checkFridaLibraries() {
    bool found = false;
    dl_iterate_phdr(dl_iterate_callback, &found);
    return found;
}



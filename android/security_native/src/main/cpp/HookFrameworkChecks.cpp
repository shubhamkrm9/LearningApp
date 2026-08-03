#include "HookFrameworkChecks.h"
#include <jni.h>
#include <string>
#include <stdio.h>
#include <string.h>
#include <android/log.h>
#include "Obfuscate.h"

bool checkHookFrameworks() {
    FILE* maps_file = fopen(OBFUSCATE_STR("/proc/self/maps").c_str(), "r");
    if (!maps_file) {
        return false;
    }

    char line[512];
    bool detected = false;
    
    std::string liblsposed = OBFUSCATE_STR("liblsposed.so");
    std::string xposed = OBFUSCATE_STR("xposed");
    std::string lsposed = OBFUSCATE_STR("lsposed");
    std::string riru = OBFUSCATE_STR("riru");
    std::string libmemtrack = OBFUSCATE_STR("libmemtrack_real.so");

    while (fgets(line, sizeof(line), maps_file)) {
        if (strstr(line, liblsposed.c_str()) != nullptr ||
            strstr(line, xposed.c_str()) != nullptr ||
            strstr(line, lsposed.c_str()) != nullptr ||
            strstr(line, riru.c_str()) != nullptr ||
            strstr(line, libmemtrack.c_str()) != nullptr) {
            detected = true;
            break;
        }
    }
    
    fclose(maps_file);
    return detected;
}



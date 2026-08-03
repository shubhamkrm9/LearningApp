#include "RootChecks.h"
#include <jni.h>
#include <string>
#include <unistd.h>
#include <sys/stat.h>
#include <sys/system_properties.h>
#include <stdio.h>
#include <string.h>
#include <ctype.h>
#include "Obfuscate.h"

bool checkFileExists(const char* path) {
    struct stat buffer;
    return (stat(path, &buffer) == 0);
}

bool checkRootFiles() {
    const std::string paths[] = {
        OBFUSCATE_STR("/system/bin/su"),
        OBFUSCATE_STR("/system/xbin/su"),
        OBFUSCATE_STR("/sbin/su"),
        OBFUSCATE_STR("/vendor/bin/su"),
        OBFUSCATE_STR("/data/local/su"),
        OBFUSCATE_STR("/data/local/bin/su"),
        OBFUSCATE_STR("/data/local/xbin/su"),
        OBFUSCATE_STR("/su/bin/su"),
        // Busybox additions
        OBFUSCATE_STR("/system/bin/busybox"),
        OBFUSCATE_STR("/system/xbin/busybox"),
        OBFUSCATE_STR("/sbin/busybox")
    };
    for (const auto& path : paths) {
        if (checkFileExists(path.c_str())) {
            return true;
        }
    }
    return false;
}

bool checkMagisk() {
    const std::string paths[] = {
        OBFUSCATE_STR("/sbin/.magisk"),
        OBFUSCATE_STR("/data/adb/modules"),
        OBFUSCATE_STR("/data/adb/magisk"),
        OBFUSCATE_STR("/data/adb/magisk.db"),
        // LSPosed addition
        OBFUSCATE_STR("/data/adb/lspd")
    };
    for (const auto& path : paths) {
        if (checkFileExists(path.c_str())) {
            return true;
        }
    }
    return false;
}

bool checkZygisk() {
    bool found = false;
    FILE* fp = fopen(OBFUSCATE_STR("/proc/self/maps").c_str(), "r");
    if (fp) {
        char line[512];
        std::string zygiskStr = OBFUSCATE_STR("zygisk");
        std::string magiskStr = OBFUSCATE_STR("magisk");
        std::string lspdStr = OBFUSCATE_STR("lspd");
        std::string lsposedStr = OBFUSCATE_STR("lsposed");
        
        while (fgets(line, sizeof(line), fp)) {
            // Lowercase the line for case-insensitive check
            for(int i = 0; line[i]; i++) {
                line[i] = tolower(line[i]);
            }
            if (strstr(line, zygiskStr.c_str()) != nullptr || 
                strstr(line, magiskStr.c_str()) != nullptr ||
                strstr(line, lspdStr.c_str()) != nullptr ||
                strstr(line, lsposedStr.c_str()) != nullptr) {
                found = true;
                break;
            }
        }
        fclose(fp);
    }
    return found;
}

bool checkDangerousProperties() {
    char value[PROP_VALUE_MAX];
    
    if (__system_property_get(OBFUSCATE_STR("ro.debuggable").c_str(), value) > 0) {
        if (strcmp(value, "1") == 0) return true;
    }
    
    if (__system_property_get(OBFUSCATE_STR("ro.secure").c_str(), value) > 0) {
        if (strcmp(value, "0") == 0) return true;
    }

    if (__system_property_get(OBFUSCATE_STR("ro.build.tags").c_str(), value) > 0) {
        std::string testKeys = OBFUSCATE_STR("test-keys");
        if (strstr(value, testKeys.c_str()) != nullptr) return true;
    }
    
    if (__system_property_get(OBFUSCATE_STR("ro.boot.vbmeta.device_state").c_str(), value) > 0) {
        std::string unlocked = OBFUSCATE_STR("unlocked");
        if (strcmp(value, unlocked.c_str()) == 0) return true;
    }
    
    if (__system_property_get(OBFUSCATE_STR("ro.boot.verifiedbootstate").c_str(), value) > 0) {
        if (strcmp(value, "orange") == 0 || strcmp(value, "yellow") == 0) return true;
    }
    
    return false;
}

bool checkSuspiciousMounts() {
    bool suspicious = false;
    FILE* fp = fopen(OBFUSCATE_STR("/proc/mounts").c_str(), "r");
    if (fp) {
        char line[512];
        std::string magiskStr = OBFUSCATE_STR("magisk");
        std::string overlayStr = OBFUSCATE_STR("overlayfs");
        while (fgets(line, sizeof(line), fp)) {
            if (strstr(line, magiskStr.c_str()) != nullptr || strstr(line, overlayStr.c_str()) != nullptr) {
                // If it's overlayfs on system/vendor/data it is suspicious
                suspicious = true;
                break;
            }
        }
        fclose(fp);
    }
    return suspicious;
}

bool checkSuspiciousDirectories() {
    const std::string paths[] = {
        OBFUSCATE_STR("/data/data/com.topjohnwu.magisk"),
        OBFUSCATE_STR("/data/data/eu.chainfire.supersu")
    };
    for (const auto& path : paths) {
        if (access(path.c_str(), F_OK) == 0) {
            return true; // Weak signal, handled via scoring
        }
    }
    return false;
}

bool checkSELinux() {
    FILE* fp = fopen(OBFUSCATE_STR("/sys/fs/selinux/enforce").c_str(), "r");
    if (fp) {
        char status;
        if (fread(&status, 1, 1, fp) == 1) {
            fclose(fp);
            return status == '0'; // 0 means Permissive, which is dangerous
        }
        fclose(fp);
    }
    return false;
}

bool checkEmulator() {
    char value[PROP_VALUE_MAX];
    
    // Check for common emulator hardware properties
    if (__system_property_get(OBFUSCATE_STR("ro.hardware").c_str(), value) > 0) {
        if (strstr(value, OBFUSCATE_STR("goldfish").c_str()) != nullptr ||
            strstr(value, OBFUSCATE_STR("vbox86").c_str()) != nullptr ||
            strstr(value, OBFUSCATE_STR("ranchu").c_str()) != nullptr) {
            return true;
        }
    }
    
    if (__system_property_get(OBFUSCATE_STR("ro.kernel.qemu").c_str(), value) > 0) {
        if (strcmp(value, "1") == 0) return true;
    }

    if (__system_property_get(OBFUSCATE_STR("ro.product.model").c_str(), value) > 0) {
        if (strstr(value, OBFUSCATE_STR("Emulator").c_str()) != nullptr ||
            strstr(value, OBFUSCATE_STR("Android SDK built for x86").c_str()) != nullptr) {
            return true;
        }
    }

    return false;
}

bool checkCloneApps() {
    // 1. UID Analysis
    // Normal Android App UIDs are typically 10000 + x. Secondary users are: userId * 100000 + appId
    uid_t uid = getuid();
    int userId = uid / 100000;
    // Work profiles are typically 10-13. 999 is a known heuristic for hidden/clone spaces on some OEMs
    if (userId == 999) return true;

    // 2. Installation Path Validation & Known Clone Packages
    char cwd[1024];
    if (getcwd(cwd, sizeof(cwd)) != nullptr) {
        std::string currentPath(cwd);
        // Lowercase for checking
        for(auto& c : currentPath) {
            c = tolower(c);
        }
        
        const std::string suspiciousKeywords[] = {
            OBFUSCATE_STR("virtual"),
            OBFUSCATE_STR("parallel"),
            OBFUSCATE_STR("dualspace"),
            OBFUSCATE_STR("clone"),
            OBFUSCATE_STR("com.lbe.parallel"),
            OBFUSCATE_STR("com.parallel.space"),
            OBFUSCATE_STR("com.excelliance.multiaccounts")
        };
        
        for (const auto& keyword : suspiciousKeywords) {
            if (currentPath.find(keyword) != std::string::npos) {
                return true;
            }
        }
    }
    return false;
}

#include "NativeIntegrity.h"
#include "ExpectedHashes.h"
#include <stdio.h>
#include <string.h>
#include <stdint.h>
#include <stdlib.h>
#include <string>
#include "sha256.h"
#include "Obfuscate.h"

bool findLibraryPath(const char* libraryName, std::string& outPath) {
    FILE* fp = fopen(OBFUSCATE_STR("/proc/self/maps").c_str(), "r");
    if (!fp) return false;

    char line[512];
    bool found = false;
    while (fgets(line, sizeof(line), fp)) {
        if (strstr(line, libraryName) != nullptr) {
            // The path is the last token on the line
            char* path = strchr(line, '/');
            if (path) {
                // Remove trailing newline
                char* newline = strchr(path, '\n');
                if (newline) *newline = '\0';
                outPath = path;
                found = true;
                break;
            }
        }
    }
    fclose(fp);
    return found;
}

bool hashFile(const char* filePath, std::string& outHash) {
    FILE* fp = fopen(filePath, "rb");
    if (!fp) return false;

    SHA256_CTX sha256;
    sha256_init(&sha256);

    uint8_t buffer[8192];
    size_t bytesRead;
    while ((bytesRead = fread(buffer, 1, sizeof(buffer), fp)) > 0) {
        sha256_update(&sha256, buffer, bytesRead);
    }
    
    fclose(fp);

    uint8_t hashResult[32];
    sha256_final(&sha256, hashResult);

    char hex[65];
    for (int i = 0; i < 32; i++) {
        sprintf(&hex[i * 2], "%02x", hashResult[i]);
    }
    hex[64] = '\0';
    outHash = std::string(hex);
    
    return true;
}

bool verifyNativeLibraryIntegrity() {
    std::string libPath;
    
    // Find where the OS extracted our library on disk
    std::string libName = OBFUSCATE_STR("libsecurity_checks.so");
    if (!findLibraryPath(libName.c_str(), libPath)) {
        // If we can't find ourselves in memory maps, something is terribly wrong
        return false;
    }

    std::string calculatedHash;
    if (!hashFile(libPath.c_str(), calculatedHash)) {
        return false; // Failed to read our own file
    }

    if (calculatedHash != EXPECTED_LIB_HASH) {
        // Tampered!
        return false;
    }

    return true;
}

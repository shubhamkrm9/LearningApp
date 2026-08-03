cmake_minimum_required(VERSION 3.22.1)

project("security_checks")

add_library(
        security_checks
        SHARED
        IntegrityChecks.cpp
        RootChecks.cpp
        FridaChecks.cpp
        HookFrameworkChecks.cpp
        SecurityEngine.cpp
        DexIntegrity.cpp
        NativeIntegrity.cpp
        sha256.cpp)

find_library(
        log-lib
        log)

find_library(
        z-lib
        z)

target_link_libraries(
        security_checks
        ${log-lib}
        ${z-lib}
        c++_shared)

# Aggressive Native Symbol Stripping for Release Builds
# This completely removes function names and symbols to thwart reverse engineering
set_target_properties(security_checks PROPERTIES LINK_FLAGS "-Wl,-s")

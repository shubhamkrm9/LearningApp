#pragma once

// These hashes will be automatically injected by the CI/CD pipeline script.
// During development, they are set to empty strings so that integrity checks
// are effectively bypassed (any hash will differ from "", causing
// verifyDexIntegrity/verifyNativeLibraryIntegrity to return false, but the
// scoring system treats this as a weighted signal rather than a hard block).
//
// For production releases, your CI/CD pipeline should replace these with
// the actual SHA-256 hashes computed after the final APK is built:
//   EXPECTED_DEX_HASH  = sha256 of all classes*.dex files concatenated
//   EXPECTED_LIB_HASH  = sha256 of libsecurity_checks.so on disk

constexpr char EXPECTED_DEX_HASH[] = "";
constexpr char EXPECTED_LIB_HASH[] = "";

#pragma once
#include <string>
#include <utility>

// A compile-time string obfuscator that does not suffer from dangling pointers
// and ensures the original string literal is removed from the compiled binary.

template <size_t N>
class Obfuscator {
public:
    char data[N];

    template <size_t... I>
    constexpr Obfuscator(const char (&str)[N], std::index_sequence<I...>)
        : data{ static_cast<char>(str[I] ^ 0x5A)... } {}

    std::string decrypt() const {
        std::string decrypted(N - 1, '\0');
        for (size_t i = 0; i < N - 1; ++i) {
            decrypted[i] = data[i] ^ 0x5A;
        }
        return decrypted;
    }
};

// Use a lambda and constexpr to force compile-time evaluation.
// This prevents the raw string literal from being embedded in the .rodata section.
#define OBFUSCATE_STR(str) \
    ([]() -> std::string { \
        constexpr auto obf = Obfuscator<sizeof(str)>(str, std::make_index_sequence<sizeof(str)>{}); \
        return obf.decrypt(); \
    }())

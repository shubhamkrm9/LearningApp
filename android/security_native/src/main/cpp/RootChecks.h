#pragma once

bool checkRootFiles();
bool checkMagisk();
bool checkZygisk();
bool checkDangerousProperties();
bool checkSuspiciousMounts();
bool checkTracerPid();
bool checkSuspiciousDirectories();
bool checkSELinux();
bool checkEmulator();
bool checkCloneApps();

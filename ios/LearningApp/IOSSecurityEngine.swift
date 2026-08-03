import Foundation
import DeviceCheck
import MachO

@objc(IOSSecurityEngine)
class IOSSecurityEngine: NSObject {
    
    // MARK: - Core Risk Evaluator
    
    override init() {
        super.init()
        #if !DEBUG
        disableDebugging()
        #endif
    }
    
    private func disableDebugging() {
        typealias ptraceType = @convention(c) (CInt, pid_t, CInt, CInt) -> CInt
        let handle = dlopen(nil, RTLD_LAZY)
        guard handle != nil else { return }
        
        if let ptr = dlsym(handle, "ptrace") {
            let ptrace = unsafeBitCast(ptr, to: ptraceType.self)
            let PT_DENY_ATTACH: CInt = 31
            _ = ptrace(PT_DENY_ATTACH, 0, 0, 0)
        }
        dlclose(handle)
    }
    
    @objc
    func getSecurityRiskLevel(_ resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        var riskLevel = "SAFE"
        var findings: [String] = []
        
        if isJailbroken() {
            riskLevel = "TAMPERED"
            findings.append("JAILBREAK_DETECTED")
        }
        
        if isFridaOrHookingDetected() || isDebuggerAttached() {
            riskLevel = "COMPROMISED"
            findings.append("HOOKING_DETECTED")
        }
        
        resolve([
            "riskLevel": riskLevel,
            "findings": findings
        ])
    }
    
    // MARK: - Jailbreak Detection
    
    private func isJailbroken() -> Bool {
        #if targetEnvironment(simulator)
        return false // Don't check on simulator
        #endif
        
        // 1. Check for suspicious files
        let suspiciousPaths = [
            "/Applications/Cydia.app",
            "/Applications/Sileo.app",
            "/Applications/Zebra.app",
            "/usr/sbin/sshd",
            "/bin/bash",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/Library/MobileSubstrate/DynamicLibraries",
            "/var/bin/cydia"
        ]
        
        for path in suspiciousPaths {
            if FileManager.default.fileExists(atPath: path) {
                return true
            }
        }
        
        // 2. Check Sandbox Violation (Can we write outside the sandbox?)
        let testPath = "/private/jailbreak_test.txt"
        do {
            try "test".write(toFile: testPath, atomically: true, encoding: .utf8)
            try FileManager.default.removeItem(atPath: testPath)
            return true // Successfully wrote outside sandbox -> Jailbroken
        } catch {
            // Error writing, meaning sandbox is intact.
        }
        
        // 3. Check Protocol Handlers
        if let url = URL(string: "cydia://package/com.example.package") {
            if UIApplication.shared.canOpenURL(url) {
                return true
            }
        }
        
        return false
    }
    
    // MARK: - Frida & Hooking Detection
    
    private func isFridaOrHookingDetected() -> Bool {
        #if targetEnvironment(simulator)
        return false // Don't check on simulator
        #endif
        
        // 1. Dynamic Library Enumeration (_dyld_get_image_name)
        let count = _dyld_image_count()
        let suspiciousLibs = ["FridaGadget", "MobileSubstrate", "CydiaSubstrate", "Substitute", "libhooker"]
        
        for i in 0..<count {
            if let imageName = _dyld_get_image_name(i) {
                let name = String(cString: imageName)
                for lib in suspiciousLibs {
                    if name.contains(lib) {
                        return true
                    }
                }
            }
        }
        
        // 2. Fork Test (Standard sandbox denies fork())
        // Note: fork() is generally discouraged in Swift, but we use the C library bridging
        // We will execute a safe test. If pid is > 0, we were able to fork!
        let pid = fork()
        if pid > 0 {
            // Successfully forked. We are compromised.
            return true
        } else if pid == 0 {
            // We are the child process. We must exit immediately.
            exit(0)
        }
        
        return false
    }
    
    // MARK: - Debugger Detection (sysctl)
    
    private func isDebuggerAttached() -> Bool {
        var info = kinfo_proc()
        var mib : [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        var size = MemoryLayout<kinfo_proc>.stride
        let junk = sysctl(&mib, UInt32(mib.count), &info, &size, nil, 0)
        
        if junk != 0 {
            // Error occurred checking sysctl
            return false
        }
        
        // Check if the P_TRACED flag is set
        return (info.kp_proc.p_flag & P_TRACED) != 0
    }
    
    // MARK: - App Attest (DeviceCheck)
    
    @objc
    func generateAttestationToken(_ challengeStr: String, resolve: @escaping RCTPromiseResolveBlock, reject: @escaping RCTPromiseRejectBlock) {
        
        let service = DCAppAttestService.shared
        guard service.isSupported else {
            reject("UNSUPPORTED", "App Attest is not supported on this device/simulator.", nil)
            return
        }
        
        guard let challengeData = challengeStr.data(using: .utf8) else {
            reject("INVALID_CHALLENGE", "Invalid challenge string provided.", nil)
            return
        }
        
        // 1. Generate KeyPair (Usually done once and stored locally)
        service.generateKey { keyId, error in
            if let error = error {
                reject("KEY_GENERATION_FAILED", error.localizedDescription, error)
                return
            }
            
            guard let keyId = keyId else {
                reject("KEY_GENERATION_FAILED", "Key ID was nil", nil)
                return
            }
            
            // 2. Generate the actual attestation using the server's challenge
            // The challenge should ideally be a SHA256 hash of the server challenge
            service.attestKey(keyId, clientDataHash: challengeData) { attestation, error in
                if let error = error {
                    reject("ATTESTATION_FAILED", error.localizedDescription, error)
                    return
                }
                
                guard let attestation = attestation else {
                    reject("ATTESTATION_FAILED", "Attestation data was nil", nil)
                    return
                }
                
                // Return base64 encoded attestation to React Native
                // so it can be sent to our backend.
                resolve(attestation.base64EncodedString())
            }
        }
    }
}

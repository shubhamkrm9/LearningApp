#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(IOSSecurityEngine, NSObject)

RCT_EXTERN_METHOD(getSecurityRiskLevel:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(generateAttestationToken:(NSString *)challengeStr
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Enforce this module to initialize on the main thread if needed
+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

@end

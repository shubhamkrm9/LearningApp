#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(IOSContentProtection, RCTEventEmitter)

// Required to silence warnings since we override supportedEvents
RCT_EXTERN_METHOD(supportedEvents)

@end

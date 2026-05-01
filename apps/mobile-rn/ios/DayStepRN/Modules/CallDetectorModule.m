#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CallDetectorModule, NSObject)

RCT_EXTERN_METHOD(
  startListening:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  stopListening:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getPendingCallEnded:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

@end

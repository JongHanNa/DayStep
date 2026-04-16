#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DayStepShareModule, NSObject)

RCT_EXTERN_METHOD(
  getPendingSharedText:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  getSiriPendingText:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

@end

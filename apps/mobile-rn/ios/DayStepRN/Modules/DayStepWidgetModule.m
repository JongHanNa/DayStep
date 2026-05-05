#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DayStepWidgetModule, NSObject)

RCT_EXTERN_METHOD(
  updateWidgetData:(NSString *)jsonString
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  reloadWidgetTimelines:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

@end

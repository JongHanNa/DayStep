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

RCT_EXTERN_METHOD(
  setAuthForExtension:(NSString *)userId
  accessToken:(NSString *)accessToken
  refreshToken:(NSString *)refreshToken
  expiresAt:(nonnull NSNumber *)expiresAt
  supabaseUrl:(NSString *)supabaseUrl
  supabaseKey:(NSString *)supabaseKey
  withResolver:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

RCT_EXTERN_METHOD(
  clearAuthForExtension:(RCTPromiseResolveBlock)resolve
  withRejecter:(RCTPromiseRejectBlock)reject
)

@end

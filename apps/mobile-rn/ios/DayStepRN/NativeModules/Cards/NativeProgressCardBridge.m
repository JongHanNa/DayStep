#import <React/RCTViewManager.h>

// NativeProgressCard — iOS 26+ 진행률 카드 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeProgressCardManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(completed, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(total, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(progress, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(progressText, NSString)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

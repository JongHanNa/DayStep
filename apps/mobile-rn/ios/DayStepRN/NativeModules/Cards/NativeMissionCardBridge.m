#import <React/RCTViewManager.h>

// NativeMissionCard — iOS 26+ 오늘의 미션 카드 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeMissionCardManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(missionData, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(onExecutePress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPlannerPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

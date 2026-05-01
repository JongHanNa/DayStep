#import <React/RCTViewManager.h>

// NativeCleaningGarden — 청소 정원 4-뷰 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeCleaningGardenManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(viewMode, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectedDate, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(gardenData, NSString)
RCT_EXPORT_VIEW_PROPERTY(onDateSelect, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onViewModeChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMonthChange, RCTDirectEventBlock)

@end

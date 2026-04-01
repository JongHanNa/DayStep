#import <React/RCTViewManager.h>

// NativeTimelineAccordion — iOS 26+ 타임라인 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeTimelineAccordionManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(timelineData, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(expandedMotivationIds, NSArray)
RCT_EXPORT_VIEW_PROPERTY(onMotivationToggle, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMotivationEdit, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMotivationLongPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

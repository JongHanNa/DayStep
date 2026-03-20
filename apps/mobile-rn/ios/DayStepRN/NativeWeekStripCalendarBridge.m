#import <React/RCTViewManager.h>

// NativeWeekStripCalendar — 주간 스트립 캘린더 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeWeekStripCalendarManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(selectedDate, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(onDateSelect, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onExpandChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(gradientColors, NSArray)
RCT_EXPORT_VIEW_PROPERTY(gradientStartX, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(gradientStartY, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(gradientEndX, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(gradientEndY, NSNumber)

@end

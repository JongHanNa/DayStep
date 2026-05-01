#import <React/RCTViewManager.h>

// NativeMonthCalendar — 월간 캘린더 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeMonthCalendarManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(selectedDate, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(monthData, NSString)
RCT_EXPORT_VIEW_PROPERTY(eventData, NSString)
RCT_EXPORT_VIEW_PROPERTY(onDateSelect, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMonthChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onNavigateToPlanner, RCTDirectEventBlock)

@end

#import <React/RCTViewManager.h>

// NativeMultiDayTimeGrid — 3일/주 뷰 시간 그리드 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeMultiDayTimeGridManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(dayCount, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(centerDate, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(todoData, NSString)
RCT_EXPORT_VIEW_PROPERTY(eventData, NSString)
RCT_EXPORT_VIEW_PROPERTY(onDateSelect, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTodoPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDateRangeChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

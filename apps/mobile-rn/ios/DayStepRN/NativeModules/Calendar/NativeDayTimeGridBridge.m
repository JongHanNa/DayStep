#import <React/RCTViewManager.h>

// NativeDayTimeGrid — 일 뷰 시간 그리드 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeDayTimeGridManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(selectedDate, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(todoData, NSString)
RCT_EXPORT_VIEW_PROPERTY(eventData, NSString)
RCT_EXPORT_VIEW_PROPERTY(onDateSelect, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTodoPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onTodoEdit, RCTDirectEventBlock)

@end

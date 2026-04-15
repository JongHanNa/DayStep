#import <React/RCTViewManager.h>

// NativeTodoPicker — 할일 연결 피커 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeTodoPickerManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(todosData, NSString)
RCT_EXPORT_VIEW_PROPERTY(linkedTodoIds, NSArray)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(onTodoToggle, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onClose, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

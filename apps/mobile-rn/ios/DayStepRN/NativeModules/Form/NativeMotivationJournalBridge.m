#import <React/RCTViewManager.h>

// NativeMotivationJournal — 원동력 저널 시트 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeMotivationJournalManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(mode, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(prompt, NSString)
RCT_EXPORT_VIEW_PROPERTY(noteData, NSString)
RCT_EXPORT_VIEW_PROPERTY(linkedTodosData, NSString)

RCT_EXPORT_VIEW_PROPERTY(onSave, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onPinToggle, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDelete, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onUnlinkTodo, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onLinkTodoRequest, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onClose, RCTDirectEventBlock)

@end

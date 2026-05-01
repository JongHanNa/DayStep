#import <React/RCTViewManager.h>

// NativeProjectForm — 프로젝트 추가/수정 시트 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeProjectFormManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(mode, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(projectData, NSString)
RCT_EXPORT_VIEW_PROPERTY(linkedTodosData, NSString)
RCT_EXPORT_VIEW_PROPERTY(paletteColors, NSString)
RCT_EXPORT_VIEW_PROPERTY(paletteIcons, NSString)
RCT_EXPORT_VIEW_PROPERTY(statusMenuItemsData, NSString)
RCT_EXPORT_VIEW_PROPERTY(statusLabel, NSString)
RCT_EXPORT_VIEW_PROPERTY(statusBadgeColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(statusBadgeBg, NSString)
RCT_EXPORT_VIEW_PROPERTY(loadingTodos, BOOL)

RCT_EXPORT_VIEW_PROPERTY(onSave, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onStatusChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onUnlinkTodo, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onClose, RCTDirectEventBlock)

@end

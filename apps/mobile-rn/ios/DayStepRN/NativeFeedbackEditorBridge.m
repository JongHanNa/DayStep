#import <React/RCTViewManager.h>

// NativeFeedbackEditor — 새 제보(버그/기능) 작성 시트 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeFeedbackEditorManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(editorData, NSString)
RCT_EXPORT_VIEW_PROPERTY(submitting, BOOL)

RCT_EXPORT_VIEW_PROPERTY(onSubmit, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onClose, RCTDirectEventBlock)

@end

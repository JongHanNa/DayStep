#import <React/RCTViewManager.h>

// NativeSleepActionButton — 기상하기 네이티브 글라스 버튼 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeSleepActionButtonManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(buttonColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(titleColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(onButtonPress, RCTDirectEventBlock)

@end

#import <React/RCTViewManager.h>

// NativeButton — 네이티브 글라스 버튼 ObjC Bridge
// ViewManager 이름: NativeButtonManager → JS requireNativeComponent('NativeButton')

@interface RCT_EXTERN_MODULE(NativeButtonManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(systemIconName, NSString)
RCT_EXPORT_VIEW_PROPERTY(iconColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(size, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(iconSize, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onButtonPress, RCTDirectEventBlock)

@end

#import <React/RCTViewManager.h>

// LiquidGlassButton — 네이티브 글라스 버튼 ObjC Bridge
// ViewManager 이름: LiquidGlassButtonManager → JS requireNativeComponent('LiquidGlassButton')

@interface RCT_EXTERN_MODULE(LiquidGlassButtonManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(systemIconName, NSString)
RCT_EXPORT_VIEW_PROPERTY(iconColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(size, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onButtonPress, RCTDirectEventBlock)

@end

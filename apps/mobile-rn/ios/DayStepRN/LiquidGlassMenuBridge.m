#import <React/RCTViewManager.h>

// LiquidGlassMenu — 리퀴드 글라스 모핑 메뉴 ObjC Bridge
// ViewManager 이름: LiquidGlassMenuManager → JS requireNativeComponent('LiquidGlassMenu')

@interface RCT_EXTERN_MODULE(LiquidGlassMenuManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(systemIconName, NSString)
RCT_EXPORT_VIEW_PROPERTY(iconColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(size, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(menuItems, NSArray)
RCT_EXPORT_VIEW_PROPERTY(onMenuItemSelect, RCTDirectEventBlock)

@end

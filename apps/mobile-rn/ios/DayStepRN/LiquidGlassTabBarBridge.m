#import <React/RCTViewManager.h>

// LiquidGlassTabBar — Phase 1 ObjC Bridge
// ViewManager 이름: LiquidGlassTabBarManager → JS requireNativeComponent('LiquidGlassTabBar')

@interface RCT_EXTERN_MODULE(LiquidGlassTabBarManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(tabs, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(timerProgress, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(onTabPress, RCTDirectEventBlock)

@end

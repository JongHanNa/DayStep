#import <React/RCTViewManager.h>

// NativeTabBar — Phase 2 ObjC Bridge
// ViewManager 이름: NativeTabBarManager → JS requireNativeComponent('NativeTabBar')

@interface RCT_EXTERN_MODULE(NativeTabBarManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(tabs, NSArray)
RCT_EXPORT_VIEW_PROPERTY(selectedIndex, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(timerProgress, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(isExpanded, BOOL)
RCT_EXPORT_VIEW_PROPERTY(menuItems, NSArray)
RCT_EXPORT_VIEW_PROPERTY(showLabels, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onTabPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onMenuItemPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onToggleLabels, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

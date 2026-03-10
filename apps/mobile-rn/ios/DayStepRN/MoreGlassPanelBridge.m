#import <React/RCTViewManager.h>

// MoreGlassPanel — iOS 26+ Glass Panel Overlay Bridge
// ViewManager: MoreGlassPanelManager → JS requireNativeComponent('MoreGlassPanel')

@interface RCT_EXTERN_MODULE(MoreGlassPanelManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(menuItems, NSArray)
RCT_EXPORT_VIEW_PROPERTY(showLabels, BOOL)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(onMenuItemPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onToggleLabels, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDismiss, RCTDirectEventBlock)

@end

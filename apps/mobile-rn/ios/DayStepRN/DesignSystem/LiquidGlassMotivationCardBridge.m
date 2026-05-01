#import <React/RCTViewManager.h>

// LiquidGlassMotivationCard — Phase 2 ObjC Bridge
// ViewManager 이름: LiquidGlassMotivationCardManager → JS requireNativeComponent('LiquidGlassMotivationCard')

@interface RCT_EXTERN_MODULE(LiquidGlassMotivationCardManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(noteTitle, NSString)
RCT_EXPORT_VIEW_PROPERTY(noteContent, NSString)
RCT_EXPORT_VIEW_PROPERTY(hasNote, BOOL)
RCT_EXPORT_VIEW_PROPERTY(isExpanded, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onExpand, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCollapse, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

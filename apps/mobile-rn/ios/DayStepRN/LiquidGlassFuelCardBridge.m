#import <React/RCTViewManager.h>

// LiquidGlassFuelCard — Phase 2 ObjC Bridge
// ViewManager 이름: LiquidGlassFuelCardManager → JS requireNativeComponent('LiquidGlassFuelCard')

@interface RCT_EXTERN_MODULE(LiquidGlassFuelCardManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(noteTitle, NSString)
RCT_EXPORT_VIEW_PROPERTY(noteContent, NSString)
RCT_EXPORT_VIEW_PROPERTY(hasNote, BOOL)
RCT_EXPORT_VIEW_PROPERTY(isExpanded, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onExpand, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCollapse, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

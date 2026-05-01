#import <React/RCTViewManager.h>

// NativeCleanupAccordion — iOS 26+ DisclosureGroup 아코디언 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeCleanupAccordionManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(accordionData, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(expandedGroups, NSArray)
RCT_EXPORT_VIEW_PROPERTY(onCategoryPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onGroupToggle, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

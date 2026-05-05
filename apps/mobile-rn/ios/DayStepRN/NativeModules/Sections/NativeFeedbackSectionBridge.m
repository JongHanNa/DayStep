#import <React/RCTViewManager.h>

// NativeFeedbackSection — iOS DisclosureGroup 기반 피드백 섹션 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeFeedbackSectionManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(sectionKey, NSString)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(statusColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(myCount, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(privateCount, NSNumber)
RCT_EXPORT_VIEW_PROPERTY(items, NSString)
RCT_EXPORT_VIEW_PROPERTY(collapsible, BOOL)
RCT_EXPORT_VIEW_PROPERTY(initiallyExpanded, BOOL)
RCT_EXPORT_VIEW_PROPERTY(onItemPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onExpandedChange, RCTDirectEventBlock)

@end

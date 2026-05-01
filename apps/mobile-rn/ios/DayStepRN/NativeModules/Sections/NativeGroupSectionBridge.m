#import <React/RCTViewManager.h>

// NativeGroupSection — iOS 26+ 2열 그리드 섹션 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeGroupSectionManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(sectionData, NSString)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(dotColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(onItemPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

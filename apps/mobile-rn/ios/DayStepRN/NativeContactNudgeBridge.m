#import <React/RCTViewManager.h>

// NativeContactNudge — iOS 26+ 연락 추천 리스트 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeContactNudgeManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(contactsData, NSString)
RCT_EXPORT_VIEW_PROPERTY(onContactPress, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)

@end

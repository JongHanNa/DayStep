#import <React/RCTViewManager.h>

// NativeAddPerson — 사람 추가/편집 시트 ObjC Bridge

@interface RCT_EXTERN_MODULE(NativeAddPersonManager, RCTViewManager)

RCT_EXPORT_VIEW_PROPERTY(mode, NSString)
RCT_EXPORT_VIEW_PROPERTY(primaryColor, NSString)
RCT_EXPORT_VIEW_PROPERTY(personData, NSString)
RCT_EXPORT_VIEW_PROPERTY(relationships, NSString)
RCT_EXPORT_VIEW_PROPERTY(roles, NSString)
RCT_EXPORT_VIEW_PROPERTY(departments, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectedRelationshipIds, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectedRoleIds, NSString)
RCT_EXPORT_VIEW_PROPERTY(selectedDepartmentIds, NSString)
RCT_EXPORT_VIEW_PROPERTY(defaultColorByKind, NSString)
RCT_EXPORT_VIEW_PROPERTY(paletteColors, NSString)

RCT_EXPORT_VIEW_PROPERTY(onSave, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onDelete, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onClose, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCategoryAdd, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCategoryRename, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCategoryRecolor, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCategoryDelete, RCTDirectEventBlock)

@end

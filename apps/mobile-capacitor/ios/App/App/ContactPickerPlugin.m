#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// ContactPickerPlugin.swift에서 정의한 메소드들을 Capacitor에 등록
CAP_PLUGIN(ContactPickerPlugin, "ContactPickerPlugin",
    CAP_PLUGIN_METHOD(echo, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(requestContactsPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(checkContactsPermission, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getAllContacts, CAPPluginReturnPromise);
    CAP_PLUGIN_METHOD(getContact, CAPPluginReturnPromise);
)
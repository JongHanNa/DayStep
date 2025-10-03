#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Define the plugin using the CAP_PLUGIN Macro, and
// each method the plugin supports using the CAP_PLUGIN_METHOD macro.
CAP_PLUGIN(ContactGroupsPlugin, "ContactGroups",
           CAP_PLUGIN_METHOD(getGroups, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getGroupById, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getContactsByGroup, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(getAllContacts, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(isSupported, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(checkPermission, CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(requestPermission, CAPPluginReturnPromise);
)
import Foundation
import Capacitor
import Contacts

/**
 * 연락처 선택 및 관리를 위한 네이티브 플러그인
 */
@objc(ContactPickerPlugin)
public class ContactPickerPlugin: CAPPlugin {
    
    @objc func echo(_ call: CAPPluginCall) {
        let value = call.getString("value") ?? ""
        call.resolve([
            "value": value
        ])
    }
    
    @objc func requestContactsPermission(_ call: CAPPluginCall) {
        let store = CNContactStore()
        
        store.requestAccess(for: .contacts) { (granted, error) in
            DispatchQueue.main.async {
                if granted {
                    call.resolve([
                        "granted": true,
                        "message": "Permission granted"
                    ])
                } else {
                    call.resolve([
                        "granted": false,
                        "message": error?.localizedDescription ?? "Permission denied"
                    ])
                }
            }
        }
    }
    
    @objc func checkContactsPermission(_ call: CAPPluginCall) {
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
        
        switch authorizationStatus {
        case .authorized:
            call.resolve([
                "granted": true,
                "status": "authorized"
            ])
        case .denied:
            call.resolve([
                "granted": false,
                "status": "denied",
                "message": "Contact access denied. Please enable in Settings."
            ])
        case .notDetermined:
            call.resolve([
                "granted": false,
                "status": "not_determined",
                "message": "Contact access permission required."
            ])
        case .restricted:
            call.resolve([
                "granted": false,
                "status": "restricted",
                "message": "Contact access is restricted."
            ])
        @unknown default:
            call.resolve([
                "granted": false,
                "status": "unknown"
            ])
        }
    }
    
    @objc func getAllContacts(_ call: CAPPluginCall) {
        let store = CNContactStore()
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
        
        guard authorizationStatus == .authorized else {
            call.reject("Contact permission not granted")
            return
        }
        
        let keys = [
            CNContactGivenNameKey,
            CNContactFamilyNameKey,
            CNContactNicknameKey,
            CNContactOrganizationNameKey,
            CNContactJobTitleKey,
            CNContactDepartmentNameKey,
            CNContactNoteKey
        ] as [CNKeyDescriptor]
        
        let request = CNContactFetchRequest(keysToFetch: keys)
        request.sortOrder = .givenName
        
        var contacts: [[String: Any]] = []
        
        do {
            try store.enumerateContacts(with: request) { (contact, stopPointer) in
                var contactDict: [String: Any] = [
                    "contactId": contact.identifier,
                    "givenName": contact.givenName,
                    "familyName": contact.familyName,
                    "nickname": contact.nickname,
                    "organizationName": contact.organizationName,
                    "jobTitle": contact.jobTitle,
                    "departmentName": contact.departmentName,
                    "note": contact.note
                ]
                
                // 이름 조합 (한국어 순서: 성 + 이름)
                let fullName = "\(contact.familyName)\(contact.givenName)".trimmingCharacters(in: .whitespaces)
                if !fullName.isEmpty {
                    contactDict["name"] = fullName
                    contactDict["displayName"] = fullName
                } else if !contact.nickname.isEmpty {
                    contactDict["name"] = contact.nickname
                    contactDict["displayName"] = contact.nickname
                } else if !contact.organizationName.isEmpty {
                    contactDict["name"] = contact.organizationName
                    contactDict["displayName"] = contact.organizationName
                } else {
                    contactDict["name"] = "이름 없음"
                    contactDict["displayName"] = "이름 없음"
                }
                
                // 조직 정보
                if !contact.organizationName.isEmpty || !contact.jobTitle.isEmpty {
                    var organization: [String: String] = [:]
                    if !contact.organizationName.isEmpty {
                        organization["company"] = contact.organizationName
                    }
                    if !contact.jobTitle.isEmpty {
                        organization["jobTitle"] = contact.jobTitle
                    }
                    contactDict["organization"] = organization
                }
                
                contacts.append(contactDict)
            }
            
            call.resolve([
                "contacts": contacts
            ])
            
        } catch {
            call.reject("Failed to fetch contacts: \(error.localizedDescription)")
        }
    }
    
    @objc func getContact(_ call: CAPPluginCall) {
        guard let contactId = call.getString("contactId") else {
            call.reject("Contact ID is required")
            return
        }
        
        let store = CNContactStore()
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
        
        guard authorizationStatus == .authorized else {
            call.reject("Contact permission not granted")
            return
        }
        
        let keys = [
            CNContactGivenNameKey,
            CNContactFamilyNameKey,
            CNContactNicknameKey,
            CNContactOrganizationNameKey,
            CNContactJobTitleKey,
            CNContactDepartmentNameKey,
            CNContactNoteKey
        ] as [CNKeyDescriptor]
        
        do {
            let contact = try store.unifiedContact(withIdentifier: contactId, keysToFetch: keys)
            
            var contactDict: [String: Any] = [
                "contactId": contact.identifier,
                "givenName": contact.givenName,
                "familyName": contact.familyName,
                "nickname": contact.nickname,
                "organizationName": contact.organizationName,
                "jobTitle": contact.jobTitle,
                "departmentName": contact.departmentName,
                "note": contact.note
            ]
            
            // 이름 조합 (한국어 순서: 성 + 이름)
            let fullName = "\(contact.familyName)\(contact.givenName)".trimmingCharacters(in: .whitespaces)
            if !fullName.isEmpty {
                contactDict["name"] = fullName
                contactDict["displayName"] = fullName
            } else if !contact.nickname.isEmpty {
                contactDict["name"] = contact.nickname
                contactDict["displayName"] = contact.nickname
            } else if !contact.organizationName.isEmpty {
                contactDict["name"] = contact.organizationName
                contactDict["displayName"] = contact.organizationName
            } else {
                contactDict["name"] = "이름 없음"
                contactDict["displayName"] = "이름 없음"
            }
            
            // 조직 정보
            if !contact.organizationName.isEmpty || !contact.jobTitle.isEmpty {
                var organization: [String: String] = [:]
                if !contact.organizationName.isEmpty {
                    organization["company"] = contact.organizationName
                }
                if !contact.jobTitle.isEmpty {
                    organization["jobTitle"] = contact.jobTitle
                }
                contactDict["organization"] = organization
            }
            
            call.resolve([
                "contact": contactDict
            ])
            
        } catch {
            call.reject("Failed to get contact: \(error.localizedDescription)")
        }
    }
}
import Foundation
import Capacitor
import Contacts

@objc(ContactGroupsPlugin)
public class ContactGroupsPlugin: CAPPlugin {
    private let contactStore = CNContactStore()

    @objc func getGroups(_ call: CAPPluginCall) {
        // 권한 확인
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
        guard authorizationStatus == .authorized else {
            call.reject("연락처 권한이 필요합니다")
            return
        }

        do {
            // 모든 그룹 가져오기
            let groups = try contactStore.groups(matching: nil)

            var groupsArray: [[String: Any]] = []

            for group in groups {
                let groupInfo: [String: Any] = [
                    "id": group.identifier,
                    "name": group.name,
                    "source": detectGroupSource(groupName: group.name),
                    "isDefault": isDefaultGroup(groupName: group.name)
                ]
                groupsArray.append(groupInfo)
            }

            call.resolve([
                "groups": groupsArray
            ])

        } catch {
            call.reject("그룹 정보를 가져오는데 실패했습니다: \(error.localizedDescription)")
        }
    }

    @objc func getGroupById(_ call: CAPPluginCall) {
        guard let groupId = call.getString("id") else {
            call.reject("그룹 ID가 필요합니다")
            return
        }

        // 권한 확인
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
        guard authorizationStatus == .authorized else {
            call.reject("연락처 권한이 필요합니다")
            return
        }

        do {
            let predicate = CNGroup.predicateForGroups(withIdentifiers: [groupId])
            let groups = try contactStore.groups(matching: predicate)

            if let group = groups.first {
                let groupInfo: [String: Any] = [
                    "id": group.identifier,
                    "name": group.name,
                    "source": detectGroupSource(groupName: group.name),
                    "isDefault": isDefaultGroup(groupName: group.name)
                ]

                call.resolve([
                    "group": groupInfo
                ])
            } else {
                call.resolve([
                    "group": NSNull()
                ])
            }

        } catch {
            call.reject("그룹 정보를 가져오는데 실패했습니다: \(error.localizedDescription)")
        }
    }

    @objc func isSupported(_ call: CAPPluginCall) {
        call.resolve([
            "isSupported": true
        ])
    }

    @objc func checkPermission(_ call: CAPPluginCall) {
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)

        switch authorizationStatus {
        case .authorized:
            call.resolve([
                "granted": true,
                "message": "권한이 허용되었습니다"
            ])
        case .denied, .restricted:
            call.resolve([
                "granted": false,
                "message": "연락처 권한이 거부되었습니다. 설정에서 권한을 허용해주세요"
            ])
        case .notDetermined:
            call.resolve([
                "granted": false,
                "message": "권한이 아직 결정되지 않았습니다"
            ])
        @unknown default:
            call.resolve([
                "granted": false,
                "message": "알 수 없는 권한 상태입니다"
            ])
        }
    }

    @objc func requestPermission(_ call: CAPPluginCall) {
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)

        if authorizationStatus == .authorized {
            call.resolve([
                "granted": true,
                "message": "권한이 이미 허용되었습니다"
            ])
            return
        }

        contactStore.requestAccess(for: .contacts) { (granted, error) in
            DispatchQueue.main.async {
                if granted {
                    call.resolve([
                        "granted": true,
                        "message": "권한이 허용되었습니다"
                    ])
                } else {
                    let errorMessage = error?.localizedDescription ?? "권한이 거부되었습니다"
                    call.resolve([
                        "granted": false,
                        "message": errorMessage
                    ])
                }
            }
        }
    }

    @objc func getAllContacts(_ call: CAPPluginCall) {
        // 권한 확인
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
        guard authorizationStatus == .authorized else {
            call.reject("연락처 권한이 필요합니다")
            return
        }

        do {
            let keysToFetch: [CNKeyDescriptor] = [
                CNContactGivenNameKey as CNKeyDescriptor,
                CNContactFamilyNameKey as CNKeyDescriptor,
                CNContactPhoneNumbersKey as CNKeyDescriptor,
                CNContactEmailAddressesKey as CNKeyDescriptor,
                CNContactOrganizationNameKey as CNKeyDescriptor,
                CNContactJobTitleKey as CNKeyDescriptor,
                CNContactNoteKey as CNKeyDescriptor,
                CNContactBirthdayKey as CNKeyDescriptor,
                CNContactImageDataAvailableKey as CNKeyDescriptor
            ]

            let request = CNContactFetchRequest(keysToFetch: keysToFetch)
            var contactsArray: [[String: Any]] = []

            try contactStore.enumerateContacts(with: request) { (contact, stopPointer) in
                let contactInfo: [String: Any] = [
                    "id": contact.identifier,
                    "name": "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces),
                    "givenName": contact.givenName,
                    "familyName": contact.familyName,
                    "phoneNumbers": contact.phoneNumbers.map { phoneNumber in
                        return [
                            "label": phoneNumber.label?.components(separatedBy: "_").last ?? "기타",
                            "number": phoneNumber.value.stringValue
                        ]
                    },
                    "emails": contact.emailAddresses.map { email in
                        return [
                            "label": email.label?.components(separatedBy: "_").last ?? "기타",
                            "address": email.value as String
                        ]
                    },
                    "organization": contact.organizationName,
                    "jobTitle": contact.jobTitle,
                    "note": contact.note,
                    "birthday": contact.birthday?.date?.timeIntervalSince1970,
                    "hasImage": contact.imageDataAvailable,
                    "isFromDevice": true,
                    "createdAt": Date().timeIntervalSince1970,
                    "updatedAt": Date().timeIntervalSince1970
                ]
                contactsArray.append(contactInfo)
            }

            print("📱 [ContactGroupsPlugin] 총 \(contactsArray.count)명의 연락처를 가져왔습니다")

            call.resolve([
                "contacts": contactsArray
            ])

        } catch {
            print("❌ [ContactGroupsPlugin] 연락처 가져오기 실패: \(error.localizedDescription)")
            call.reject("연락처 정보를 가져오는데 실패했습니다: \(error.localizedDescription)")
        }
    }

    // MARK: - Helper Methods

    private func detectGroupSource(groupName: String) -> String {
        let name = groupName.lowercased()

        if name.contains("icloud") || name.contains("모든 연락처") {
            return "icloud"
        } else if name.contains("gmail") || name.contains("google") {
            return "gmail"
        } else if name.contains("exchange") || name.contains("outlook") {
            return "exchange"
        } else {
            return "other"
        }
    }

    private func isDefaultGroup(groupName: String) -> Bool {
        let name = groupName.lowercased()
        return name.contains("모든 연락처") || name.contains("all contacts") || name.contains("default")
    }
}
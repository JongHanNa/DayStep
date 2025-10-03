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

    @objc func getContactsByGroup(_ call: CAPPluginCall) {
        guard let groupId = call.getString("groupId") else {
            call.reject("Group ID is required")
            return
        }

        // 권한 확인
        let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
        guard authorizationStatus == .authorized else {
            call.reject("연락처 권한이 필요합니다")
            return
        }

        do {
            // 핵심: CNContact.predicateForContactsInGroup 사용하여 정확한 그룹별 연락처 조회
            let predicate = CNContact.predicateForContactsInGroup(withIdentifier: groupId)

            // 가져올 연락처 필드 지정
            let keys = [
                CNContactGivenNameKey,
                CNContactFamilyNameKey,
                CNContactPhoneNumbersKey,
                CNContactEmailAddressesKey,
                CNContactOrganizationNameKey,
                CNContactJobTitleKey,
                CNContactBirthdayKey
            ] as [CNKeyDescriptor]

            // 해당 그룹에 속한 연락처만 조회
            let contacts = try contactStore.unifiedContacts(matching: predicate, keysToFetch: keys)

            // JavaScript로 전달할 형태로 변환
            var contactsArray: [[String: Any]] = []

            for contact in contacts {
                var phoneNumbers: [[String: String]] = []
                for phoneNumber in contact.phoneNumbers {
                    phoneNumbers.append([
                        "label": phoneNumber.label ?? "기타",
                        "number": phoneNumber.value.stringValue
                    ])
                }

                var emails: [[String: String]] = []
                for email in contact.emailAddresses {
                    emails.append([
                        "label": email.label ?? "기타",
                        "address": email.value as String
                    ])
                }

                var birthdayString: String? = nil
                if let birthday = contact.birthday {
                    let calendar = Calendar.current
                    if let year = birthday.year, let month = birthday.month, let day = birthday.day {
                        if let date = calendar.date(from: DateComponents(year: year, month: month, day: day)) {
                            let formatter = ISO8601DateFormatter()
                            birthdayString = formatter.string(from: date)
                        }
                    }
                }

                let contactInfo: [String: Any] = [
                    "contactId": contact.identifier,
                    "name": [
                        "given": contact.givenName,
                        "family": contact.familyName,
                        "display": "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
                    ],
                    "phones": phoneNumbers,
                    "emails": emails,
                    "organization": [
                        "company": contact.organizationName,
                        "jobTitle": contact.jobTitle
                    ],
                    "birthday": birthdayString as Any
                ]
                contactsArray.append(contactInfo)
            }

            call.resolve([
                "contacts": contactsArray
            ])

        } catch {
            call.reject("그룹별 연락처를 가져오는데 실패했습니다: \(error.localizedDescription)")
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
            // 모든 연락처 가져오기
            let keys = [
                CNContactGivenNameKey,
                CNContactFamilyNameKey,
                CNContactPhoneNumbersKey,
                CNContactEmailAddressesKey,
                CNContactOrganizationNameKey,
                CNContactJobTitleKey,
                CNContactBirthdayKey
            ] as [CNKeyDescriptor]

            let request = CNContactFetchRequest(keysToFetch: keys)
            var contactsArray: [[String: Any]] = []

            try contactStore.enumerateContacts(with: request) { (contact, stop) in
                var phoneNumbers: [[String: String]] = []
                for phoneNumber in contact.phoneNumbers {
                    phoneNumbers.append([
                        "label": phoneNumber.label ?? "기타",
                        "number": phoneNumber.value.stringValue
                    ])
                }

                var emails: [[String: String]] = []
                for email in contact.emailAddresses {
                    emails.append([
                        "label": email.label ?? "기타",
                        "address": email.value as String
                    ])
                }

                var birthdayString: String? = nil
                if let birthday = contact.birthday {
                    let calendar = Calendar.current
                    if let year = birthday.year, let month = birthday.month, let day = birthday.day {
                        if let date = calendar.date(from: DateComponents(year: year, month: month, day: day)) {
                            let formatter = ISO8601DateFormatter()
                            birthdayString = formatter.string(from: date)
                        }
                    }
                }

                let contactInfo: [String: Any] = [
                    "contactId": contact.identifier,
                    "name": [
                        "given": contact.givenName,
                        "family": contact.familyName,
                        "display": "\(contact.givenName) \(contact.familyName)".trimmingCharacters(in: .whitespaces)
                    ],
                    "phones": phoneNumbers,
                    "emails": emails,
                    "organization": [
                        "company": contact.organizationName,
                        "jobTitle": contact.jobTitle
                    ],
                    "birthday": birthdayString as Any
                ]
                contactsArray.append(contactInfo)
            }

            call.resolve([
                "contacts": contactsArray
            ])

        } catch {
            call.reject("연락처를 가져오는데 실패했습니다: \(error.localizedDescription)")
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
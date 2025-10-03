# iOS Native ContactGroups Plugin Implementation Guide

## 문제 상황

현재 앱에서 "1. 연락 우선순위 top5" 그룹이 iOS 연락처 앱에서는 7명인데 앱에서는 10명 또는 추론된 5명으로 표시되는 문제가 있습니다.

## 원인

현재 ContactGroups 플러그인의 iOS 네이티브 구현에서 **실제 그룹별 연락처를 가져오는 기능이 없기 때문**입니다.

## 해결 방법

iOS Contacts Framework의 `CNContact.predicateForContactsInGroup(withIdentifier:)`을 사용하여 정확한 그룹별 연락처를 가져와야 합니다.

## 필요한 Swift 코드 구현

### 1. ContactGroupsPlugin.swift에 추가할 메서드

```swift
@objc func getContactsByGroup(_ call: CAPPluginCall) {
    guard let groupId = call.getString("groupId") else {
        call.reject("Group ID is required")
        return
    }

    let contactStore = CNContactStore()

    // 권한 확인
    let authorizationStatus = CNContactStore.authorizationStatus(for: .contacts)
    guard authorizationStatus == .authorized else {
        call.reject("Contacts permission not granted")
        return
    }

    do {
        // 중요: CNContact.predicateForContactsInGroup 사용
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

        // 그룹에 속한 연락처만 조회
        let contacts = try contactStore.unifiedContacts(matching: predicate, keysToFetch: keys)

        // JavaScript로 전달할 형태로 변환
        let contactsArray = contacts.map { contact in
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

            return [
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
        }

        call.resolve([
            "contacts": contactsArray
        ])

    } catch {
        call.reject("Failed to fetch contacts for group: \(error.localizedDescription)")
    }
}
```

### 2. 플러그인 등록에 추가

```swift
@objc override public func load() {
    // 기존 메서드들...
    self.bridge?.registerPluginInstance(self)
}

// 메서드 등록
@objc public override func getMethod(_ methodName: String) -> CAPPluginMethod? {
    switch methodName {
    case "getGroups":
        return CAPPluginMethod(self.getGroups)
    case "getGroupById":
        return CAPPluginMethod(self.getGroupById)
    case "getContactsByGroup":  // 새로 추가
        return CAPPluginMethod(self.getContactsByGroup)
    case "isSupported":
        return CAPPluginMethod(self.isSupported)
    case "checkPermission":
        return CAPPluginMethod(self.checkPermission)
    case "requestPermission":
        return CAPPluginMethod(self.requestPermission)
    case "getAllContacts":
        return CAPPluginMethod(self.getAllContacts)
    default:
        return nil
    }
}
```

## 기대 결과

이 구현이 완료되면:

1. **"1. 연락 우선순위 top5" 그룹** → iOS 연락처 앱과 정확히 동일한 7명 표시
2. **다른 모든 그룹들** → 실제 iOS 연락처 앱의 멤버와 정확히 동일한 명단 표시
3. **그룹별 연락처 수** → 추론이 아닌 실제 멤버 수 표시

## 임시 해결책 (네이티브 구현 전까지)

현재는 네이티브 구현이 없으므로, 다음과 같은 임시 메시지를 사용자에게 안내할 수 있습니다:

```typescript
// ContactListSheet.tsx에서
if (groupContacts.length === 0 && !isLoadingGroupContacts) {
  return (
    <div className="text-center text-muted-foreground p-4">
      <p>그룹별 연락처 조회 기능은 현재 개발 중입니다.</p>
      <p className="text-sm mt-2">곧 iOS 연락처 앱과 동일한 정확한 멤버 목록을 제공할 예정입니다.</p>
    </div>
  );
}
```

## 네이티브 구현 우선순위

**높음**: `CNContact.predicateForContactsInGroup(withIdentifier:)` 구현이 가장 정확하고 효율적인 해결책입니다.

이 구현이 완료되면 iOS 연락처 앱과 100% 동일한 그룹별 연락처 목록을 표시할 수 있습니다.
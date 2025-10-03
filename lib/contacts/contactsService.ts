import { Capacitor } from '@capacitor/core';
import { Contacts, GetContactsOptions } from '@capacitor-community/contacts';
import { Contact, ContactsPermission, DeviceContactGroup } from '../../types/contacts';

/**
 * 연락처 권한 상태 확인
 */
export async function checkContactsPermission(): Promise<ContactsPermission> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return {
        granted: false,
        message: 'Contacts access is only available on native platforms (iOS/Android)',
      };
    }


    console.log('🔐 [권한체크] @capacitor-community/contacts로 권한 상태 확인');

    // @capacitor-community/contacts 플러그인으로 권한 상태 확인
    const result = await Contacts.checkPermissions();
    console.log('🔐 [권한체크] 커뮤니티 플러그인 권한 상태:', result);

    const granted = result.contacts === 'granted';
    return {
      granted,
      message: granted ? '연락처 권한이 허용되었습니다' : '연락처 권한이 필요합니다',
    };
  } catch (error) {
    console.error('Error checking contacts permission:', error);
    return {
      granted: false,
      message: 'Failed to check contacts permission',
    };
  }
}

/**
 * 연락처 권한 요청
 */
export async function requestContactsPermission(): Promise<ContactsPermission> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return {
        granted: false,
        message: 'Contacts access is only available on native platforms (iOS/Android)',
      };
    }

    console.log('🔐 [권한요청] @capacitor-community/contacts로 권한 요청');

    // @capacitor-community/contacts 플러그인으로 권한 요청
    const result = await Contacts.requestPermissions();
    console.log('🔐 [권한요청] 커뮤니티 플러그인 권한 요청 결과:', result);

    const granted = result.contacts === 'granted';
    return {
      granted,
      message: granted ? '연락처 권한이 허용되었습니다' : '연락처 권한이 거부되었습니다',
    };
  } catch (error) {
    console.error('Error requesting contacts permission:', error);
    return {
      granted: false,
      message: 'Failed to request contacts permission',
    };
  }
}

/**
 * 기기에서 모든 연락처 불러오기
 */
export async function fetchAllContacts(): Promise<Contact[]> {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Contacts access is only available on native platforms');
      return [];
    }

    console.log('🔍 [연락처] 연락처 가져오기 시작');

    // 권한 확인
    const permission = await checkContactsPermission();
    console.log('🔍 [연락처] 권한 상태:', permission);
    if (!permission.granted) {
      console.error('❌ [연락처] 권한 거부됨. iOS 설정을 확인해주세요:', {
        permissionStatus: permission,
        suggestedAction: 'iOS 설정 > 개인정보 보호 및 보안 > 연락처에서 DayStep 앱 권한 확인'
      });
      throw new Error(permission.message || 'Contacts permission not granted');
    }

    console.log('🔄 [연락처] @capacitor-community/contacts로 연락처 API 호출');

    console.log('📱 [연락처] Contacts.getContacts() 호출 중...');

    // @capacitor-community/contacts 플러그인으로 연락처 가져오기
    const options: GetContactsOptions = {
      projection: {
        name: true,
        phones: true,
        emails: true,
        organization: true,
        birthday: true,
        // note: true, // iOS에서 Unauthorized Keys 오류 발생하므로 제거
      }
    };

    const result = await Contacts.getContacts(options);
    console.log('🔍 [연락처] API 응답:', {
      totalContacts: result.contacts?.length || 0,
      firstContact: result.contacts?.[0] ? {
        contactId: result.contacts[0].contactId,
        name: result.contacts[0].name,
        phones: result.contacts[0].phones?.length || 0,
        emails: result.contacts[0].emails?.length || 0
      } : null
    });

    if (!result.contacts || result.contacts.length === 0) {
      console.warn('🔍 [연락처] API에서 연락처를 찾을 수 없습니다');
      return [];
    }

    // ContactPayload를 Contact 형식으로 변환
    const contacts: Contact[] = result.contacts.map((capacitorContact: any) => {
      const contact: Contact = {
        id: capacitorContact.contactId,
        name: capacitorContact.name ?
          `${capacitorContact.name.given || ''} ${capacitorContact.name.family || ''}`.trim() ||
          `${capacitorContact.name.display || ''}` || 'Unknown' : 'Unknown',
        phoneNumbers: capacitorContact.phones?.map((phone: any) => ({
          label: phone.label || '기타',
          number: phone.number || ''
        })) || [],
        emails: capacitorContact.emails?.map((email: any) => ({
          label: email.label || '기타',
          address: email.address || ''
        })) || [],
        birthday: capacitorContact.birthday?.year && capacitorContact.birthday?.month && capacitorContact.birthday?.day
          ? new Date(capacitorContact.birthday.year, capacitorContact.birthday.month - 1, capacitorContact.birthday.day).toISOString()
          : undefined,
        notes: undefined, // note 필드를 요청하지 않으므로 undefined로 설정
        organization: capacitorContact.organization ? {
          company: capacitorContact.organization.company || '',
          jobTitle: capacitorContact.organization.jobTitle || undefined
        } : undefined,
        isFromDevice: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return contact;
    });

    console.log(`✅ [연락처] 최종 변환된 연락처 수: ${contacts.length}`);
    return contacts;
  } catch (error) {
    console.error('❌ [연락처] Error fetching contacts:', error);
    throw error;
  }
}



/**
 * 연락처 검색 (기기에서 직접)
 */
export async function searchContactsOnDevice(searchTerm: string): Promise<Contact[]> {
  try {
    if (!Capacitor.isNativePlatform() || !searchTerm.trim()) {
      return [];
    }

    // 연락처 검색 기능 미구현
    console.warn('⚠️ [연락처] 연락처 검색 기능은 아직 구현되지 않았습니다', { searchTerm });

    return [];
  } catch (error) {
    console.error('Error searching contacts:', error);
    throw error;
  }
}

/**
 * 특정 연락처 가져오기
 */
export async function getContactById(contactId: string): Promise<Contact | null> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    const permission = await checkContactsPermission();
    if (!permission.granted) {
      return null;
    }

    // 개별 연락처 조회 기능 미구현
    console.warn('⚠️ [연락처] 개별 연락처 조회 기능은 아직 구현되지 않았습니다', { contactId });

    return null;
  } catch (error) {
    console.error('Error getting contact by ID:', error);
    return null;
  }
}

/**
 * 연락처 동기화 가능 여부 확인
 */
export function isContactsAvailable(): boolean {
  return Capacitor.isNativePlatform();
}


/**
 * 기기에서 모든 연락처 그룹 불러오기 (iOS 전용)
 */
export async function fetchAllContactGroups(): Promise<DeviceContactGroup[]> {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Contact groups access is only available on native platforms');
      return [];
    }

    console.log('🔍 [연락처그룹] 연락처 그룹 가져오기 시작');

    // ContactGroups 플러그인 동적 임포트
    const { default: ContactGroups } = await import('../plugins/contactGroups');

    // 플러그인 지원 여부 확인
    const { isSupported } = await ContactGroups.isSupported();
    if (!isSupported) {
      console.warn('⚠️ [연락처그룹] ContactGroups 플러그인이 지원되지 않습니다');
      return [];
    }

    // 권한 확인
    const permission = await ContactGroups.checkPermission();
    console.log('🔍 [연락처그룹] 권한 상태:', permission);
    if (!permission.granted) {
      console.error('❌ [연락처그룹] 권한 거부됨:', permission.message);
      throw new Error(permission.message || 'Contacts permission not granted');
    }

    console.log('🔄 [연락처그룹] ContactGroups 플러그인으로 그룹 가져오기');

    // 그룹 목록 가져오기
    const result = await ContactGroups.getGroups();
    console.log('🔍 [연락처그룹] 그룹 목록:', {
      totalGroups: result.groups?.length || 0,
      groups: result.groups?.map(g => ({ id: g.id, name: g.name, source: g.source, contactCount: g.contactCount }))
    });

    return result.groups || [];

  } catch (error) {
    console.error('❌ [연락처그룹] Error fetching contact groups:', error);
    throw error;
  }
}

/**
 * 특정 그룹의 연락처들 가져오기 (iOS 전용)
 */
export async function fetchContactsByGroup(groupId: string): Promise<Contact[]> {
  try {
    if (!Capacitor.isNativePlatform()) {
      console.warn('Contact groups access is only available on native platforms');
      return [];
    }

    console.log('🔍 [그룹연락처] 그룹별 연락처 가져오기 시작:', groupId);

    // 권한 확인
    const permission = await checkContactsPermission();
    if (!permission.granted) {
      throw new Error(permission.message || 'Contacts permission not granted');
    }

    try {
      // ContactGroups 플러그인으로 그룹별 연락처 직접 조회 시도
      const { default: ContactGroups } = await import('../plugins/contactGroups');

      console.log('🔍 [그룹연락처] ContactGroups 플러그인으로 그룹별 연락처 조회 시도');
      const result = await ContactGroups.getContactsByGroup({ groupId });

      if (result.contacts && result.contacts.length > 0) {
        console.log('✅ [그룹연락처] 네이티브에서 그룹별 연락처 조회 성공:', {
          groupId,
          contactCount: result.contacts.length
        });

        // 네이티브에서 가져온 연락처를 Contact 형식으로 변환
        const contacts: Contact[] = result.contacts.map((nativeContact: any) => ({
          id: nativeContact.contactId || nativeContact.id,
          name: nativeContact.name ?
            `${nativeContact.name.given || ''} ${nativeContact.name.family || ''}`.trim() ||
            `${nativeContact.name.display || ''}` || 'Unknown' : 'Unknown',
          phoneNumbers: nativeContact.phones?.map((phone: any) => ({
            label: phone.label || '기타',
            number: phone.number || ''
          })) || [],
          emails: nativeContact.emails?.map((email: any) => ({
            label: email.label || '기타',
            address: email.address || ''
          })) || [],
          birthday: nativeContact.birthday?.year && nativeContact.birthday?.month && nativeContact.birthday?.day
            ? new Date(nativeContact.birthday.year, nativeContact.birthday.month - 1, nativeContact.birthday.day).toISOString()
            : undefined,
          notes: nativeContact.note || undefined,
          organization: nativeContact.organization ? {
            company: nativeContact.organization.company || '',
            jobTitle: nativeContact.organization.jobTitle || undefined
          } : undefined,
          isFromDevice: true,
          deviceGroups: [groupId], // 해당 그룹에 속함을 명시
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }));

        return contacts;
      }
    } catch (nativeError) {
      console.warn('⚠️ [그룹연락처] 네이티브 그룹별 조회 실패, 대안 방법 사용:', nativeError);
    }

    // 대안: 모든 연락처를 가져와서 그룹별로 필터링
    console.log('🔍 [그룹연락처] 모든 연락처 가져와서 그룹별 필터링...');
    const allContacts = await fetchAllContacts();

    // 현재는 그룹 정보가 연락처에 포함되지 않으므로,
    // 일단 모든 연락처를 반환하고 추후 개선 필요
    console.warn('🔍 [그룹연락처] 현재 그룹별 필터링 미구현, 모든 연락처 반환');

    return allContacts;
  } catch (error) {
    console.error('❌ [그룹연락처] Error fetching contacts by group:', error);
    throw error;
  }
}

/**
 * 특정 그룹 정보 가져오기 (iOS 전용)
 */
export async function getContactGroupById(groupId: string): Promise<DeviceContactGroup | null> {
  try {
    if (!Capacitor.isNativePlatform()) {
      return null;
    }

    console.log('🔍 [그룹상세] 그룹 정보 가져오기 시작:', groupId);

    // ContactGroups 플러그인 동적 임포트
    const { default: ContactGroups } = await import('../plugins/contactGroups');

    // 플러그인 지원 여부 확인
    const { isSupported } = await ContactGroups.isSupported();
    if (!isSupported) {
      console.warn('⚠️ [그룹상세] ContactGroups 플러그인이 지원되지 않습니다');
      return null;
    }

    // 권한 확인
    const permission = await ContactGroups.checkPermission();
    if (!permission.granted) {
      console.error('❌ [그룹상세] 권한 거부됨');
      return null;
    }

    console.log('🔄 [그룹상세] ContactGroups 플러그인으로 그룹 정보 가져오기');

    // 특정 그룹 정보 가져오기
    const result = await ContactGroups.getGroupById({ id: groupId });
    console.log('🔍 [그룹상세] 그룹 정보:', result.group);

    return result.group;

  } catch (error) {
    console.error('❌ [그룹상세] Error getting contact group by ID:', error);
    return null;
  }
}

/**
 * 그룹 이름으로 소스 감지
 */
function detectGroupSource(groupName: string): DeviceContactGroup['source'] {
  const lowerName = groupName.toLowerCase();

  if (lowerName.includes('icloud') || lowerName.includes('me card')) {
    return 'icloud';
  }
  if (lowerName.includes('gmail') || lowerName.includes('google')) {
    return 'gmail';
  }
  if (lowerName.includes('exchange') || lowerName.includes('outlook')) {
    return 'exchange';
  }
  if (lowerName.includes('local') || lowerName.includes('device')) {
    return 'local';
  }

  return 'other';
}

/**
 * 기본 그룹인지 확인
 */
function isDefaultGroup(groupName: string): boolean {
  const lowerName = groupName.toLowerCase();

  // "모든 연락처" 또는 "All Contacts" 패턴
  return lowerName.includes('모든 연락처') ||
         lowerName.includes('all contacts') ||
         lowerName.includes('모든') ||
         lowerName.includes('all');
}

/**
 * 연락처 그룹 동기화 가능 여부 확인
 */
export function isContactGroupsAvailable(): boolean {
  // iOS에서만 지원
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}


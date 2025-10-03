import { useCallback, useEffect } from 'react';
import { useContactsStore } from '../../state/stores/contactsStore';
import {
  checkContactsPermission,
  requestContactsPermission,
  fetchAllContacts,
  searchContactsOnDevice,
  isContactsAvailable,
  fetchAllContactGroups,
  isContactGroupsAvailable
} from './contactsService';
import { Contact } from '../../types/contacts';

/**
 * 연락처 관리를 위한 커스텀 훅
 */
export function useContacts() {
  const {
    contacts,
    deviceContactGroups,
    permission,
    syncState,
    filter,
    searchResults,

    setContacts,
    setDeviceContactGroups,
    setPermission,
    setSyncState,
    startSync,
    completeSync,
    failSync,
    syncDeviceGroups,
    completeGroupSync,
    failGroupSync,
    setFilter,
    searchContacts,
    clearSearch,

    getContactById,
    getContactsByIds,
    getFavoriteContacts,
    getRecentContacts,
    getDeviceGroupById,
    getDeviceGroupsBySource,
    getDefaultDeviceGroups,
    getContactsByDeviceGroup,
  } = useContactsStore();

  /**
   * 권한 확인
   */
  const checkPermission = useCallback(async () => {
    try {
      const result = await checkContactsPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error checking permission:', error);
      const errorPermission = { 
        granted: false, 
        message: 'Permission check failed' 
      };
      setPermission(errorPermission);
      return errorPermission;
    }
  }, [setPermission]);

  /**
   * 권한 요청
   */
  const requestPermission = useCallback(async () => {
    try {
      const result = await requestContactsPermission();
      setPermission(result);
      return result;
    } catch (error) {
      console.error('Error requesting permission:', error);
      const errorPermission = { 
        granted: false, 
        message: 'Permission request failed' 
      };
      setPermission(errorPermission);
      return errorPermission;
    }
  }, [setPermission]);

  /**
   * 연락처 동기화
   */
  const syncContacts = useCallback(async (force = false) => {
    try {
      console.log('🔄 [useContacts] 연락처 동기화 시작', { force });
      startSync();

      // 네이티브 환경이 아닌 경우 빈 배열 반환
      if (!isContactsAvailable()) {
        console.log('🌐 [useContacts] 웹 환경 - 연락처 기능 사용 불가');
        const emptyContacts: Contact[] = [];
        completeSync(emptyContacts);
        return { success: true, contacts: emptyContacts };
      }

      console.log('📱 [useContacts] 네이티브 환경 감지');

      // 권한 확인
      let currentPermission = permission;
      console.log('🔐 [useContacts] 현재 권한 상태:', currentPermission);
      
      if (!currentPermission.granted || force) {
        console.log('🔐 [useContacts] 권한 재확인 중...');
        currentPermission = await checkPermission();
        console.log('🔐 [useContacts] 권한 재확인 결과:', currentPermission);
      }

      if (!currentPermission.granted) {
        console.warn('❌ [useContacts] 권한 없음');
        failSync('연락처 접근 권한이 필요합니다.');
        return { 
          success: false, 
          error: '연락처 접근 권한이 필요합니다.',
          needsPermission: true 
        };
      }

      console.log('📞 [useContacts] 기기 연락처 가져오기 시작');

      // 기기에서 연락처 가져오기
      const deviceContacts = await fetchAllContacts();
      
      console.log('📞 [useContacts] 기기 연락처 가져오기 완료:', {
        deviceContactsCount: deviceContacts.length,
        firstDeviceContact: deviceContacts[0] || null
      });
      
      // 기존 앱 내 연락처와 합치기 (기기 연락처가 우선)
      const existingAppContacts = contacts.filter(c => !c.isFromDevice);
      const allContacts = [...deviceContacts, ...existingAppContacts];
      
      console.log('✅ [useContacts] 연락처 합치기 완료:', {
        deviceContactsCount: deviceContacts.length,
        existingAppContactsCount: existingAppContacts.length,
        totalContactsCount: allContacts.length
      });
      
      completeSync(allContacts);
      
      return { success: true, contacts: allContacts };
    } catch (error) {
      console.error('❌ [useContacts] 연락처 동기화 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '연락처 동기화에 실패했습니다.';
      failSync(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [
    permission, 
    contacts, 
    startSync, 
    completeSync, 
    failSync, 
    checkPermission
  ]);

  /**
   * 연락처 검색
   */
  const performSearch = useCallback(async (searchTerm: string) => {
    try {
      if (!searchTerm.trim()) {
        clearSearch();
        return [];
      }

      // 로컬 검색
      searchContacts(searchTerm);
      
      // 네이티브 환경에서는 기기 연락처도 검색
      if (isContactsAvailable() && permission.granted) {
        const deviceResults = await searchContactsOnDevice(searchTerm);
        
        // 기존 결과와 합치기 (중복 제거)
        const allResults = [...searchResults];
        deviceResults.forEach(deviceContact => {
          if (!allResults.find(c => c.id === deviceContact.id)) {
            allResults.push(deviceContact);
          }
        });
        
        return allResults;
      }
      
      return searchResults;
    } catch (error) {
      console.error('Error searching contacts:', error);
      return searchResults;
    }
  }, [searchContacts, clearSearch, searchResults, permission.granted]);

  /**
   * 연락처 추가 (앱 내에서)
   */
  const addCustomContact = useCallback((contactData: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newContact: Contact = {
      ...contactData,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isFromDevice: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    setContacts([...contacts, newContact]);
    return newContact;
  }, [contacts, setContacts]);

  /**
   * 연락처 업데이트
   */
  const updateContactInfo = useCallback((contactId: string, updates: Partial<Contact>) => {
    const updatedContacts = contacts.map(contact => 
      contact.id === contactId 
        ? { ...contact, ...updates, updatedAt: new Date().toISOString() }
        : contact
    );
    setContacts(updatedContacts);
  }, [contacts, setContacts]);

  /**
   * 빠른 연락처 찾기 (이름으로)
   */
  const findContactByName = useCallback((name: string): Contact | undefined => {
    return contacts.find(contact => 
      contact.name.toLowerCase().includes(name.toLowerCase())
    );
  }, [contacts]);

  /**
   * 연락처 그룹핑 (관계별)
   */
  const getContactsByRelationship = useCallback(() => {
    const grouped: { [key: string]: Contact[] } = {};

    contacts.forEach(contact => {
      const relationship = contact.relationship || 'other';
      if (!grouped[relationship]) {
        grouped[relationship] = [];
      }
      grouped[relationship].push(contact);
    });

    return grouped;
  }, [contacts]);

  /**
   * 기기 연락처 그룹 동기화
   */
  const syncContactGroups = useCallback(async (force = false) => {
    try {
      console.log('🔄 [useContacts] 연락처 그룹 동기화 시작', { force });
      syncDeviceGroups();

      // 네이티브 환경이 아니거나 iOS가 아닌 경우 빈 배열 반환
      if (!isContactGroupsAvailable()) {
        console.log('🌐 [useContacts] 웹 환경 또는 iOS 아님 - 빈 그룹 반환');
        completeGroupSync([]);
        return { success: true, groups: [] };
      }

      console.log('📱 [useContacts] iOS 환경 감지');

      // 권한 확인 (연락처 권한이 그룹에도 필요)
      let currentPermission = permission;
      if (!currentPermission.granted || force) {
        currentPermission = await checkPermission();
      }

      if (!currentPermission.granted) {
        console.warn('❌ [useContacts] 권한 없음 - 그룹 동기화 실패');
        failGroupSync('연락처 접근 권한이 필요합니다.');
        return {
          success: false,
          error: '연락처 접근 권한이 필요합니다.',
          needsPermission: true
        };
      }

      console.log('📁 [useContacts] 기기 연락처 그룹 가져오기 시작');

      // 기기에서 연락처 그룹 가져오기
      const deviceGroups = await fetchAllContactGroups();

      console.log('📁 [useContacts] 기기 연락처 그룹 가져오기 완료:', {
        deviceGroupsCount: deviceGroups.length,
        firstGroup: deviceGroups[0] || null
      });

      completeGroupSync(deviceGroups);

      return { success: true, groups: deviceGroups };
    } catch (error) {
      console.error('❌ [useContacts] 연락처 그룹 동기화 실패:', error);
      const errorMessage = error instanceof Error ? error.message : '연락처 그룹 동기화에 실패했습니다.';
      failGroupSync(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, [
    permission,
    syncDeviceGroups,
    completeGroupSync,
    failGroupSync,
    checkPermission
  ]);

  // 컴포넌트 마운트 시 권한 상태 확인
  useEffect(() => {
    if (isContactsAvailable()) {
      checkPermission();
    }
  }, [checkPermission]);

  return {
    // 데이터
    contacts,
    deviceContactGroups,
    permission,
    syncState,
    filter,
    searchResults,

    // 상태 확인
    isAvailable: isContactsAvailable(),
    isGroupsAvailable: isContactGroupsAvailable(),
    hasPermission: permission.granted,
    isLoading: syncState.isLoading,
    isLoadingGroups: syncState.isLoadingGroups,

    // 액션들
    checkPermission,
    requestPermission,
    syncContacts,
    syncContactGroups,
    performSearch,
    clearSearch,
    addCustomContact,
    updateContactInfo,

    // 유틸리티
    getContactById,
    getContactsByIds,
    getFavoriteContacts,
    getRecentContacts,
    findContactByName,
    getContactsByRelationship,

    // 그룹 유틸리티
    getDeviceGroupById,
    getDeviceGroupsBySource,
    getDefaultDeviceGroups,
    getContactsByDeviceGroup,

    // 필터링
    setFilter,
  };
}
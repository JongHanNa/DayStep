import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Contact, ContactsPermission, ContactsSyncState, ContactsFilter, ContactGroup, DeviceContactGroup } from '../../types/contacts';

interface ContactsState {
  // 연락처 데이터
  contacts: Contact[];
  contactGroups: ContactGroup[];
  deviceContactGroups: DeviceContactGroup[]; // 기기 연락처 그룹 추가
  
  // 권한 및 동기화 상태
  permission: ContactsPermission;
  syncState: ContactsSyncState;
  
  // 필터 및 검색
  filter: ContactsFilter;
  searchResults: Contact[];
  
  // 액션들
  setContacts: (contacts: Contact[]) => void;
  // addContact: (contact: Contact) => void; // 서버 저장 기능 제거로 불필요
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  removeContact: (contactId: string) => void;
  
  // 권한 관리
  setPermission: (permission: ContactsPermission) => void;
  
  // 동기화 상태 관리
  setSyncState: (syncState: Partial<ContactsSyncState>) => void;
  startSync: () => void;
  completeSync: (contacts: Contact[]) => void;
  failSync: (error: string) => void;
  
  // 검색 및 필터링
  setFilter: (filter: Partial<ContactsFilter>) => void;
  searchContacts: (searchTerm: string) => void;
  clearSearch: () => void;
  
  // 그룹 관리
  addContactGroup: (group: ContactGroup) => void;
  updateContactGroup: (groupId: string, updates: Partial<ContactGroup>) => void;
  removeContactGroup: (groupId: string) => void;

  // 기기 그룹 관리
  setDeviceContactGroups: (groups: DeviceContactGroup[]) => void;
  syncDeviceGroups: () => void;
  completeGroupSync: (groups: DeviceContactGroup[]) => void;
  failGroupSync: (error: string) => void;
  
  // 유틸리티
  getContactById: (contactId: string) => Contact | undefined;
  getContactsByIds: (contactIds: string[]) => Contact[];
  getContactsByGroup: (groupId: string) => Contact[];
  getFavoriteContacts: () => Contact[];
  getRecentContacts: (days?: number) => Contact[];

  // 기기 그룹 유틸리티
  getDeviceGroupById: (groupId: string) => DeviceContactGroup | undefined;
  getDeviceGroupsBySource: (source: DeviceContactGroup['source']) => DeviceContactGroup[];
  getDefaultDeviceGroups: () => DeviceContactGroup[];
  getContactsByDeviceGroup: (groupId: string) => Contact[];
  
  // 초기화
  reset: () => void;
}

const initialState = {
  contacts: [],
  contactGroups: [],
  deviceContactGroups: [], // 기기 연락처 그룹 초기값 추가
  permission: { granted: false },
  syncState: {
    isLoading: false,
    totalContacts: 0,
  },
  filter: {},
  searchResults: [],
};

export const useContactsStore = create<ContactsState>()(
  persist(
    (set, get) => ({
      ...initialState,
      
      // 연락처 관리
      setContacts: (contacts) => set({ contacts }),
      
      // addContact: (contact) => 
      //   set((state) => ({
      //     contacts: [...state.contacts, contact],
      //   })), // 서버 저장 기능 제거로 불필요
      
      updateContact: (contactId, updates) =>
        set((state) => ({
          contacts: state.contacts.map(contact =>
            contact.id === contactId ? { ...contact, ...updates } : contact
          ),
        })),
      
      removeContact: (contactId) =>
        set((state) => ({
          contacts: state.contacts.filter(contact => contact.id !== contactId),
        })),
      
      // 권한 관리
      setPermission: (permission) => set({ permission }),
      
      // 동기화 상태 관리
      setSyncState: (syncState) =>
        set((state) => ({
          syncState: { ...state.syncState, ...syncState },
        })),
      
      startSync: () =>
        set((state) => ({
          syncState: { ...state.syncState, isLoading: true, errorMessage: undefined },
        })),
      
      completeSync: (contacts) =>
        set((state) => ({
          contacts,
          syncState: {
            ...state.syncState,
            isLoading: false,
            lastSyncDate: new Date().toISOString(),
            totalContacts: contacts.length,
            errorMessage: undefined,
          },
        })),
      
      failSync: (error) =>
        set((state) => ({
          syncState: {
            ...state.syncState,
            isLoading: false,
            errorMessage: error,
          },
        })),
      
      // 검색 및 필터링
      setFilter: (filter) =>
        set((state) => ({ filter: { ...state.filter, ...filter } })),
      
      searchContacts: (searchTerm) => {
        const { contacts, filter } = get();
        let results = contacts;
        
        // 검색어 필터링
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          results = results.filter(contact =>
            contact.name.toLowerCase().includes(term) ||
            contact.notes?.toLowerCase().includes(term) ||
            contact.organization?.company?.toLowerCase().includes(term) ||
            contact.organization?.jobTitle?.toLowerCase().includes(term)
          );
        }
        
        // 관계 필터링
        if (filter.relationship) {
          results = results.filter(contact => contact.relationship === filter.relationship);
        }
        
        // 태그 필터링
        if (filter.tags && filter.tags.length > 0) {
          results = results.filter(contact =>
            contact.tags?.some(tag => filter.tags!.includes(tag))
          );
        }
        
        // 회사 정보 있는 연락처만
        if (filter.hasCompany) {
          results = results.filter(contact => 
            contact.organization?.company
          );
        }
        
        // 최근 연락한 사람들
        if (filter.recentlyContacted) {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          results = results.filter(contact =>
            contact.lastContactDate && 
            new Date(contact.lastContactDate) > thirtyDaysAgo
          );
        }
        
        set({ 
          searchResults: results,
          filter: { ...filter, searchTerm }
        });
      },
      
      clearSearch: () =>
        set({ searchResults: [], filter: {} }),
      
      // 그룹 관리
      addContactGroup: (group) =>
        set((state) => ({
          contactGroups: [...state.contactGroups, group],
        })),
      
      updateContactGroup: (groupId, updates) =>
        set((state) => ({
          contactGroups: state.contactGroups.map(group =>
            group.id === groupId ? { ...group, ...updates } : group
          ),
        })),
      
      removeContactGroup: (groupId) =>
        set((state) => ({
          contactGroups: state.contactGroups.filter(group => group.id !== groupId),
        })),
      
      // 유틸리티 함수들
      getContactById: (contactId) => {
        const { contacts } = get();
        return contacts.find(contact => contact.id === contactId);
      },
      
      getContactsByIds: (contactIds) => {
        const { contacts } = get();
        return contacts.filter(contact => contactIds.includes(contact.id));
      },
      
      getContactsByGroup: (groupId) => {
        const { contactGroups, contacts } = get();
        const group = contactGroups.find(g => g.id === groupId);
        if (!group) return [];
        return contacts.filter(contact => group.contactIds.includes(contact.id));
      },
      
      getFavoriteContacts: () => {
        const { contacts } = get();
        return contacts.filter(contact => contact.tags?.includes('favorite'));
      },
      
      getRecentContacts: (days = 30) => {
        const { contacts } = get();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        return contacts
          .filter(contact => 
            contact.lastContactDate && 
            new Date(contact.lastContactDate) > cutoffDate
          )
          .sort((a, b) => 
            new Date(b.lastContactDate!).getTime() - 
            new Date(a.lastContactDate!).getTime()
          );
      },
      
      // 기기 그룹 관리
      setDeviceContactGroups: (groups) => set({ deviceContactGroups: groups }),

      syncDeviceGroups: () =>
        set((state) => ({
          syncState: {
            ...state.syncState,
            isLoadingGroups: true,
            groupErrorMessage: undefined
          },
        })),

      completeGroupSync: (groups) =>
        set((state) => ({
          deviceContactGroups: groups,
          syncState: {
            ...state.syncState,
            isLoadingGroups: false,
            lastGroupSyncDate: new Date().toISOString(),
            totalGroups: groups.length,
            groupErrorMessage: undefined,
          },
        })),

      failGroupSync: (error) =>
        set((state) => ({
          syncState: {
            ...state.syncState,
            isLoadingGroups: false,
            groupErrorMessage: error,
          },
        })),

      // 기기 그룹 유틸리티 함수들
      getDeviceGroupById: (groupId) => {
        const { deviceContactGroups } = get();
        return deviceContactGroups.find(group => group.id === groupId);
      },

      getDeviceGroupsBySource: (source) => {
        const { deviceContactGroups } = get();
        return deviceContactGroups.filter(group => group.source === source);
      },

      getDefaultDeviceGroups: () => {
        const { deviceContactGroups } = get();
        return deviceContactGroups.filter(group => group.isDefault);
      },

      getContactsByDeviceGroup: (groupId) => {
        const { contacts } = get();
        // 현재는 연락처에 그룹 정보가 포함되지 않으므로 추후 개선 필요
        // TODO: deviceGroups 필드 사용하여 필터링 구현
        return contacts.filter(contact =>
          contact.deviceGroups?.includes(groupId)
        );
      },

      // 초기화
      reset: () => set(initialState),
    }),
    {
      name: 'daystep-contacts-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        contacts: state.contacts,
        contactGroups: state.contactGroups,
        deviceContactGroups: state.deviceContactGroups, // 기기 그룹도 저장
        permission: state.permission,
        syncState: {
          lastSyncDate: state.syncState.lastSyncDate,
          totalContacts: state.syncState.totalContacts,
          lastGroupSyncDate: state.syncState.lastGroupSyncDate, // 그룹 동기화 날짜도 저장
          totalGroups: state.syncState.totalGroups, // 그룹 수도 저장
        },
      }),
    }
  )
);
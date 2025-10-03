import { registerPlugin } from '@capacitor/core';
import type { DeviceContactGroup, ContactsPermission } from '../../types/contacts';

export interface ContactGroupsPlugin {
  /**
   * 모든 연락처 그룹 가져오기
   */
  getGroups(): Promise<{ groups: DeviceContactGroup[] }>;

  /**
   * 특정 그룹 정보 가져오기
   */
  getGroupById(options: { id: string }): Promise<{ group: DeviceContactGroup | null }>;

  /**
   * 특정 그룹에 속한 연락처들 가져오기
   */
  getContactsByGroup(options: { groupId: string }): Promise<{ contacts: any[] }>;

  /**
   * 플러그인 지원 여부 확인
   */
  isSupported(): Promise<{ isSupported: boolean }>;

  /**
   * 연락처 권한 확인
   */
  checkPermission(): Promise<ContactsPermission>;

  /**
   * 연락처 권한 요청
   */
  requestPermission(): Promise<ContactsPermission>;

  /**
   * 모든 연락처 가져오기 (백업용)
   */
  getAllContacts(): Promise<{ contacts: any[] }>;
}

const ContactGroups = registerPlugin<ContactGroupsPlugin>('ContactGroups', {
  web: () => import('./contactGroups.web').then(m => new m.ContactGroupsWeb()),
});

export default ContactGroups;
export { ContactGroups };
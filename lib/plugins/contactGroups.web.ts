import { WebPlugin } from '@capacitor/core';
import type { ContactGroupsPlugin } from './contactGroups';
import type { DeviceContactGroup, ContactsPermission } from '../../types/contacts';

export class ContactGroupsWeb extends WebPlugin implements ContactGroupsPlugin {
  async getGroups(): Promise<{ groups: DeviceContactGroup[] }> {
    console.warn('ContactGroups.getGroups() is not available on web');

    // 웹에서는 더미 데이터 반환
    const dummyGroups: DeviceContactGroup[] = [
      {
        id: 'web-all',
        name: '모든 연락처',
        source: 'local',
        isDefault: true,
        contactCount: 0
      }
    ];

    return { groups: dummyGroups };
  }

  async getGroupById(): Promise<{ group: DeviceContactGroup | null }> {
    console.warn('ContactGroups.getGroupById() is not available on web');
    return { group: null };
  }

  async getContactsByGroup(): Promise<{ contacts: any[] }> {
    console.warn('ContactGroups.getContactsByGroup() is not available on web');
    return { contacts: [] };
  }

  async isSupported(): Promise<{ isSupported: boolean }> {
    return { isSupported: false };
  }

  async checkPermission(): Promise<ContactsPermission> {
    return {
      granted: false,
      message: 'Contact groups are only available on native platforms'
    };
  }

  async requestPermission(): Promise<ContactsPermission> {
    return {
      granted: false,
      message: 'Contact groups are only available on native platforms'
    };
  }

  async getAllContacts(): Promise<{ contacts: any[] }> {
    console.warn('ContactGroups.getAllContacts() is not available on web');
    return { contacts: [] };
  }
}
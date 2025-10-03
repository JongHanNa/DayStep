import { WebPlugin } from '@capacitor/core';
import type { ContactGroupsPlugin, DeviceContactGroup, ContactsPermission } from './definitions';

export class ContactGroupsWeb extends WebPlugin implements ContactGroupsPlugin {
  async getGroups(): Promise<{ groups: DeviceContactGroup[] }> {
    console.warn('ContactGroups.getGroups() is not available on web');
    return { groups: [] };
  }

  async getGroupById(): Promise<{ group: DeviceContactGroup | null }> {
    console.warn('ContactGroups.getGroupById() is not available on web');
    return { group: null };
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
}
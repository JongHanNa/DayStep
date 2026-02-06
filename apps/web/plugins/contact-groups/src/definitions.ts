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
}

export interface DeviceContactGroup {
  id: string;
  name: string;
  source: 'icloud' | 'gmail' | 'exchange' | 'local' | 'other';
  isDefault?: boolean;
  contactCount?: number;
}

export interface ContactsPermission {
  granted: boolean;
  message?: string;
}
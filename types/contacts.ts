// 연락처 개인정보 타입 정의
export interface ContactPhoneNumber {
  label: string; // 'mobile', 'home', 'work', etc.
  number: string;
}

export interface ContactEmail {
  label: string; // 'personal', 'work', etc.
  address: string;
}

export interface ContactAddress {
  label: string; // 'home', 'work', etc.
  street?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

// 연락처 관련 타입 정의 (개인정보 포함)
export interface Contact {
  id: string;
  name: string;
  // 개인정보 필드 추가
  phoneNumbers?: ContactPhoneNumber[];
  emails?: ContactEmail[];
  addresses?: ContactAddress[];
  birthday?: string; // ISO 날짜 문자열
  notes?: string;
  organization?: {
    company?: string;
    jobTitle?: string;
  };
  // 앱에서 추가 관리할 정보
  lastContactDate?: string; // ISO 날짜 문자열
  relationship?: 'family' | 'friend' | 'colleague' | 'business' | 'other';
  tags?: string[];
  avatar?: string; // 이니셜 또는 아바타 URL
  // Supabase에 저장되는 추가 정보
  userId?: string;
  createdAt?: string;
  updatedAt?: string;
  isFromDevice?: boolean; // 기기 연락처에서 가져온 것인지
  // 그룹 관련 정보
  deviceGroups?: string[]; // 속한 기기 그룹 ID들
  groupSource?: DeviceContactGroup['source']; // 주 소스 (icloud, gmail 등)
}

// 연락처 권한 상태
export interface ContactsPermission {
  granted: boolean;
  message?: string;
}

// 연락처 동기화 상태
export interface ContactsSyncState {
  isLoading: boolean;
  lastSyncDate?: string;
  totalContacts: number;
  errorMessage?: string;
  // 그룹 동기화 상태 추가
  isLoadingGroups?: boolean;
  lastGroupSyncDate?: string;
  totalGroups?: number;
  groupErrorMessage?: string;
}

// 할일과 연락처 연결
export interface TodoContactRelation {
  id: string;
  todoId: string;
  contactId: string;
  relation: 'assignee' | 'collaborator' | 'related' | 'mentioned';
  createdAt: string;
  userId: string;
}

// 연락처 필터링 옵션 (개인정보 제외)
export interface ContactsFilter {
  searchTerm?: string;
  relationship?: Contact['relationship'];
  tags?: string[];
  hasCompany?: boolean; // 회사 정보가 있는지
  recentlyContacted?: boolean; // 최근 연락한 사람들
  // 그룹 필터링 옵션 추가
  deviceGroupId?: string; // 특정 기기 그룹으로 필터링
  groupSource?: DeviceContactGroup['source']; // 특정 소스(icloud, gmail 등)로 필터링
  customGroupId?: string; // 사용자 정의 그룹으로 필터링
}

// 기기 연락처 그룹 (iOS/Android 네이티브 그룹)
export interface DeviceContactGroup {
  id: string;           // 기기에서 제공하는 그룹 ID
  name: string;         // 그룹 이름 (예: "모든 연락처(iCloud)", "가족", "직장")
  source: 'icloud' | 'gmail' | 'exchange' | 'local' | 'other'; // 그룹 소스
  isDefault?: boolean;  // 기본 그룹인지 (예: "모든 연락처")
  contactCount?: number; // 그룹 내 연락처 수
}

// 앱에서 관리하는 사용자 정의 그룹
export interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  contactIds: string[];
  userId: string;
  createdAt: string;
  updatedAt: string;
  color?: string;       // 그룹 색상
  icon?: string;        // 그룹 아이콘
  isFromDevice?: boolean; // 기기 그룹에서 가져온 것인지
  deviceGroupId?: string; // 연결된 기기 그룹 ID
}
// ============================================
// Department Types
// ============================================

export type DepartmentCategory = 'church' | 'company' | 'club' | 'community' | 'family' | 'other';
export type AnnouncementType = 'notice' | 'event' | 'news' | 'prayer';

export interface Department {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string;
  image_url: string | null;
  category: DepartmentCategory;
  contact_info: Record<string, string>;
  meeting_day: number | null; // 0(일) ~ 6(토)
  meeting_time: string | null;
  meeting_location: string | null;
  is_active: boolean;
  is_favorite: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DepartmentInput {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string;
  image_url?: string | null;
  category?: DepartmentCategory;
  contact_info?: Record<string, string>;
  meeting_day?: number | null;
  meeting_time?: string | null;
  meeting_location?: string | null;
  is_active?: boolean;
  is_favorite?: boolean;
  order_index?: number;
}

export interface DepartmentAnnouncement {
  id: string;
  user_id: string;
  department_id: string;
  title: string;
  content: string | null;
  announcement_type: AnnouncementType;
  event_date: string | null;
  event_time: string | null;
  event_location: string | null;
  is_pinned: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  department?: Department;
}

export interface DepartmentAnnouncementInput {
  department_id: string;
  title: string;
  content?: string | null;
  announcement_type?: AnnouncementType;
  event_date?: string | null;
  event_time?: string | null;
  event_location?: string | null;
  is_pinned?: boolean;
  is_active?: boolean;
}

export interface PersonDepartment {
  id: string;
  user_id: string;
  person_id: string;
  department_id: string;
  role_in_department: string | null;
  created_at: string;
  // Joined data
  department?: Department;
}

export interface PersonDepartmentInput {
  person_id: string;
  department_id: string;
  role_in_department?: string | null;
}

// ============================================
// Constants
// ============================================

export const DEPARTMENT_CATEGORY_LABELS: Record<DepartmentCategory, string> = {
  church: '교회',
  company: '회사',
  club: '동호회',
  community: '커뮤니티',
  family: '가족',
  other: '기타',
};

export const DEPARTMENT_CATEGORY_ICONS: Record<DepartmentCategory, string> = {
  church: 'Church',
  company: 'Building2',
  club: 'Users',
  community: 'Globe',
  family: 'Home',
  other: 'Folder',
};

export const ANNOUNCEMENT_TYPE_LABELS: Record<AnnouncementType, string> = {
  notice: '공지',
  event: '행사',
  news: '소식',
  prayer: '기도',
};

export const ANNOUNCEMENT_TYPE_ICONS: Record<AnnouncementType, string> = {
  notice: 'Megaphone',
  event: 'Calendar',
  news: 'Newspaper',
  prayer: 'Heart',
};

export const WEEKDAY_LABELS: Record<number, string> = {
  0: '일요일',
  1: '월요일',
  2: '화요일',
  3: '수요일',
  4: '목요일',
  5: '금요일',
  6: '토요일',
};

export const WEEKDAY_SHORT_LABELS: Record<number, string> = {
  0: '일',
  1: '월',
  2: '화',
  3: '수',
  4: '목',
  5: '금',
  6: '토',
};

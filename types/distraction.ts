// ============================================
// 집중 환경 세팅 시스템 타입 정의 (v3)
// 계층적 구조: 카테고리(방해물/환경) → 방법(구체적 행동)
// ============================================

/**
 * 구체적 방법
 */
export interface DistractionMethod {
  id: string;
  categoryId: string;
  text: string;          // "금욕상자에 넣기", "다른 방에 두기"
  isDefault: boolean;    // 기본 방법 여부
  isSelected: boolean;   // 선택 여부
}

/**
 * 방해물/환경 카테고리
 */
export interface DistractionCategory {
  id: string;
  name: string;          // "핸드폰", "TV 리모컨", "책상"
  iconName: string;      // 'Smartphone', 'Tv', 'Armchair' (Lucide 아이콘 이름)
  type: 'digital' | 'media' | 'workspace' | 'custom';
  isDefault: boolean;    // 기본 카테고리 여부
  isExpanded: boolean;   // 펼침 상태
  methods: DistractionMethod[];
}

/**
 * 환경 세팅 결과 (pomodoro_sessions.distraction_plan에 저장)
 */
export interface EnvironmentSetup {
  selectedMethods: {
    categoryId: string;
    categoryName: string;
    methodId: string;
    methodText: string;
  }[];
  completedAt: string | null;
}

// ============================================
// 기본 카테고리 및 방법 정의
// ============================================

export const DEFAULT_CATEGORIES: Omit<DistractionCategory, 'isExpanded'>[] = [
  {
    id: 'phone',
    name: '핸드폰',
    iconName: 'Smartphone',
    type: 'digital',
    isDefault: true,
    methods: [
      { id: 'phone-box', categoryId: 'phone', text: '금욕상자에 넣기', isDefault: true, isSelected: false },
      { id: 'phone-room', categoryId: 'phone', text: '다른 방에 두기', isDefault: true, isSelected: false },
    ]
  },
  {
    id: 'laptop',
    name: '노트북/PC',
    iconName: 'Laptop',
    type: 'digital',
    isDefault: true,
    methods: [
      { id: 'laptop-detox', categoryId: 'laptop', text: '디지털 디톡스 앱 실행하기', isDefault: true, isSelected: false },
    ]
  },
  {
    id: 'remote',
    name: 'TV 리모컨',
    iconName: 'Tv',
    type: 'media',
    isDefault: true,
    methods: [
      { id: 'remote-drawer', categoryId: 'remote', text: '서랍에 넣기', isDefault: true, isSelected: false },
    ]
  },
  {
    id: 'desk',
    name: '책상',
    iconName: 'Armchair',
    type: 'workspace',
    isDefault: true,
    methods: [
      { id: 'desk-clean', categoryId: 'desk', text: '정리하기', isDefault: true, isSelected: false },
    ]
  },
];

/**
 * 커스텀 데이터 (user_preferences에 저장)
 */
export interface CustomEnvironmentData {
  customCategories: {
    id: string;
    name: string;
    methods: { id: string; text: string; }[];
  }[];
  customMethods: {
    categoryId: string;  // 기본 카테고리에 추가한 커스텀 방법
    methods: { id: string; text: string; }[];
  }[];
}

/** user_preferences 키 */
export const ENVIRONMENT_CUSTOM_DATA_KEY = 'environment_custom_data_v3';

// ============================================
// 레거시 타입 (v2 호환성 유지)
// ============================================

/**
 * @deprecated v3의 DistractionMethod 사용
 */
export interface EnvironmentCheckItem {
  id: string;
  text: string;
  category: 'digital' | 'media' | 'workspace' | 'custom';
  checked: boolean;
  isDefault: boolean;
}

/**
 * @deprecated v3의 DEFAULT_CATEGORIES 사용
 */
export const DEFAULT_ENVIRONMENT_ITEMS: Omit<EnvironmentCheckItem, 'id' | 'checked'>[] = [
  { text: '핸드폰 치우기', category: 'digital', isDefault: true },
  { text: 'TV 리모컨 치우기', category: 'media', isDefault: true },
  { text: '책상 정리하기', category: 'workspace', isDefault: true },
];

/**
 * @deprecated v3의 CustomEnvironmentData 사용
 */
export interface CustomEnvironmentItem {
  id: string;
  text: string;
  createdAt: string;
}

/**
 * @deprecated v3의 ENVIRONMENT_CUSTOM_DATA_KEY 사용
 */
export const ENVIRONMENT_CUSTOM_ITEMS_KEY = 'environment_custom_items';

/**
 * @deprecated v3는 Lucide 아이콘 사용
 */
export const CATEGORY_ICONS: Record<EnvironmentCheckItem['category'], string> = {
  digital: '📱',
  media: '📺',
  workspace: '🪑',
  custom: '✏️',
};

// ============================================
// 레거시 타입 (호환성 유지)
// ============================================

/**
 * @deprecated EnvironmentSetup 사용
 */
export interface DistractionPlan {
  distraction: string;
  response: string;
  preset_id: string | null;
  review_result: DistractionReviewResult | null;
}

/**
 * @deprecated 사용 안함
 */
export type DistractionReviewResult = 'success' | 'partial' | 'failed';

/**
 * @deprecated 사용 안함
 */
export interface DistractionPreset {
  id: string;
  user_id: string;
  distraction_text: string;
  response_text: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated 사용 안함
 */
export interface DistractionHistory {
  recent_distractions: string[];
  recent_responses: string[];
  last_updated: string;
}

/**
 * @deprecated 사용 안함
 */
export interface DistractionPresetInput {
  distraction_text: string;
  response_text: string;
}

/**
 * @deprecated 사용 안함
 */
export interface DistractionPresetUpdate {
  distraction_text?: string;
  response_text?: string;
  is_active?: boolean;
}

/**
 * @deprecated 사용 안함
 */
export const DISTRACTION_HISTORY_MAX_ITEMS = 20;

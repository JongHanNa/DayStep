// Memo Tag System Constants
// 노트 태그 시스템 상수 정의

import { MemoTagCategory } from '@/types';

/**
 * 노트 태그 카테고리 정의
 */
export const MEMO_TAG_CATEGORIES: MemoTagCategory[] = [
  {
    category: 'productivity',
    name: '생산성',
    description: '업무, 공부, 프로젝트 관련 태그',
    icon: 'briefcase'
  },
  {
    category: 'personal',
    name: '개인',
    description: '개인적인 활동과 관심사 관련 태그',
    icon: 'user'
  },
  {
    category: 'priority',
    name: '우선순위',
    description: '중요도와 긴급성을 나타내는 태그',
    icon: 'star'
  },
  {
    category: 'type',
    name: '유형',
    description: '메모의 종류와 성격을 구분하는 태그',
    icon: 'tag'
  },
  {
    category: 'general',
    name: '일반',
    description: '기타 범용 태그',
    icon: 'circle'
  }
];

/**
 * 카테고리별 아이콘 매핑
 */
export const CATEGORY_ICONS = {
  productivity: 'briefcase',
  personal: 'user',
  priority: 'star',
  type: 'tag',
  general: 'circle'
} as const;

/**
 * 카테고리별 색상 테마
 */
export const CATEGORY_COLORS = {
  productivity: {
    primary: '#3B82F6',
    secondary: '#DBEAFE',
    text: '#1E40AF'
  },
  personal: {
    primary: '#EC4899',
    secondary: '#FCE7F3',
    text: '#BE185D'
  },
  priority: {
    primary: '#F59E0B',
    secondary: '#FEF3C7',
    text: '#D97706'
  },
  type: {
    primary: '#8B5CF6',
    secondary: '#EDE9FE',
    text: '#7C3AED'
  },
  general: {
    primary: '#6B7280',
    secondary: '#F3F4F6',
    text: '#374151'
  }
} as const;

/**
 * 기본 태그 템플릿 정의 (migration에서 삽입되는 데이터와 일치)
 */
export const DEFAULT_TAG_TEMPLATES = {
  productivity: [
    { name: '업무', color: '#3B82F6', icon: 'briefcase', description: '업무 관련 메모' },
    { name: '공부', color: '#8B5CF6', icon: 'book-open', description: '학습 및 공부 관련' },
    { name: '프로젝트', color: '#06B6D4', icon: 'folder', description: '프로젝트 관련 메모' },
    { name: '미팅', color: '#10B981', icon: 'users', description: '회의 및 미팅 관련' },
    { name: '아이디어', color: '#F59E0B', icon: 'lightbulb', description: '떠오른 아이디어 기록' }
  ],
  personal: [
    { name: '개인', color: '#EC4899', icon: 'user', description: '개인적인 메모' },
    { name: '가족', color: '#F97316', icon: 'heart', description: '가족 관련 메모' },
    { name: '건강', color: '#84CC16', icon: 'activity', description: '건강 관련 메모' },
    { name: '취미', color: '#A855F7', icon: 'music', description: '취미 활동 관련' },
    { name: '여행', color: '#14B8A6', icon: 'map-pin', description: '여행 계획 및 기록' }
  ],
  priority: [
    { name: '긴급', color: '#EF4444', icon: 'alert-circle', description: '긴급한 사항' },
    { name: '중요', color: '#F97316', icon: 'star', description: '중요한 사항' },
    { name: '나중에', color: '#6B7280', icon: 'clock', description: '나중에 처리할 사항' },
    { name: '완료', color: '#22C55E', icon: 'check-circle', description: '완료된 사항' }
  ],
  type: [
    { name: '할일', color: '#3B82F6', icon: 'check-square', description: '해야 할 일' },
    { name: '메모', color: '#6B7280', icon: 'sticky-note', description: '단순 메모' },
    { name: '링크', color: '#8B5CF6', icon: 'link', description: '링크 및 참조' },
    { name: '목표', color: '#F59E0B', icon: 'target', description: '목표 및 계획' }
  ]
} as const;

/**
 * 태그 색상 팔레트 (사용자가 선택할 수 있는 색상들)
 */
export const TAG_COLOR_PALETTE = [
  '#EF4444', // red
  '#F97316', // orange
  '#F59E0B', // amber
  '#84CC16', // lime
  '#22C55E', // green
  '#14B8A6', // teal
  '#06B6D4', // cyan
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#A855F7', // purple
  '#EC4899', // pink
  '#F43F5E', // rose
  '#6B7280', // gray
  '#475569', // slate
] as const;

/**
 * 태그 아이콘 목록 (lucide 아이콘 키)
 */
export const TAG_ICON_OPTIONS = [
  'tag',
  'bookmark',
  'star',
  'heart',
  'flag',
  'circle',
  'square',
  'triangle',
  'diamond',
  'briefcase',
  'user',
  'users',
  'home',
  'book-open',
  'lightbulb',
  'target',
  'clock',
  'calendar',
  'music',
  'camera',
  'map-pin',
  'activity',
  'check-circle',
  'alert-circle',
  'info',
  'link',
  'folder',
  'file',
  'sticky-note'
] as const;

/**
 * 신규 사용자를 위한 추천 기본 태그 (카테고리당 최대 3개)
 */
export const RECOMMENDED_STARTER_TAGS = [
  // 생산성 (3개)
  { category: 'productivity', templates: ['업무', '공부', '아이디어'] },
  // 개인 (2개)
  { category: 'personal', templates: ['개인', '건강'] },
  // 우선순위 (2개)
  { category: 'priority', templates: ['중요', '나중에'] }
] as const;

/**
 * 태그 이름 유효성 검사 규칙
 */
export const TAG_VALIDATION = {
  NAME_MIN_LENGTH: 1,
  NAME_MAX_LENGTH: 50,
  MAX_TAGS_PER_MEMO: 10,
  MAX_USER_TAGS: 100
} as const;

/**
 * UI 디스플레이 설정
 */
export const TAG_DISPLAY_CONFIG = {
  MAX_VISIBLE_TAGS: 3, // 노트 카드에서 보여줄 최대 태그 수
  TAG_TRUNCATE_LENGTH: 12, // 태그 이름 자르기 길이
  RECENT_TAGS_LIMIT: 10, // 최근 사용 태그 표시 개수
  POPULAR_TAGS_LIMIT: 15 // 인기 태그 표시 개수
} as const;
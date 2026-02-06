/**
 * 할일 완료 시 동작 방식 타입 정의
 */
export type CompletionBehavior = 'move-to-completed' | 'strikethrough-inline';

/**
 * 할일 완료 관련 설정
 */
export interface TodoCompletionSettings {
  /** 완료 시 동작 방식 */
  behavior: CompletionBehavior;
  /** 완료된 할일 표시 여부 (취소선 모드에서만 사용) */
  showCompletedItems: boolean;
  /** 완료된 할일 투명도 (0.3-1.0) */
  completedItemsOpacity: number;
}

/**
 * 설정 옵션 메타데이터
 */
export interface CompletionBehaviorOption {
  value: CompletionBehavior;
  label: string;
  description: string;
  icon?: string;
}

/**
 * 사전 정의된 완료 동작 옵션들
 */
export const COMPLETION_BEHAVIOR_OPTIONS: CompletionBehaviorOption[] = [
  {
    value: 'move-to-completed',
    label: '완료 영역으로 이동',
    description: '완료된 할일을 별도 영역으로 이동시킵니다.',
    icon: '📋'
  },
  {
    value: 'strikethrough-inline',
    label: '현재 위치에서 취소선 표시',
    description: '완료된 할일을 현재 위치에 취소선으로 표시합니다.',
    icon: '✏️'
  }
];

/**
 * 기본 할일 완료 설정값
 */
export const DEFAULT_TODO_COMPLETION_SETTINGS: TodoCompletionSettings = {
  behavior: 'strikethrough-inline', // 현재 위치에서 취소선 표시가 기본값
  showCompletedItems: true,
  completedItemsOpacity: 0.7
};

/**
 * Second Brain 항목 타입 정의 (상태 선택용)
 */
export type SecondBrainItemType = 'area' | 'resource' | 'archive';
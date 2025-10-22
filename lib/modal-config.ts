/**
 * 중앙 집중식 모달 설정 관리
 * 모든 react-modal-sheet 기반 모달들의 공통 설정을 관리합니다.
 */

// 모달 타입별 snapPoints 정의
export const MODAL_SNAP_POINTS = {
  // 메인 컨텐츠 모달 (폼, 상세 정보 등)
  FULL_CONTENT: [0.95, 0.6, 0] as number[],

  // 브라우징/선택 모달 (리스트, 갤러리 등)
  BROWSE_CONTENT: [0.9, 0.6, 0] as number[],

  // 전체 화면 모달 (에디터, 복잡한 폼 등)
  FULLSCREEN: [1.0, 0.6, 0] as number[],

  // 작은 폼 모달 (간단한 입력, 설정 등)
  COMPACT: [0.85, 0.6, 0] as number[],

  // 고정 높이 모달 (작은 선택기, 툴팁 등)
  FIXED_SMALL: [0.6, 0] as number[],
} as const;

// 모달 공통 설정
export const MODAL_COMMON_CONFIG = {
  initialSnap: 0,
  dragCloseThreshold: 0.6,
  dragVelocityThreshold: 500,
  prefersReducedMotion: false,
  disableDrag: false,
};

// 모달 타입별 권장 사용 케이스
export const MODAL_TYPE_GUIDE = {
  FULL_CONTENT: [
    '할일 추가/수정 모달',
    '연락처 상세 모달',
    '노트 링크 모달',
    '아이콘 브라우저 모달',
  ],
  BROWSE_CONTENT: [
    '동기부여 메시지 모달',
    '할일 선택 패널',
  ],
  FULLSCREEN: [
    '연락처 목록 모달',
    '퀵노트 시트',
    '노트 에디터 모달',
  ],
  COMPACT: [
    '달력 모달',
  ],
  FIXED_SMALL: [
    '시간 선택 모달',
    '간단한 picker 모달',
  ],
} as const;

// 유틸리티 함수: 모달 설정 생성
export function createModalConfig(
  type: keyof typeof MODAL_SNAP_POINTS,
  overrides: Partial<typeof MODAL_COMMON_CONFIG & {
    initialSnap?: number;
    dragCloseThreshold?: number;
    dragVelocityThreshold?: number;
    prefersReducedMotion?: boolean;
    disableDrag?: boolean;
  }> = {}
) {
  return {
    snapPoints: MODAL_SNAP_POINTS[type],
    ...MODAL_COMMON_CONFIG,
    ...overrides,
  };
}

// TypeScript 타입 정의
export type ModalType = keyof typeof MODAL_SNAP_POINTS;
export type ModalConfig = ReturnType<typeof createModalConfig>;
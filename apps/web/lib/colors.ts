/**
 * 색상 유틸 + 시맨틱 컬러 단일 소스
 * 모바일 RN(`apps/mobile-rn/src/lib/todoUtils.ts`, `apps/mobile-rn/src/theme/colors.ts`)과 의미 동일
 */

/** hex 색상에 opacity를 적용한 rgba 문자열 반환 */
export function hexWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export interface SemanticColorMap {
  error: string;
  errorSoft: string;
  success: string;
  warning: string;
  info: string;
}

export const SEMANTIC_COLORS: SemanticColorMap = {
  error: '#DC2626',
  errorSoft: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
};

export const SEMANTIC_COLORS_DARK: SemanticColorMap = {
  error: '#F87171',
  errorSoft: '#FCA5A5',
  success: '#4ADE80',
  warning: '#FBBF24',
  info: '#60A5FA',
};

export type SemanticStatus = 'success' | 'error' | 'pending' | 'info' | 'warning';

export function getSemanticColors(resolvedTheme: 'light' | 'dark'): SemanticColorMap {
  return resolvedTheme === 'dark' ? SEMANTIC_COLORS_DARK : SEMANTIC_COLORS;
}

/** 상태 → 시맨틱 색상 헬퍼 (toast/indicator 공용) */
export function getStatusColor(
  status: SemanticStatus,
  resolvedTheme: 'light' | 'dark' = 'light',
): string {
  const palette = getSemanticColors(resolvedTheme);
  switch (status) {
    case 'success':
      return palette.success;
    case 'error':
      return palette.error;
    case 'warning':
      return palette.warning;
    case 'pending':
    case 'info':
    default:
      return palette.info;
  }
}

/**
 * Todo utility functions
 * DndContext + TodoCard 등에서 공유 사용
 */

/** hex 색상에 opacity를 적용한 rgba 문자열 반환 */
export function hexWithOpacity(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export function getPriorityColor(
  importance?: boolean | null,
  urgency?: boolean | null,
  primaryColor?: string,
): string | null {
  const base = primaryColor || '#3B82F6';
  if (importance && urgency) return base; // 긴급+중요: 메인컬러
  if (importance && !urgency) return hexWithOpacity(base, 0.7); // 중요만
  if (!importance && urgency) return hexWithOpacity(base, 0.5); // 긴급만
  return null;
}

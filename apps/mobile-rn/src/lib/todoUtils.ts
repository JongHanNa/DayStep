/**
 * Todo utility functions
 * DndContext + TodoCard 등에서 공유 사용
 */

export function getPriorityColor(
  importance?: boolean | null,
  urgency?: boolean | null,
): string | null {
  if (importance && urgency) return '#EF4444'; // 긴급+중요
  if (importance && !urgency) return '#F59E0B'; // 중요
  if (!importance && urgency) return '#3B82F6'; // 긴급
  return null;
}

/**
 * Inbox Messages Utility
 * 수집함 카드에 표시할 동적 상태 메시지 생성
 */

import type { InboxItem } from '@/types/second-brain';

/**
 * 할일의 현재 상태를 분석하여 수집함에서 사라지기 위한 조건 메시지 생성
 *
 * @param todo 할일 객체 (InboxItem)
 * @returns 사용자에게 표시할 안내 메시지 (null = 메시지 불필요)
 *
 * @example
 * // none 상태
 * getInboxRemovalMessage({ clarification: 'none' })
 * // → "명료화를 완료하면 수집함에서 사라집니다"
 *
 * @example
 * // reminder 날짜 미선택
 * getInboxRemovalMessage({ clarification: 'reminder', start_time: null })
 * // → "다시알림 날짜를 선택하면 수집함에서 사라집니다"
 *
 * @example
 * // next_action 상황 미선택
 * getInboxRemovalMessage({ clarification: 'next_action', next_action_contexts: [] })
 * // → "다음행동 상황을 선택하면 수집함에서 사라집니다"
 *
 * @example
 * // waiting (이미 사라진 상태)
 * getInboxRemovalMessage({ clarification: 'waiting' })
 * // → null
 */
export function getInboxRemovalMessage(todo: InboxItem): string | null {
  const clarification = todo.clarification;
  const startTime = todo.scheduled_date; // InboxItem에서는 scheduled_date 사용
  const nextActionContexts = todo.next_action_status ? [todo.next_action_status] : []; // InboxItem 구조에 맞게 수정

  // none: 명료화 필요
  if (!clarification || clarification === 'none') {
    return '명료화를 완료하면 수집함에서 사라집니다';
  }

  /* 임시 숨김: 다시알림 조건
  // reminder: 날짜 미선택 시에만 메시지
  if (clarification === 'reminder' && !startTime) {
    return '다시알림 날짜를 선택하면 수집함에서 사라집니다';
  }
  */

  // scheduled: 날짜 미선택 시에만 메시지
  if (clarification === 'scheduled' && !startTime) {
    return '일정 날짜를 선택하면 수집함에서 사라집니다';
  }

  // next_action: 상황 미선택 시에만 메시지
  if (clarification === 'next_action') {
    const hasContexts = nextActionContexts && nextActionContexts.length > 0;
    if (!hasContexts) {
      return '다음행동 상황을 선택하면 수집함에서 사라집니다';
    }
  }

  // waiting, someday, 조건 충족된 케이스 → 메시지 없음
  // (이 케이스들은 DB 필터링으로 이미 수집함에서 제거되므로 실행되지 않음)
  return null;
}

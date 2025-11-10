import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
  type QueryCondition,
} from '@/lib/supabase/core';

/**
 * 점검 체크리스트 항목 타입
 */
export interface ReviewChecklistItem {
  id: string;
  user_id: string;
  section: 'empty' | 'refresh';
  label: string;
  is_default: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * 점검 체크리스트 상태 타입
 */
export interface ReviewChecklistState {
  id: string;
  user_id: string;
  checklist_item_id: string;
  is_checked: boolean;
  checked_at: string | null;
  reset_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 기본 수집 매체 목록
 */
const DEFAULT_EMPTY_SOURCES = [
  '책상',
  '이메일',
  '스크린샷',
  '바탕화면',
  '북마크',
  '카카오톡',
  '캘린더 앱',
  '다른 메모앱',
  '문자 메시지',
  '머리속 모든 생각',
];

/**
 * 기본 갱신하기 체크리스트
 */
const DEFAULT_REFRESH_CHECKLIST = [
  '다음 행동 목록 점검',
  '지나간 일정 검토',
  '앞으로의 일정 검토',
  '프로젝트 상태 점검',
  '대기중 목록 점검',
  '목표 최신화',
];

/**
 * 사용자의 체크리스트 항목 조회
 */
export async function fetchReviewChecklists(
  userId: string,
  section: 'empty' | 'refresh'
): Promise<ReviewChecklistItem[]> {
  try {
    const conditions: QueryCondition[] = [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'section', operator: 'eq', value: section },
    ];

    const data = await queryRLSTableWithJWT('review_checklist_items', conditions, {
      order: 'display_order.asc,created_at.asc',
    });

    // 데이터가 없으면 기본 체크리스트 생성
    if (!data || data.length === 0) {
      return await initializeDefaultChecklist(userId, section);
    }

    return data;
  } catch (error) {
    console.error('fetchReviewChecklists failed:', error);
    throw error;
  }
}

/**
 * 기본 체크리스트 초기화
 */
async function initializeDefaultChecklist(
  userId: string,
  section: 'empty' | 'refresh'
): Promise<ReviewChecklistItem[]> {
  try {
    const defaultItems = section === 'empty' ? DEFAULT_EMPTY_SOURCES : DEFAULT_REFRESH_CHECKLIST;

    const insertPromises = defaultItems.map((label, index) =>
      createWithJWT('review_checklist_items', {
        user_id: userId,
        section,
        label,
        is_default: true,
        display_order: index,
      })
    );

    const results = await Promise.all(insertPromises);
    return results.filter((item) => item != null);
  } catch (error) {
    console.error('initializeDefaultChecklist failed:', error);
    throw error;
  }
}

/**
 * 새로운 체크리스트 항목 추가 (사용자 커스텀)
 */
export async function createChecklistItem(
  userId: string,
  section: 'empty' | 'refresh',
  label: string
): Promise<ReviewChecklistItem> {
  try {
    // 현재 최대 display_order 조회
    const conditions: QueryCondition[] = [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'section', operator: 'eq', value: section },
    ];

    const existingItems = await queryRLSTableWithJWT('review_checklist_items', conditions, {
      select: 'display_order',
      order: 'display_order.desc',
      limit: 1,
    });

    const maxOrder = existingItems && existingItems.length > 0 ? existingItems[0].display_order : -1;
    const nextOrder = maxOrder + 1;

    const newItem = await createWithJWT('review_checklist_items', {
      user_id: userId,
      section,
      label,
      is_default: false,
      display_order: nextOrder,
    });

    return newItem;
  } catch (error) {
    console.error('createChecklistItem failed:', error);
    throw error;
  }
}

/**
 * 체크리스트 항목 삭제
 */
export async function deleteChecklistItem(userId: string, itemId: string): Promise<void> {
  try {
    const conditions: QueryCondition[] = [
      { column: 'id', operator: 'eq', value: itemId },
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'is_default', operator: 'eq', value: false },
    ];

    await deleteWithJWT('review_checklist_items', conditions);
  } catch (error) {
    console.error('deleteChecklistItem failed:', error);
    throw error;
  }
}

/**
 * 체크리스트 상태 조회
 */
export async function fetchChecklistStates(userId: string): Promise<ReviewChecklistState[]> {
  try {
    const conditions: QueryCondition = {
      column: 'user_id',
      operator: 'eq',
      value: userId,
    };

    const data = await queryRLSTableWithJWT('review_checklist_state', conditions);
    return data || [];
  } catch (error) {
    console.error('fetchChecklistStates failed:', error);
    throw error;
  }
}

/**
 * 체크리스트 상태 업데이트 (체크/언체크)
 * Supabase UPSERT: Prefer: resolution=merge-duplicates 헤더 사용
 */
export async function updateChecklistState(
  userId: string,
  checklistItemId: string,
  isChecked: boolean
): Promise<void> {
  try {
    const checkedAt = isChecked ? new Date().toISOString() : null;

    // UPSERT를 위해 createWithJWT에 특별 헤더 추가
    // Supabase REST API는 POST + Prefer: resolution=merge-duplicates로 UPSERT 구현
    const data = {
      user_id: userId,
      checklist_item_id: checklistItemId,
      is_checked: isChecked,
      checked_at: checkedAt,
    };

    // 기존 상태 확인
    const existingConditions: QueryCondition[] = [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'checklist_item_id', operator: 'eq', value: checklistItemId },
    ];

    const existing = await queryRLSTableWithJWT('review_checklist_state', existingConditions, {
      limit: 1,
      single: true,
    });

    if (existing) {
      // UPDATE
      await updateWithJWT('review_checklist_state', existingConditions, {
        is_checked: isChecked,
        checked_at: checkedAt,
      });
    } else {
      // INSERT
      await createWithJWT('review_checklist_state', data);
    }
  } catch (error) {
    console.error('updateChecklistState failed:', error);
    throw error;
  }
}

/**
 * 체크리스트 초기화 (모든 체크 해제)
 */
export async function resetChecklist(userId: string): Promise<void> {
  try {
    const conditions: QueryCondition = {
      column: 'user_id',
      operator: 'eq',
      value: userId,
    };

    await updateWithJWT('review_checklist_state', conditions, {
      is_checked: false,
      checked_at: null,
      reset_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('resetChecklist failed:', error);
    throw error;
  }
}

/**
 * 명료화 속성별 할일 조회 (점검 페이지 전용)
 */
export async function fetchReviewTodos(
  userId: string,
  clarifyType?: string
): Promise<any[]> {
  try {
    const conditions: QueryCondition[] = [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'item_type', operator: 'eq', value: 'todo' },
    ];

    if (clarifyType) {
      conditions.push({ column: 'clarification', operator: 'eq', value: clarifyType });
    }

    const data = await queryRLSTableWithJWT('inbox_items', conditions, {
      order: 'created_at.desc',
    });

    return data || [];
  } catch (error) {
    console.error('fetchReviewTodos failed:', error);
    throw error;
  }
}

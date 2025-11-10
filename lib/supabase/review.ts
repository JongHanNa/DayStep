import { supabase } from '@/lib/supabase';

// Helper for executing raw SQL queries - TEMPORARY IMPLEMENTATION
// TODO: Refactor to use queryRLSTableWithJWT, createWithJWT, updateWithJWT, deleteWithJWT from core.ts
async function executeQuery<T = any>(query: string): Promise<{ data: T[] | null; error: any }> {
  try {
    // Using supabase client directly for now - needs RPC function implementation in DB
    const { data, error } = await (supabase as any).rpc('execute_sql', { sql: query });
    return { data: (data as T[]) || null, error };
  } catch (error) {
    console.error('executeQuery error:', error);
    return { data: null, error };
  }
}

// Helper wrapper for backward compatibility
const supabaseWebViewHelper = {
  executeQuery
};

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
    const query = `
      SELECT *
      FROM review_checklist_items
      WHERE user_id = '${userId}' AND section = '${section}'
      ORDER BY display_order ASC, created_at ASC
    `;

    const { data, error } = await supabaseWebViewHelper.executeQuery<ReviewChecklistItem>(query);

    if (error) {
      console.error('fetchReviewChecklists error:', error);
      throw error;
    }

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

    const insertPromises = defaultItems.map((label, index) => {
      const query = `
        INSERT INTO review_checklist_items (user_id, section, label, is_default, display_order)
        VALUES ('${userId}', '${section}', '${label}', true, ${index})
        RETURNING *
      `;
      return supabaseWebViewHelper.executeQuery<ReviewChecklistItem>(query);
    });

    const results = await Promise.all(insertPromises);

    // 생성된 항목 반환
    return results
      .filter((result: any) => result.data && result.data.length > 0)
      .map((result: any) => result.data![0]);
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
    const maxOrderQuery = `
      SELECT COALESCE(MAX(display_order), -1) as max_order
      FROM review_checklist_items
      WHERE user_id = '${userId}' AND section = '${section}'
    `;

    const { data: maxData } = await supabaseWebViewHelper.executeQuery<{ max_order: number }>(
      maxOrderQuery
    );
    const nextOrder = (maxData?.[0]?.max_order || 0) + 1;

    const query = `
      INSERT INTO review_checklist_items (user_id, section, label, is_default, display_order)
      VALUES ('${userId}', '${section}', '${label.replace(/'/g, "''")}', false, ${nextOrder})
      RETURNING *
    `;

    const { data, error } = await supabaseWebViewHelper.executeQuery<ReviewChecklistItem>(query);

    if (error) {
      console.error('createChecklistItem error:', error);
      throw error;
    }

    return data![0];
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
    const query = `
      DELETE FROM review_checklist_items
      WHERE id = '${itemId}' AND user_id = '${userId}' AND is_default = false
    `;

    const { error } = await supabaseWebViewHelper.executeQuery(query);

    if (error) {
      console.error('deleteChecklistItem error:', error);
      throw error;
    }
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
    const query = `
      SELECT *
      FROM review_checklist_state
      WHERE user_id = '${userId}'
    `;

    const { data, error } = await supabaseWebViewHelper.executeQuery<ReviewChecklistState>(query);

    if (error) {
      console.error('fetchChecklistStates error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('fetchChecklistStates failed:', error);
    throw error;
  }
}

/**
 * 체크리스트 상태 업데이트 (체크/언체크)
 */
export async function updateChecklistState(
  userId: string,
  checklistItemId: string,
  isChecked: boolean
): Promise<void> {
  try {
    const checkedAt = isChecked ? `'${new Date().toISOString()}'` : 'NULL';

    // UPSERT (ON CONFLICT UPDATE)
    const query = `
      INSERT INTO review_checklist_state (user_id, checklist_item_id, is_checked, checked_at)
      VALUES ('${userId}', '${checklistItemId}', ${isChecked}, ${checkedAt})
      ON CONFLICT (user_id, checklist_item_id)
      DO UPDATE SET
        is_checked = ${isChecked},
        checked_at = ${checkedAt},
        updated_at = NOW()
    `;

    const { error } = await supabaseWebViewHelper.executeQuery(query);

    if (error) {
      console.error('updateChecklistState error:', error);
      throw error;
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
    const query = `
      UPDATE review_checklist_state
      SET is_checked = false, checked_at = NULL, reset_at = NOW(), updated_at = NOW()
      WHERE user_id = '${userId}'
    `;

    const { error } = await supabaseWebViewHelper.executeQuery(query);

    if (error) {
      console.error('resetChecklist error:', error);
      throw error;
    }
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
    let clarificationFilter = '';
    if (clarifyType) {
      clarificationFilter = `AND clarification = '${clarifyType}'`;
    }

    const query = `
      SELECT *
      FROM inbox_items
      WHERE user_id = '${userId}'
        AND item_type = 'todo'
        ${clarificationFilter}
      ORDER BY created_at DESC
    `;

    const { data, error } = await supabaseWebViewHelper.executeQuery(query);

    if (error) {
      console.error('fetchReviewTodos error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('fetchReviewTodos failed:', error);
    throw error;
  }
}

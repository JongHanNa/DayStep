/**
 * Areas/Resources CRUD 도구
 *
 * 책임(Area)과 자원(Resource) 관리
 */

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';
import type { McpToolCallResult } from '../types/mcp.ts';
import type {
  CreateAreaResourceInput,
  ListAreasResourcesInput,
  GetAreaResourceInput,
  UpdateAreaResourceInput,
  DeleteAreaResourceInput,
  ArchiveAreaResourceInput,
} from '../types/tools.ts';
import type { DateContext } from '../utils/date.ts';
import {
  createSuccessResult,
  createErrorResult,
  createListResult,
  createConfirmationRequired,
  getStatusEmoji,
} from '../utils/response.ts';

// ============================================================================
// 포맷터
// ============================================================================

interface AreaResourceRow {
  id: string;
  title: string;
  status: string;
  icon?: string;
  color?: string;
  is_pinned: boolean;
  order_index: number;
  created_at: string;
}

function formatAreaResource(ar: AreaResourceRow): string {
  const typeLabel = ar.status === 'area' ? '책임' : ar.status === 'resource' ? '자원' : '보관됨';
  const pin = ar.is_pinned ? '📌 ' : '';
  return `${pin}[${typeLabel}] ${ar.title} (ID: ${ar.id})`;
}

// ============================================================================
// CRUD 구현
// ============================================================================

/**
 * 책임/자원 생성
 */
export async function createAreaResource(
  supabase: SupabaseClient,
  userId: string,
  input: CreateAreaResourceInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { title, status, icon, color, is_pinned } = input;

  if (!title || !status) {
    return createErrorResult('title과 status는 필수입니다.');
  }

  if (!['area', 'resource'].includes(status)) {
    return createErrorResult('status는 "area" 또는 "resource"여야 합니다.');
  }

  // 최대 order_index 조회
  const { data: maxOrder } = await supabase
    .from('areas_resources')
    .select('order_index')
    .eq('user_id', userId)
    .order('order_index', { ascending: false })
    .limit(1)
    .single();

  const newOrderIndex = (maxOrder?.order_index ?? -1) + 1;

  const { data, error } = await supabase
    .from('areas_resources')
    .insert({
      user_id: userId,
      title,
      status,
      icon: icon || null,
      color: color || '#A8DADC',
      is_pinned: is_pinned || false,
      order_index: newOrderIndex,
    })
    .select()
    .single();

  if (error) {
    return createErrorResult(`생성 실패: ${error.message}`);
  }

  const typeLabel = status === 'area' ? '책임' : '자원';
  return createSuccessResult(`${typeLabel} "${title}"이(가) 생성되었습니다.`, {
    id: data.id,
    title: data.title,
    status: data.status,
  });
}

/**
 * 책임/자원 목록 조회
 */
export async function listAreasResources(
  supabase: SupabaseClient,
  userId: string,
  input: ListAreasResourcesInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { status, is_pinned, limit = 50, offset = 0 } = input;

  let query = supabase
    .from('areas_resources')
    .select('*')
    .eq('user_id', userId)
    .order('is_pinned', { ascending: false })
    .order('order_index', { ascending: true });

  if (status) {
    query = query.eq('status', status);
  }
  if (is_pinned !== undefined) {
    query = query.eq('is_pinned', is_pinned);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;

  if (error) {
    return createErrorResult(`조회 실패: ${error.message}`);
  }

  const statusLabel = status
    ? status === 'area'
      ? '책임'
      : status === 'resource'
      ? '자원'
      : '보관된 항목'
    : '책임/자원';

  return createListResult(data || [], formatAreaResource, {
    title: `📂 ${statusLabel} 목록`,
    emptyMessage: `${statusLabel}이(가) 없습니다.`,
  });
}

/**
 * 책임/자원 상세 조회
 */
export async function getAreaResource(
  supabase: SupabaseClient,
  userId: string,
  input: GetAreaResourceInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  const { data, error } = await supabase
    .from('areas_resources')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return createErrorResult('항목을 찾을 수 없습니다.');
  }

  // 연결된 목표 수 조회
  const { count: goalCount } = await supabase
    .from('goals')
    .select('id', { count: 'exact' })
    .eq('area_resource_id', id);

  // 연결된 프로젝트 수 조회
  const { count: projectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact' })
    .eq('area_resource_id', id);

  const typeLabel = data.status === 'area' ? '책임' : data.status === 'resource' ? '자원' : '보관됨';

  const details = `
📋 ${typeLabel} 상세 정보

제목: ${data.title}
유형: ${typeLabel}
아이콘: ${data.icon || '없음'}
색상: ${data.color}
고정: ${data.is_pinned ? '예' : '아니오'}
연결된 목표: ${goalCount || 0}개
연결된 프로젝트: ${projectCount || 0}개
생성일: ${new Date(data.created_at).toLocaleDateString('ko-KR')}
ID: ${data.id}
`.trim();

  return {
    content: [{ type: 'text', text: details }],
    isError: false,
  };
}

/**
 * 책임/자원 수정
 */
export async function updateAreaResource(
  supabase: SupabaseClient,
  userId: string,
  input: UpdateAreaResourceInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, ...updates } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('areas_resources')
    .select('*')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('항목을 찾을 수 없습니다.');
  }

  // 빈 업데이트 방지
  const validUpdates: Record<string, unknown> = {};
  if (updates.title !== undefined) validUpdates.title = updates.title;
  if (updates.status !== undefined) validUpdates.status = updates.status;
  if (updates.icon !== undefined) validUpdates.icon = updates.icon;
  if (updates.color !== undefined) validUpdates.color = updates.color;
  if (updates.is_pinned !== undefined) validUpdates.is_pinned = updates.is_pinned;
  if (updates.order_index !== undefined) validUpdates.order_index = updates.order_index;

  if (Object.keys(validUpdates).length === 0) {
    return createErrorResult('수정할 항목이 없습니다.');
  }

  validUpdates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('areas_resources')
    .update(validUpdates)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    return createErrorResult(`수정 실패: ${error.message}`);
  }

  return createSuccessResult(`"${data.title}"이(가) 수정되었습니다.`);
}

/**
 * 책임/자원 삭제
 */
export async function deleteAreaResource(
  supabase: SupabaseClient,
  userId: string,
  input: DeleteAreaResourceInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id, force } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('areas_resources')
    .select('title, status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('항목을 찾을 수 없습니다.');
  }

  // 연결된 항목 확인
  const { count: goalCount } = await supabase
    .from('goals')
    .select('id', { count: 'exact' })
    .eq('area_resource_id', id);

  const { count: projectCount } = await supabase
    .from('projects')
    .select('id', { count: 'exact' })
    .eq('area_resource_id', id);

  const linkedCount = (goalCount || 0) + (projectCount || 0);

  if (linkedCount > 0 && !force) {
    return createConfirmationRequired(
      `"${existing.title}"에 연결된 항목이 ${linkedCount}개 있습니다.`,
      '삭제하면 연결이 해제됩니다. force: true 옵션을 사용하여 다시 호출해주세요.'
    );
  }

  // 연결 해제
  if (linkedCount > 0) {
    await supabase.from('goals').update({ area_resource_id: null }).eq('area_resource_id', id);
    await supabase.from('projects').update({ area_resource_id: null }).eq('area_resource_id', id);
  }

  // 삭제
  const { error } = await supabase
    .from('areas_resources')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return createErrorResult(`삭제 실패: ${error.message}`);
  }

  return createSuccessResult(`"${existing.title}"이(가) 삭제되었습니다.`);
}

/**
 * 책임/자원 보관
 */
export async function archiveAreaResource(
  supabase: SupabaseClient,
  userId: string,
  input: ArchiveAreaResourceInput,
  _dateContext: DateContext
): Promise<McpToolCallResult> {
  const { id } = input;

  if (!id) {
    return createErrorResult('id는 필수입니다.');
  }

  // 기존 데이터 확인
  const { data: existing, error: fetchError } = await supabase
    .from('areas_resources')
    .select('title, status')
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !existing) {
    return createErrorResult('항목을 찾을 수 없습니다.');
  }

  if (existing.status === 'archived') {
    return createErrorResult('이미 보관된 항목입니다.');
  }

  const { error } = await supabase
    .from('areas_resources')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId);

  if (error) {
    return createErrorResult(`보관 실패: ${error.message}`);
  }

  return createSuccessResult(`"${existing.title}"이(가) 보관되었습니다.`);
}

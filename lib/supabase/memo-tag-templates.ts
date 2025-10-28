/**
 * Memo Tag Templates - 노트 태그 템플릿 관리
 */

import { createWithJWT, deleteWithJWT, queryRLSTableWithJWT, fetchWithJWT } from './core';
import type { NoteTagTemplate, CreateTagFromTemplateInput, NoteTag, NoteTagLink } from '@/types';

/**
 * 노트 태그 템플릿 조회 (공용 데이터)
 */
export async function fetchNoteTagTemplatesWithJWT(): Promise<NoteTagTemplate[]> {
  console.log('📋 노트 태그 템플릿 조회 시작 (공용 데이터)');

  try {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/note_tag_templates?is_active=eq.true&order=category.asc,sort_order.asc`;
    console.log('🔗 API URL:', url);
    console.log('🔑 API Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    // 템플릿은 RLS가 없는 공용 데이터이므로 REST API 직접 호출
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    console.log('📡 Response status:', response.status, response.statusText);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ 템플릿 조회 응답 오류:', response.status, response.statusText, errorText);
      return [];
    }

    const templates = await response.json();
    console.log('✅ 노트 태그 템플릿 조회 성공:', {
      templatesCount: templates?.length || 0,
      templates: templates?.slice(0, 3) // 처음 3개만 로그
    });
    return templates || [];
  } catch (error) {
    console.error('❌ 노트 태그 템플릿 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 카테고리별 노트 태그 템플릿 조회
 */
export async function fetchNoteTagTemplatesByCategoryWithJWT(category?: string): Promise<NoteTagTemplate[]> {
  console.log('📋 JWT 방식으로 카테고리별 노트 태그 템플릿 조회:', { category });

  try {
    let path = '/rest/v1/note_tag_templates?is_active=eq.true';
    if (category) {
      path += `&category=eq.${category}`;
    }
    path += '&order=sort_order.asc,name.asc';

    const templates = await fetchWithJWT(path, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('✅ JWT 카테고리별 노트 태그 템플릿 조회 성공:', { category, count: templates?.length || 0 });
    return templates || [];
  } catch (error) {
    console.error('❌ JWT 카테고리별 노트 태그 템플릿 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 템플릿에서 사용자 태그 생성
 */
export async function createTagFromTemplateWithJWT(
  data: CreateTagFromTemplateInput,
  userId: string
): Promise<NoteTag | null> {
  console.log('✨ JWT 방식으로 템플릿에서 태그 생성:', { ...data, userId });

  try {
    // PostgreSQL 함수 호출
    const result = await fetchWithJWT('/rpc/create_tag_from_template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        p_user_id: userId,
        p_template_id: data.template_id,
        p_custom_name: data.custom_name || null,
        p_custom_color: data.custom_color || null
      })
    });

    if (result) {
      // 생성된 태그 정보 조회
      const newTag = await queryRLSTableWithJWT('note_tags', [
        {
          column: 'id',
          operator: 'eq',
          value: result
        }
      ], {
        select: '*',
        single: true
      });

      console.log('✅ JWT 템플릿에서 태그 생성 성공:', { tagId: result });
      return newTag;
    }

    return null;
  } catch (error) {
    console.error('❌ JWT 템플릿에서 태그 생성 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자의 기본 태그 세트 생성 (신규 사용자용)
 */
export async function createDefaultTagsForUserWithJWT(userId: string): Promise<number> {
  console.log('🏷️ JWT 방식으로 사용자 기본 태그 세트 생성:', { userId });

  try {
    // PostgreSQL 함수 호출
    const result = await fetchWithJWT('/rpc/create_default_tags_for_user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        p_user_id: userId
      })
    });

    console.log('✅ JWT 사용자 기본 태그 세트 생성 성공:', { userId, createdCount: result || 0 });
    return result || 0;
  } catch (error) {
    console.error('❌ JWT 사용자 기본 태그 세트 생성 실패:', error);
    return 0;
  }
}

/**
 * 노트에 태그 및 템플릿 태그 연결 (혼합 지원)
 * - userTagIds: 실제 사용자 태그 ID들
 * - templateTagIds: 템플릿 태그 ID들 (note_tags 생성 없이 직접 연결)
 */
export async function updateMemoTagsWithTemplates(
  memoId: string,
  userTagIds: string[],
  templateTagIds: string[],
  userId: string
): Promise<void> {
  console.log('🔗 노트에 사용자 태그 + 템플릿 태그 연결:', {
    memoId,
    userTagCount: userTagIds.length,
    templateTagCount: templateTagIds.length,
    userId
  });

  try {
    // 1. 기존 연결 모두 삭제
    await deleteWithJWT('note_tag_links', [
      { column: 'note_id', operator: 'eq', value: memoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    // 2. 사용자 태그 연결
    for (const tagId of userTagIds) {
      await createWithJWT('note_tag_links', {
        user_id: userId,
        note_id: memoId,
        tag_id: tagId,
        template_id: null, // 사용자 태그이므로 template_id는 null
        is_active: true
      });
    }

    // 3. 템플릿 태그 직접 연결
    for (const templateId of templateTagIds) {
      await createWithJWT('note_tag_links', {
        user_id: userId,
        note_id: memoId,
        tag_id: null, // 템플릿 태그이므로 tag_id는 null
        template_id: templateId,
        is_active: true
      });
    }

    console.log('✅ 노트 태그 연결 완료:', {
      memoId,
      userTagsLinked: userTagIds.length,
      templateTagsLinked: templateTagIds.length
    });
  } catch (error) {
    console.error('❌ 노트 태그 연결 실패:', error);
    throw new Error('노트 태그 연결에 실패했습니다.');
  }
}

/**
 * JWT 방식으로 사용자의 노트 태그 링크 조회
 */
export async function fetchNoteTagLinksWithJWT(userId: string): Promise<NoteTagLink[]> {
  console.log('🔗 JWT 방식으로 노트 태그 링크 조회:', { userId });

  try {
    const links = await queryRLSTableWithJWT('note_tag_links', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'is_active',
        operator: 'eq',
        value: true
      }
    ], {
      select: '*',
      order: 'assigned_at.desc'
    });

    console.log('✅ JWT 노트 태그 링크 조회 성공:', { userId, linksCount: links.length });
    return links || [];
  } catch (error) {
    console.error('❌ JWT 노트 태그 링크 조회 실패:', error);
    throw new Error('노트 태그 링크 조회에 실패했습니다.');
  }
}

/**
 * JWT 방식으로 사용자의 전체 태그 (사용자 태그 + 템플릿) 조회
 */
export async function fetchUserTagsWithTemplatesWithJWT(userId: string): Promise<NoteTag[]> {
  console.log('🏷️ JWT 방식으로 사용자 전체 태그 조회 (템플릿 포함):', { userId });

  try {
    // 사용자의 커스텀 태그만 조회 (템플릿 정보는 별도로 제공)
    const userTags = await queryRLSTableWithJWT('note_tags', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'name.asc'
    });

    console.log('✅ JWT 사용자 전체 태그 조회 성공:', { userId, userTagsCount: userTags.length });
    return userTags || [];
  } catch (error) {
    console.error('❌ JWT 사용자 전체 태그 조회 실패:', error);
    return [];
  }
}

/**
 * Memo Tags - 노트 태그 관리
 */

import { createWithJWT, updateWithJWT, deleteWithJWT, queryRLSTableWithJWT, fetchWithJWT } from './core';
import type { NoteTag, NoteTagLink, NoteTagInsert } from '@/types';

/**
 * JWT 방식으로 노트 태그 조회
 */
export async function fetchAllMemoTagsWithJWT(userId: string): Promise<NoteTag[]> {
  console.log('🏷️ JWT 방식으로 노트 태그 조회:', { userId });

  try {
    const tags = await queryRLSTableWithJWT('note_tags', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'name.asc'
    });

    console.log('✅ JWT 노트 태그 조회 성공:', { tagsCount: tags.length });
    return tags || [];
  } catch (error) {
    console.error('❌ JWT 노트 태그 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 노트 태그 생성
 */
export async function createMemoTagWithJWT(
  data: Omit<NoteTagInsert, 'user_id'>,
  userId: string
): Promise<NoteTag | null> {
  console.log('✏️ JWT 방식으로 노트 태그 생성:', { data, userId });

  try {
    // 태그 이름 중복 검사
    const existingTags = await queryRLSTableWithJWT('note_tags', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'name',
        operator: 'eq',
        value: data.name
      }
    ], {
      select: 'id',
      limit: 1
    });

    if (existingTags && existingTags.length > 0) {
      throw new Error(`태그 이름 "${data.name}"이 이미 존재합니다.`);
    }

    const tagData = {
      user_id: userId,
      name: data.name,
      color: data.color || '#6B7280',
      description: data.description || null,
      is_active: data.is_active !== false, // 기본값은 true
      position: data.position || 0
    };

    const result = await createWithJWT('note_tags', tagData);
    console.log('✅ JWT 노트 태그 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 태그 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 태그 업데이트
 */
export async function updateMemoTagWithJWT(
  tagId: string,
  userId: string,
  updates: Partial<NoteTagInsert>
): Promise<NoteTag | null> {
  console.log('🔄 JWT 방식으로 노트 태그 업데이트:', { tagId, userId, updates });

  try {
    // 미리 정의된 태그는 수정 불가
    const existingTag = await queryRLSTableWithJWT('note_tags', [
      { column: 'id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'is_predefined',
      limit: 1
    });

    if (!existingTag || existingTag.length === 0) {
      throw new Error('태그를 찾을 수 없습니다.');
    }

    if (existingTag[0].is_predefined) {
      throw new Error('미리 정의된 태그는 수정할 수 없습니다.');
    }

    // 이름 변경 시 중복 검사
    if (updates.name) {
      const duplicateTags = await queryRLSTableWithJWT('note_tags', [
        {
          column: 'user_id',
          operator: 'eq',
          value: userId
        },
        {
          column: 'name',
          operator: 'eq',
          value: updates.name
        }
      ], {
        select: 'id',
        limit: 1
      });

      if (duplicateTags && duplicateTags.length > 0 && duplicateTags[0].id !== tagId) {
        throw new Error(`태그 이름 "${updates.name}"이 이미 존재합니다.`);
      }
    }

    const result = await updateWithJWT('note_tags', [
      { column: 'id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], updates);

    console.log('✅ JWT 노트 태그 업데이트 성공:', { tagId });
    return result?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 노트 태그 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 태그 삭제
 */
export async function deleteMemoTagWithJWT(
  tagId: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 노트 태그 삭제:', { tagId, userId });

  try {
    // 미리 정의된 태그는 삭제 불가
    const existingTag = await queryRLSTableWithJWT('note_tags', [
      { column: 'id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'is_predefined',
      limit: 1
    });

    if (!existingTag || existingTag.length === 0) {
      throw new Error('태그를 찾을 수 없습니다.');
    }

    if (existingTag[0].is_predefined) {
      throw new Error('미리 정의된 태그는 삭제할 수 없습니다.');
    }

    // 연결된 노트-태그 링크가 있는지 확인
    const linkedMemos = await queryRLSTableWithJWT('note_tag_links', [
      { column: 'tag_id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'id',
      limit: 1
    });

    // 연결된 노트가 있으면 경고 (선택사항: 강제 삭제할지 사용자에게 확인)
    if (linkedMemos && linkedMemos.length > 0) {
      console.warn(`⚠️ 태그 ${tagId}에 연결된 노트가 있습니다. 링크도 함께 삭제됩니다.`);

      // 먼저 모든 링크 삭제
      await deleteWithJWT('note_tag_links', [
        { column: 'tag_id', operator: 'eq', value: tagId },
        { column: 'user_id', operator: 'eq', value: userId }
      ]);
    }

    // 태그 삭제
    await deleteWithJWT('note_tags', [
      { column: 'id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 노트 태그 삭제 성공:', { tagId });
    return true;
  } catch (error) {
    console.error('❌ JWT 노트 태그 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트에 태그 연결
 */
export async function linkMemoToTagWithJWT(
  memoId: string,
  tagId: string,
  userId: string
): Promise<NoteTagLink | null> {
  console.log('🔗 JWT 방식으로 노트에 태그 연결:', { memoId, tagId, userId });

  try {
    // 이미 연결되어 있는지 확인
    const existingLinks = await queryRLSTableWithJWT('note_tag_links', [
      { column: 'note_id', operator: 'eq', value: memoId },
      { column: 'tag_id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: '*',
      limit: 1
    });

    if (existingLinks && existingLinks.length > 0) {
      console.log('ℹ️ 이미 연결된 노트-태그:', { memoId, tagId });
      return existingLinks[0];
    }

    // 노트당 태그 개수 제한 확인 (선택사항: 10개 제한)
    const currentTags = await queryRLSTableWithJWT('note_tag_links', [
      { column: 'note_id', operator: 'eq', value: memoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'id'
    });

    if (currentTags && currentTags.length >= 10) {
      throw new Error('노트당 최대 10개의 태그만 연결할 수 있습니다.');
    }

    // 새 링크 생성
    const linkData = {
      note_id: memoId,
      tag_id: tagId,
      user_id: userId
    };

    const result = await createWithJWT('note_tag_links', linkData);
    console.log('✅ JWT 노트-태그 연결 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트-태그 연결 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트에서 태그 연결 해제
 */
export async function unlinkMemoFromTagWithJWT(
  memoId: string,
  tagId: string,
  userId: string
): Promise<boolean> {
  console.log('🔓 JWT 방식으로 노트-태그 연결 해제:', { memoId, tagId, userId });

  try {
    await deleteWithJWT('note_tag_links', [
      { column: 'note_id', operator: 'eq', value: memoId },
      { column: 'tag_id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 노트-태그 연결 해제 성공:', { memoId, tagId });
    return true;
  } catch (error) {
    console.error('❌ JWT 노트-태그 연결 해제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 노트의 모든 태그 연결 해제
 */
export async function unlinkAllTagsFromMemoWithJWT(
  memoId: string,
  userId: string
): Promise<boolean> {
  console.log('🔓 JWT 방식으로 노트의 모든 태그 연결 해제:', { memoId, userId });

  try {
    await deleteWithJWT('note_tag_links', [
      { column: 'note_id', operator: 'eq', value: memoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 노트의 모든 태그 연결 해제 성공:', { memoId });
    return true;
  } catch (error) {
    console.error('❌ JWT 노트의 모든 태그 연결 해제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 특정 노트에 연결된 모든 태그 조회
 */
export async function fetchTagsForMemoWithJWT(
  memoId: string,
  userId: string
): Promise<NoteTag[]> {
  console.log('🔍 JWT 방식으로 노트에 연결된 태그들 조회:', { memoId, userId });

  try {
    // 노트-태그 링크를 통해 태그 정보 조회 (JOIN 쿼리)
    const query = `
      select note_tags.*
      from note_tags
      inner join note_tag_links on note_tags.id = note_tag_links.tag_id
      where note_tag_links.note_id = '${memoId}'
        and note_tag_links.user_id = '${userId}'
        and note_tags.user_id = '${userId}'
      order by note_tags.name asc
    `;

    // 복잡한 JOIN 쿼리는 직접 SQL로 실행
    const tags = await fetchWithJWT(`/rpc/execute_sql`, {
      method: 'POST',
      body: JSON.stringify({ query })
    });

    console.log('✅ JWT 노트에 연결된 태그들 조회 성공:', { memoId, count: tags?.length || 0 });
    return tags || [];
  } catch (error) {
    console.error('❌ JWT 노트에 연결된 태그들 조회 실패:', error);

    // 폴백: 링크를 먼저 조회하고 태그를 개별적으로 가져오기
    try {
      const links = await queryRLSTableWithJWT('note_tag_links', [
        { column: 'note_id', operator: 'eq', value: memoId },
        { column: 'user_id', operator: 'eq', value: userId }
      ], {
        select: 'tag_id'
      });

      if (!links || links.length === 0) {
        return [];
      }

      const tagIds = links.map((link: any) => link.tag_id);
      const tags = await queryRLSTableWithJWT('note_tags', [
        { column: 'id', operator: 'in', value: tagIds },
        { column: 'user_id', operator: 'eq', value: userId }
      ], {
        select: '*',
        order: 'name.asc'
      });

      return tags || [];
    } catch (fallbackError) {
      console.error('❌ JWT 노트 태그 조회 폴백도 실패:', fallbackError);
      return [];
    }
  }
}

/**
 * JWT 방식으로 태그에 연결된 모든 노트 조회
 */
export async function fetchTagMemosWithJWT(
  tagId: string,
  userId: string
): Promise<string[]> {
  console.log('🔍 JWT 방식으로 태그에 연결된 노트들 조회:', { tagId, userId });

  try {
    const links = await queryRLSTableWithJWT('note_tag_links', [
      { column: 'tag_id', operator: 'eq', value: tagId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], {
      select: 'note_id',
      order: 'created_at.desc'
    });

    const memoIds = links?.map((link: any) => link.note_id) || [];
    console.log('✅ JWT 태그에 연결된 노트들 조회 성공:', { tagId, count: memoIds.length });
    return memoIds;
  } catch (error) {
    console.error('❌ JWT 태그에 연결된 노트들 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 노트에 다중 태그 연결 (배치 처리)
 */
export async function linkMemoToMultipleTagsWithJWT(
  memoId: string,
  tagIds: string[],
  userId: string
): Promise<NoteTagLink[]> {
  console.log('🔗 JWT 방식으로 노트에 다중 태그 연결:', { memoId, tagIds, userId });

  try {
    const results: NoteTagLink[] = [];

    // 각 태그에 대해 개별적으로 연결 (배치 INSERT는 복잡하므로)
    for (const tagId of tagIds) {
      try {
        const link = await linkMemoToTagWithJWT(memoId, tagId, userId);
        if (link) {
          results.push(link);
        }
      } catch (error) {
        console.warn(`⚠️ 태그 ${tagId} 연결 실패:`, error);
        // 개별 실패는 전체 작업을 중단하지 않음
      }
    }

    console.log('✅ JWT 노트에 다중 태그 연결 완료:', { memoId, successCount: results.length });
    return results;
  } catch (error) {
    console.error('❌ JWT 노트에 다중 태그 연결 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 태그들 일괄 업데이트 (기존 연결 모두 해제 후 새로 연결)
 */
export async function updateMemoTagsWithJWT(
  memoId: string,
  tagIds: string[],
  userId: string
): Promise<NoteTagLink[]> {
  console.log('🔄 JWT 방식으로 노트 태그들 일괄 업데이트:', { memoId, tagIds, userId });

  try {
    // 1. 기존 연결 모두 해제
    await unlinkAllTagsFromMemoWithJWT(memoId, userId);

    // 2. 새로운 태그들 연결
    if (tagIds.length > 0) {
      return await linkMemoToMultipleTagsWithJWT(memoId, tagIds, userId);
    } else {
      return [];
    }
  } catch (error) {
    console.error('❌ JWT 노트 태그들 일괄 업데이트 실패:', error);
    throw error;
  }
}

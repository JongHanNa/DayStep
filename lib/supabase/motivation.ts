/**
 * Motivation - 동기부여 메시지 관리
 */

import { createWithJWT, updateWithJWT, deleteWithJWT, queryRLSTableWithJWT, fetchWithJWT } from './core';
import type { MotivationMessage, MotivationTemplate, MotivationTag, TodoMotivation } from '@/types/motivation';

/**
 * JWT 방식으로 동기부여 템플릿 조회
 */
export async function fetchMotivationTemplatesWithJWT(): Promise<MotivationTemplate[]> {
  console.log('💪 JWT 방식으로 동기부여 템플릿 조회 시작');

  try {
    // 기본 템플릿은 RLS 없이 모든 사용자가 읽을 수 있음
    const templates = await fetchWithJWT('/motivation_templates', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('✅ JWT 동기부여 템플릿 조회 성공:', { templatesCount: templates?.length || 0 });
    return templates || [];
  } catch (error) {
    console.error('❌ JWT 동기부여 템플릿 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 모든 동기부여 태그 조회
 */
export async function fetchMotivationTagsWithJWT(userId?: string): Promise<MotivationTag[]> {
  console.log('🏷️ JWT 방식으로 동기부여 태그 조회 시작:', { userId });

  try {
    let path = '/motivation_tags?';

    if (userId) {
      // 기본 태그 + 사용자 커스텀 태그 조회
      path += `or=(is_default.eq.true,and(is_default.eq.false,user_id.eq.${userId}))`;
    } else {
      // 기본 태그만 조회
      path += 'is_default=eq.true';
    }

    const tags = await fetchWithJWT(path, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    console.log('✅ JWT 동기부여 태그 조회 성공:', { tagsCount: tags?.length || 0 });
    return tags || [];
  } catch (error) {
    console.error('❌ JWT 동기부여 태그 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 사용자 커스텀 동기부여 메시지 조회
 */
export async function fetchUserMotivationMessagesWithJWT(userId: string): Promise<MotivationMessage[]> {
  console.log('📝 JWT 방식으로 사용자 커스텀 동기부여 메시지 조회:', { userId });

  try {
    const messages = await queryRLSTableWithJWT('user_motivation_messages', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      }
    ], {
      select: '*',
      order: 'created_at.desc'
    });

    console.log('✅ JWT 사용자 커스텀 동기부여 메시지 조회 성공:', { messagesCount: messages.length });
    return messages || [];
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 동기부여 메시지 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 사용자 커스텀 동기부여 메시지 생성
 */
export async function createUserMotivationMessageWithJWT(
  data: Omit<MotivationMessage, 'id' | 'isDefault' | 'createdAt' | 'updatedAt'>
): Promise<MotivationMessage | null> {
  console.log('✏️ JWT 방식으로 사용자 커스텀 동기부여 메시지 생성:', data);

  try {
    const messageData = {
      user_id: data.userId,
      content: data.content,
      tags: JSON.stringify(data.tags),
      icon: data.icon,
      color: data.color,
      image_url: data.imageUrl
    };

    const result = await createWithJWT('user_motivation_messages', messageData);
    console.log('✅ JWT 사용자 커스텀 동기부여 메시지 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 동기부여 메시지 생성 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자 커스텀 동기부여 메시지 수정
 */
export async function updateUserMotivationMessageWithJWT(
  id: string,
  userId: string,
  updates: Partial<MotivationMessage>
): Promise<MotivationMessage | null> {
  console.log('🔄 JWT 방식으로 사용자 커스텀 동기부여 메시지 수정:', { id, userId, updates });

  try {
    const updateData: any = {};

    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.tags !== undefined) updateData.tags = JSON.stringify(updates.tags);
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;

    const result = await updateWithJWT('user_motivation_messages', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ], updateData);

    console.log('✅ JWT 사용자 커스텀 동기부여 메시지 수정 성공:', { id });
    return result?.[0] || null;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 동기부여 메시지 수정 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자 커스텀 동기부여 메시지 삭제
 */
export async function deleteUserMotivationMessageWithJWT(
  id: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 사용자 커스텀 동기부여 메시지 삭제:', { id, userId });

  try {
    await deleteWithJWT('user_motivation_messages', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId }
    ]);

    console.log('✅ JWT 사용자 커스텀 동기부여 메시지 삭제 성공:', { id });
    return true;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 동기부여 메시지 삭제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 할일에 동기부여 메시지 연결
 */
export async function linkMotivationToTodoWithJWT(
  userId: string,
  todoId: string,
  motivationType: 'template' | 'custom',
  motivationId: string
): Promise<TodoMotivation | null> {
  console.log('🔗 JWT 방식으로 할일에 동기부여 메시지 연결:', {
    userId,
    todoId,
    motivationType,
    motivationId
  });

  try {
    // 이미 같은 메시지가 연결되어 있는지 확인
    const existingLinks = await queryRLSTableWithJWT('todo_motivation_links', [
      { column: 'todo_id', operator: 'eq', value: todoId },
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'motivation_id', operator: 'eq', value: motivationId },
      { column: 'motivation_type', operator: 'eq', value: motivationType },
      { column: 'is_active', operator: 'eq', value: true }
    ], { select: '*', limit: 1 });

    // 이미 연결되어 있으면 기존 연결 반환
    if (existingLinks && existingLinks.length > 0) {
      const existingLink = existingLinks[0];
      console.log('ℹ️ 이미 연결된 동기부여 메시지:', { todoId, motivationId });
      return {
        todoId,
        motivationMessageId: motivationId,
        assignedAt: existingLink.assigned_at || new Date().toISOString(),
        isActive: true
      };
    }

    // 새로운 연결 생성
    const linkData = {
      todo_id: todoId,
      user_id: userId,
      motivation_type: motivationType,
      motivation_id: motivationId,
      is_active: true
    };

    const result = await createWithJWT('todo_motivation_links', linkData);
    console.log('✅ JWT 할일에 동기부여 메시지 연결 성공:', { id: result?.id });

    return {
      todoId,
      motivationMessageId: motivationId,
      assignedAt: result?.assigned_at || new Date().toISOString(),
      isActive: true
    };
  } catch (error) {
    console.error('❌ JWT 할일에 동기부여 메시지 연결 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 특정 동기부여 메시지의 할일 연결 해제
 */
export async function unlinkMotivationFromTodoWithJWT(
  userId: string,
  todoId: string,
  motivationId: string,
  motivationType: 'template' | 'custom'
): Promise<boolean> {
  console.log('🔓 JWT 방식으로 특정 동기부여 메시지의 할일 연결 해제:', {
    userId,
    todoId,
    motivationId,
    motivationType
  });

  try {
    await updateWithJWT('todo_motivation_links', [
      { column: 'todo_id', operator: 'eq', value: todoId },
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'motivation_id', operator: 'eq', value: motivationId },
      { column: 'motivation_type', operator: 'eq', value: motivationType }
    ], { is_active: false });

    console.log('✅ JWT 특정 동기부여 메시지의 할일 연결 해제 성공:', { todoId, motivationId });
    return true;
  } catch (error) {
    console.error('❌ JWT 특정 동기부여 메시지의 할일 연결 해제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 할일의 모든 동기부여 메시지 연결 해제
 */
export async function unlinkAllMotivationsFromTodoWithJWT(
  userId: string,
  todoId: string
): Promise<boolean> {
  console.log('🔓 JWT 방식으로 할일의 모든 동기부여 메시지 연결 해제:', { userId, todoId });

  try {
    await updateWithJWT('todo_motivation_links', [
      { column: 'todo_id', operator: 'eq', value: todoId },
      { column: 'user_id', operator: 'eq', value: userId }
    ], { is_active: false });

    console.log('✅ JWT 할일의 모든 동기부여 메시지 연결 해제 성공:', { todoId });
    return true;
  } catch (error) {
    console.error('❌ JWT 할일의 모든 동기부여 메시지 연결 해제 실패:', error);
    return false;
  }
}

/**
 * JWT 방식으로 할일에 연결된 모든 동기부여 메시지 조회
 */
export async function fetchTodoMotivationsWithJWT(
  userId: string,
  todoId: string
): Promise<MotivationMessage[]> {
  console.log('🔍 JWT 방식으로 할일에 연결된 모든 동기부여 메시지 조회:', { userId, todoId });

  try {
    // 먼저 모든 연결 정보 조회
    const links = await queryRLSTableWithJWT('todo_motivation_links', [
      {
        column: 'todo_id',
        operator: 'eq',
        value: todoId
      },
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
      select: '*'
    });

    if (!links || links.length === 0) {
      console.log('ℹ️ 할일에 연결된 활성 동기부여 메시지 없음:', { todoId });
      return [];
    }

    const messages: MotivationMessage[] = [];

    // 각 링크에 대해 메시지 조회
    for (const link of links) {
      let message: MotivationMessage | null = null;

      if (link.motivation_type === 'template') {
        // 템플릿 메시지 조회
        const templates = await fetchWithJWT(`/motivation_templates?id=eq.${link.motivation_id}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        const template = templates?.[0];
        if (template) {
          message = {
            id: template.id,
            content: template.content,
            tags: Array.isArray(template.tags) ? template.tags : JSON.parse(template.tags || '[]'),
            icon: template.icon,
            imageUrl: template.image_url,
            isDefault: true,
            createdAt: template.created_at,
            updatedAt: template.updated_at
          };
        }
      } else if (link.motivation_type === 'custom') {
        // 커스텀 메시지 조회
        const customMessages = await queryRLSTableWithJWT('user_motivation_messages', [
          {
            column: 'id',
            operator: 'eq',
            value: link.motivation_id
          },
          {
            column: 'user_id',
            operator: 'eq',
            value: userId
          }
        ], {
          select: '*',
          limit: 1
        });

        const customMessage = customMessages?.[0];
        if (customMessage) {
          message = {
            id: customMessage.id,
            content: customMessage.content,
            tags: Array.isArray(customMessage.tags) ? customMessage.tags : JSON.parse(customMessage.tags || '[]'),
            icon: customMessage.icon,
            color: customMessage.color,
            imageUrl: customMessage.image_url,
            isDefault: false,
            userId: customMessage.user_id,
            createdAt: customMessage.created_at,
            updatedAt: customMessage.updated_at
          };
        }
      }

      if (message) {
        messages.push(message);
      }
    }

    console.log('✅ JWT 할일에 연결된 모든 동기부여 메시지 조회 성공:', { todoId, count: messages.length });
    return messages;
  } catch (error) {
    console.error('❌ JWT 할일에 연결된 모든 동기부여 메시지 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 동기부여 메시지에 연결된 모든 할일 조회
 */
export async function fetchMotivationTodosWithJWT(
  userId: string,
  motivationId: string,
  motivationType: 'template' | 'custom'
): Promise<string[]> {
  console.log('🔍 JWT 방식으로 동기부여 메시지에 연결된 모든 할일 조회:', {
    userId,
    motivationId,
    motivationType
  });

  try {
    const links = await queryRLSTableWithJWT('todo_motivation_links', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'motivation_id',
        operator: 'eq',
        value: motivationId
      },
      {
        column: 'motivation_type',
        operator: 'eq',
        value: motivationType
      },
      {
        column: 'is_active',
        operator: 'eq',
        value: true
      }
    ], {
      select: 'todo_id'
    });

    const todoIds = links?.map((link: any) => link.todo_id) || [];
    console.log('✅ JWT 동기부여 메시지에 연결된 모든 할일 조회 성공:', {
      motivationId,
      count: todoIds.length
    });

    return todoIds;
  } catch (error) {
    console.error('❌ JWT 동기부여 메시지에 연결된 모든 할일 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 할일에 연결된 첫 번째 동기부여 메시지 조회 (하위 호환성)
 */
export async function fetchTodoMotivationWithJWT(
  userId: string,
  todoId: string
): Promise<MotivationMessage | null> {
  console.log('🔍 JWT 방식으로 할일에 연결된 첫 번째 동기부여 메시지 조회 (하위 호환성):', { userId, todoId });

  const motivations = await fetchTodoMotivationsWithJWT(userId, todoId);
  return motivations.length > 0 ? motivations[0] : null;
}

/**
 * JWT 방식으로 사용자의 모든 할일-동기부여 연결 데이터 조회
 */
export async function fetchAllTodoMotivationLinksWithJWT(
  userId: string
): Promise<Array<{ todoId: string; motivationId: string; assignedAt: string }>> {
  console.log('🔍 JWT 방식으로 사용자의 모든 할일-동기부여 연결 데이터 조회:', { userId });

  try {
    const links = await queryRLSTableWithJWT('todo_motivation_links', [
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'is_active', operator: 'eq', value: true }
    ]);

    if (!links) {
      console.log('ℹ️ 연결된 할일-동기부여 데이터가 없습니다.');
      return [];
    }

    const results = links.map((link: any) => ({
      todoId: link.todo_id,
      motivationId: link.motivation_id,
      assignedAt: link.assigned_at
    }));

    console.log('✅ 사용자의 모든 할일-동기부여 연결 데이터 조회 성공:', { count: results.length });
    return results;
  } catch (error) {
    console.error('❌ 사용자의 모든 할일-동기부여 연결 데이터 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 사용자 커스텀 태그 생성
 */
export async function createCustomMotivationTagWithJWT(
  data: Omit<MotivationTag, 'id' | 'isDefault' | 'createdAt'>
): Promise<MotivationTag | null> {
  console.log('🏷️ JWT 방식으로 사용자 커스텀 태그 생성:', data);

  try {
    const tagData = {
      name: data.name,
      color: data.color,
      icon: data.icon,
      is_default: false,
      user_id: data.userId
    };

    const result = await createWithJWT('motivation_tags', tagData);
    console.log('✅ JWT 사용자 커스텀 태그 생성 성공:', { id: result?.id });
    return result;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 태그 생성 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 사용자 커스텀 태그 삭제
 */
export async function deleteCustomMotivationTagWithJWT(
  id: string,
  userId: string
): Promise<boolean> {
  console.log('🗑️ JWT 방식으로 사용자 커스텀 태그 삭제:', { id, userId });

  try {
    await deleteWithJWT('motivation_tags', [
      { column: 'id', operator: 'eq', value: id },
      { column: 'user_id', operator: 'eq', value: userId },
      { column: 'is_default', operator: 'eq', value: false }
    ]);

    console.log('✅ JWT 사용자 커스텀 태그 삭제 성공:', { id });
    return true;
  } catch (error) {
    console.error('❌ JWT 사용자 커스텀 태그 삭제 실패:', error);
    return false;
  }
}

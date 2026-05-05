/**
 * Memo Instances - 노트 인스턴스 관리
 */

import { createWithJWT, updateWithJWT, deleteWithJWT, queryRLSTableWithJWT, type QueryOptions } from './core';

/**
 * JWT 방식으로 노트 인스턴스 생성
 */
export async function createMemoInstanceWithJWT(instanceData: Record<string, any>): Promise<any> {
  console.log('📝 JWT 방식으로 노트 인스턴스 생성:', { instanceData });

  try {
    const result = await createWithJWT('motivation_instances', instanceData);
    console.log('✅ JWT 노트 인스턴스 생성 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스 생성 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 인스턴스 업데이트
 */
export async function updateMemoInstanceWithJWT(instanceId: string, instanceData: Record<string, any>): Promise<any> {
  console.log('📝 JWT 방식으로 노트 인스턴스 업데이트:', { instanceId, instanceData });

  try {
    const result = await updateWithJWT('motivation_instances', {
      column: 'id',
      operator: 'eq',
      value: instanceId
    }, instanceData);

    console.log('✅ JWT 노트 인스턴스 업데이트 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스 업데이트 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 노트 인스턴스 삭제
 */
export async function deleteMemoInstanceWithJWT(instanceId: string): Promise<any> {
  console.log('📝 JWT 방식으로 노트 인스턴스 삭제:', { instanceId });

  try {
    const result = await deleteWithJWT('motivation_instances', {
      column: 'id',
      operator: 'eq',
      value: instanceId
    });

    console.log('✅ JWT 노트 인스턴스 삭제 성공:', { result });
    return result;
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스 삭제 실패:', error);
    throw error;
  }
}

/**
 * JWT 방식으로 특정 노트의 인스턴스들 조회
 */
export async function fetchMemoInstancesByMemoIdWithJWT(
  userId: string,
  originalMemoId: string,
  options: QueryOptions = {}
): Promise<any[]> {
  console.log('📝 JWT 방식으로 노트 인스턴스들 조회:', { userId, originalMemoId, options });

  try {
    const instances = await queryRLSTableWithJWT('motivation_instances', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'original_motivation_id',
        operator: 'eq',
        value: originalMemoId
      }
    ], {
      select: '*',
      order: 'instance_date.asc',
      ...options
    });

    console.log('✅ JWT 노트 인스턴스들 조회 성공:', { instancesCount: instances.length });
    return instances || [];
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스들 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 특정 날짜의 노트 인스턴스들 조회
 */
export async function fetchMemoInstancesByDateWithJWT(
  userId: string,
  instanceDate: string,
  options: QueryOptions = {}
): Promise<any[]> {
  console.log('📝 JWT 방식으로 특정 날짜 노트 인스턴스들 조회:', { userId, instanceDate, options });

  try {
    const instances = await queryRLSTableWithJWT('motivation_instances', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'instance_date',
        operator: 'eq',
        value: instanceDate
      }
    ], {
      select: '*',
      order: 'created_at.desc',
      ...options
    });

    console.log('✅ JWT 특정 날짜 노트 인스턴스들 조회 성공:', { instancesCount: instances.length });
    return instances || [];
  } catch (error) {
    console.error('❌ JWT 특정 날짜 노트 인스턴스들 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 특정 노트의 특정 날짜 인스턴스 조회
 */
export async function fetchMemoInstanceByDateWithJWT(
  userId: string,
  originalMemoId: string,
  instanceDate: string
): Promise<any | null> {
  console.log('📝 JWT 방식으로 특정 노트의 특정 날짜 인스턴스 조회:', { userId, originalMemoId, instanceDate });

  try {
    const instances = await queryRLSTableWithJWT('motivation_instances', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'original_motivation_id',
        operator: 'eq',
        value: originalMemoId
      },
      {
        column: 'instance_date',
        operator: 'eq',
        value: instanceDate
      }
    ], {
      select: '*',
      limit: 1
    });

    const instance = instances?.[0] || null;
    console.log('✅ JWT 특정 노트의 특정 날짜 인스턴스 조회 성공:', { instance });
    return instance;
  } catch (error) {
    console.error('❌ JWT 특정 노트의 특정 날짜 인스턴스 조회 실패:', error);
    return null;
  }
}

/**
 * JWT 방식으로 특정 할일과 연결된 노트 인스턴스들 조회
 */
export async function fetchMemoInstancesByTaskIdWithJWT(
  userId: string,
  taskId: string,
  options: QueryOptions = {}
): Promise<any[]> {
  console.log('📝 JWT 방식으로 특정 할일의 노트 인스턴스들 조회:', { userId, taskId, options });

  try {
    const instances = await queryRLSTableWithJWT('motivation_instances', [
      {
        column: 'user_id',
        operator: 'eq',
        value: userId
      },
      {
        column: 'related_task_id',
        operator: 'eq',
        value: taskId
      }
    ], {
      select: '*',
      order: 'instance_date.asc',
      ...options
    });

    console.log('✅ JWT 특정 할일의 노트 인스턴스들 조회 성공:', { instancesCount: instances.length });
    return instances || [];
  } catch (error) {
    console.error('❌ JWT 특정 할일의 노트 인스턴스들 조회 실패:', error);
    return [];
  }
}

/**
 * JWT 방식으로 노트 인스턴스 일괄 생성 (반복 노트 설정용)
 */
export async function createMultipleMemoInstancesWithJWT(
  userId: string,
  originalMemoId: string,
  content: string,
  dates: string[],
  relatedTaskId?: string | null
): Promise<any[]> {
  console.log('📝 JWT 방식으로 노트 인스턴스 일괄 생성:', {
    userId,
    originalMemoId,
    content,
    dates,
    relatedTaskId
  });

  try {
    const instances = [];

    for (const date of dates) {
      const instanceData = {
        original_motivation_id: originalMemoId,
        user_id: userId,
        instance_date: date,
        content: content,
        is_modified: false,
        related_task_id: relatedTaskId || null
      };

      const result = await createMemoInstanceWithJWT(instanceData);
      instances.push(result);
    }

    console.log('✅ JWT 노트 인스턴스 일괄 생성 성공:', { instancesCount: instances.length });
    return instances;
  } catch (error) {
    console.error('❌ JWT 노트 인스턴스 일괄 생성 실패:', error);
    throw error;
  }
}

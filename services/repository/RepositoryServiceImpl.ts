/**
 * 보관함 서비스 구현체
 * 보관함 관련 비즈니스 로직과 데이터베이스 연동
 */

import { RepositoryItem } from '@/entities/repository/RepositoryItem';
import { Todo } from '@/entities/todo/Todo';
import { RepositoryItemInsert, RepositoryItemUpdate, RepositoryItemType } from '@/types';
import { BaseService, ServiceError } from '../base/BaseService';

/**
 * 보관함 서비스 인터페이스
 */
export interface RepositoryRepository {
  findById(id: string): Promise<RepositoryItem | null>;
  findByUserId(userId: string): Promise<RepositoryItem[]>;
  findByUserIdAndType(userId: string, type: RepositoryItemType): Promise<RepositoryItem[]>;
  findByUserIdAndCategory(userId: string, category: string): Promise<RepositoryItem[]>;
  create(itemData: RepositoryItemInsert): Promise<RepositoryItem>;
  update(id: string, itemData: RepositoryItemUpdate): Promise<RepositoryItem>;
  delete(id: string): Promise<void>;
  countByUserId(userId: string): Promise<number>;
}

/**
 * 보관함 도메인 서비스 인터페이스
 */
export interface RepositoryDomainService {
  getRepositoryStats(userId: string): Promise<{
    totalCount: number;
    typeBreakdown: Record<RepositoryItemType, number>;
    categoryBreakdown: Record<string, number>;
    oldestItem: Date | null;
    recentActivity: Date | null;
    averageItemsPerCategory: number;
  }>;
  
  searchRepository(userId: string, query: string): Promise<RepositoryItem[]>;
  getItemsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<RepositoryItem[]>;
  getAllCategories(userId: string): Promise<string[]>;
  moveToCategory(itemId: string, category: string | null): Promise<void>;
  mergeCategories(userId: string, fromCategory: string, toCategory: string): Promise<{ success: number; failed: number }>;
  deleteCategory(userId: string, category: string): Promise<{ success: number; failed: number }>;
  restoreItem(itemId: string): Promise<Todo | null>;
  bulkRestore(itemIds: string[]): Promise<{ success: number; failed: number; errors: string[] }>;
  bulkDelete(itemIds: string[]): Promise<{ success: number; failed: number; errors: string[] }>;
  exportRepository(userId: string, format: 'json' | 'csv'): Promise<string>;
  cleanupOldItems(userId: string, olderThanDays: number): Promise<{ deleted: number; errors: string[] }>;
}

/**
 * 보관함 서비스 구현
 */
export class RepositoryService extends BaseService implements RepositoryRepository, RepositoryDomainService {
  constructor() {
    super('RepositoryService');
  }

  /**
   * ID로 보관함 아이템 조회
   */
  async findById(id: string): Promise<RepositoryItem | null> {
    return this.executeWithPerformanceTracking(
      'findById',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'findById');

        const data = await this.executeSingleQuery(
          this.client
            .from('repository_items')
            .select('*')
            .eq('id', id),
          { itemId: id }
        );

        return data ? RepositoryItem.fromDatabase(data as any) : null;
      },
      { itemId: id }
    );
  }

  /**
   * 사용자의 모든 보관함 아이템 조회
   */
  async findByUserId(userId: string): Promise<RepositoryItem[]> {
    return this.executeWithPerformanceTracking(
      'findByUserId',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'findByUserId');

        const data = await this.executeQuery(
          this.client
            .from('repository_items')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false }),
          { userId }
        );

        return (data as any[]).map(item => RepositoryItem.fromDatabase(item));
      },
      { userId }
    );
  }

  /**
   * 사용자의 특정 타입 보관함 아이템 조회
   */
  async findByUserIdAndType(userId: string, type: RepositoryItemType): Promise<RepositoryItem[]> {
    return this.executeWithPerformanceTracking(
      'findByUserIdAndType',
      async () => {
        this.validateRequiredFields({ userId, type }, ['userId', 'type'], 'findByUserIdAndType');

        const data = await this.executeQuery(
          this.client
            .from('repository_items')
            .select('*')
            .eq('user_id', userId)
            .eq('type', type)
            .order('created_at', { ascending: false }),
          { userId, type }
        );

        return (data as any[]).map(item => RepositoryItem.fromDatabase(item));
      },
      { userId, type }
    );
  }

  /**
   * 사용자의 특정 카테고리 보관함 아이템 조회
   */
  async findByUserIdAndCategory(userId: string, category: string): Promise<RepositoryItem[]> {
    return this.executeWithPerformanceTracking(
      'findByUserIdAndCategory',
      async () => {
        this.validateRequiredFields({ userId, category }, ['userId', 'category'], 'findByUserIdAndCategory');

        const data = await this.executeQuery(
          this.client
            .from('repository_items')
            .select('*')
            .eq('user_id', userId)
            .eq('category', category)
            .order('created_at', { ascending: false }),
          { userId, category }
        );

        return (data as any[]).map(item => RepositoryItem.fromDatabase(item));
      },
      { userId, category }
    );
  }

  /**
   * 새 보관함 아이템 생성
   */
  async create(itemData: RepositoryItemInsert): Promise<RepositoryItem> {
    return this.executeWithPerformanceTracking(
      'create',
      async () => {
        this.validateRequiredFields(
          itemData, 
          ['user_id', 'type', 'title', 'content'], 
          'create'
        );

        // 제목 길이 검증
        if (itemData.title.length > 100) {
          throw new ServiceError(
            '제목은 100자를 초과할 수 없습니다.',
            'TITLE_TOO_LONG',
            undefined,
            { titleLength: itemData.title.length }
          );
        }

        // 내용 길이 검증
        if (itemData.content.length > 1000) {
          throw new ServiceError(
            '내용은 1000자를 초과할 수 없습니다.',
            'CONTENT_TOO_LONG',
            undefined,
            { contentLength: itemData.content.length }
          );
        }

        // 카테고리 길이 검증
        if (itemData.category && itemData.category.length > 50) {
          throw new ServiceError(
            '카테고리는 50자를 초과할 수 없습니다.',
            'CATEGORY_TOO_LONG',
            undefined,
            { categoryLength: itemData.category.length }
          );
        }

        const data = await this.executeQuery(
          this.client
            .from('repository_items')
            .insert([itemData])
            .select()
            .single(),
          { itemData }
        );

        return RepositoryItem.fromDatabase(data as any);
      },
      { userId: itemData.user_id, type: itemData.type }
    );
  }

  /**
   * 보관함 아이템 업데이트
   */
  async update(id: string, itemData: RepositoryItemUpdate): Promise<RepositoryItem> {
    return this.executeWithPerformanceTracking(
      'update',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'update');

        // 보관함 아이템 존재 확인
        const existingItem = await this.findById(id);
        if (!existingItem) {
          throw new ServiceError(
            '보관함 아이템을 찾을 수 없습니다.',
            'REPOSITORY_ITEM_NOT_FOUND',
            undefined,
            { itemId: id }
          );
        }

        // 필드 길이 검증
        if (itemData.title && itemData.title.length > 100) {
          throw new ServiceError(
            '제목은 100자를 초과할 수 없습니다.',
            'TITLE_TOO_LONG',
            undefined,
            { titleLength: itemData.title.length }
          );
        }

        if (itemData.content && itemData.content.length > 1000) {
          throw new ServiceError(
            '내용은 1000자를 초과할 수 없습니다.',
            'CONTENT_TOO_LONG',
            undefined,
            { contentLength: itemData.content.length }
          );
        }

        if (itemData.category && itemData.category.length > 50) {
          throw new ServiceError(
            '카테고리는 50자를 초과할 수 없습니다.',
            'CATEGORY_TOO_LONG',
            undefined,
            { categoryLength: itemData.category.length }
          );
        }

        const updateData = {
          ...itemData,
          updated_at: new Date().toISOString(),
        };

        const data = await this.executeQuery(
          this.client
            .from('repository_items')
            .update(updateData)
            .eq('id', id)
            .select()
            .single(),
          { itemId: id, updateData }
        );

        return RepositoryItem.fromDatabase(data as any);
      },
      { itemId: id }
    );
  }

  /**
   * 보관함 아이템 삭제
   */
  async delete(id: string): Promise<void> {
    return this.executeWithPerformanceTracking(
      'delete',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'delete');

        // 보관함 아이템 존재 확인
        const item = await this.findById(id);
        if (!item) {
          throw new ServiceError(
            '보관함 아이템을 찾을 수 없습니다.',
            'REPOSITORY_ITEM_NOT_FOUND',
            undefined,
            { itemId: id }
          );
        }

        await this.executeQuery(
          this.client
            .from('repository_items')
            .delete()
            .eq('id', id),
          { itemId: id }
        );
      },
      { itemId: id }
    );
  }

  /**
   * 사용자의 보관함 아이템 개수 조회
   */
  async countByUserId(userId: string): Promise<number> {
    return this.executeWithPerformanceTracking(
      'countByUserId',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'countByUserId');

        const { count } = (await this.executeQuery(
          this.client
            .from('repository_items')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          { userId }
        )) as any;

        return count || 0;
      },
      { userId }
    );
  }

  /**
   * 보관함 통계 조회
   */
  async getRepositoryStats(userId: string): Promise<{
    totalCount: number;
    typeBreakdown: Record<RepositoryItemType, number>;
    categoryBreakdown: Record<string, number>;
    oldestItem: Date | null;
    recentActivity: Date | null;
    averageItemsPerCategory: number;
  }> {
    return this.executeWithPerformanceTracking(
      'getRepositoryStats',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'getRepositoryStats');

        const items = await this.findByUserId(userId);
        
        // 타입별 개수 계산
        const typeBreakdown: Record<RepositoryItemType, number> = {
          todo: 0,
        };

        // 카테고리별 개수 계산
        const categoryBreakdown: Record<string, number> = {};

        items.forEach(item => {
          typeBreakdown[item.type]++;
          
          const category = item.category || '미분류';
          categoryBreakdown[category] = (categoryBreakdown[category] || 0) + 1;
        });

        // 가장 오래된 아이템과 최근 활동
        const sortedByCreated = [...items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const sortedByUpdated = [...items].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        const categoryCount = Object.keys(categoryBreakdown).length;
        const averageItemsPerCategory = categoryCount > 0 ? items.length / categoryCount : 0;

        return {
          totalCount: items.length,
          typeBreakdown,
          categoryBreakdown,
          oldestItem: sortedByCreated.length > 0 ? sortedByCreated[0].createdAt : null,
          recentActivity: sortedByUpdated.length > 0 ? sortedByUpdated[0].updatedAt : null,
          averageItemsPerCategory: Math.round(averageItemsPerCategory * 100) / 100,
        };
      },
      { userId }
    );
  }

  /**
   * 보관함 검색
   */
  async searchRepository(userId: string, query: string): Promise<RepositoryItem[]> {
    return this.executeWithPerformanceTracking(
      'searchRepository',
      async () => {
        this.validateRequiredFields({ userId, query }, ['userId', 'query'], 'searchRepository');

        const data = await this.executeQuery(
          this.client
            .from('repository_items')
            .select('*')
            .eq('user_id', userId)
            .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
            .order('created_at', { ascending: false }),
          { userId, query }
        );

        return (data as any[]).map(item => RepositoryItem.fromDatabase(item));
      },
      { userId, query }
    );
  }

  /**
   * 날짜 범위로 보관함 아이템 조회
   */
  async getItemsByDateRange(userId: string, startDate: Date, endDate: Date): Promise<RepositoryItem[]> {
    return this.executeWithPerformanceTracking(
      'getItemsByDateRange',
      async () => {
        this.validateRequiredFields({ userId, startDate, endDate }, ['userId', 'startDate', 'endDate'], 'getItemsByDateRange');

        if (startDate > endDate) {
          throw new ServiceError(
            '시작 날짜는 종료 날짜보다 이전이어야 합니다.',
            'INVALID_DATE_RANGE',
            undefined,
            { startDate, endDate }
          );
        }

        const data = await this.executeQuery(
          this.client
            .from('repository_items')
            .select('*')
            .eq('user_id', userId)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false }),
          { userId, startDate, endDate }
        );

        return (data as any[]).map(item => RepositoryItem.fromDatabase(item));
      },
      { userId }
    );
  }

  /**
   * 모든 카테고리 조회
   */
  async getAllCategories(userId: string): Promise<string[]> {
    return this.executeWithPerformanceTracking(
      'getAllCategories',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'getAllCategories');

        const data = await this.executeQuery(
          this.client
            .from('repository_items')
            .select('category')
            .eq('user_id', userId)
            .not('category', 'is', null),
          { userId }
        );

        const categories = new Set<string>();
        (data as any[]).forEach((item: any) => {
          if (item.category) {
            categories.add(item.category);
          }
        });

        return Array.from(categories).sort();
      },
      { userId }
    );
  }

  /**
   * 아이템을 카테고리로 이동
   */
  async moveToCategory(itemId: string, category: string | null): Promise<void> {
    return this.executeWithPerformanceTracking(
      'moveToCategory',
      async () => {
        this.validateRequiredFields({ itemId }, ['itemId'], 'moveToCategory');

        const item = await this.findById(itemId);
        if (!item) {
          throw new ServiceError(
            '보관함 아이템을 찾을 수 없습니다.',
            'REPOSITORY_ITEM_NOT_FOUND',
            undefined,
            { itemId }
          );
        }

        await this.update(itemId, { category });
      },
      { itemId, category }
    );
  }

  /**
   * 카테고리 병합
   */
  async mergeCategories(userId: string, fromCategory: string, toCategory: string): Promise<{
    success: number;
    failed: number;
  }> {
    return this.executeWithPerformanceTracking(
      'mergeCategories',
      async () => {
        this.validateRequiredFields({ userId, fromCategory, toCategory }, ['userId', 'fromCategory', 'toCategory'], 'mergeCategories');

        if (fromCategory === toCategory) {
          throw new ServiceError(
            '동일한 카테고리로는 병합할 수 없습니다.',
            'SAME_CATEGORY_MERGE',
            undefined,
            { fromCategory, toCategory }
          );
        }

        const itemsToMove = await this.findByUserIdAndCategory(userId, fromCategory);

        const results = await this.executeBatch(
          itemsToMove,
          async (item: RepositoryItem) => {
            await this.update(item.id, { category: toCategory });
            return item;
          },
          5 // 배치 크기
        );

        const success = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return { success, failed };
      },
      { userId, fromCategory, toCategory }
    );
  }

  /**
   * 카테고리 삭제 (해당 카테고리의 모든 아이템을 미분류로 이동)
   */
  async deleteCategory(userId: string, category: string): Promise<{
    success: number;
    failed: number;
  }> {
    return this.executeWithPerformanceTracking(
      'deleteCategory',
      async () => {
        this.validateRequiredFields({ userId, category }, ['userId', 'category'], 'deleteCategory');

        const itemsToMove = await this.findByUserIdAndCategory(userId, category);

        const results = await this.executeBatch(
          itemsToMove,
          async (item: RepositoryItem) => {
            await this.update(item.id, { category: null });
            return item;
          },
          5 // 배치 크기
        );

        const success = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return { success, failed };
      },
      { userId, category }
    );
  }

  /**
   * 보관함 아이템 복원
   */
  async restoreItem(itemId: string): Promise<Todo | null> {
    return this.executeWithPerformanceTracking(
      'restoreItem',
      async () => {
        this.validateRequiredFields({ itemId }, ['itemId'], 'restoreItem');

        const item = await this.findById(itemId);
        if (!item) {
          throw new ServiceError(
            '보관함 아이템을 찾을 수 없습니다.',
            'REPOSITORY_ITEM_NOT_FOUND',
            undefined,
            { itemId }
          );
        }

        if (item.type === 'todo') {
          // 할일로 복원
          const todoData = item.toTodoData();
          
          const result = await this.executeTransaction([
            {
              name: 'create_todo',
              params: {
                user_id: item.userId,
                ...todoData,
              }
            },
            {
              name: 'delete_repository_item',
              params: { item_id: itemId }
            }
          ], 'restore_todo_from_repository');

          return Todo.fromDatabase((result as any).todo);

        } else {
          throw new ServiceError(
            '지원하지 않는 아이템 타입입니다.',
            'UNSUPPORTED_ITEM_TYPE',
            undefined,
            { itemId, itemType: item.type }
          );
        }
      },
      { itemId }
    );
  }

  /**
   * 일괄 복원
   */
  async bulkRestore(itemIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    return this.executeWithPerformanceTracking(
      'bulkRestore',
      async () => {
        this.validateRequiredFields({ itemIds }, ['itemIds'], 'bulkRestore');

        if (itemIds.length === 0) {
          return { success: 0, failed: 0, errors: [] };
        }

        const results = await this.executeBatch(
          itemIds,
          async (id: string) => {
            return await this.restoreItem(id);
          },
          3 // 작은 배치 크기로 부담 줄이기
        );

        const success = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const errors = results
          .filter(r => !r.success)
          .map(r => r.error?.getLocalizedMessage() || '알 수 없는 오류');

        return { success, failed, errors };
      },
      { itemCount: itemIds.length }
    );
  }

  /**
   * 일괄 삭제
   */
  async bulkDelete(itemIds: string[]): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    return this.executeWithPerformanceTracking(
      'bulkDelete',
      async () => {
        this.validateRequiredFields({ itemIds }, ['itemIds'], 'bulkDelete');

        if (itemIds.length === 0) {
          return { success: 0, failed: 0, errors: [] };
        }

        const results = await this.executeBatch(
          itemIds,
          async (id: string) => {
            await this.delete(id);
            return id;
          },
          5 // 배치 크기
        );

        const success = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const errors = results
          .filter(r => !r.success)
          .map(r => r.error?.getLocalizedMessage() || '알 수 없는 오류');

        return { success, failed, errors };
      },
      { itemCount: itemIds.length }
    );
  }

  /**
   * 보관함 내보내기
   */
  async exportRepository(userId: string, format: 'json' | 'csv'): Promise<string> {
    return this.executeWithPerformanceTracking(
      'exportRepository',
      async () => {
        this.validateRequiredFields({ userId, format }, ['userId', 'format'], 'exportRepository');

        const items = await this.findByUserId(userId);

        if (format === 'json') {
          return JSON.stringify(items.map(item => ({
            id: item.id,
            type: item.type,
            title: item.title,
            content: item.content,
            category: item.category,
            sourceId: item.sourceId,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
          })), null, 2);
        } else if (format === 'csv') {
          const headers = ['ID', '타입', '제목', '내용', '카테고리', '원본ID', '생성일', '수정일'];
          const rows = items.map(item => [
            item.id,
            item.type,
            `"${item.title.replace(/"/g, '""')}"`, // CSV 이스케이프
            `"${item.content.replace(/"/g, '""')}"`,
            item.category || '미분류',
            item.sourceId || '',
            item.createdAt.toISOString(),
            item.updatedAt.toISOString(),
          ]);

          return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        }

        throw new ServiceError(
          '지원하지 않는 형식입니다.',
          'INVALID_FORMAT',
          undefined,
          { format }
        );
      },
      { userId, format }
    );
  }

  /**
   * 오래된 아이템 정리
   */
  async cleanupOldItems(userId: string, olderThanDays: number): Promise<{
    deleted: number;
    errors: string[];
  }> {
    return this.executeWithPerformanceTracking(
      'cleanupOldItems',
      async () => {
        this.validateRequiredFields({ userId, olderThanDays }, ['userId', 'olderThanDays'], 'cleanupOldItems');

        if (olderThanDays < 1) {
          throw new ServiceError(
            '정리 기간은 1일 이상이어야 합니다.',
            'INVALID_CLEANUP_PERIOD',
            undefined,
            { olderThanDays }
          );
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

        const oldItems = await this.getItemsByDateRange(
          userId,
          new Date('1970-01-01'), // 아주 오래 전
          cutoffDate
        );

        const results = await this.executeBatch(
          oldItems,
          async (item: RepositoryItem) => {
            await this.delete(item.id);
            return item;
          },
          5 // 배치 크기
        );

        const deleted = results.filter(r => r.success).length;
        const errors = results
          .filter(r => !r.success)
          .map(r => r.error?.getLocalizedMessage() || '알 수 없는 오류');

        return { deleted, errors };
      },
      { userId, olderThanDays }
    );
  }
}
import { RepositoryItem } from '@/entities/repository/RepositoryItem';
import { RepositoryItemInsert, RepositoryItemUpdate, RepositoryItemType } from '@/types';

/**
 * Repository Item Repository Interface
 * 보관함 아이템 데이터 접근을 위한 계약 정의
 */
export interface RepositoryItemRepository {
  /**
   * ID로 보관함 아이템 조회
   */
  findById(id: string): Promise<RepositoryItem | null>;

  /**
   * 사용자의 모든 보관함 아이템 조회
   */
  findByUserId(userId: string): Promise<RepositoryItem[]>;

  /**
   * 사용자의 보관함 아이템을 타입별로 조회
   */
  findByUserIdAndType(userId: string, type: RepositoryItemType): Promise<RepositoryItem[]>;

  /**
   * 사용자의 보관함 아이템을 카테고리별로 조회
   */
  findByUserIdAndCategory(userId: string, category: string): Promise<RepositoryItem[]>;

  /**
   * 새 보관함 아이템 생성
   */
  create(itemData: RepositoryItemInsert): Promise<RepositoryItem>;

  /**
   * 보관함 아이템 업데이트
   */
  update(id: string, itemData: RepositoryItemUpdate): Promise<RepositoryItem>;

  /**
   * 보관함 아이템 삭제
   */
  delete(id: string): Promise<void>;

  /**
   * 사용자의 보관함 아이템 개수 조회
   */
  countByUserId(userId: string): Promise<number>;

  /**
   * 원본 ID로 보관함 아이템 조회
   */
  findBySourceId(sourceId: string): Promise<RepositoryItem[]>;
}

/**
 * Repository Domain Service
 * 보관함 도메인의 복잡한 비즈니스 로직 처리
 */
export interface RepositoryService {
  /**
   * 보관함 통계 조회
   */
  getRepositoryStats(userId: string): Promise<{
    totalCount: number;
    typeBreakdown: Record<RepositoryItemType, number>;
    categoryBreakdown: Record<string, number>;
    averageContentLength: number;
    oldestItem: Date | null;
    newestItem: Date | null;
    itemsWithSource: number;
    itemsWithoutSource: number;
  }>;

  /**
   * 보관함 아이템 검색
   */
  searchItems(userId: string, query: string): Promise<RepositoryItem[]>;

  /**
   * 카테고리 목록 조회
   */
  getCategories(userId: string): Promise<Array<{
    category: string;
    count: number;
  }>>;

  /**
   * 카테고리 자동완성 제안
   */
  suggestCategories(userId: string, query: string): Promise<string[]>;

  /**
   * 비슷한 아이템 추천
   */
  getSimilarItems(itemId: string, limit?: number): Promise<RepositoryItem[]>;

  /**
   * 보관함 아이템을 할일로 복사
   */
  copyToTodo(itemId: string): Promise<string>; // 생성된 Todo ID 반환


  /**
   * 오래된 아이템 정리 제안
   */
  suggestCleanup(userId: string): Promise<{
    oldItems: RepositoryItem[]; // 90일 이상 된 아이템
    duplicates: RepositoryItem[][]; // 중복 가능성이 있는 아이템들
    unusedCategories: string[]; // 사용되지 않는 카테고리
    suggestions: string[];
  }>;

  /**
   * 보관함 아이템 일괄 작업
   */
  bulkOperation(
    itemIds: string[],
    operation: 'delete' | 'updateCategory' | 'copyToTodo',
    data?: { category?: string }
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }>;

  /**
   * 보관함 내보내기
   */
  exportRepository(userId: string, format: 'json' | 'csv'): Promise<string>;

  /**
   * 보관함 가져오기
   */
  importRepository(userId: string, data: string): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }>;

  /**
   * 드래그 앤 드롭을 위한 아이템 데이터 변환
   */
  getItemForDragDrop(itemId: string): Promise<{
    id: string;
    type: RepositoryItemType;
    title: string;
    content: string;
    dragData: any;
  } | null>;

  /**
   * 아이템 미리보기 데이터 생성
   */
  generatePreview(itemId: string): Promise<{
    title: string;
    preview: string;
    type: RepositoryItemType;
    category: string | null;
    createdAt: Date;
  } | null>;
}
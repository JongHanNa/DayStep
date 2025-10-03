/**
 * 상태 관리 시스템의 공통 타입 정의
 */

// API 상태 관리를 위한 기본 타입
export interface ApiState<T = any> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// CRUD 작업을 위한 기본 액션 인터페이스
export interface CrudActions<T, CreateData, UpdateData> {
  // 읽기 작업
  fetch: () => Promise<void>;
  fetchById: (id: string) => Promise<T | null>;
  
  // 생성 작업
  create: (data: CreateData) => Promise<T>;
  
  // 업데이트 작업
  update: (id: string, data: UpdateData) => Promise<T>;
  
  // 삭제 작업
  delete: (id: string) => Promise<void>;
  
  // 상태 초기화
  reset: () => void;
}

// 필터링 및 정렬을 위한 기본 타입
export interface FilterState {
  searchQuery: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  filters: Record<string, any>;
}

// 페이지네이션을 위한 타입
export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

// 실시간 구독 상태
export interface SubscriptionState {
  isSubscribed: boolean;
  subscriptionId: string | null;
  lastSync: Date | null;
}

// 낙관적 업데이트를 위한 타입
export interface OptimisticUpdate<T> {
  id: string;
  action: 'create' | 'update' | 'delete';
  data: T;
  timestamp: Date;
}

// 스토어의 기본 상태 구조
export interface BaseStoreState {
  initialized: boolean;
  version: number;
}

// 에러 처리를 위한 타입
export interface ErrorState {
  code?: string;
  message: string;
  details?: any;
  timestamp: Date;
}

// 로딩 상태의 세분화
export type LoadingState = 
  | 'idle'        // 초기 상태
  | 'loading'     // 로딩 중
  | 'success'     // 성공
  | 'error'       // 오류
  | 'updating';   // 업데이트 중

// 상태 지속성 설정
export interface PersistConfig {
  name: string;
  version: number;
  blacklist?: string[];  // 제외할 키들
  whitelist?: string[];  // 포함할 키들
  migrate?: (persistedState: any, version: number) => any;
}

// 개발 환경에서 사용할 스토어 디버그 정보
export interface StoreDebugInfo {
  storeName: string;
  actions: string[];
  stateKeys: string[];
  lastAction?: {
    type: string;
    timestamp: Date;
    payload?: any;
  };
}
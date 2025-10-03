/**
 * 기본 서비스 클래스
 * 모든 Supabase 서비스의 공통 기능과 에러 처리를 담당
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { performanceMonitor } from '@/state/utils/performanceUtils';

/**
 * 서비스 에러 클래스
 */
export class ServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: any,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ServiceError';
  }

  /**
   * Supabase 에러를 서비스 에러로 변환
   */
  static fromSupabaseError(error: any, context?: Record<string, any>): ServiceError {
    const message = error.message || '데이터베이스 오류가 발생했습니다.';
    const code = error.code || 'UNKNOWN_ERROR';
    
    return new ServiceError(message, code, error, context);
  }

  /**
   * 한글 에러 메시지 변환
   */
  getLocalizedMessage(): string {
    const errorMessages: Record<string, string> = {
      'PGRST116': '데이터를 찾을 수 없습니다.',
      'PGRST301': '접근 권한이 없습니다.',
      '23505': '중복된 데이터입니다.',
      '23503': '참조 제약조건 위반입니다.',
      '23502': '필수 값이 누락되었습니다.',
      '42501': '권한이 부족합니다.',
      'NETWORK_ERROR': '네트워크 연결을 확인해주세요.',
      'TIMEOUT_ERROR': '요청 시간이 초과되었습니다.',
    };

    return errorMessages[this.code] || this.message;
  }
}

/**
 * 재시도 설정
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

/**
 * 기본 서비스 클래스
 */
export abstract class BaseService {
  protected client: SupabaseClient;
  protected serviceName: string;

  // 기본 재시도 설정
  protected retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableErrors: ['NETWORK_ERROR', 'TIMEOUT_ERROR', '500', '502', '503', '504'],
  };

  constructor(serviceName: string, client?: SupabaseClient) {
    this.client = client || supabase;
    this.serviceName = serviceName;
  }

  /**
   * 성능 측정과 함께 작업 실행
   */
  protected async executeWithPerformanceTracking<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    const measureKey = `${this.serviceName}.${operationName}`;
    
    performanceMonitor.startMeasure(measureKey);
    
    try {
      this.logOperation('start', operationName, context);
      const result = await operation();
      this.logOperation('success', operationName, context);
      
      return result;
    } catch (error) {
      this.logOperation('error', operationName, { ...context, error });
      throw error;
    } finally {
      performanceMonitor.endMeasure(measureKey);
    }
  }

  /**
   * 재시도 메커니즘과 함께 작업 실행
   */
  protected async executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    const finalConfig = { ...this.retryConfig, ...config };
    let lastError: any;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // 재시도 가능한 에러인지 확인
        const errorCode = (error as any)?.code || (error as any)?.status?.toString() || 'UNKNOWN_ERROR';
        if (!finalConfig.retryableErrors.includes(errorCode) || attempt === finalConfig.maxRetries) {
          break;
        }

        // 지수 백오프로 대기
        const delay = Math.min(
          finalConfig.baseDelay * Math.pow(2, attempt),
          finalConfig.maxDelay
        );
        
        this.logOperation('retry', 'operation', { 
          attempt: attempt + 1, 
          delay, 
          error: errorCode 
        });

        await this.sleep(delay);
      }
    }

    throw ServiceError.fromSupabaseError(lastError);
  }

  /**
   * Supabase 쿼리 실행 헬퍼
   */
  protected async executeQuery<T>(
    queryBuilder: any,
    errorContext?: Record<string, any>
  ): Promise<T> {
    try {
      const { data, error } = await queryBuilder;
      
      if (error) {
        throw ServiceError.fromSupabaseError(error, errorContext);
      }

      return data;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw ServiceError.fromSupabaseError(error, errorContext);
    }
  }

  /**
   * 단일 레코드 조회 (없으면 null 반환)
   */
  protected async executeSingleQuery<T>(
    queryBuilder: any,
    errorContext?: Record<string, any>
  ): Promise<T | null> {
    try {
      const { data, error } = await queryBuilder.single();
      
      if (error) {
        // 데이터가 없는 경우 null 반환
        if (error.code === 'PGRST116') {
          return null;
        }
        throw ServiceError.fromSupabaseError(error, errorContext);
      }

      return data;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw ServiceError.fromSupabaseError(error, errorContext);
    }
  }

  /**
   * 데이터 유효성 검사
   */
  protected validateRequiredFields<T extends Record<string, any>>(
    data: T,
    requiredFields: (keyof T)[],
    operationName?: string
  ): void {
    const missingFields = requiredFields.filter(field => 
      data[field] === undefined || data[field] === null || data[field] === ''
    );

    if (missingFields.length > 0) {
      throw new ServiceError(
        `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
        'VALIDATION_ERROR',
        undefined,
        { missingFields, operationName }
      );
    }
  }

  /**
   * 사용자 권한 확인
   */
  protected async validateUserAccess(
    userId: string,
    resourceUserId: string,
    operationName?: string
  ): Promise<void> {
    if (userId !== resourceUserId) {
      throw new ServiceError(
        '해당 리소스에 접근할 권한이 없습니다.',
        'ACCESS_DENIED',
        undefined,
        { userId, resourceUserId, operationName }
      );
    }
  }

  /**
   * 배치 작업 실행
   */
  protected async executeBatch<T, R>(
    items: T[],
    operation: (item: T) => Promise<R>,
    batchSize = 10
  ): Promise<Array<{ success: boolean; result?: R; error?: ServiceError; item: T }>> {
    const results: Array<{ success: boolean; result?: R; error?: ServiceError; item: T }> = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (item) => {
        try {
          const result = await operation(item);
          return { success: true, result, item };
        } catch (error) {
          const serviceError = error instanceof ServiceError 
            ? error 
            : ServiceError.fromSupabaseError(error);
          return { success: false, error: serviceError, item };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 트랜잭션 실행 (RPC 사용)
   */
  protected async executeTransaction<T>(
    operations: Array<{ name: string; params: any }>,
    transactionName?: string
  ): Promise<T> {
    try {
      const { data, error } = await this.client.rpc('execute_transaction', {
        operations,
        transaction_name: transactionName || `${this.serviceName}_transaction`,
      });

      if (error) {
        throw ServiceError.fromSupabaseError(error, { operations, transactionName });
      }

      return data;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }
      throw ServiceError.fromSupabaseError(error, { operations, transactionName });
    }
  }

  /**
   * 실시간 구독 설정
   */
  protected setupRealtimeSubscription(
    table: string,
    callback: (event: string, payload: any) => void,
    filter?: { column: string; value: any }
  ) {
    const channel = this.client
      .channel(`${this.serviceName}_${table}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        ...(filter && { filter: `${filter.column}=eq.${filter.value}` })
      }, (payload) => {
        this.logOperation('realtime', 'subscription_event', { 
          table, 
          event: payload.eventType,
          id: (payload.new as any)?.id || (payload.old as any)?.id 
        });
        callback(payload.eventType, payload);
      })
      .subscribe();

    return channel;
  }

  /**
   * 대량 데이터 조회 (페이지네이션)
   */
  protected async executePaginatedQuery<T>(
    baseQuery: any,
    options: {
      page?: number;
      limit?: number;
      orderBy?: string;
      ascending?: boolean;
    } = {}
  ): Promise<{
    data: T[];
    totalCount: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }> {
    const { page = 1, limit = 50, orderBy, ascending = true } = options;
    const offset = (page - 1) * limit;

    // 총 개수 조회
    const { count } = await baseQuery.select('*', { count: 'exact', head: true });
    
    // 데이터 조회
    let query = baseQuery.select('*').range(offset, offset + limit - 1);
    
    if (orderBy) {
      query = query.order(orderBy, { ascending });
    }

    const { data, error } = await query;

    if (error) {
      throw ServiceError.fromSupabaseError(error);
    }

    return {
      data,
      totalCount: count || 0,
      page,
      limit,
      hasMore: offset + limit < (count || 0),
    };
  }

  /**
   * 캐시 키 생성
   */
  protected getCacheKey(operation: string, params: Record<string, any>): string {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    
    return `${this.serviceName}:${operation}:${paramString}`;
  }

  /**
   * 작업 로깅
   */
  private logOperation(
    type: 'start' | 'success' | 'error' | 'retry' | 'realtime',
    operation: string,
    context?: Record<string, any>
  ): void {
    if (process.env.NODE_ENV === 'development') {
      const logLevel = type === 'error' ? 'error' : 'log';
      console[logLevel](`[${this.serviceName}] ${type.toUpperCase()}: ${operation}`, context);
    }
  }

  /**
   * 비동기 대기 헬퍼
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * 서비스 팩토리
 */
export class ServiceFactory {
  private static services: Map<string, any> = new Map();

  /**
   * 서비스 인스턴스 등록
   */
  static register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * 서비스 인스턴스 조회
   */
  static get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`서비스를 찾을 수 없습니다: ${name}`);
    }
    return service;
  }

  /**
   * 모든 서비스 초기화
   */
  static clear(): void {
    this.services.clear();
  }
}
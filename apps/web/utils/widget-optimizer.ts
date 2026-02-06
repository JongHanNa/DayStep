import type { Todo } from '@/entities/todo/Todo';
import type { WidgetTodo } from '../plugins/widget-bridge/src';

/**
 * Widget 최적화 설정
 */
export interface WidgetOptimizationConfig {
  /** 최대 할일 개수 */
  maxTodos: number;
  /** 데이터 압축 여부 */
  enableCompression: boolean;
  /** 변경 감지 활성화 */
  enableDiffing: boolean;
  /** 캐시 활성화 */
  enableCaching: boolean;
  /** 캐시 만료 시간 (밀리초) */
  cacheExpiryMs: number;
}

/**
 * Widget 데이터 통계
 */
export interface WidgetDataStats {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  processingTimeMs: number;
  cacheHitRate: number;
  diffPercentage: number;
}

/**
 * 캐시된 데이터
 */
interface CachedData {
  data: WidgetTodo[];
  hash: string;
  timestamp: number;
  size: number;
}

/**
 * Widget 데이터 최적화 유틸리티
 */
export class WidgetOptimizer {
  private static instance: WidgetOptimizer;
  private config: WidgetOptimizationConfig;
  private cache: Map<string, CachedData> = new Map();
  private stats: WidgetDataStats = this.getDefaultStats();
  private lastProcessedHash: string = '';

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  public static getInstance(): WidgetOptimizer {
    if (!WidgetOptimizer.instance) {
      WidgetOptimizer.instance = new WidgetOptimizer();
    }
    return WidgetOptimizer.instance;
  }

  /**
   * 기본 설정 반환
   */
  private getDefaultConfig(): WidgetOptimizationConfig {
    return {
      maxTodos: 100,
      enableCompression: true,
      enableDiffing: true,
      enableCaching: true,
      cacheExpiryMs: 5 * 60 * 1000 // 5분
    };
  }

  /**
   * 기본 통계 반환
   */
  private getDefaultStats(): WidgetDataStats {
    return {
      originalSize: 0,
      optimizedSize: 0,
      compressionRatio: 0,
      processingTimeMs: 0,
      cacheHitRate: 0,
      diffPercentage: 0
    };
  }

  /**
   * Todo 데이터를 Widget용으로 최적화
   */
  public optimizeTodos(todos: Todo[]): WidgetTodo[] {
    const startTime = performance.now();
    
    try {
      // 1. 데이터 해시 생성
      const dataHash = this.generateHash(todos);
      
      // 2. 캐시 확인
      if (this.config.enableCaching) {
        const cached = this.getCachedData(dataHash);
        if (cached) {
          this.updateCacheHitStats(performance.now() - startTime);
          return cached.data;
        }
      }

      // 3. 데이터 필터링 및 정렬
      const filteredTodos = this.filterAndSortTodos(todos);
      
      // 4. Widget 형태로 변환
      const widgetTodos = this.transformToWidgetTodos(filteredTodos);
      
      // 5. 압축 적용
      const optimizedTodos = this.config.enableCompression 
        ? this.compressTodos(widgetTodos)
        : widgetTodos;

      // 6. 캐시 저장
      if (this.config.enableCaching) {
        this.cacheData(dataHash, optimizedTodos);
      }

      // 7. 통계 업데이트
      this.updateStats(todos, optimizedTodos, performance.now() - startTime, dataHash);

      return optimizedTodos;
    } catch (error) {
      // Widget optimization failed - using fallback
      return this.getFallbackTodos(todos);
    }
  }

  /**
   * 할일 필터링 및 정렬 (위젯용: 현재 시간 이후 시간 지정 할일 우선)
   */
  private filterAndSortTodos(todos: Todo[]): Todo[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const currentTimeInMinutes = now.getHours() * 60 + now.getMinutes();

    // 우선순위 계산 함수
    const calculateTimePriority = (todo: Todo): number => {
      if (todo.startTime && todo.endTime) {
        const todoDate = new Date(todo.startTime);
        const todoTimeInMinutes = todoDate.getHours() * 60 + todoDate.getMinutes();
        
        // 오늘 날짜의 시간 지정 할일인지 확인
        const isTodayTodo = todoDate.toDateString() === today.toDateString();
        
        if (isTodayTodo) {
          if (todoTimeInMinutes > currentTimeInMinutes) {
            // 현재 시간 이후의 할일: 높은 우선순위 (가까운 시간일수록 높음)
            return 10000 - (todoTimeInMinutes - currentTimeInMinutes);
          } else {
            // 현재 시간 이전의 할일: 낮은 우선순위
            return 1000;
          }
        } else if (todoDate > today) {
          // 미래 날짜의 할일: 중간 우선순위
          return 5000;
        } else {
          // 과거 날짜의 할일: 낮은 우선순위
          return 500;
        }
      } else {
        // 시간 지정이 없는 할일: 기본 우선순위
        return 3000;
      }
    };

    return todos
      .filter(todo => {
        // 완료된 할일 제외 (최근 완료된 것은 포함)
        if (todo.completed) {
          const updatedAt = new Date(todo.updatedAt);
          const hoursSinceUpdate = (now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60);
          return hoursSinceUpdate < 24; // 24시간 이내 완료된 것만
        }

        return true; // 모든 미완료 할일 포함
      })
      .sort((a, b) => {
        // 1. 완료 상태 (미완료 우선)
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }

        // 2. 시간 우선순위 (높은 숫자가 우선)
        const priorityA = calculateTimePriority(a);
        const priorityB = calculateTimePriority(b);
        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }

        // 3. orderIndex 순서 (낮은 숫자가 우선)
        if (a.orderIndex !== b.orderIndex) {
          return a.orderIndex - b.orderIndex;
        }

        // 4. 최근 업데이트 순
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, this.config.maxTodos);
  }

  /**
   * Widget Todo 형태로 변환
   */
  private transformToWidgetTodos(todos: Todo[]): WidgetTodo[] {
    return todos.map((todo): WidgetTodo => {
      // 시간 정보를 제목에 포함
      let displayTitle = this.optimizeTitle(todo.title);
      
      // 시간 지정 할일인 경우 시간 정보 추가
      if (todo.startTime) {
        const startTime = new Date(todo.startTime);
        const timeString = startTime.toLocaleTimeString('ko-KR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
        displayTitle = `${timeString} ${displayTitle}`;
      }

      return {
        id: todo.id,
        title: displayTitle,
        completed: todo.completed,
        priority: this.determinePriority(todo),
        dueDate: todo.startTime ? new Date(todo.startTime).toISOString() : undefined,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString(),
        category: todo.scheduleType || undefined,
        tags: this.generateTags(todo)
      };
    });
  }

  /**
   * 할일의 우선순위 결정
   */
  private determinePriority(todo: Todo): 'high' | 'medium' | 'low' {
    const now = new Date();
    
    // 시간 지정 할일인 경우
    if (todo.startTime) {
      const todoDate = new Date(todo.startTime);
      const timeDiffMinutes = (todoDate.getTime() - now.getTime()) / (1000 * 60);
      
      if (timeDiffMinutes <= 30 && timeDiffMinutes > 0) {
        return 'high'; // 30분 이내 시작하는 할일
      } else if (timeDiffMinutes <= 120 && timeDiffMinutes > 0) {
        return 'medium'; // 2시간 이내 시작하는 할일
      }
    }
    
    return 'low'; // 기본 우선순위
  }

  /**
   * 할일에 대한 태그 생성
   */
  private generateTags(todo: Todo): string[] {
    const tags: string[] = [];
    
    // 스케줄 타입 태그
    if (todo.scheduleType) {
      switch (todo.scheduleType) {
        case 'timed':
          tags.push('시간지정');
          break;
        case 'all_day':
          tags.push('종일');
          break;
        case 'anytime':
          tags.push('언제든지');
          break;
      }
    }
    
    // 반복 할일 태그
    if (todo.recurrencePattern && todo.recurrencePattern !== 'none') {
      tags.push('반복');
    }
    
    return tags;
  }

  /**
   * 제목 최적화 (길이 제한)
   */
  private optimizeTitle(title: string): string {
    const maxLength = 50; // Widget에 표시할 최대 길이
    
    if (title.length <= maxLength) {
      return title;
    }

    // 단어 단위로 자르기
    const words = title.split(' ');
    let optimized = '';
    
    for (const word of words) {
      const testLength = optimized.length + word.length + (optimized ? 1 : 0);
      if (testLength <= maxLength - 3) { // '...' 공간 확보
        optimized += (optimized ? ' ' : '') + word;
      } else {
        break;
      }
    }

    return optimized + (optimized.length < title.length ? '...' : '');
  }

  /**
   * 카테고리 최적화
   */
  private optimizeCategory(category?: string): string | undefined {
    if (!category) return undefined;
    
    // 카테고리 길이 제한
    const maxLength = 20;
    return category.length > maxLength 
      ? category.substring(0, maxLength - 3) + '...'
      : category;
  }

  /**
   * 태그 최적화
   */
  private optimizeTags(tags?: string | string[]): string[] | undefined {
    if (!tags) return undefined;
    
    const tagArray = Array.isArray(tags) ? tags : [tags];
    
    // 최대 3개 태그만 유지
    return tagArray
      .slice(0, 3)
      .map(tag => tag.length > 15 ? tag.substring(0, 12) + '...' : tag);
  }

  /**
   * 데이터 압축
   */
  private compressTodos(todos: WidgetTodo[]): WidgetTodo[] {
    // 중복 데이터 제거 및 필수 필드만 유지
    return todos.map(todo => {
      const compressed: WidgetTodo = {
        id: todo.id,
        title: todo.title,
        completed: todo.completed,
        priority: todo.priority,
        createdAt: todo.createdAt,
        updatedAt: todo.updatedAt
      };

      // 선택적 필드 추가 (값이 있는 경우만)
      if (todo.dueDate) compressed.dueDate = todo.dueDate;
      if (todo.category) compressed.category = todo.category;
      if (todo.tags && todo.tags.length > 0) compressed.tags = todo.tags;

      return compressed;
    });
  }

  /**
   * 데이터 해시 생성
   */
  private generateHash(todos: Todo[]): string {
    const relevantData = todos.map(todo => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
      orderIndex: todo.orderIndex,
      updatedAt: todo.updatedAt.toISOString()
    }));

    return btoa(JSON.stringify(relevantData)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
  }

  /**
   * 캐시된 데이터 가져오기
   */
  private getCachedData(hash: string): CachedData | null {
    if (!this.config.enableCaching) return null;

    const cached = this.cache.get(hash);
    if (!cached) return null;

    // 캐시 만료 확인
    const now = Date.now();
    if (now - cached.timestamp > this.config.cacheExpiryMs) {
      this.cache.delete(hash);
      return null;
    }

    return cached;
  }

  /**
   * 캐시에 데이터 저장
   */
  private cacheData(hash: string, data: WidgetTodo[]): void {
    if (!this.config.enableCaching) return;

    const cached: CachedData = {
      data,
      hash,
      timestamp: Date.now(),
      size: JSON.stringify(data).length
    };

    // 캐시 크기 제한 (최대 10개 항목)
    if (this.cache.size >= 10) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(hash, cached);
  }

  /**
   * 통계 업데이트
   */
  private updateStats(
    originalTodos: Todo[], 
    optimizedTodos: WidgetTodo[], 
    processingTime: number,
    hash: string
  ): void {
    const originalSize = JSON.stringify(originalTodos).length;
    const optimizedSize = JSON.stringify(optimizedTodos).length;
    
    this.stats.originalSize = originalSize;
    this.stats.optimizedSize = optimizedSize;
    this.stats.compressionRatio = originalSize > 0 ? optimizedSize / originalSize : 1;
    this.stats.processingTimeMs = processingTime;
    
    // 변경 감지
    if (this.config.enableDiffing && this.lastProcessedHash) {
      this.stats.diffPercentage = this.lastProcessedHash === hash ? 0 : 100;
    }
    
    this.lastProcessedHash = hash;
  }

  /**
   * 캐시 히트 통계 업데이트
   */
  private updateCacheHitStats(processingTime: number): void {
    this.stats.processingTimeMs = processingTime;
    this.stats.cacheHitRate = Math.min(this.stats.cacheHitRate + 0.1, 1.0);
  }

  /**
   * 오류 시 대체 데이터 생성
   */
  private getFallbackTodos(todos: Todo[]): WidgetTodo[] {
    // Using fallback todo optimization
    
    return todos
      .filter(todo => !todo.completed)
      .slice(0, 5)
      .map(todo => ({
        id: todo.id,
        title: todo.title.substring(0, 30),
        completed: todo.completed,
        priority: 'medium' as const,
        createdAt: todo.createdAt.toISOString(),
        updatedAt: todo.updatedAt.toISOString()
      }));
  }

  /**
   * 현재 통계 반환
   */
  public getStats(): WidgetDataStats {
    return { ...this.stats };
  }

  /**
   * 설정 업데이트
   */
  public updateConfig(config: Partial<WidgetOptimizationConfig>): void {
    this.config = { ...this.config, ...config };
    // Widget optimizer config updated
  }

  /**
   * 캐시 초기화
   */
  public clearCache(): void {
    this.cache.clear();
    this.stats.cacheHitRate = 0;
    // Widget optimizer cache cleared
  }

  /**
   * 변경된 데이터만 반환 (차이점 분석)
   */
  public getDiff(newTodos: Todo[], previousHash?: string): { changed: boolean; diff: WidgetTodo[] } {
    const newHash = this.generateHash(newTodos);
    const changed = previousHash ? newHash !== previousHash : true;
    
    if (!changed) {
      return { changed: false, diff: [] };
    }

    const optimized = this.optimizeTodos(newTodos);
    return { changed: true, diff: optimized };
  }
}

// 싱글톤 인스턴스 export
export const widgetOptimizer = WidgetOptimizer.getInstance();
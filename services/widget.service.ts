import { WidgetBridge, type WidgetTodo, type WidgetStatus } from '../plugins/widget-bridge/src';
import { widgetOptimizer } from '../utils/widget-optimizer';
import { backgroundSyncService } from './background-sync.service';
import { useTodoStore } from '@/state/stores/todoStore';
import type { Todo } from '@/entities/todo/Todo';

/**
 * Widget 서비스 설정
 */
export interface WidgetServiceConfig {
  /** 자동 동기화 활성화 */
  autoSync: boolean;
  /** 백그라운드 동기화 활성화 */
  backgroundSync: boolean;
  /** 동기화 디바운스 시간 (ms) */
  debounceMs: number;
  /** 최대 동기화 할일 개수 */
  maxTodos: number;
  /** 성능 모니터링 활성화 */
  enablePerfMonitoring: boolean;
}

/**
 * Widget 서비스 상태
 */
export interface WidgetServiceState {
  isInitialized: boolean;
  isSupported: boolean;
  isLoading: boolean;
  lastSync: Date | null;
  error: string | null;
  syncCount: number;
  status: WidgetStatus | null;
}

/**
 * Widget 성능 메트릭
 */
export interface WidgetPerformanceMetrics {
  avgSyncTime: number;
  syncSuccessRate: number;
  compressionRatio: number;
  cacheHitRate: number;
  errorRate: number;
  totalSyncs: number;
}

/**
 * 통합 Widget 관리 서비스
 * 모든 Widget 관련 기능을 통합 관리
 */
export class WidgetService {
  private static instance: WidgetService;
  private config: WidgetServiceConfig;
  private state: WidgetServiceState;
  private metrics: WidgetPerformanceMetrics;
  private debounceTimer: NodeJS.Timeout | null = null;
  private syncTimes: number[] = [];
  private syncResults: boolean[] = [];

  private constructor() {
    this.config = this.getDefaultConfig();
    this.state = this.getDefaultState();
    this.metrics = this.getDefaultMetrics();
  }

  public static getInstance(): WidgetService {
    if (!WidgetService.instance) {
      WidgetService.instance = new WidgetService();
    }
    return WidgetService.instance;
  }

  /**
   * 기본 설정 반환
   */
  private getDefaultConfig(): WidgetServiceConfig {
    return {
      autoSync: true,
      backgroundSync: true,
      debounceMs: 500,
      maxTodos: 20,
      enablePerfMonitoring: true
    };
  }

  /**
   * 기본 상태 반환
   */
  private getDefaultState(): WidgetServiceState {
    return {
      isInitialized: false,
      isSupported: false,
      isLoading: false,
      lastSync: null,
      error: null,
      syncCount: 0,
      status: null
    };
  }

  /**
   * 기본 메트릭 반환
   */
  private getDefaultMetrics(): WidgetPerformanceMetrics {
    return {
      avgSyncTime: 0,
      syncSuccessRate: 0,
      compressionRatio: 0,
      cacheHitRate: 0,
      errorRate: 0,
      totalSyncs: 0
    };
  }

  /**
   * Widget 서비스 초기화
   */
  public async initialize(config?: Partial<WidgetServiceConfig>): Promise<boolean> {
    try {
      console.log('🚀 Initializing Widget Service...');

      // 설정 업데이트
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // 플랫폼 지원 여부 확인
      this.state.isSupported = await this.checkPlatformSupport();
      
      if (!this.state.isSupported) {
        console.log('ℹ️ Widget not supported on this platform');
        this.state.isInitialized = true;
        return true;
      }

      // Widget 상태 확인
      this.state.status = await WidgetBridge.getWidgetStatus();

      // 최적화 설정 업데이트
      widgetOptimizer.updateConfig({
        maxTodos: this.config.maxTodos,
        enableCaching: true,
        enableCompression: true,
        enableDiffing: true
      });

      // 백그라운드 동기화 시작
      if (this.config.backgroundSync) {
        await backgroundSyncService.start({
          intervalMinutes: 30,
          enableBackgroundMode: true,
          detectNetworkChanges: true
        });
      }

      // Todo 스토어 구독 (자동 동기화)
      if (this.config.autoSync) {
        this.setupAutoSync();
      }

      this.state.isInitialized = true;
      console.log('✅ Widget Service initialized successfully');
      
      return true;
    } catch (error) {
      console.error('❌ Widget Service initialization failed:', error);
      this.state.error = error instanceof Error ? error.message : 'Initialization failed';
      return false;
    }
  }

  /**
   * 플랫폼 지원 여부 확인
   */
  private async checkPlatformSupport(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;
      
      // Capacitor 네이티브 환경 확인
      const { Capacitor } = await import('@capacitor/core');
      if (!Capacitor.isNativePlatform()) {
        return false; // 웹 환경에서는 Widget 미지원
      }

      // iOS 버전 확인 (Widget은 iOS 14+ 지원)
      // @ts-ignore - 플러그인이 설치되지 않을 수 있음
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      
      if (info.platform === 'ios') {
        const version = parseFloat(info.osVersion);
        return version >= 14.0;
      }

      return false; // Android Widget은 아직 미구현
    } catch (error) {
      console.error('Platform support check failed:', error);
      return false;
    }
  }

  /**
   * 자동 동기화 설정
   */
  private setupAutoSync(): void {
    const todoStore = useTodoStore.getState();
    
    // Todo 변경 감지 리스너
    const handleTodoChange = () => {
      this.debouncedSync();
    };

    // 스토어 구독
    // @ts-ignore - Zustand subscribe 타입 불일치
    todoStore.subscribe?.(handleTodoChange);
    
    console.log('🔄 Auto-sync enabled');
  }

  /**
   * 디바운스된 동기화
   */
  private debouncedSync(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.syncNow();
    }, this.config.debounceMs);
  }

  /**
   * 즉시 동기화 실행
   */
  public async syncNow(force: boolean = false): Promise<boolean> {
    if (!this.state.isSupported) {
      console.log('ℹ️ Widget sync skipped - not supported');
      return false;
    }

    if (this.state.isLoading && !force) {
      console.log('ℹ️ Widget sync skipped - already in progress');
      return false;
    }

    const startTime = performance.now();
    this.state.isLoading = true;
    this.state.error = null;

    try {
      // Todo 데이터 가져오기
      const todoStore = useTodoStore.getState();
      const todos = todoStore.todos || [];

      // 데이터 최적화
      const optimizedTodos = widgetOptimizer.optimizeTodos(todos);

      if (optimizedTodos.length === 0) {
        console.log('ℹ️ No todos to sync to widget');
        this.state.isLoading = false;
        return true;
      }

      // Widget과 동기화
      const result = await WidgetBridge.syncTodos({
        todos: optimizedTodos,
        maxItems: this.config.maxTodos,
        force
      });

      if (result.success) {
        // 상태 업데이트
        this.state.lastSync = new Date();
        this.state.syncCount++;
        this.state.error = null;
        
        // 성능 메트릭 업데이트
        if (this.config.enablePerfMonitoring) {
          this.updateMetrics(performance.now() - startTime, true);
        }

        console.log(`✅ Widget sync successful: ${optimizedTodos.length} todos`);
        return true;
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.state.error = errorMessage;
      
      // 성능 메트릭 업데이트
      if (this.config.enablePerfMonitoring) {
        this.updateMetrics(performance.now() - startTime, false);
      }

      console.error('❌ Widget sync failed:', errorMessage);
      return false;
    } finally {
      this.state.isLoading = false;
    }
  }

  /**
   * Widget 새로고침
   */
  public async refresh(): Promise<boolean> {
    if (!this.state.isSupported) return false;

    try {
      const result = await WidgetBridge.reloadWidget();
      if (result.success) {
        // 상태 업데이트
        this.state.status = await WidgetBridge.getWidgetStatus();
        console.log('✅ Widget refreshed');
        return true;
      } else {
        throw new Error(result.message || 'Refresh failed');
      }
    } catch (error) {
      console.error('❌ Widget refresh failed:', error);
      this.state.error = error instanceof Error ? error.message : 'Refresh failed';
      return false;
    }
  }

  /**
   * Widget 데이터 삭제
   */
  public async clear(): Promise<boolean> {
    if (!this.state.isSupported) return false;

    try {
      const result = await WidgetBridge.clearTodos();
      if (result.success) {
        this.state.lastSync = new Date();
        this.state.status = await WidgetBridge.getWidgetStatus();
        console.log('✅ Widget data cleared');
        return true;
      } else {
        throw new Error(result.message || 'Clear failed');
      }
    } catch (error) {
      console.error('❌ Widget clear failed:', error);
      this.state.error = error instanceof Error ? error.message : 'Clear failed';
      return false;
    }
  }

  /**
   * 앱 섹션 열기 (딥링킹)
   */
  public async openApp(section: string = 'todos', todoId?: string): Promise<boolean> {
    try {
      const result = await WidgetBridge.openApp({ section, todoId });
      return result.success;
    } catch (error) {
      console.error('❌ Failed to open app:', error);
      return false;
    }
  }

  /**
   * 성능 메트릭 업데이트
   */
  private updateMetrics(syncTime: number, success: boolean): void {
    // 동기화 시간 기록
    this.syncTimes.push(syncTime);
    if (this.syncTimes.length > 100) {
      this.syncTimes.shift();
    }

    // 성공/실패 기록
    this.syncResults.push(success);
    if (this.syncResults.length > 100) {
      this.syncResults.shift();
    }

    // 메트릭 계산
    this.metrics.avgSyncTime = this.syncTimes.reduce((a, b) => a + b, 0) / this.syncTimes.length;
    this.metrics.syncSuccessRate = this.syncResults.filter(r => r).length / this.syncResults.length;
    this.metrics.errorRate = 1 - this.metrics.syncSuccessRate;
    this.metrics.totalSyncs = this.state.syncCount;

    // 최적화 통계 가져오기
    const optimizerStats = widgetOptimizer.getStats();
    this.metrics.compressionRatio = optimizerStats.compressionRatio;
    this.metrics.cacheHitRate = optimizerStats.cacheHitRate;
  }

  /**
   * 현재 상태 반환
   */
  public getState(): WidgetServiceState {
    return { ...this.state };
  }

  /**
   * 현재 설정 반환
   */
  public getConfig(): WidgetServiceConfig {
    return { ...this.config };
  }

  /**
   * 성능 메트릭 반환
   */
  public getMetrics(): WidgetPerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 설정 업데이트
   */
  public async updateConfig(config: Partial<WidgetServiceConfig>): Promise<void> {
    const oldConfig = this.config;
    this.config = { ...this.config, ...config };

    // 백그라운드 동기화 설정 변경
    if (oldConfig.backgroundSync !== this.config.backgroundSync) {
      if (this.config.backgroundSync) {
        await backgroundSyncService.start();
      } else {
        await backgroundSyncService.stop();
      }
    }

    // 최적화 설정 업데이트
    if (oldConfig.maxTodos !== this.config.maxTodos) {
      widgetOptimizer.updateConfig({ maxTodos: this.config.maxTodos });
    }

    console.log('⚙️ Widget service config updated:', config);
  }

  /**
   * 진단 정보 수집
   */
  public async getDiagnostics(): Promise<any> {
    return {
      state: this.getState(),
      config: this.getConfig(),
      metrics: this.getMetrics(),
      optimizerStats: widgetOptimizer.getStats(),
      backgroundSyncStatus: backgroundSyncService.getStatus(),
      widgetStatus: this.state.status,
      platformInfo: {
        isNative: this.state.isSupported,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * 서비스 종료
   */
  public async destroy(): Promise<void> {
    // 타이머 정리
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 백그라운드 서비스 종료
    await backgroundSyncService.destroy();

    // 캐시 정리
    widgetOptimizer.clearCache();

    this.state.isInitialized = false;
    console.log('🗑️ Widget service destroyed');
  }
}

// 싱글톤 인스턴스 export
export const widgetService = WidgetService.getInstance();
import { Capacitor } from '@capacitor/core';
import { WidgetBridge } from '../plugins/widget-bridge/src';
import { useTodoStore } from '@/state/stores/todoStore';

/**
 * 백그라운드 동기화 설정
 */
export interface BackgroundSyncConfig {
  /** 동기화 간격 (분 단위) */
  intervalMinutes: number;
  /** 백그라운드 모드 활성화 여부 */
  enableBackgroundMode: boolean;
  /** 네트워크 변화 감지 여부 */
  detectNetworkChanges: boolean;
  /** 최대 재시도 횟수 */
  maxRetries: number;
  /** 재시도 지연 시간 (초) */
  retryDelaySeconds: number;
}

/**
 * 백그라운드 동기화 상태
 */
export interface BackgroundSyncStatus {
  isActive: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  syncCount: number;
  errorCount: number;
  lastError: string | null;
}

/**
 * 백그라운드에서 Widget과 데이터를 동기화하는 서비스
 */
export class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private config: BackgroundSyncConfig;
  private status: BackgroundSyncStatus;
  private syncInterval: NodeJS.Timeout | null = null;
  private isNative: boolean;
  private retryTimeouts: Set<NodeJS.Timeout> = new Set();

  private constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.config = this.getDefaultConfig();
    this.status = this.getDefaultStatus();
  }

  public static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * 기본 설정 반환
   */
  private getDefaultConfig(): BackgroundSyncConfig {
    return {
      intervalMinutes: 30,
      enableBackgroundMode: this.isNative,
      detectNetworkChanges: true,
      maxRetries: 3,
      retryDelaySeconds: 60
    };
  }

  /**
   * 기본 상태 반환
   */
  private getDefaultStatus(): BackgroundSyncStatus {
    return {
      isActive: false,
      lastSync: null,
      nextSync: null,
      syncCount: 0,
      errorCount: 0,
      lastError: null
    };
  }

  /**
   * 백그라운드 동기화 시작
   */
  public async start(config?: Partial<BackgroundSyncConfig>): Promise<boolean> {
    try {
      // 설정 업데이트
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // 이미 활성화된 경우 중지 후 재시작
      if (this.status.isActive) {
        await this.stop();
      }

      // 백그라운드 모드 활성화 (네이티브만)
      if (this.isNative && this.config.enableBackgroundMode) {
        await this.enableBackgroundMode();
      }

      // 동기화 스케줄 시작
      this.scheduleSync();

      // 네트워크 상태 감지
      if (this.config.detectNetworkChanges) {
        this.setupNetworkListeners();
      }

      this.status.isActive = true;
      this.updateNextSyncTime();

      return true;
    } catch (error) {
      console.error('❌ Failed to start background sync:', error);
      this.status.lastError = error instanceof Error ? error.message : 'Unknown error';
      return false;
    }
  }

  /**
   * 백그라운드 동기화 중지
   */
  public async stop(): Promise<void> {
    try {
      // 스케줄 중지
      if (this.syncInterval) {
        clearInterval(this.syncInterval);
        this.syncInterval = null;
      }

      // 재시도 타이머 정리
      this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
      this.retryTimeouts.clear();

      // 백그라운드 모드 비활성화
      if (this.isNative && this.config.enableBackgroundMode) {
        await this.disableBackgroundMode();
      }

      this.status.isActive = false;
      this.status.nextSync = null;

      // Background sync stopped
    } catch (error) {
      console.error('❌ Error stopping background sync:', error);
    }
  }

  /**
   * 즉시 동기화 실행
   */
  public async syncNow(): Promise<boolean> {
    try {
      // Starting manual background sync

      // Todo 스토어에서 데이터 가져오기
      const todoStore = useTodoStore.getState();
      const todos = todoStore.getPendingTodos().slice(0, 20);

      if (todos.length === 0) {
        return true;
      }

      // Widget과 동기화
      const result = await WidgetBridge.syncTodos({
        todos: todos.map(todo => ({
          id: todo.id,
          title: todo.title,
          completed: todo.completed,
          priority: 'medium',
          dueDate: (todo as any).due_date || undefined,
          createdAt: new Date(todo.createdAt).toISOString(),
          updatedAt: new Date(todo.updatedAt).toISOString()
        })),
        maxItems: 20,
        force: false
      });

      if (result.success) {
        this.status.lastSync = new Date();
        this.status.syncCount++;
        this.status.lastError = null;
        this.updateNextSyncTime();

        return true;
      } else {
        throw new Error(result.message || 'Sync failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.status.errorCount++;
      this.status.lastError = errorMessage;

      console.error('❌ Background sync failed:', errorMessage);

      // 재시도 스케줄링
      this.scheduleRetry();
      return false;
    }
  }

  /**
   * 현재 상태 반환
   */
  public getStatus(): BackgroundSyncStatus {
    return { ...this.status };
  }

  /**
   * 현재 설정 반환
   */
  public getConfig(): BackgroundSyncConfig {
    return { ...this.config };
  }

  /**
   * 설정 업데이트
   */
  public async updateConfig(config: Partial<BackgroundSyncConfig>): Promise<void> {
    const oldConfig = this.config;
    this.config = { ...this.config, ...config };

    // 간격이 변경된 경우 스케줄 재시작
    if (oldConfig.intervalMinutes !== this.config.intervalMinutes && this.status.isActive) {
      this.scheduleSync();
    }

    // Config updated
  }

  /**
   * 동기화 스케줄링
   */
  private scheduleSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const intervalMs = this.config.intervalMinutes * 60 * 1000;
    
    this.syncInterval = setInterval(() => {
      this.syncNow();
    }, intervalMs);

    this.updateNextSyncTime();
    // Sync scheduled
  }

  /**
   * 재시도 스케줄링
   */
  private scheduleRetry(): void {
    if (this.status.errorCount >= this.config.maxRetries) {
      console.warn(`🚫 Max retries (${this.config.maxRetries}) reached - stopping retries`);
      return;
    }

    const delayMs = this.config.retryDelaySeconds * 1000;
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(timeout);
      this.syncNow();
    }, delayMs);

    this.retryTimeouts.add(timeout);
    // Retry scheduled
  }

  /**
   * 다음 동기화 시간 업데이트
   */
  private updateNextSyncTime(): void {
    if (this.status.isActive) {
      const nextSync = new Date();
      nextSync.setMinutes(nextSync.getMinutes() + this.config.intervalMinutes);
      this.status.nextSync = nextSync;
    }
  }

  /**
   * 백그라운드 모드 활성화 (네이티브만)
   */
  private async enableBackgroundMode(): Promise<void> {
    if (!this.isNative) return;

    try {
      // BackgroundMode 플러그인을 동적으로 로드
      try {
        // @ts-ignore - 플러그인이 설치되지 않을 수 있음
        const { BackgroundMode } = await import('@capacitor/background-mode');
        await BackgroundMode.enable();
        // Background mode enabled
      } catch (importError) {
        // BackgroundMode plugin not available
      }
    } catch (error) {
      console.error('❌ Failed to enable background mode:', error);
    }
  }

  /**
   * 백그라운드 모드 비활성화
   */
  private async disableBackgroundMode(): Promise<void> {
    if (!this.isNative) return;

    try {
      try {
        // @ts-ignore - 플러그인이 설치되지 않을 수 있음
        const { BackgroundMode } = await import('@capacitor/background-mode');
        await BackgroundMode.disable();
        // Background mode disabled
      } catch (importError) {
        // BackgroundMode plugin not available
      }
    } catch (error) {
      console.error('❌ Failed to disable background mode:', error);
    }
  }

  /**
   * 네트워크 상태 변화 리스너 설정
   */
  private setupNetworkListeners(): void {
    const handleOnline = () => {
      // Network back online - triggering sync
      this.syncNow();
    };

    const handleOffline = () => {
      // Network offline - sync paused
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // 서비스 인스턴스에 리스너 해제 메소드 추가
      this.cleanup = () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }

  /**
   * 리소스 정리
   */
  private cleanup?: () => void;

  /**
   * 서비스 종료 시 리소스 정리
   */
  public async destroy(): Promise<void> {
    await this.stop();
    this.cleanup?.();
    // Background sync service destroyed
  }
}

// 싱글톤 인스턴스 export
export const backgroundSyncService = BackgroundSyncService.getInstance();
/**
 * Local Storage 지속성 유틸리티
 * Zustand 스토어의 로컬 저장소 관리 및 동기화 기능
 */

import { User } from "@/entities/user/User";
import { Todo } from "@/entities/todo/Todo";
import { RepositoryItem } from "@/entities/repository/RepositoryItem";

/**
 * 저장소 키 접두사
 */
const STORAGE_PREFIX = "daystep";

/**
 * 저장소 키 생성
 */
function createStorageKey(userId: string, storeType: string): string {
  return `${STORAGE_PREFIX}_${storeType}_${userId}`;
}

/**
 * 로컬 저장소 데이터 타입
 */
interface LocalStorageData<T = any> {
  version: number;
  timestamp: number;
  data: T;
  metadata?: {
    lastSync?: number;
    itemCount?: number;
    checksum?: string;
  };
}

/**
 * 압축된 저장소 데이터 (용량 절약용)
 */
interface CompressedStorageData {
  v: number; // version
  t: number; // timestamp
  d: any; // data (compressed)
  m?: {
    // metadata
    s?: number; // lastSync
    c?: number; // itemCount
    h?: string; // checksum
  };
}

/**
 * 로컬 저장소 관리 클래스
 */
export class LocalStorageManager {
  private static instance: LocalStorageManager;
  private maxRetries = 3;
  private retryDelay = 1000;

  private constructor() {}

  static getInstance(): LocalStorageManager {
    if (!LocalStorageManager.instance) {
      LocalStorageManager.instance = new LocalStorageManager();
    }
    return LocalStorageManager.instance;
  }

  /**
   * 데이터를 로컬 저장소에 저장
   */
  async saveData<T>(
    userId: string,
    storeType: string,
    data: T,
    options: {
      version?: number;
      compress?: boolean;
      metadata?: LocalStorageData["metadata"];
    } = {}
  ): Promise<boolean> {
    const { version = 1, compress = true, metadata } = options;

    try {
      const storageKey = createStorageKey(userId, storeType);
      const storageData: LocalStorageData<T> = {
        version,
        timestamp: Date.now(),
        data,
        metadata: {
          ...metadata,
          lastSync: Date.now(),
          itemCount: Array.isArray(data) ? data.length : 1,
        },
      };

      const serializedData = compress
        ? this.compressData(storageData)
        : JSON.stringify(storageData);

      // 저장소 용량 체크
      if (this.willExceedQuota(serializedData)) {
        await this.cleanup(userId);
      }

      localStorage.setItem(storageKey, serializedData);

      // 저장 검증
      const savedData = localStorage.getItem(storageKey);
      if (!savedData) {
        throw new Error("데이터 저장 실패");
      }

      this.logStorageAction("saveData", {
        userId,
        storeType,
        size: serializedData.length,
      });
      return true;
    } catch (error) {
      console.error("로컬 저장소 저장 오류:", error);
      return false;
    }
  }

  /**
   * 로컬 저장소에서 데이터 로드
   */
  async loadData<T>(
    userId: string,
    storeType: string,
    options: {
      maxAge?: number; // 최대 캐시 시간 (밀리초)
      fallback?: T;
    } = {}
  ): Promise<T | null> {
    const { maxAge, fallback = null as T } = options;

    try {
      const storageKey = createStorageKey(userId, storeType);
      const rawData = localStorage.getItem(storageKey);

      if (!rawData) {
        return fallback;
      }

      let storageData: LocalStorageData<T>;

      // 압축된 데이터인지 확인하고 파싱
      if (rawData.startsWith("{") && rawData.includes('"version"')) {
        storageData = JSON.parse(rawData);
      } else {
        storageData = this.decompressData<T>(rawData);
      }

      // 데이터 버전 체크
      if (storageData.version !== 1) {
        console.warn(`버전 불일치: ${storageData.version} !== 1`);
        return fallback;
      }

      // 최대 캐시 시간 체크
      if (maxAge && Date.now() - storageData.timestamp > maxAge) {
        this.removeData(userId, storeType);
        return fallback;
      }

      this.logStorageAction("loadData", {
        userId,
        storeType,
        age: Date.now() - storageData.timestamp,
      });

      return storageData.data;
    } catch (error) {
      console.error("로컬 저장소 로드 오류:", error);
      return fallback;
    }
  }

  /**
   * 특정 데이터 삭제
   */
  removeData(userId: string, storeType: string): boolean {
    try {
      const storageKey = createStorageKey(userId, storeType);
      localStorage.removeItem(storageKey);
      this.logStorageAction("removeData", { userId, storeType });
      return true;
    } catch (error) {
      console.error("로컬 저장소 삭제 오류:", error);
      return false;
    }
  }

  /**
   * 사용자의 모든 데이터 삭제
   */
  clearUserData(userId: string): boolean {
    try {
      const keys = Object.keys(localStorage);
      const userKeys = keys.filter(
        (key) =>
          key.startsWith(`${STORAGE_PREFIX}_`) && key.endsWith(`_${userId}`)
      );

      userKeys.forEach((key) => localStorage.removeItem(key));

      this.logStorageAction("clearUserData", {
        userId,
        clearedKeys: userKeys.length,
      });
      return true;
    } catch (error) {
      console.error("사용자 데이터 삭제 오류:", error);
      return false;
    }
  }

  /**
   * 모든 앱 데이터 삭제
   */
  clearAllData(): boolean {
    try {
      const keys = Object.keys(localStorage);
      const appKeys = keys.filter((key) =>
        key.startsWith(`${STORAGE_PREFIX}_`)
      );

      appKeys.forEach((key) => localStorage.removeItem(key));

      this.logStorageAction("clearAllData", { clearedKeys: appKeys.length });
      return true;
    } catch (error) {
      console.error("전체 데이터 삭제 오류:", error);
      return false;
    }
  }

  /**
   * 저장소 용량 정보 조회
   */
  getStorageInfo(): {
    used: number;
    available: number;
    quota: number;
    percentage: number;
    appDataSize: number;
  } {
    try {
      let totalSize = 0;
      let appDataSize = 0;

      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          const itemSize = localStorage.getItem(key)?.length || 0;
          totalSize += key.length + itemSize;

          if (key.startsWith(`${STORAGE_PREFIX}_`)) {
            appDataSize += key.length + itemSize;
          }
        }
      }

      // 대략적인 로컬스토리지 할당량 (보통 5-10MB)
      const estimatedQuota = 5 * 1024 * 1024; // 5MB
      const available = estimatedQuota - totalSize;
      const percentage = (totalSize / estimatedQuota) * 100;

      return {
        used: totalSize,
        available: Math.max(0, available),
        quota: estimatedQuota,
        percentage: Math.min(100, percentage),
        appDataSize,
      };
    } catch (error) {
      console.error("저장소 정보 조회 오류:", error);
      return {
        used: 0,
        available: 0,
        quota: 0,
        percentage: 0,
        appDataSize: 0,
      };
    }
  }

  /**
   * 저장소 정리 (오래된 데이터 삭제)
   */
  private async cleanup(userId: string): Promise<void> {
    try {
      const keys = Object.keys(localStorage);
      const appKeys = keys.filter((key) =>
        key.startsWith(`${STORAGE_PREFIX}_`)
      );

      // 오래된 데이터 삭제 (7일 이상)
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7일
      const now = Date.now();

      for (const key of appKeys) {
        try {
          const rawData = localStorage.getItem(key);
          if (!rawData) continue;

          let storageData: LocalStorageData;
          if (rawData.startsWith("{")) {
            storageData = JSON.parse(rawData);
          } else {
            storageData = this.decompressData(rawData);
          }

          if (now - storageData.timestamp > maxAge) {
            localStorage.removeItem(key);
          }
        } catch (error) {
          // 파싱 오류 시 해당 키 삭제
          localStorage.removeItem(key);
        }
      }

      this.logStorageAction("cleanup", { userId });
    } catch (error) {
      console.error("저장소 정리 오류:", error);
    }
  }

  /**
   * 저장소 할당량 초과 확인
   */
  private willExceedQuota(data: string): boolean {
    const info = this.getStorageInfo();
    const dataSize = data.length;

    // 90% 이상 사용 시 정리 필요
    return (info.used + dataSize) / info.quota > 0.9;
  }

  /**
   * 데이터 압축
   */
  private compressData<T>(data: LocalStorageData<T>): string {
    const compressed: CompressedStorageData = {
      v: data.version,
      t: data.timestamp,
      d: data.data,
      m: data.metadata
        ? {
            s: data.metadata.lastSync,
            c: data.metadata.itemCount,
            h: data.metadata.checksum,
          }
        : undefined,
    };

    return JSON.stringify(compressed);
  }

  /**
   * 데이터 압축 해제
   */
  private decompressData<T>(compressedData: string): LocalStorageData<T> {
    const compressed: CompressedStorageData = JSON.parse(compressedData);

    return {
      version: compressed.v,
      timestamp: compressed.t,
      data: compressed.d,
      metadata: compressed.m
        ? {
            lastSync: compressed.m.s,
            itemCount: compressed.m.c,
            checksum: compressed.m.h,
          }
        : undefined,
    };
  }

  /**
   * 개발 환경에서 저장소 액션 로깅
   */
  private logStorageAction(action: string, payload?: any): void {
    if (process.env.NODE_ENV === "development") {
      console.group(`[LocalStorage] ${action}`);
      if (payload) {
        console.log("Payload:", payload);
      }
      console.log("Storage Info:", this.getStorageInfo());
      console.groupEnd();
    }
  }
}

/**
 * 엔티티별 지속성 관리자
 */
export class EntityPersistenceManager {
  private storage = LocalStorageManager.getInstance();

  /**
   * 사용자 데이터 저장
   */
  async saveUsers(userId: string, users: User[]): Promise<boolean> {
    const serializedUsers = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    }));

    return this.storage.saveData(userId, "users", serializedUsers, {
      metadata: { itemCount: users.length },
    });
  }

  /**
   * 사용자 데이터 로드
   */
  async loadUsers(userId: string): Promise<User[]> {
    const data = await this.storage.loadData<any[]>(userId, "users");

    if (!data) return [];

    return data.map((item) =>
      User.fromDatabase({
        id: item.id,
        email: item.email,
        name: item.name,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      })
    );
  }



  /**
   * 할일 데이터 저장
   */
  async saveTodos(userId: string, todos: Todo[]): Promise<boolean> {
    const serializedTodos = todos.map((todo) => ({
      id: todo.id,
      userId: todo.userId,
      content: todo.content,
      completed: todo.completed,
      orderIndex: todo.orderIndex,
      createdAt: todo.createdAt.toISOString(),
      updatedAt: todo.updatedAt.toISOString(),
    }));

    return this.storage.saveData(userId, "todos", serializedTodos, {
      metadata: { itemCount: todos.length },
    });
  }

  /**
   * 할일 데이터 로드
   */
  async loadTodos(userId: string): Promise<Todo[]> {
    const data = await this.storage.loadData<any[]>(userId, "todos");

    if (!data) return [];

    return data.map((item) =>
      Todo.fromDatabase({
        id: item.id,
        user_id: item.userId,
        content: item.content,
        completed: item.completed,
        order_index: item.orderIndex,
        description: item.description || null,
        priority: item.priority || null,
        schedule_type: item.scheduleType || "anytime",
        start_time: item.startTime || null,
        end_time: item.endTime || null,
        recurrence_pattern: item.recurrencePattern || "none",
        recurrence_end_date: item.recurrenceEndDate || null,
        recurrence_count: item.recurrenceCount || null,
        recurrence_interval: item.recurrenceInterval || 1,
        recurrence_days_of_week: item.recurrenceDaysOfWeek || null,
        recurrence_day_of_month: item.recurrenceDayOfMonth || null,
        parent_todo_id: item.parentTodoId || null,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      })
    );
  }

  /**
   * 보관함 데이터 저장
   */
  async saveRepositoryItems(
    userId: string,
    items: RepositoryItem[]
  ): Promise<boolean> {
    const serializedItems = items.map((item) => ({
      id: item.id,
      userId: item.userId,
      type: item.type,
      title: item.title,
      content: item.content,
      category: item.category,
      sourceId: item.sourceId,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    }));

    return this.storage.saveData(userId, "repository", serializedItems, {
      metadata: { itemCount: items.length },
    });
  }

  /**
   * 보관함 데이터 로드
   */
  async loadRepositoryItems(userId: string): Promise<RepositoryItem[]> {
    const data = await this.storage.loadData<any[]>(userId, "repository");

    if (!data) return [];

    return data.map((item) =>
      RepositoryItem.fromDatabase({
        id: item.id,
        user_id: item.userId,
        type: item.type,
        title: item.title,
        content: item.content,
        category: item.category,
        source_id: item.sourceId,
        created_at: item.createdAt,
        updated_at: item.updatedAt,
      })
    );
  }

  /**
   * 모든 엔티티 데이터 삭제
   */
  async clearAllEntityData(userId: string): Promise<boolean> {
    return this.storage.clearUserData(userId);
  }
}

/**
 * 싱글톤 인스턴스 익스포트
 */
export const localStorageManager = LocalStorageManager.getInstance();
export const entityPersistenceManager = new EntityPersistenceManager();

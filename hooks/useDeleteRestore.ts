'use client';

import { useCallback, useRef } from 'react';
import { useToast } from './use-toast';

export interface DeletedItem<T = any> {
  id: string;
  data: T;
  title: string;
  timestamp: Date;
  restore: () => Promise<void>;
  permanentDelete: () => Promise<void>;
}

export interface DeleteRestoreOptions {
  confirmationThreshold?: number; // 중요한 항목의 임계값 (예: 글자 수)
  undoTimeout?: number; // Undo 가능 시간 (밀리초)
  onConfirmDelete?: (item: any) => Promise<boolean>; // 삭제 확인 콜백
}

/**
 * 삭제 및 복구 시스템을 위한 Hook
 * - 즉시 복구 (Undo) 기능
 * - 삭제 확인 다이얼로그
 * - 임시 보관 및 영구 삭제
 */
export function useDeleteRestore<T = any>(options: DeleteRestoreOptions = {}) {
  const {
    confirmationThreshold = 50,
    undoTimeout = 5000,
    onConfirmDelete
  } = options;

  const { deleteToast, successToast, errorToast } = useToast();
  const deletedItemsRef = useRef<Map<string, DeletedItem<T>>>(new Map());
  const permanentDeleteTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  /**
   * 삭제 확인이 필요한지 판단
   */
  const needsConfirmation = useCallback((item: T, title: string): boolean => {
    // 제목이나 내용이 긴 경우 확인 필요
    if (title.length > confirmationThreshold) return true;
    
    // 특정 조건들 (예: 중요 플래그, 하위 항목 존재 등)
    if ((item as any).important) return true;
    if ((item as any).hasSubtasks) return true;
    
    return false;
  }, [confirmationThreshold]);

  /**
   * 항목 삭제 (Soft Delete with Undo)
   */
  const deleteItem = useCallback(async (
    id: string,
    title: string,
    item: T,
    restoreFunction: () => Promise<void>,
    permanentDeleteFunction: () => Promise<void>
  ): Promise<boolean> => {
    try {
      // 삭제 확인이 필요한 경우
      if (needsConfirmation(item, title)) {
        if (onConfirmDelete) {
          const confirmed = await onConfirmDelete(item);
          if (!confirmed) return false;
        } else {
          // 기본 확인 다이얼로그
          const confirmed = window.confirm(
            `정말로 "${title}"을(를) 삭제하시겠습니까?\n\n이 작업은 ${undoTimeout / 1000}초 내에 취소할 수 있습니다.`
          );
          if (!confirmed) return false;
        }
      }

      // 삭제된 항목 정보 저장
      const deletedItem: DeletedItem<T> = {
        id,
        data: item,
        title,
        timestamp: new Date(),
        restore: restoreFunction,
        permanentDelete: permanentDeleteFunction
      };

      deletedItemsRef.current.set(id, deletedItem);

      // Undo 토스트 표시
      const toastId = deleteToast(title, async () => {
        await restoreDeletedItem(id);
      });

      // 영구 삭제 타이머 설정
      const permanentDeleteTimer = setTimeout(async () => {
        await performPermanentDelete(id);
      }, undoTimeout);

      permanentDeleteTimeouts.current.set(id, permanentDeleteTimer);

      console.log(`✅ Item "${title}" marked for deletion with ${undoTimeout/1000}s undo window`);
      return true;

    } catch (error) {
      console.error('❌ Failed to delete item:', error);
      errorToast('삭제 중 오류가 발생했습니다');
      return false;
    }
  }, [deleteToast, errorToast, needsConfirmation, onConfirmDelete, undoTimeout]);

  /**
   * 삭제된 항목 복구
   */
  const restoreDeletedItem = useCallback(async (id: string): Promise<boolean> => {
    try {
      const deletedItem = deletedItemsRef.current.get(id);
      if (!deletedItem) {
        console.warn(`⚠️ Deleted item ${id} not found`);
        return false;
      }

      // 영구 삭제 타이머 취소
      const timer = permanentDeleteTimeouts.current.get(id);
      if (timer) {
        clearTimeout(timer);
        permanentDeleteTimeouts.current.delete(id);
      }

      // 복구 실행
      await deletedItem.restore();

      // 임시 보관에서 제거
      deletedItemsRef.current.delete(id);

      successToast(`"${deletedItem.title}"이(가) 복구되었습니다`);
      console.log(`✅ Item "${deletedItem.title}" restored successfully`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to restore item ${id}:`, error);
      errorToast('복구 중 오류가 발생했습니다');
      return false;
    }
  }, [successToast, errorToast]);

  /**
   * 영구 삭제 실행
   */
  const performPermanentDelete = useCallback(async (id: string): Promise<boolean> => {
    try {
      const deletedItem = deletedItemsRef.current.get(id);
      if (!deletedItem) {
        console.warn(`⚠️ Deleted item ${id} not found for permanent deletion`);
        return false;
      }

      // 영구 삭제 실행
      await deletedItem.permanentDelete();

      // 정리
      deletedItemsRef.current.delete(id);
      const timer = permanentDeleteTimeouts.current.get(id);
      if (timer) {
        clearTimeout(timer);
        permanentDeleteTimeouts.current.delete(id);
      }

      console.log(`✅ Item "${deletedItem.title}" permanently deleted`);
      return true;

    } catch (error) {
      console.error(`❌ Failed to permanently delete item ${id}:`, error);
      // 실패한 경우 다시 복구 가능하도록 타이머 재설정
      const timer = setTimeout(() => performPermanentDelete(id), 30000); // 30초 후 재시도
      permanentDeleteTimeouts.current.set(id, timer);
      return false;
    }
  }, []);

  /**
   * 즉시 영구 삭제 (Undo 없이)
   */
  const permanentDelete = useCallback(async (
    id: string,
    title: string,
    item: T,
    deleteFunction: () => Promise<void>
  ): Promise<boolean> => {
    try {
      // 반드시 확인 받기
      const confirmed = window.confirm(
        `정말로 "${title}"을(를) 영구적으로 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`
      );
      
      if (!confirmed) return false;

      await deleteFunction();
      successToast(`"${title}"이(가) 영구 삭제되었습니다`);
      return true;

    } catch (error) {
      console.error('❌ Failed to permanently delete item:', error);
      errorToast('영구 삭제 중 오류가 발생했습니다');
      return false;
    }
  }, [successToast, errorToast]);

  /**
   * 모든 삭제 대기 중인 항목들의 타이머 정리
   */
  const cleanup = useCallback(() => {
    permanentDeleteTimeouts.current.forEach(timer => clearTimeout(timer));
    permanentDeleteTimeouts.current.clear();
    deletedItemsRef.current.clear();
  }, []);

  /**
   * 삭제 대기 중인 항목 목록 조회
   */
  const getPendingDeletes = useCallback((): DeletedItem<T>[] => {
    return Array.from(deletedItemsRef.current.values());
  }, []);

  return {
    deleteItem,
    restoreDeletedItem,
    permanentDelete,
    cleanup,
    getPendingDeletes,
    
    // 통계 정보
    stats: {
      pendingDeletesCount: deletedItemsRef.current.size,
      hasDeletes: deletedItemsRef.current.size > 0
    }
  };
}
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

interface UseAutoSaveOptions {
  onSave: () => Promise<void>;
  onDelete?: () => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
}

interface UseAutoSaveReturn {
  saveStatus: SaveStatus;
  triggerSave: () => void;
  lastSavedAt: Date | null;
  errorMessage: string | null;
}

/**
 * 자동 저장 기능을 제공하는 커스텀 훅
 * 
 * @param content - 저장할 내용
 * @param options - 자동 저장 옵션
 * @returns 저장 상태와 수동 저장 함수
 */
export const useAutoSave = (
  content: string,
  options: UseAutoSaveOptions
): UseAutoSaveReturn => {
  const { onSave, onDelete, debounceMs = 1000, enabled = true } = options;
  
  // 상태 관리
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Refs
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastContentRef = useRef<string>(content);
  const isMountedRef = useRef(true);
  const isInitialLoadRef = useRef(true);

  // 저장 함수
  const performSave = useCallback(async () => {
    if (!isMountedRef.current) {
      return;
    }

    try {
      setSaveStatus('saving');
      setErrorMessage(null);

      await onSave();

      if (!isMountedRef.current) {
        return;
      }

      setSaveStatus('saved');
      setLastSavedAt(new Date());
      lastContentRef.current = content;

      // 2초 후 상태를 idle로 변경
      setTimeout(() => {
        if (isMountedRef.current) {
          setSaveStatus('idle');
        }
      }, 2000);

    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }

      setSaveStatus('error');
      setErrorMessage(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다');

      console.error('❌ [AutoSave] 저장 실패:', error);
    }
  }, [onSave, content]);

  // 수동 저장 트리거
  const triggerSave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    performSave();
  }, [performSave]);

  // 내용 변경 감지 및 debounced 자동 저장
  useEffect(() => {
    // 첫 마운트 시에는 자동 저장하지 않음
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      lastContentRef.current = content;
      return;
    }
    
    // 자동 저장이 비활성화되었거나 내용이 변경되지 않았으면 return
    if (!enabled || content === lastContentRef.current) {
      return;
    }
    
    // 빈 내용일 때 삭제 처리 (기존 메모가 있을 때만)
    if (!content.trim()) {
      // 이전에 저장된 내용이 있었다면 (빈 메모가 아닌 기존 메모를 지운 경우)
      if (lastContentRef.current.trim() && onDelete) {
        console.log('🗑️ [AutoSave] 빈 내용 감지, 노트 삭제 중...');
        
        // 상태를 삭제 중으로 설정 (saving 상태 재사용)
        setSaveStatus('saving');
        setErrorMessage(null);
        
        // debounce 타이머 설정
        timeoutRef.current = setTimeout(async () => {
          if (isMountedRef.current && enabled && onDelete) {
            try {
              await onDelete();
              if (isMountedRef.current) {
                setSaveStatus('saved');
                setLastSavedAt(new Date());
                lastContentRef.current = content;
                
                // 2초 후 상태를 idle로 변경
                setTimeout(() => {
                  if (isMountedRef.current) {
                    setSaveStatus('idle');
                  }
                }, 2000);
              }
            } catch (error) {
              if (isMountedRef.current) {
                setSaveStatus('error');
                setErrorMessage(error instanceof Error ? error.message : '삭제 중 오류가 발생했습니다');
                console.error('❌ [AutoSave] 노트 삭제 실패:', error);
              }
            }
          }
        }, debounceMs);
        
        console.log(`⏱️ [AutoSave] ${debounceMs}ms 후 노트 삭제 예약`);
      }
      return;
    }
    
    // 기존 타이머 취소
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // 상태를 pending으로 설정
    setSaveStatus('pending');
    setErrorMessage(null);
    
    // debounce 타이머 설정
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && enabled) {
        performSave();
      }
    }, debounceMs);
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [content, enabled, debounceMs, performSave, onDelete]);

  // 컴포넌트 마운트/언마운트 관리
  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveStatus,
    triggerSave,
    lastSavedAt,
    errorMessage,
  };
};

export default useAutoSave;
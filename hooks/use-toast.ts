import { useState, useCallback, useRef } from 'react';
import { toast as sonnerToast } from 'sonner';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: 'default' | 'destructive' | 'success';
  action?: ToastAction;
  duration?: number;
}

export interface UseToastOptions {
  duration?: number;
  persistent?: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const toast = useCallback(({ 
    title, 
    description, 
    variant = 'default',
    action,
    duration = 5000
  }: Omit<Toast, 'id'> & { duration?: number }) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      id,
      title,
      description,
      variant,
      action,
      duration
    };

    setToasts(prev => [...prev, newToast]);

    // 🎯 Sonner 토스트로 실제 화면에 표시
    const fullMessage = title ? `${title}\n${description}` : description;
    
    if (variant === 'destructive') {
      sonnerToast.error(fullMessage, {
        duration: duration,
        action: action ? {
          label: action.label,
          onClick: action.onClick
        } : undefined
      });
    } else if (variant === 'success') {
      sonnerToast.success(fullMessage, {
        duration: duration
      });
    } else {
      sonnerToast(fullMessage, {
        duration: duration,
        action: action ? {
          label: action.label,
          onClick: action.onClick
        } : undefined
      });
    }

    // 자동 제거 타이머 설정
    if (duration > 0) {
      const timeout = setTimeout(() => {
        dismiss(id);
      }, duration);
      
      timeoutRefs.current.set(id, timeout);
    }

    // 개발/프로덕션 환경에서 console 로그
    if (typeof window !== 'undefined') {
      const message = title ? `${title}: ${description}` : description;
      const actionText = action ? ` [${action.label}]` : '';
      console.log(`[Toast ${variant}]`, message + actionText);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    // 타이머 정리
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }

    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    // 모든 타이머 정리
    timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
    timeoutRefs.current.clear();
    
    setToasts([]);
  }, []);

  // 삭제 전용 토스트 헬퍼
  const deleteToast = useCallback((
    itemTitle: string, 
    onUndo: () => void,
    options: UseToastOptions = {}
  ) => {
    const { duration = 5000 } = options;
    
    return toast({
      title: '삭제됨',
      description: `"${itemTitle}"이(가) 삭제되었습니다`,
      variant: 'destructive',
      action: {
        label: '실행 취소',
        onClick: onUndo
      },
      duration
    });
  }, [toast]);

  // 성공 토스트 헬퍼
  const successToast = useCallback((message: string) => {
    // 직접 Sonner 호출로 더 빠른 표시
    sonnerToast.success(message, {
      duration: 3000
    });
    
    return toast({
      description: message,
      variant: 'success',
      duration: 3000
    });
  }, [toast]);

  // 에러 토스트 헬퍼
  const errorToast = useCallback((message: string) => {
    // 직접 Sonner 호출로 더 빠른 표시
    sonnerToast.error(`오류\n${message}`, {
      duration: 4000
    });
    
    return toast({
      title: '오류',
      description: message,
      variant: 'destructive',
      duration: 4000
    });
  }, [toast]);

  return {
    toast,
    deleteToast,
    successToast,
    errorToast,
    dismiss,
    dismissAll,
    toasts
  };
}
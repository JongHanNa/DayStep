'use client';

import { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PopoverContainerProps {
  position: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  width?: number;
  maxHeight?: number;
  className?: string;
}

export function PopoverContainer({
  position,
  onClose,
  children,
  title,
  width = 280,
  maxHeight = 400,
  className,
}: PopoverContainerProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // 화면 경계 처리된 위치 계산
  const getAdjustedPosition = useCallback(() => {
    if (typeof window === 'undefined') return position;

    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = position.x;
    let adjustedY = position.y;

    // 오른쪽 경계 체크
    if (position.x + width + padding > viewportWidth) {
      adjustedX = position.x - width - 20; // 메뉴 왼쪽에 표시
    }

    // 하단 경계 체크
    if (position.y + maxHeight + padding > viewportHeight) {
      adjustedY = viewportHeight - maxHeight - padding;
    }

    // 상단 경계 체크
    if (adjustedY < padding) {
      adjustedY = padding;
    }

    // 왼쪽 경계 체크
    if (adjustedX < padding) {
      adjustedX = padding;
    }

    return { x: adjustedX, y: adjustedY };
  }, [position, width, maxHeight]);

  const adjustedPosition = getAdjustedPosition();

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        // 액션 메뉴 클릭은 무시 (액션 메뉴에서 팝오버 전환 시)
        const target = event.target as HTMLElement;
        if (target.closest('[data-action-menu]')) return;

        onClose();
      }
    };

    // ESC 키로 닫기
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // 약간의 딜레이 후 이벤트 리스너 추가 (열릴 때 즉시 닫히는 것 방지)
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className={cn(
        'fixed z-[60] bg-base-100 rounded-xl shadow-xl border border-base-300',
        'animate-in fade-in-0 zoom-in-95 duration-150',
        className
      )}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
        width,
        maxHeight,
      }}
    >
      {/* 헤더 */}
      {title && (
        <div className="flex items-center justify-between px-3 py-2 border-b border-base-300">
          <span className="text-sm font-medium">{title}</span>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-xs btn-circle"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 콘텐츠 */}
      <div
        className="overflow-y-auto"
        style={{ maxHeight: title ? maxHeight - 44 : maxHeight }}
      >
        {children}
      </div>
    </div>
  );
}

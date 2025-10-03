'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface DragPortalProps {
  isActive: boolean;
  dragX: number;
  dragY: number;
  previewTime?: string;
  children: React.ReactNode;
}

/**
 * React Portal 기반 드래그 오버레이
 * - document.body에 직접 렌더링하여 스크롤 영향 완전 차단
 * - 절대 좌표 기반 위치 추적
 * - 타임라인과 완전히 분리된 레이어
 */
export const DragPortal: React.FC<DragPortalProps> = ({
  isActive,
  dragX,
  dragY,
  previewTime,
  children
}) => {
  if (!isActive || typeof window === 'undefined') return null;

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 pointer-events-none z-[9999]",
        "bg-transparent"
      )}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        pointerEvents: 'none'
      }}
    >
      {/* 드래그 카드 */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: dragX,
          top: dragY,
          transform: 'translate(-50%, -50%)',
          zIndex: 10000
        }}
      >
        {children}
      </div>

      {/* 드래그 중 시간 마커와 가이드 라인 (작은 카드와 정렬) */}
      {previewTime && (
        <div 
          className="absolute left-0 right-0 z-40 pointer-events-none"
          style={{
            top: dragY,
            transform: 'translateY(-50%)', // 작은 카드와 같은 중앙 정렬
            zIndex: 9999
          }}
        >
          <div className="flex items-center">
            {/* 시간 라벨 */}
            <div className="bg-blue-600 text-white px-2 py-1 rounded-md text-xs font-semibold mr-2 shadow-lg">
              {previewTime}
            </div>
            {/* 가로 라인 */}
            <div className="flex-1 h-0.5 bg-blue-600 shadow-sm" />
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};

export default DragPortal;
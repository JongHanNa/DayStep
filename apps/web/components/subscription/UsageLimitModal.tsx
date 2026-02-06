'use client';

/**
 * 용량 제한 모달
 *
 * 생성 시도 시 제한에 도달하면 표시되는 모달
 * - 현재/한도 표시
 * - 삭제 안내
 * - Pro 업그레이드 버튼
 */

import { useEffect, useRef } from 'react';
import { AlertCircle, Crown, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { CanCreateResult } from '@/hooks/useUsageStats';

interface UsageLimitModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean;
  /** 모달 닫기 핸들러 */
  onClose: () => void;
  /** 생성 가능 여부 결과 */
  result: CanCreateResult;
}

export function UsageLimitModal({ isOpen, onClose, result }: UsageLimitModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  // 백드롭 클릭 시 닫기
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;

    if (!isInDialog) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <dialog
      ref={dialogRef}
      className="modal z-[110]"
      onClick={handleBackdropClick}
      onClose={onClose}
    >
      <div className="modal-box max-w-sm">
        {/* 헤더 */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-error" />
          </div>
          <h3 className="text-lg font-bold">{result.displayName} 한도 도달</h3>
          <p className="text-base-content/60 mt-2">
            무료 플랜에서는 {result.displayName}을(를) {result.limit}개까지 생성할 수 있습니다.
          </p>
        </div>

        {/* 현재 상태 */}
        <div className="bg-base-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-base-content/60">현재 사용량</span>
            <span className="font-semibold text-error">
              {result.current} / {result.limit}개
            </span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-2">
            <div
              className="bg-error h-2 rounded-full transition-all"
              style={{ width: `${Math.min(result.percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* 안내 */}
        <div className="flex items-start gap-3 bg-base-200/50 rounded-lg p-3 mb-6">
          <Trash2 className="w-5 h-5 text-base-content/60 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-base-content/70">
            기존 {result.displayName}을(를) 삭제하면 새로 생성할 수 있습니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-2">
          <Link
            href="/settings/subscription"
            className="btn btn-primary w-full gap-2"
            onClick={onClose}
          >
            <Crown className="w-5 h-5" />
            Pro로 무제한 사용하기
          </Link>
          <button onClick={onClose} className="btn btn-ghost w-full">
            닫기
          </button>
        </div>
      </div>
    </dialog>
  );
}

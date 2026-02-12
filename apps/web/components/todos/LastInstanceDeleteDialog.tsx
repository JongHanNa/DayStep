'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';

interface LastInstanceDeleteDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  todoTitle: string;
  isDeleting: boolean;
}

/**
 * 마지막 반복 인스턴스 삭제 확인 다이얼로그
 *
 * 마지막 남은 반복 인스턴스를 삭제하려고 할 때 표시됩니다.
 * 삭제 시 원본 반복 할일과 관련된 모든 데이터(time_overrides, exclusions 등)가 삭제됩니다.
 */
export default function LastInstanceDeleteDialog({
  isOpen,
  onClose,
  onConfirm,
  todoTitle,
  isDeleting
}: LastInstanceDeleteDialogProps) {
  if (!isOpen) return null;

  const modalPositionClass = 'modal-bottom sm:modal-middle';

  const dialogContent = (
    <dialog open className={`modal modal-open z-[120] ${modalPositionClass}`}>
      <div className="modal-box bg-base-100 max-w-sm">
        {/* 헤더 */}
        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          마지막 반복 일정
        </h3>

        {/* 설명 */}
        <p className="text-base-content/70 mb-2">
          이것이 마지막 남은 반복 일정입니다.
        </p>
        <p className="text-sm text-warning mb-4">
          삭제하면 원본 반복 할일과 관련된 모든 데이터가 삭제됩니다.
        </p>

        {/* 할일 제목 */}
        <p className="text-sm font-medium mb-6 break-words">
          &ldquo;{todoTitle}&rdquo;
        </p>

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="btn btn-ghost btn-sm rounded-full"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="btn btn-error btn-sm rounded-full"
          >
            {isDeleting ? '삭제 중...' : '전체 삭제'}
          </button>
        </div>
      </div>

      {/* 배경 클릭으로 닫기 */}
      <div
        className="modal-backdrop bg-black/50"
        onClick={isDeleting ? undefined : onClose}
      />
    </dialog>
  );

  // Portal로 렌더링하여 z-index 문제 방지
  if (typeof window !== 'undefined') {
    return createPortal(dialogContent, document.body);
  }

  return dialogContent;
}

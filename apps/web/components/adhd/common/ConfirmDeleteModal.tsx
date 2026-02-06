'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import type { ConfirmDeleteModalProps } from '@/types/adhd';

/**
 * 삭제 확인 모달 컴포넌트
 *
 * DaisyUI dialog 기반의 삭제 확인 모달입니다.
 */
export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = '정말 삭제할까요?',
  message = '이 작업은 되돌릴 수 없습니다.',
  confirmLabel = '삭제',
  cancelLabel = '취소',
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <dialog open className="modal z-[110]">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="text-base-content/70 mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="btn btn-ghost flex-1 rounded-full"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="btn btn-error flex-1 rounded-full"
          >
            <Trash2 className="w-4 h-4" />
            {confirmLabel}
          </button>
        </div>
      </div>
      <form method="dialog" className="modal-backdrop bg-black/50">
        <button onClick={onClose}>close</button>
      </form>
    </dialog>
  );
}

export default ConfirmDeleteModal;

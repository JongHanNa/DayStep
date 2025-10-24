'use client';

import { useEffect } from 'react';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { useModalStore } from '@/state/stores/modalStore';

interface TodoEditModalProps {
  open: boolean;
  todo: TodoFormData | null;
  onClose: () => void;
  onSave: (todo: TodoFormData) => void;
  onChange: (todo: TodoFormData) => void;
}

export default function TodoEditModal({
  open,
  todo,
  onClose,
  onSave,
  onChange,
}: TodoEditModalProps) {
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  if (!open || !todo) return null;

  return (
    <dialog open className="modal modal-open">
      <div className={`modal-box w-full max-w-4xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        {/* 헤더 (취소-제목-저장) */}
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
          <button onClick={onClose} className="btn btn-primary btn-sm rounded-full">
            취소
          </button>
          <h3 className="font-bold text-lg">할일 편집</h3>
          <button onClick={() => onSave(todo)} className="btn btn-primary btn-sm rounded-full">
            저장
          </button>
        </div>

        {/* 콘텐츠 영역 */}
        <div className="flex-1 overflow-y-auto">
          <TodoFormFields
            todo={todo}
            onChange={onChange}
          />
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}

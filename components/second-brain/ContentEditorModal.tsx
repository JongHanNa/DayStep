'use client';

import { useEffect } from 'react';
import { useModalStore } from '@/state/stores/modalStore';
import AdvancedMarkdownEditor from '@/components/notes/AdvancedMarkdownEditor';

interface ContentEditorModalProps {
  open: boolean;
  content: string;
  onClose: () => void;
  onSave: () => void;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function ContentEditorModal({
  open,
  content,
  onClose,
  onSave,
  onChange,
  placeholder = '내용을 입력하세요..',
}: ContentEditorModalProps) {
  const { openModal, closeModal } = useModalStore();

  // 모달 열림/닫힘 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (open) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  if (!open) return null;

  return (
    <dialog open className="modal modal-open">
      <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        {/* 헤더 */}
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-1 border-b border-base-300 sticky top-0 bg-base-200 z-10`}>
          <button
            onClick={onClose}
            className="btn btn-primary btn-sm rounded-full"
          >
            취소
          </button>

          <h3 className="text-lg font-semibold">내용 편집</h3>

          <button
            onClick={onSave}
            className="btn btn-primary btn-sm rounded-full"
          >
            저장
          </button>
        </div>

        {/* 마크다운 에디터 */}
        <div className="flex-1 overflow-y-auto px-4">
          <div className="pt-0 pb-8">
            <AdvancedMarkdownEditor
              value={content}
              onChange={onChange}
              placeholder={placeholder}
              minHeight={740}
            />
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}

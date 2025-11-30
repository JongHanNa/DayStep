'use client';

import { useEffect, useState } from 'react';
import { useModalStore } from '@/state/stores/modalStore';
import AdvancedMarkdownEditor from '@/components/notes/AdvancedMarkdownEditor';
import { AutoSaveStatus } from '@/components/notes/AutoSaveStatus';
import { useAutoSave } from '@/hooks/useAutoSave';

interface ContentEditorModalProps {
  open: boolean;
  content: string;
  onClose: () => void;
  onSave: () => void;
  onChange: (content: string) => void;
  placeholder?: string;
  /**
   * 자동저장 활성화 여부 (기본: false)
   */
  enableAutoSave?: boolean;
  /**
   * 자동저장 콜백 (비동기)
   */
  onAutoSave?: (content: string) => Promise<void>;
  /**
   * 자동저장 디바운스 시간 (기본: 1000ms)
   */
  debounceMs?: number;
}

export default function ContentEditorModal({
  open,
  content,
  onClose,
  onSave,
  onChange,
  placeholder = '내용을 입력하세요..',
  enableAutoSave = false,
  onAutoSave,
  debounceMs = 1000,
}: ContentEditorModalProps) {
  const { openModal, closeModal } = useModalStore();

  // 사용자 편집 상태 추적
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false);
  const [originalContent] = useState(content);

  // 자동저장 Hook
  const autoSave = useAutoSave(content, {
    onSave: async () => {
      if (!content.trim()) {
        throw new Error('내용을 입력해주세요');
      }
      if (onAutoSave) {
        await onAutoSave(content);
      }
    },
    debounceMs,
    enabled: enableAutoSave && open && hasUserEditedContent
  });

  // 모달 열림/닫힘 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (open) {
      openModal();
      // 모달 열릴 때 편집 상태 초기화
      setHasUserEditedContent(false);
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal]);

  // 내용 변경 핸들러 (사용자 편집 감지)
  const handleContentChange = (value: string) => {
    onChange(value);
    // 사용자가 실제로 내용을 변경했을 때만 편집 상태로 표시
    if (!hasUserEditedContent && value !== originalContent) {
      setHasUserEditedContent(true);
    }
  };

  if (!open) return null;

  // Z-[110] ensures modal appears above AppHeader (z-40) in Capacitor
  return (
    <dialog open className="modal modal-open z-[110]">
      <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        {/* 헤더 */}
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-1 border-b border-base-300 sticky top-0 bg-base-200 z-10`}>
          <button
            onClick={onClose}
            className="btn btn-primary btn-sm rounded-full"
          >
            취소
          </button>

          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">내용 편집</h3>
            {enableAutoSave && (
              <AutoSaveStatus
                status={autoSave.saveStatus}
                onRetry={autoSave.triggerSave}
              />
            )}
          </div>

          <button
            onClick={onSave}
            className="btn btn-primary btn-sm rounded-full"
          >
            저장
          </button>
        </div>

        {/* 마크다운 에디터 */}
        <div
          className="flex-1 overflow-y-auto px-0"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          <div className="pt-0 pb-0">
            <AdvancedMarkdownEditor
              value={content}
              onChange={handleContentChange}
              placeholder={placeholder}
              minHeight={770}
            />
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}

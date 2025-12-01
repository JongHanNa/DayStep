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
  /** @deprecated 자동저장으로 대체됨 - 하위 호환성을 위해 유지 */
  onSave?: () => void;
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
  /**
   * 헤더에 표시할 제목 (미지정 시 기본값 사용)
   */
  title?: string;
}

export default function ContentEditorModal({
  open,
  content,
  onClose,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSave,
  onChange,
  placeholder = '내용을 입력하세요..',
  enableAutoSave = false,
  onAutoSave,
  debounceMs = 1000,
  title,
}: ContentEditorModalProps) {
  const { openModal, closeModal } = useModalStore();

  // 사용자 편집 상태 추적
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false);
  const [originalContent] = useState(content);

  // 글자 크기 조절 상태
  const [editorFontSize, setEditorFontSize] = useState(18);


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
        <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-1 border-b border-base-300`}>
          <button
            onClick={onClose}
            className="btn btn-primary btn-sm rounded-full"
          >
            닫기
          </button>

          <div className="flex-1 flex items-center justify-center gap-3 min-w-0">
            <h3 className="text-lg font-semibold text-center">
              {title || '내용 편집'}
            </h3>
            {enableAutoSave && (
              <AutoSaveStatus
                status={autoSave.saveStatus}
                onRetry={autoSave.triggerSave}
              />
            )}
          </div>

          {/* 오른쪽 균형용 빈 공간 */}
          <div className="w-[52px]" />
        </div>

        {/* 스크롤 영역: 슬라이더 + 에디터 */}
        <div
          className="flex-1 overflow-y-auto px-0"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            overscrollBehavior: 'auto'
          }}
        >
          <style jsx>{`
            div::-webkit-scrollbar {
              display: none;
            }
          `}</style>

          {/* 글자 크기 조절 슬라이더 */}
          <div className="flex items-center gap-3 px-4 py-2 bg-base-300/50">
            <span className="text-sm text-base-content/70">글자 크기: {editorFontSize}px</span>
            <input
              type="range"
              min="12"
              max="24"
              value={editorFontSize}
              onChange={(e) => setEditorFontSize(Number(e.target.value))}
              className="range range-xs range-primary w-32"
            />
          </div>

          {/* 마크다운 에디터 */}
          <AdvancedMarkdownEditor
            value={content}
            onChange={handleContentChange}
            placeholder={placeholder}
            minHeight={770}
            fontSize={editorFontSize}
          />
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>
  );
}

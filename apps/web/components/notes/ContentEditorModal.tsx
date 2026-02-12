'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModalStore } from '@/state/stores/modalStore';
import AdvancedMarkdownEditor, { AdvancedMarkdownEditorRef } from '@/components/notes/AdvancedMarkdownEditor';
import MarkdownToolbar from '@/components/notes/editor/MarkdownToolbar';
import { AutoSaveStatus } from '@/components/notes/AutoSaveStatus';
import { useAutoSave } from '@/hooks/useAutoSave';
import { ChevronDown, ChevronUp, ChevronLeft, PanelTop } from 'lucide-react';

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
  onSave,
  onChange,
  placeholder = '내용을 입력하세요..',
  enableAutoSave = false,
  onAutoSave,
  debounceMs = 1000,
  title,
}: ContentEditorModalProps) {
  const { openModal, closeModal } = useModalStore();

  // ✅ 내부 state 분리 - 외부 리렌더 영향 없이 에디터 독립적으로 동작
  const [localContent, setLocalContent] = useState(content);

  // 사용자 편집 상태 추적
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false);
  const [originalContent] = useState(content);

  // 글자 크기 조절 상태
  const [editorFontSize, setEditorFontSize] = useState(18);

  // 제목 접기/펼치기 상태
  const [isTitleExpanded, setIsTitleExpanded] = useState(false);

  // 툴바 표시/숨김 상태
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);

  // 제목 잘림 감지
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [isTitleTruncated, setIsTitleTruncated] = useState(false);

  // 에디터 ref (툴바에서 에디터 조작용)
  const editorRef = useRef<AdvancedMarkdownEditorRef>(null);

  // 툴바 핸들러 - 에디터 ref를 통해 텍스트 삽입
  const handleToolbarInsert = useCallback((text: string, cursorOffset?: number) => {
    editorRef.current?.insertText(text, cursorOffset);
  }, []);

  // 툴바 핸들러 - 선택 영역 감싸기
  const handleWrapSelection = useCallback((prefix: string, suffix: string) => {
    editorRef.current?.wrapSelection(prefix, suffix);
  }, []);


  // 자동저장 Hook - localContent 사용
  const autoSave = useAutoSave(localContent, {
    onSave: async () => {
      if (!localContent.trim()) {
        throw new Error('내용을 입력해주세요');
      }
      if (onAutoSave) {
        await onAutoSave(localContent);
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
      // ✅ 모달 열릴 때 외부 content로 localContent 초기화
      setLocalContent(content);
    }
    return () => {
      closeModal();
    };
  }, [open, openModal, closeModal, content]);

  // 제목 잘림 감지
  useEffect(() => {
    const checkTruncation = () => {
      if (titleRef.current && !isTitleExpanded) {
        const el = titleRef.current;
        setIsTitleTruncated(el.scrollWidth > el.clientWidth);
      }
    };

    checkTruncation();
    window.addEventListener('resize', checkTruncation);
    return () => window.removeEventListener('resize', checkTruncation);
  }, [title, open, isTitleExpanded]);

  // 내용 변경 핸들러 (사용자 편집 감지)
  const handleContentChange = (value: string) => {
    // ✅ 내부 state 업데이트 (에디터용 - 즉시 반영)
    setLocalContent(value);
    // ✅ 부모에게도 전달 (자동저장용)
    onChange(value);
    // 사용자가 실제로 내용을 변경했을 때만 편집 상태로 표시
    if (!hasUserEditedContent && value !== originalContent) {
      setHasUserEditedContent(true);
    }
  };

  if (!open) return null;

  // SSR 환경에서는 document가 없으므로 체크
  if (typeof document === 'undefined') return null;

  // Portal로 document.body에 직접 렌더링하여 부모 모달의 제약에서 벗어남
  // Z-[110] ensures modal appears above AppHeader (z-40)
  return createPortal(
    <dialog open className="modal modal-open z-[110] fixed inset-0">
      <div className={`modal-box rounded-none bg-base-200 dark:bg-base-100 w-full max-w-7xl h-screen max-h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
        {/* 헤더 - sticky로 고정하여 내용이 길어져도 항상 보이게 함 */}
        <div className={`sticky top-0 z-10 bg-base-200 dark:bg-base-100 flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-1`}>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-circle btn-sm"
          >
            <ChevronLeft size={24} />
          </button>

          <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
            <div
              className={`flex items-center gap-1 min-w-0 max-w-full ${isTitleTruncated || isTitleExpanded ? 'cursor-pointer' : ''}`}
              onClick={() => (isTitleTruncated || isTitleExpanded) && setIsTitleExpanded(!isTitleExpanded)}
            >
              <h3
                ref={titleRef}
                className={`text-lg font-semibold text-center ${isTitleExpanded ? 'whitespace-normal' : 'truncate'}`}
              >
                {title || '내용 편집'}
              </h3>
              {(isTitleTruncated || isTitleExpanded) && (
                <span className="flex-shrink-0 text-base-content/50">
                  {isTitleExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </span>
              )}
            </div>
            {enableAutoSave && (
              <AutoSaveStatus
                status={autoSave.saveStatus}
                onRetry={autoSave.triggerSave}
              />
            )}
          </div>

          {/* 툴바 토글 버튼 (오른쪽) */}
          <button
            onClick={() => setIsToolbarVisible(!isToolbarVisible)}
            className={`btn btn-ghost btn-circle btn-sm ${isToolbarVisible ? 'text-primary' : 'text-base-content/50'}`}
            title={isToolbarVisible ? '툴바 숨기기' : '툴바 보이기'}
          >
            <PanelTop size={20} />
          </button>
        </div>

        {/* MarkdownToolbar - 스크롤 영역 밖에 고정 배치 */}
        {isToolbarVisible && (
          <div className="flex-shrink-0 px-3">
            <MarkdownToolbar
              onInsert={handleToolbarInsert}
              onWrapSelection={handleWrapSelection}
              fontSize={editorFontSize}
              onFontSizeChange={setEditorFontSize}
            />
          </div>
        )}

        {/* 스크롤 영역: 에디터만 스크롤 */}
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

          {/* 마크다운 에디터 - 툴바는 위에서 별도 렌더링 */}
          <AdvancedMarkdownEditor
            ref={editorRef}
            value={localContent}  // ✅ 내부 state 사용 - 외부 리렌더 영향 없음
            onChange={handleContentChange}
            placeholder={placeholder}
            minHeight={0}
            fontSize={editorFontSize}
            onFontSizeChange={setEditorFontSize}
            showToolbar={false}  // 툴바는 스크롤 영역 밖에서 렌더링
          />
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </dialog>,
    document.body
  );
}

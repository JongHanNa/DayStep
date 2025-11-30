'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sheet } from 'react-modal-sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Save,
  Check,
  Clock,
  AlertCircle,
  Edit3,
  StickyNote
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useKeyboardAwareModal } from '@/hooks/useKeyboardAwareModal';
import { useAutoSave } from '@/hooks/useAutoSave';
import AdvancedMarkdownEditor from './AdvancedMarkdownEditor';
import MarkdownViewer from './MarkdownViewer';

interface NoteEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent?: string;
  onSave: (content: string) => void | Promise<void>;
  mode?: 'edit' | 'preview' | 'both';
  title?: string;
  placeholder?: string;
}

const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  open,
  onOpenChange,
  initialContent = '',
  onSave,
  mode = 'both',
  title = '노트 작성',
  placeholder = '노트 내용을 입력하세요...'
}) => {
  // 로컬 상태
  const [content, setContent] = useState(initialContent);
  const [originalContent, setOriginalContent] = useState(initialContent);
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'both'>('edit');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [hasUserEditedContent, setHasUserEditedContent] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // 중복 저장 방지

  // 키보드 적응형 모달 기능
  const keyboardAwareModal = useKeyboardAwareModal({
    offsetRatio: 0.8,
    animationDuration: 250,
    extraPadding: 20,
    minTopPadding: 60
  });

  // 자동 저장 기능
  const autoSave = useAutoSave(content, {
    onSave: async () => {
      if (!content.trim() || isSaving) {
        return; // 빈 내용이거나 이미 저장 중인 경우 저장하지 않음
      }

      setIsSaving(true);
      try {
        await onSave(content.trim());
      } finally {
        setIsSaving(false);
      }
    },
    onDelete: async () => {
      // 빈 내용일 때는 특별한 처리 없음 (할일 내 메모는 삭제되지 않음)
    },
    debounceMs: 1000,
    enabled: open && hasUserEditedContent && !isSaving // 저장 중일 때는 자동 저장 비활성화
  });

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setOriginalContent(initialContent);
      setHasUserEditedContent(false);
      setViewMode('edit');
      setShowExitConfirm(false);
      setIsSaving(false); // 저장 상태 초기화
    }
  }, [open, initialContent]);

  // 변경사항 확인
  const hasChanges = content !== originalContent;

  // 노트 편집 취소 시도
  const handleCancel = useCallback(() => {
    // 내용이 있으면 항상 확인 다이얼로그 표시
    if (content.trim()) {
      setShowExitConfirm(true);
    } else {
      onOpenChange(false);
    }
  }, [content, onOpenChange]);

  // 변경사항 저장하고 닫기
  const handleSaveAndClose = useCallback(async () => {
    if (isSaving) {
      return; // 이미 저장 중이면 중복 실행 방지
    }

    // 먼저 확인 다이얼로그 닫기
    setShowExitConfirm(false);

    if (content.trim()) {
      setIsSaving(true);
      try {
        await onSave(content.trim());
      } finally {
        setIsSaving(false);
      }
    }

    // 저장 후 메인 모달 닫기
    onOpenChange(false);
  }, [content, onSave, onOpenChange, isSaving]);

  // 변경사항 무시하고 닫기
  const handleDiscardAndClose = useCallback(() => {
    // 먼저 확인 다이얼로그 닫기
    setShowExitConfirm(false);
    // 그 다음 메인 모달 닫기
    onOpenChange(false);
  }, [onOpenChange]);

  // 내용 변경 핸들러
  const handleContentChange = useCallback((value: string) => {
    setContent(value);
    // 사용자가 실제로 내용을 변경했을 때만 편집 상태로 표시
    if (!hasUserEditedContent && value !== originalContent) {
      setHasUserEditedContent(true);
    }
  }, [hasUserEditedContent, originalContent]);

  // 수동 저장
  const handleManualSave = useCallback(async () => {
    if (content.trim() && !isSaving) {
      setIsSaving(true);
      try {
        await onSave(content.trim());
      } finally {
        setIsSaving(false);
      }
    }
  }, [content, onSave, isSaving]);

  // 뷰 모드 토글
  const toggleViewMode = useCallback(() => {
    if (mode === 'both') {
      if (viewMode === 'edit') {
        setViewMode('preview');
      } else if (viewMode === 'preview') {
        setViewMode('both');
      } else {
        setViewMode('edit');
      }
    }
  }, [mode, viewMode]);

  // 드래그로 모달을 닫을 때는 확인 없이 바로 닫기
  const handleDragClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <>
      {/* 메인 노트 편집 모달 */}
      <Sheet
        isOpen={open}
        onClose={handleDragClose}
        snapPoints={[1.0, 0.6, 0]}
        initialSnap={0}
        dragCloseThreshold={0.6}
        dragVelocityThreshold={500}
      >
        <Sheet.Container
          ref={keyboardAwareModal.containerRef}
          className="bg-background"
          style={{
            transition: 'padding-bottom 250ms ease-out',
          }}
        >
          <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
            <div className="flex items-center justify-between px-4 py-3">
              {/* 왼쪽: 취소 버튼 */}
              <Button
                type="button"
                size="sm"
                onClick={handleCancel}
                className="bg-brand hover:bg-brand-hover text-white font-medium px-4 py-2 rounded-full"
              >
                취소
              </Button>

              {/* 가운데: 제목 */}
              <div className="flex items-center gap-2">
                <StickyNote className="h-5 w-5 text-brand" />
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>

              {/* 오른쪽: 자동 저장 상태 표시만 */}
              <div className="flex items-center gap-2">
                {/* 자동 저장 상태 표시 */}
                {autoSave.saveStatus === 'pending' && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 animate-pulse" />
                    <span>저장 대기중...</span>
                  </div>
                )}

                {autoSave.saveStatus === 'saving' && (
                  <div className="flex items-center gap-1 text-xs text-brand">
                    <Save className="h-3 w-3 animate-spin" />
                    <span>저장 중...</span>
                  </div>
                )}

                {autoSave.saveStatus === 'saved' && (
                  <div className="flex items-center gap-1 text-xs text-green-600">
                    <Check className="h-3 w-3" />
                    <span>저장됨</span>
                  </div>
                )}

                {autoSave.saveStatus === 'error' && (
                  <Button
                    onClick={autoSave.triggerSave}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                  >
                    <AlertCircle className="h-3 w-3 mr-1" />
                    재시도
                  </Button>
                )}
              </div>
            </div>
          </Sheet.Header>

          <Sheet.Content>
            <div
              className="flex flex-col h-full"
              style={{
                pointerEvents: 'auto',
                touchAction: 'manipulation',
                backgroundColor: 'white'
              }}
            >
              <div
                className="flex-1 overflow-y-auto px-4 pt-4"
                style={{
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'auto'
                }}
              >
                <div className="space-y-4">
                  {/* 뷰 모드에 따른 렌더링 */}
                  {(viewMode === 'edit' || viewMode === 'both') && (
                    <div className={cn(
                      viewMode === 'both' && 'mb-6'
                    )}>
                      {viewMode === 'both' && (
                        <div className="mb-2">
                          <Badge variant="outline" className="text-xs">
                            <Edit3 className="h-3 w-3 mr-1" />
                            편집
                          </Badge>
                        </div>
                      )}
                      <AdvancedMarkdownEditor
                        value={content}
                        onChange={handleContentChange}
                        placeholder={placeholder}
                        className="text-sm"
                        minHeight={viewMode === 'both' ? 300 : 600}
                        onFocus={keyboardAwareModal.handleEditorFocus}
                        onBlur={keyboardAwareModal.handleEditorBlur}
                      />
                    </div>
                  )}

                  {(viewMode === 'preview' || viewMode === 'both') && content.trim() && (
                    <div>
                      {viewMode === 'both' && (
                        <div className="mb-2">
                          <Badge variant="outline" className="text-xs">
                            미리보기
                          </Badge>
                        </div>
                      )}
                      <div className="border border-border rounded-lg p-4 bg-gray-50/50">
                        <MarkdownViewer content={content} />
                      </div>
                    </div>
                  )}

                  {viewMode === 'preview' && !content.trim() && (
                    <div className="text-center py-8 text-muted-foreground">
                      <StickyNote className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p className="text-sm">미리 볼 내용이 없습니다</p>
                      <p className="text-xs text-muted-foreground/70">편집 모드로 전환해서 내용을 입력해보세요</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>

      {/* 변경사항 확인 다이얼로그 */}
      <Sheet
        isOpen={showExitConfirm}
        onClose={() => setShowExitConfirm(false)}
        detent="content-height"
      >
        <Sheet.Container className="bg-background">
          <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
            <div className="flex items-center justify-between px-4 py-3">
              {/* 왼쪽: 빈 공간 */}
              <div className="w-12"></div>

              {/* 가운데: 제목 */}
              <h2 className="text-lg font-semibold">편집을 중단하시겠어요?</h2>

              {/* 오른쪽: 닫기 버튼 */}
              <Button
                type="button"
                size="sm"
                onClick={() => setShowExitConfirm(false)}
                className="bg-brand hover:bg-brand-hover text-white font-medium px-3 py-2 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </Sheet.Header>

          <Sheet.Content style={{ backgroundColor: 'white' }}>
            <div className="px-4 pb-4">
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  작성 중인 노트 내용이 저장되지 않고 사라집니다.
                </p>

                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDiscardAndClose}
                    className="w-full border-red-300 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-4 w-4 mr-2" />
                    취소
                  </Button>

                  <Button
                    onClick={() => setShowExitConfirm(false)}
                    className="w-full bg-brand hover:bg-brand-hover text-white font-medium"
                  >
                    계속 편집하기
                  </Button>
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    </>
  );
};

export default NoteEditorModal;
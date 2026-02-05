'use client';

import { FileText, Plus } from 'lucide-react';

// 범용 노트 타입 (noteStore.Note와 domain.Note 모두 호환)
interface FuelNote {
  id: string;
  title?: string;
  content: string;
}

interface FuelSelectorProps {
  // 노트 데이터
  notes: FuelNote[];  // 선택 가능한 노트 목록 (이미 연결된 노트 제외됨)
  notesLoading?: boolean;

  // 모드 상태 (외부에서 관리)
  mode: 'select' | 'create';
  onModeChange: (mode: 'select' | 'create') => void;

  // 선택 모드
  selectedNoteId?: string | null;
  onSelectNote: (noteId: string | null) => void;

  // 생성 모드
  newContent: string;
  onNewContentChange: (content: string) => void;

  // 상태
  isConnecting?: boolean;

  // UI 커스터마이징 (사용처별 다른 텍스트)
  emptyMessage?: string;
  createPlaceholder?: string;
  showEmptyCreateButton?: boolean;  // 빈 목록에서 "새로 연결하기" 버튼 표시
  showNoteIcon?: boolean;  // 노트 아이콘 표시 여부
  maxHeight?: string;  // 노트 목록 최대 높이
  immediateSelect?: boolean;  // true면 선택 시 토글 없이 바로 콜백 호출 (LinkedFuelsSection용)
}

/**
 * 실행 원동력 선택 컴포넌트
 * - 탭 UI ("기존 원동력 선택" / "새로 연결")
 * - 선택 모드: 노트 목록 렌더링
 * - 생성 모드: textarea
 *
 * 사용처:
 * - ExecutionMode의 Completion 화면
 * - ExecutionMode의 AdhocNoteConnectionView
 * - LinkedFuelsSection의 모달 내부
 */
export default function FuelSelector({
  notes,
  notesLoading = false,
  mode,
  onModeChange,
  selectedNoteId,
  onSelectNote,
  newContent,
  onNewContentChange,
  emptyMessage = '아직 기록된 실행 원동력이 없어요',
  createPlaceholder = '이 실행을 가능하게 해준 원동력이 뭐였나요?',
  showEmptyCreateButton = false,
  showNoteIcon = false,
  maxHeight = 'max-h-60',
  immediateSelect = false,
}: FuelSelectorProps) {
  // 노트 선택 핸들러
  const handleNoteClick = (noteId: string) => {
    if (immediateSelect) {
      // 바로 연결 모드: 토글 없이 바로 콜백 호출
      onSelectNote(noteId);
    } else {
      // 토글 모드: 선택/해제 토글
      onSelectNote(selectedNoteId === noteId ? null : noteId);
    }
  };
  return (
    <div>
      {/* 모드 선택 탭 */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onModeChange('select')}
          className={`flex-1 btn btn-sm rounded-full ${
            mode === 'select' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          기존 원동력 선택
        </button>
        <button
          onClick={() => onModeChange('create')}
          className={`flex-1 btn btn-sm rounded-full ${
            mode === 'create' ? 'btn-primary' : 'btn-ghost'
          }`}
        >
          새로 연결
        </button>
      </div>

      {/* 기존 원동력 선택 모드 */}
      {mode === 'select' && (
        <div className={`${maxHeight} overflow-y-auto`}>
          {notesLoading ? (
            <div className="flex items-center justify-center py-4">
              <span className="loading loading-spinner loading-sm" />
            </div>
          ) : notes.length > 0 ? (
            <div className="space-y-2">
              {notes.map((note) => (
                <button
                  key={note.id}
                  onClick={() => handleNoteClick(note.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                    selectedNoteId === note.id && !immediateSelect
                      ? 'bg-primary/10 border-2 border-primary'
                      : 'hover:bg-base-200'
                  }`}
                >
                  {showNoteIcon && (
                    <FileText className="h-4 w-4 text-info flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    {note.title && (
                      <p className="text-sm font-medium truncate">{note.title}</p>
                    )}
                    {note.content && (
                      <p className={`text-sm truncate ${note.title ? 'text-base-content/60' : ''}`}>
                        {note.content}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <p className="text-base-content/50 text-sm">
                {emptyMessage}
              </p>
              {showEmptyCreateButton && (
                <button
                  onClick={() => onModeChange('create')}
                  className="btn btn-ghost btn-sm mt-2"
                >
                  <Plus className="w-4 h-4" />
                  새로 연결하기
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* 새로 연결 모드 */}
      {mode === 'create' && (
        <textarea
          value={newContent}
          onChange={(e) => onNewContentChange(e.target.value)}
          placeholder={createPlaceholder}
          className="textarea textarea-bordered w-full min-h-[120px]"
          autoFocus
        />
      )}
    </div>
  );
}

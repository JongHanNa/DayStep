'use client';

import { useState, useMemo } from 'react';
import { FileText, Search, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { Note } from '@/types/domain';

interface CollapsibleMotivationSectionProps {
  selectedNoteIds: string[];
  allNotes: Note[];
  onChange: (noteIds: string[]) => void;
  onCreateNote?: (title: string) => Promise<Note>;
  onNoteClick?: (note: Note) => void;
  todoColor?: string;
  // 즉시 DB 저장을 위한 props
  todoId?: string;
  userId?: string;
  onImmediateSave?: (noteIds: string[]) => Promise<void>;
}

export default function CollapsibleMotivationSection({
  selectedNoteIds = [],
  allNotes = [],
  onChange,
  onCreateNote,
  onNoteClick,
  todoColor = '#808080',
  todoId,
  userId,
  onImmediateSave,
}: CollapsibleMotivationSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // 검색 필터링
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return allNotes;

    const query = searchQuery.toLowerCase();
    return allNotes.filter(note =>
      note.title?.toLowerCase().includes(query) ||
      note.content?.toLowerCase().includes(query)
    );
  }, [allNotes, searchQuery]);

  // 연결된 노트와 다른 노트 분리
  const connectedNotes = useMemo(() =>
    filteredNotes.filter(n => selectedNoteIds.includes(n.id)),
    [filteredNotes, selectedNoteIds]
  );

  const otherNotes = useMemo(() =>
    filteredNotes.filter(n => !selectedNoteIds.includes(n.id)),
    [filteredNotes, selectedNoteIds]
  );

  // 노트 선택/해제 토글
  const toggleNote = async (noteId: string) => {
    const newIds = selectedNoteIds.includes(noteId)
      ? selectedNoteIds.filter(id => id !== noteId)
      : [...selectedNoteIds, noteId];

    // 로컬 상태 즉시 업데이트
    onChange(newIds);

    // DB에 즉시 저장 (선택적)
    if (onImmediateSave) {
      try {
        await onImmediateSave(newIds);
      } catch (error) {
        console.error('노트 연결 저장 실패:', error);
        // 실패 시 원래 상태로 되돌리기
        onChange(selectedNoteIds);
      }
    }
  };

  // 노트 생성 및 자동 연결
  const handleCreateNote = async () => {
    if (!onCreateNote || !searchQuery.trim()) return;

    try {
      const newNote = await onCreateNote(searchQuery.trim());
      const newIds = [...selectedNoteIds, newNote.id];

      // 로컬 상태 즉시 업데이트
      onChange(newIds);

      // DB에 즉시 저장 (선택적)
      if (onImmediateSave) {
        await onImmediateSave(newIds);
      }

      // 검색어 초기화
      setSearchQuery('');
    } catch (error) {
      console.error('노트 생성 실패:', error);
    }
  };

  // 축약 상태 렌더링
  if (!isExpanded) {
    return (
      <div className="my-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 rounded-lg bg-base-100 border border-base-300 hover:bg-base-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5" style={{ color: todoColor }} />
              <span className="text-lg font-semibold" style={{ color: '#666666' }}>
                노트 {selectedNoteIds.length}개
              </span>
            </div>
            <ChevronDown className="h-5 w-5 text-base-content/50" />
          </div>
        </button>
      </div>
    );
  }

  // 확장 상태 렌더링
  return (
    <div className="my-4">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="w-full p-3 rounded-t-lg bg-base-100 border border-base-300 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5" style={{ color: todoColor }} />
            <span className="text-lg font-semibold" style={{ color: '#666666' }}>
              노트 {selectedNoteIds.length}개
            </span>
          </div>
          <ChevronUp className="h-5 w-5 text-base-content/50" />
        </div>
      </button>

      {/* 확장된 내용 */}
      <div className="border border-t-0 border-base-300 rounded-b-lg bg-base-100">
        {/* 검색 입력창 */}
        <div className="p-3 border-b border-base-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50" />
            <input
              type="text"
              placeholder="노트 연결 또는 생성"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>

        {/* 연결된 노트 */}
        {connectedNotes.length > 0 && (
          <div className="p-3 border-b border-base-300">
            <div className="text-sm text-base-content/70 mb-2">
              연결된 노트 {connectedNotes.length}개
            </div>
            <div className="space-y-1">
              {connectedNotes.map(note => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors"
                >
                  {/* 체크박스 - 연결/해제 */}
                  <input
                    type="checkbox"
                    checked={true}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleNote(note.id);
                    }}
                    className="checkbox checkbox-sm cursor-pointer"
                  />

                  {/* 클릭 가능 영역 - 노트 편집 모달 열기 */}
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => onNoteClick?.(note)}
                  >
                    <FileText className="h-4 w-4" style={{ color: '#808080' }} />
                    <span className="text-sm">{note.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 다른 노트들 */}
        {otherNotes.length > 0 && (
          <div className="p-3">
            <div className="text-sm text-base-content/70 mb-2">
              다른 노트들
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {otherNotes.map(note => (
                <div
                  key={note.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors"
                >
                  {/* 체크박스 - 연결/해제 */}
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={(e) => {
                      e.stopPropagation();
                      toggleNote(note.id);
                    }}
                    className="checkbox checkbox-sm cursor-pointer"
                  />

                  {/* 클릭 가능 영역 - 노트 편집 모달 열기 */}
                  <div
                    className="flex items-center gap-2 flex-1 cursor-pointer"
                    onClick={() => onNoteClick?.(note)}
                  >
                    <FileText className="h-4 w-4" style={{ color: '#808080' }} />
                    <span className="text-sm">{note.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 노트가 없을 때 (검색어 없을 때만) */}
        {filteredNotes.length === 0 && !searchQuery && (
          <div className="p-8 text-center text-base-content/50">
            노트가 없습니다
          </div>
        )}

        {/* 검색어가 있을 때 항상 생성 버튼 표시 */}
        {onCreateNote && searchQuery.trim() && (
          <div className="p-3 border-t border-base-300">
            <button
              type="button"
              onClick={handleCreateNote}
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
            >
              <Plus className="h-5 w-5 text-base-content/70" />
              <FileText className="h-5 w-5 text-base-content/70" />
              <span className="text-sm">
                새로운 <strong>{searchQuery}</strong> 노트 생성
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

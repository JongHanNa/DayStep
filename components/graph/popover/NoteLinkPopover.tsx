'use client';

import { useState, useMemo } from 'react';
import { StickyNote, Plus, Check } from 'lucide-react';
import { PopoverContainer } from './PopoverContainer';
import { PopoverSearchInput } from './PopoverSearchInput';
import type { Note } from '@/types/second-brain';

interface NoteLinkPopoverProps {
  position: { x: number; y: number };
  currentNoteId: string; // 현재 편집 중인 노트 ID (순환 참조 방지)
  selectedNoteIds: string[];
  allNotes: Note[];
  onToggle: (noteId: string, isSelected: boolean) => Promise<void>;
  onCreateNote?: (title: string) => Promise<Note>;
  onClose: () => void;
}

export function NoteLinkPopover({
  position,
  currentNoteId,
  selectedNoteIds,
  allNotes,
  onToggle,
  onCreateNote,
  onClose,
}: NoteLinkPopoverProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isToggling, setIsToggling] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 자기 자신 제외한 노트 목록
  const availableNotes = useMemo(
    () => allNotes.filter((note) => note.id !== currentNoteId),
    [allNotes, currentNoteId]
  );

  // 검색 필터링
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return availableNotes;

    const query = searchQuery.toLowerCase();
    return availableNotes.filter(
      (note) =>
        note.title?.toLowerCase().includes(query) ||
        note.content?.toLowerCase().includes(query)
    );
  }, [availableNotes, searchQuery]);

  // 연결된 노트와 다른 노트 분리
  const connectedNotes = useMemo(
    () => filteredNotes.filter((n) => selectedNoteIds.includes(n.id)),
    [filteredNotes, selectedNoteIds]
  );

  const otherNotes = useMemo(
    () => filteredNotes.filter((n) => !selectedNoteIds.includes(n.id)),
    [filteredNotes, selectedNoteIds]
  );

  // 노트 토글
  const handleToggle = async (noteId: string) => {
    if (isToggling) return;

    setIsToggling(noteId);
    const isSelected = selectedNoteIds.includes(noteId);

    try {
      await onToggle(noteId, !isSelected);
    } catch (error) {
      console.error('노트 연결 토글 실패:', error);
    } finally {
      setIsToggling(null);
    }
  };

  // 노트 생성 및 연결
  const handleCreateNote = async () => {
    if (!onCreateNote || !searchQuery.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newNote = await onCreateNote(searchQuery.trim());
      await onToggle(newNote.id, true);
      setSearchQuery('');
    } catch (error) {
      console.error('노트 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <PopoverContainer
      position={position}
      onClose={onClose}
      title="노트 연결"
      width={300}
      maxHeight={450}
    >
      <PopoverSearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        placeholder="노트 검색 또는 생성..."
      />

      <div className="px-2 pb-2 space-y-1 max-h-[300px] overflow-y-auto">
        {/* 연결된 노트 */}
        {connectedNotes.length > 0 && (
          <>
            <div className="px-1 py-1.5 text-xs font-medium text-base-content/50">
              연결된 노트 ({connectedNotes.length})
            </div>
            {connectedNotes.map((note) => {
              const isSelected = selectedNoteIds.includes(note.id);
              const isLoading = isToggling === note.id;

              return (
                <button
                  key={note.id}
                  onClick={() => handleToggle(note.id)}
                  disabled={isToggling !== null}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-base-200'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-primary border-primary' : 'border-base-300'
                    }`}
                  >
                    {isLoading ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      isSelected && <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <StickyNote className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{note.title || '제목 없음'}</div>
                    {note.content && (
                      <div className="text-xs text-base-content/50 truncate">
                        {note.content.slice(0, 50)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* 다른 노트 */}
        {otherNotes.length > 0 && (
          <>
            <div className="px-1 py-1.5 text-xs font-medium text-base-content/50 mt-2">
              다른 노트 ({otherNotes.length})
            </div>
            {otherNotes.map((note) => {
              const isLoading = isToggling === note.id;

              return (
                <button
                  key={note.id}
                  onClick={() => handleToggle(note.id)}
                  disabled={isToggling !== null}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-base-200 transition-colors text-left"
                >
                  <div className="w-4 h-4 rounded border border-base-300 flex items-center justify-center flex-shrink-0">
                    {isLoading && (
                      <span className="loading loading-spinner loading-xs" />
                    )}
                  </div>
                  <StickyNote className="w-4 h-4 flex-shrink-0 text-amber-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{note.title || '제목 없음'}</div>
                    {note.content && (
                      <div className="text-xs text-base-content/50 truncate">
                        {note.content.slice(0, 50)}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </>
        )}

        {/* 검색 결과 없음 */}
        {filteredNotes.length === 0 && !searchQuery && (
          <div className="px-2 py-3 text-sm text-base-content/40 text-center">
            연결할 수 있는 노트가 없습니다
          </div>
        )}
      </div>

      {/* 노트 생성 버튼 */}
      {onCreateNote && searchQuery.trim() && (
        <div className="px-2 pb-2 border-t border-base-300 pt-2">
          <button
            onClick={handleCreateNote}
            disabled={isCreating}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-base-200 transition-colors text-left"
          >
            {isCreating ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Plus className="w-4 h-4 text-primary" />
            )}
            <StickyNote className="w-4 h-4 text-amber-500" />
            <span className="text-sm">
              <span className="font-medium">{searchQuery}</span> 노트 생성
            </span>
          </button>
        </div>
      )}
    </PopoverContainer>
  );
}

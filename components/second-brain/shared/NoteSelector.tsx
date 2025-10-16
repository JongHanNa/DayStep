'use client';

import { useState } from 'react';
import { StickyNote, Plus, MoreVertical, Trash2, Check } from 'lucide-react';
import type { Note } from '@/types/second-brain';

interface NoteSelectorProps {
  selectedNoteIds: string[];
  notes: Note[];
  onNotesChange: (noteIds: string[]) => void;
  onCreateNote?: (title: string) => Promise<Note>;
  onUpdateNote?: (id: string, title: string) => Promise<void>;
  onDeleteNote?: (id: string) => Promise<void>;
}

export default function NoteSelector({
  selectedNoteIds,
  notes,
  onNotesChange,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
}: NoteSelectorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const toggleNote = (noteId: string) => {
    if (selectedNoteIds.includes(noteId)) {
      onNotesChange(selectedNoteIds.filter((id) => id !== noteId));
    } else {
      onNotesChange([...selectedNoteIds, noteId]);
    }
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditingTitle(note.title);
    setMenuOpenId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEdit = async () => {
    if (!editingId || !editingTitle.trim() || !onUpdateNote) return;
    try {
      await onUpdateNote(editingId, editingTitle.trim());
      setEditingId(null);
      setEditingTitle('');
    } catch (error) {
      console.error('노트 수정 실패:', error);
    }
  };

  const handleCreate = async () => {
    if (!onCreateNote) return;
    try {
      setIsCreating(true);
      const newNote = await onCreateNote('새노트');
      // 새 노트 생성 후 자동 선택 및 편집 모드
      onNotesChange([...selectedNoteIds, newNote.id]);
      setEditingId(newNote.id);
      setEditingTitle(newNote.title);
    } catch (error) {
      console.error('노트 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!onDeleteNote) return;
    if (!confirm('이 노트를 삭제하시겠습니까?')) return;
    try {
      await onDeleteNote(noteId);
      // 삭제 후 선택 목록에서도 제거
      onNotesChange(selectedNoteIds.filter((id) => id !== noteId));
      setMenuOpenId(null);
    } catch (error) {
      console.error('노트 삭제 실패:', error);
    }
  };

  if (notes.length === 0 && !onCreateNote) {
    return (
      <div className="text-center py-6 text-sm text-base-content/60">
        노트가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-base-content/60">
          {selectedNoteIds.length}개 선택됨
        </span>
        {onCreateNote && (
          <button
            onClick={handleCreate}
            disabled={isCreating}
            className="btn btn-xs btn-ghost gap-1"
            title="새 노트"
          >
            <Plus className="w-3 h-3" />
            {isCreating ? '생성 중...' : '추가'}
          </button>
        )}
      </div>

      {/* 노트 목록 */}
      <div className="space-y-1 max-h-60 overflow-y-auto">
        {notes.map((note) => {
          const isSelected = selectedNoteIds.includes(note.id);
          const isEditing = editingId === note.id;

          return (
            <div
              key={note.id}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                isSelected ? 'bg-base-200' : 'bg-transparent hover:bg-base-100'
              }`}
            >
              {/* 선택 체크박스 */}
              <button
                onClick={() => toggleNote(note.id)}
                className="flex-shrink-0"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-base-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-primary-content" />}
                </div>
              </button>

              {/* 노트 아이콘 */}
              <StickyNote className="w-4 h-4 text-base-content/60 flex-shrink-0" />

              {/* 제목 (편집 가능) */}
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <input
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={saveEdit}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEdit();
                      if (e.key === 'Escape') cancelEdit();
                    }}
                    className="input input-xs input-bordered w-full"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => startEdit(note)}
                    className="text-left text-sm truncate w-full hover:underline"
                  >
                    {note.title}
                  </button>
                )}
              </div>

              {/* 메뉴 버튼 */}
              {onDeleteNote && !isEditing && (
                <div className="relative">
                  <button
                    onClick={() =>
                      setMenuOpenId(menuOpenId === note.id ? null : note.id)
                    }
                    className="btn btn-xs btn-ghost btn-square"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>

                  {menuOpenId === note.id && (
                    <>
                      {/* 메뉴 드롭다운 */}
                      <div className="absolute right-0 mt-1 w-32 bg-base-100 rounded-lg shadow-lg border border-base-300 z-10">
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-base-200 rounded-lg flex items-center gap-2 text-error"
                        >
                          <Trash2 className="w-3 h-3" />
                          삭제
                        </button>
                      </div>
                      {/* 메뉴 외부 클릭 시 닫기 */}
                      <div
                        className="fixed inset-0 z-0"
                        onClick={() => setMenuOpenId(null)}
                      />
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

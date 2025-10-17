'use client';

import { useState } from 'react';
import { Pin } from 'lucide-react';
import type { InboxItem, Area, Resource } from '@/types/second-brain';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { Sheet } from 'react-modal-sheet';
import { createModalConfig } from '@/lib/modal-config';

interface NoteInboxListProps {
  notes: InboxItem[];
  areas: Area[];
  resources: Resource[];
  onRefresh: () => void;
}

export default function NoteInboxList({ notes, areas, resources, onRefresh }: NoteInboxListProps) {
  const { updateInboxItem } = useInboxStore();
  const [editingNote, setEditingNote] = useState<InboxItem | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormData | null>(null);

  const handleNoteClick = (note: InboxItem) => {
    setEditingNote(note);
    setNoteForm({
      title: note.note_title || note.content,
      content: note.note_content || '',
      category: note.note_category || '중간 작업물',
      linkedAreaOrResource: note.linked_area_or_resource || '',
      isPinned: note.is_pinned || false,
    });
  };

  const handleSave = async () => {
    if (!editingNote || !noteForm) return;

    try {
      // GTD 로직: 영역/자원 연결 시 수집함에서 제거
      let shouldRemoveFromInbox = false;
      let newStatus: typeof editingNote.status = 'inbox';
      let area_id: string | undefined;
      let resource_id: string | undefined;

      if (noteForm.linkedAreaOrResource) {
        shouldRemoveFromInbox = true;
        newStatus = 'next_action'; // 영역/자원 연결 시 다음행동으로 이동

        if (noteForm.linkedAreaOrResource.startsWith('area-')) {
          area_id = noteForm.linkedAreaOrResource.replace('area-', '');
        } else if (noteForm.linkedAreaOrResource.startsWith('resource-')) {
          resource_id = noteForm.linkedAreaOrResource.replace('resource-', '');
        }
      }

      await updateInboxItem(editingNote.id, {
        content: noteForm.title,
        note_title: noteForm.title,
        note_content: noteForm.content,
        note_category: noteForm.category,
        linked_area_or_resource: noteForm.linkedAreaOrResource,
        is_pinned: noteForm.isPinned,
        status: shouldRemoveFromInbox ? newStatus : 'inbox',
        area_id,
        resource_id,
      });

      setEditingNote(null);
      setNoteForm(null);
      onRefresh();
    } catch (error) {
      console.error('노트 저장 실패:', error);
      alert('노트 저장에 실패했습니다.');
    }
  };

  if (notes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📝</div>
        <p className="text-lg font-semibold text-base-content/70 mb-2">
          노트 수집함이 비어있습니다
        </p>
        <p className="text-sm text-base-content/50">
          수집 페이지에서 새로운 노트를 추가해보세요
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => handleNoteClick(note)}
            className="w-full text-left p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-medium mb-1">{note.note_title || note.content}</p>
                {note.note_content && (
                  <p className="text-sm text-base-content/60 line-clamp-2 mt-1">
                    {note.note_content}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  {note.note_category && (
                    <span className="badge badge-sm badge-ghost">{note.note_category}</span>
                  )}
                  {note.linked_area_or_resource && (
                    <span className="badge badge-sm badge-primary">
                      {note.linked_area_or_resource.startsWith('area-') ? '영역 연결됨' : '자원 연결됨'}
                    </span>
                  )}
                </div>
              </div>
              {note.is_pinned && (
                <Pin className="w-5 h-5 text-primary fill-primary flex-shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

      {/* 노트 편집 모달 */}
      <Sheet
        isOpen={!!(editingNote && noteForm)}
        onClose={() => {
          setEditingNote(null);
          setNoteForm(null);
        }}
        {...createModalConfig('FULLSCREEN')}
      >
        <Sheet.Container className="bg-background">
          <Sheet.Header className="border-b border-border" style={{ backgroundColor: '#f8f8f8' }}>
            <div className="flex items-center justify-between px-4 py-3">
              {/* 왼쪽: 취소 버튼 */}
              <button
                onClick={() => {
                  setEditingNote(null);
                  setNoteForm(null);
                }}
                className="btn btn-primary btn-sm px-4 py-2 rounded-full"
              >
                취소
              </button>

              {/* 가운데: 제목 */}
              <h3 className="text-lg font-semibold">노트 편집</h3>

              {/* 오른쪽: 저장 버튼 */}
              <button
                onClick={handleSave}
                className="btn btn-primary btn-sm px-4 py-2 rounded-full"
              >
                저장
              </button>
            </div>
          </Sheet.Header>

          <Sheet.Content>
            <Sheet.Scroller draggableAt="top" style={{ overflowX: 'hidden', backgroundColor: 'white' }}>
              <div className="px-4 py-6" style={{ overflowX: 'hidden', touchAction: 'pan-y' }}>
                {noteForm && (
                  <NoteFormFields
                    note={noteForm}
                    onChange={setNoteForm}
                    areas={areas}
                    resources={resources}
                  />
                )}
              </div>
            </Sheet.Scroller>
          </Sheet.Content>
        </Sheet.Container>
      </Sheet>
    </>
  );
}

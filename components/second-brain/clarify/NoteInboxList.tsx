'use client';

import { useState, useEffect } from 'react';
import { Pin } from 'lucide-react';
import type { InboxItem, AreaResource as Area, AreaResource as Resource, Project } from '@/types/second-brain';
import type { Todo } from '@/types';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useModalStore } from '@/state/stores/modalStore';
import { useAuthStore } from '@/state/stores/authStore';

interface NoteInboxListProps {
  notes: InboxItem[];
  areas: Area[];
  resources: Resource[];
  projects: Project[];
  todos: Todo[];
  onRefresh: () => void;
}

export default function NoteInboxList({ notes, areas, resources, projects, todos, onRefresh }: NoteInboxListProps) {
  const user = useAuthStore((state) => state.user);
  const { updateInboxItem } = useInboxStore();
  const { openModal, closeModal } = useModalStore();
  const [editingNote, setEditingNote] = useState<InboxItem | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormData | null>(null);

  // 편집 모달 상태 관리 (하단 네비 숨김)
  useEffect(() => {
    if (editingNote) {
      openModal();
    }
    return () => {
      closeModal();
    };
  }, [editingNote, openModal, closeModal]);

  const handleNoteClick = (note: InboxItem) => {
    setEditingNote(note);
    setNoteForm({
      title: note.note_title || note.content,
      content: note.note_content || '',
      category: note.note_category || '중간 작업물',
      linkedAreaOrResource: note.linked_area_or_resource || '',
      isPinned: note.is_pinned || false,
      projectId: note.project_id || '',
      todoId: '', // TODO: note.todo_id 필드 추가 필요
    });
  };

  const handleSave = async () => {
    if (!editingNote || !noteForm) return;

    try {
      // GTD 로직: 영역/자원 연결 시 수집함에서 제거
      // 프로젝트/할일은 연결만 하고 수집함에 유지
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

      if (!user?.id) throw new Error('사용자 정보를 찾을 수 없습니다.');

      await updateInboxItem(user.id, editingNote.id, {
        content: noteForm.title,
        note_title: noteForm.title,
        note_content: noteForm.content,
        note_category: noteForm.category,
        linked_area_or_resource: noteForm.linkedAreaOrResource,
        is_pinned: noteForm.isPinned,
        status: shouldRemoveFromInbox ? newStatus : 'inbox',
        area_id,
        resource_id,
        project_id: noteForm.projectId || undefined,
        // todo_id: noteForm.todoId || undefined, // TODO: InboxItem 타입에 todo_id 필드 추가 필요
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

      {/* 노트 편집 모달 - DaisyUI dialog */}
      {editingNote && noteForm && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button
                onClick={() => {
                  setEditingNote(null);
                  setNoteForm(null);
                }}
                className="btn btn-primary btn-sm rounded-full"
              >
                취소
              </button>

              <h3 className="text-lg font-semibold">노트 편집</h3>

              <button
                onClick={handleSave}
                className="btn btn-primary btn-sm rounded-full"
              >
                저장
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                {noteForm && (
                  <NoteFormFields
                    note={noteForm}
                    onChange={setNoteForm}
                    areas={areas}
                    resources={resources}
                    projects={projects}
                    todos={todos}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setEditingNote(null);
            setNoteForm(null);
          }} />
        </dialog>
      )}
    </>
  );
}

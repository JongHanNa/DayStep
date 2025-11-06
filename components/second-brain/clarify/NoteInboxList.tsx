'use client';

import { useState } from 'react';
import { Pin } from 'lucide-react';
import type { InboxItem, AreaResource as Area, AreaResource as Resource, Project, Note } from '@/types/second-brain';
import type { Todo } from '@/types';
import { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import NoteEditModal from '@/components/second-brain/NoteEditModal';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useAuthStore } from '@/state/stores/authStore';
import { updateProjectNotes } from '@/lib/supabase/project-notes';
import { createNoteWithJWT } from '@/lib/supabase/notes';

interface NoteInboxListProps {
  notes: InboxItem[];
  areas: Area[];
  resources: Resource[];
  projects: Project[];
  todos: Todo[];
  allNotes?: Note[];  // 노트-노트 연결을 위한 전체 노트 목록
  onRefresh: () => void;
}

export default function NoteInboxList({ notes, areas, resources, projects, todos, allNotes, onRefresh }: NoteInboxListProps) {
  const user = useAuthStore((state) => state.user);
  const { updateInboxItem } = useInboxStore();
  const [editingNote, setEditingNote] = useState<InboxItem | null>(null);
  const [noteForm, setNoteForm] = useState<NoteFormData | null>(null);
  const [clickedNote, setClickedNote] = useState<Note | null>(null);

  const handleNoteClick = (note: InboxItem) => {
    // note_category를 NoteCategory enum으로 매핑
    const mapCategoryToNoteCategory = (category?: string): NoteFormData['note_category'] => {
      switch (category) {
        case '중간 작업물':
          return 'work_in_progress';
        case '나중에 보기':
          return 'read_later';
        case '레퍼런스':
          return 'reference';
        default:
          return 'work_in_progress';
      }
    };

    setEditingNote(note);
    setNoteForm({
      title: note.note_title || note.content,
      content: note.note_content || '',
      note_category: mapCategoryToNoteCategory(note.note_category),
      linkedAreaOrResource: note.linked_area_or_resource || '',
      isPinned: note.is_pinned || false,
      projectIds: [], // N:N 관계로 변경됨
      todoIds: [], // N:N 관계로 변경됨
      noteIds: [], // 연결된 노트
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

      // NoteCategory enum을 한글 note_category로 역매핑
      const mapNoteCategoryToKorean = (note_category: NoteFormData['note_category']): '중간 작업물' | '나중에 보기' | '레퍼런스' | undefined => {
        switch (note_category) {
          case 'work_in_progress':
            return '중간 작업물';
          case 'read_later':
            return '나중에 보기';
          case 'reference':
            return '레퍼런스';
          case 'none':
            return undefined;
          default:
            return '중간 작업물';
        }
      };

      // InboxItem 업데이트 (project_id는 더이상 사용하지 않음)
      await updateInboxItem(user.id, editingNote.id, {
        content: noteForm.title,
        note_title: noteForm.title,
        note_content: noteForm.content,
        note_category: mapNoteCategoryToKorean(noteForm.note_category),
        linked_area_or_resource: noteForm.linkedAreaOrResource,
        is_pinned: noteForm.isPinned,
        status: shouldRemoveFromInbox ? newStatus : 'inbox',
        area_id,
        resource_id,
        // project_id는 제거됨 - junction table 사용
        // todo_id: noteForm.todoId || undefined, // TODO: InboxItem 타입에 todo_id 필드 추가 필요
      });

      // ⚠️ 주의: InboxItem은 아직 실제 Note가 아니므로 junction table 연결은 하지 않음
      // 실제 Note로 변환될 때 연결 처리 필요

      setEditingNote(null);
      setNoteForm(null);
      onRefresh();
    } catch (error) {
      console.error('노트 저장 실패:', error);
      alert('노트 저장에 실패했습니다.');
    }
  };

  // 새 노트 생성 핸들러
  const handleCreateNote = async (title: string): Promise<Note> => {
    if (!user?.id) throw new Error('사용자 정보를 찾을 수 없습니다.');

    const newNote = await createNoteWithJWT({
      user_id: user.id,
      title: title,
      content: '',
      memo_type: 'note', // 기본값: 일반 노트
      note_category: 'none',
      tags: [],
      is_pinned: false,
    });

    if (!newNote) {
      throw new Error('노트 생성에 실패했습니다.');
    }

    onRefresh(); // 노트 목록 새로고침
    return newNote;
  };

  // 연결된 노트 클릭 핸들러 (해당 노트의 편집 모달 열기)
  const handleConnectedNoteClick = (note: Note) => {
    setClickedNote(note);
    // TODO: 중첩 모달 또는 모달 전환 구현
    console.log('연결된 노트 클릭:', note);
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
          <div key={note.id} className="relative overflow-hidden rounded-lg">
            {/* 카드 레이어 */}
            <button
              onClick={() => handleNoteClick(note)}
              className="relative bg-white hover:bg-base-100 transition-colors cursor-pointer w-full text-left"
            >
              <div className="p-4">
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
              </div>
            </button>
          </div>
        ))}
      </div>

      {/* 노트 편집 모달 */}
      <NoteEditModal
        open={editingNote !== null && noteForm !== null}
        note={noteForm}
        onClose={() => {
          setEditingNote(null);
          setNoteForm(null);
        }}
        onSave={handleSave}
        onChange={setNoteForm}
        areas={areas}
        resources={resources}
        projects={projects}
        todos={todos}
        notes={allNotes}
        onNoteClick={handleConnectedNoteClick}
        onCreateNote={handleCreateNote}
      />
    </>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import type { InboxItem, Project, Note } from '@/types/second-brain';

export default function InboxPage() {
  const router = useRouter();
  const { inboxItems, fetchInboxItems, createInboxItem, updateInboxItem, deleteInboxItem } = useInboxStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { projects, createProject } = useProjectStore();
  const { notes, fetchNotes, createNote } = useNoteStore();

  const [activeTab, setActiveTab] = useState<'todo' | 'note'>('todo');
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);

  // 할일 폼 데이터
  const [todoForm, setTodoForm] = useState<TodoFormData>({
    title: '',
    clarification: '',
    nextActionStatuses: [],
    scheduledDate: undefined,
    isHighlight: false,
    completed: false,
    projectId: '',
    noteId: '',
  });

  // 노트 폼 데이터
  const [noteForm, setNoteForm] = useState<NoteFormData>({
    title: '',
    content: '',
    category: '중간 작업물',
    linkedAreaOrResource: '',
    isPinned: false,
  });

  useEffect(() => {
    fetchInboxItems();
    fetchAreas();
    fetchResources();
    fetchNotes();
  }, [fetchInboxItems, fetchAreas, fetchResources, fetchNotes]);

  const resetForms = () => {
    setTodoForm({
      title: '',
      clarification: '',
      nextActionStatuses: [],
      scheduledDate: undefined,
      isHighlight: false,
      completed: false,
      projectId: '',
      noteId: '',
    });
    setNoteForm({
      title: '',
      content: '',
      category: '중간 작업물',
      linkedAreaOrResource: '',
      isPinned: false,
    });
  };

  // 즉시 생성 패턴
  const handleQuickAdd = async () => {
    if (isCreating) return; // 중복 생성 방지

    try {
      setIsCreating(true);

      if (activeTab === 'todo') {
        await createInboxItem({
          content: '새 할일',
          status: 'inbox',
          item_type: 'todo',
          is_completed: false,
        });
      } else {
        await createInboxItem({
          content: '새 노트',
          status: 'inbox',
          item_type: 'note',
          note_title: '새 노트',
          note_content: '',
          note_category: '중간 작업물',
          is_pinned: false,
        });
      }
    } catch (error) {
      console.error('항목 생성 실패:', error);
    } finally {
      setIsCreating(false);
    }
  };

  // 카드 클릭 → 편집 모달
  const handleCardClick = (item: InboxItem) => {
    setEditingItem(item);

    // 탭 필터링과 동일한 조건: item_type이 없으면 todo로 간주
    if (!item.item_type || item.item_type === 'todo') {
      // next_action_status가 JSON 배열 문자열이면 파싱, 아니면 빈 배열
      let nextActionStatuses: string[] = [];
      if (item.next_action_status) {
        try {
          nextActionStatuses = JSON.parse(item.next_action_status);
        } catch {
          // JSON이 아니면 빈 배열
          nextActionStatuses = [];
        }
      }

      setTodoForm({
        title: item.content,
        clarification: item.clarification || '',
        nextActionStatuses,
        scheduledDate: item.scheduled_date ? new Date(item.scheduled_date) : undefined,
        isHighlight: item.is_highlight || false,
        completed: item.is_completed || false,
        projectId: item.project_id || '',
        noteId: '', // inbox item에는 noteId 연결 필드 없음 (추후 필요시 추가)
      });
    } else {
      setNoteForm({
        title: item.note_title || item.content,
        content: item.note_content || '',
        category: item.note_category || '중간 작업물',
        linkedAreaOrResource: item.linked_area_or_resource || '',
        isPinned: item.is_pinned || false,
      });
    }
  };

  // 항목 업데이트
  const handleUpdate = async () => {
    if (!editingItem) return;

    try {
      // 탭 필터링과 동일한 조건: item_type이 없으면 todo로 간주
      if (!editingItem.item_type || editingItem.item_type === 'todo') {
        // nextActionStatuses 배열을 JSON 문자열로 변환
        const nextActionStatusJson =
          todoForm.nextActionStatuses && todoForm.nextActionStatuses.length > 0
            ? JSON.stringify(todoForm.nextActionStatuses)
            : '';

        await updateInboxItem(editingItem.id, {
          content: todoForm.title,
          clarification: todoForm.clarification,
          next_action_status: nextActionStatusJson,
          scheduled_date: todoForm.scheduledDate?.toISOString(),
          is_highlight: todoForm.isHighlight,
          is_completed: todoForm.completed,
          project_id: todoForm.projectId || undefined,
        });
      } else {
        // linkedAreaOrResource에서 area_id 또는 resource_id 추출
        let area_id: string | undefined;
        let resource_id: string | undefined;

        if (noteForm.linkedAreaOrResource) {
          if (noteForm.linkedAreaOrResource.startsWith('area-')) {
            area_id = noteForm.linkedAreaOrResource.replace('area-', '');
          } else if (noteForm.linkedAreaOrResource.startsWith('resource-')) {
            resource_id = noteForm.linkedAreaOrResource.replace('resource-', '');
          }
        }

        await updateInboxItem(editingItem.id, {
          content: noteForm.title,
          note_title: noteForm.title,
          note_content: noteForm.content,
          note_category: noteForm.category,
          is_pinned: noteForm.isPinned,
          linked_area_or_resource: noteForm.linkedAreaOrResource,
          area_id,
          resource_id,
        });
      }

      setEditingItem(null);
      resetForms();
    } catch (error) {
      console.error('항목 수정 실패:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteInboxItem(id);
    } catch (error) {
      console.error('항목 삭제 실패:', error);
    }
  };

  const handleClarify = (id: string) => {
    // 명료화 페이지로 이동
    router.push('/second-brain/clarify');
  };

  // 새 프로젝트 생성 핸들러
  const handleCreateProject = async (title: string): Promise<Project> => {
    return await createProject({
      title,
      status: 'active',
      color: '#3B82F6',
      order_index: projects.length,
    });
  };

  // 새 노트 생성 핸들러
  const handleCreateNote = async (title: string): Promise<Note> => {
    return await createNote({
      title,
      content: '',
      memo_type: 'note',
      tags: [],
      is_pinned: false,
    });
  };

  // 탭별 필터링
  const filteredItems = inboxItems.filter((item) => {
    if (activeTab === 'todo') {
      return !item.item_type || item.item_type === 'todo';
    } else {
      return item.item_type === 'note';
    }
  });

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">수집</h1>
              <p className="text-sm text-base-content/70">
                {filteredItems.length}개의 항목
              </p>
            </div>
            <button
              onClick={handleQuickAdd}
              className="btn btn-primary btn-sm"
              disabled={isCreating}
            >
              {isCreating ? (
                <span className="loading loading-spinner loading-xs" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isCreating ? '생성 중...' : '추가'}
            </button>
          </div>

          {/* 탭 */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('todo')}
              className={`btn btn-sm flex-1 ${activeTab === 'todo' ? 'bg-base-300' : 'btn-ghost'}`}
            >
              할 일
            </button>
            <button
              onClick={() => setActiveTab('note')}
              className={`btn btn-sm flex-1 ${activeTab === 'note' ? 'bg-base-300' : 'btn-ghost'}`}
            >
              노트
            </button>
          </div>
        </div>
      </div>

      {/* 안내 메시지 */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        <div className="alert bg-base-200 border-none mb-4">
          <div className="flex items-start gap-2">
            <span className="text-2xl">💡</span>
            <div className="text-sm">
              <p className="font-medium mb-1">빠른 수집을 위한 페이지입니다</p>
              <p className="text-base-content/70">
                스크린샷, 메모, 머릿속 아이디어 등을 고민 없이 바로 수집하세요.
                어느 것에 속하는지는 다음 명료화 단계에서 정리할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-2">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📥</div>
            <p className="text-base-content/50">
              {activeTab === 'todo' ? '할일이 없습니다' : '노트가 없습니다'}
            </p>
            <p className="text-sm text-base-content/30 mt-2">
              + 버튼을 눌러 새로운 항목을 추가하세요
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="card bg-base-200 hover:bg-base-300 transition-colors cursor-pointer"
                onClick={() => handleCardClick(item)}
              >
                <div className="card-body p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{item.note_title || item.content}</p>
                      {item.note_content && (
                        <p className="text-xs text-base-content/60 mt-1 line-clamp-2">
                          {item.note_content}
                        </p>
                      )}
                      {item.clarification && (
                        <p className="text-xs text-base-content/60 mt-1 line-clamp-2">
                          {item.clarification}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-base-content/50">
                          {formatDistanceToNow(new Date(item.created_at), {
                            addSuffix: true,
                            locale: ko
                          })}
                        </span>
                        {item.note_category && (
                          <span className="badge badge-xs badge-ghost">{item.note_category}</span>
                        )}
                        {item.is_highlight && (
                          <span className="badge badge-xs badge-ghost">⭐ 하이라이트</span>
                        )}
                        {item.is_pinned && (
                          <span className="badge badge-xs badge-ghost">📌 고정</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClarify(item.id);
                        }}
                        className="btn btn-ghost btn-sm btn-square"
                        title="명료화"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="btn btn-ghost btn-sm btn-square text-error"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 편집 모달 */}
      {editingItem && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              {!editingItem.item_type || editingItem.item_type === 'todo' ? '할 일' : '노트'} 편집
            </h3>

            {/* 폼 필드 */}
            {!editingItem.item_type || editingItem.item_type === 'todo' ? (
              <TodoFormFields
                todo={todoForm}
                onChange={setTodoForm}
                titlePlaceholder="예: 슈퍼업 레퍼런스 정리"
                clarificationPlaceholder="수집 과정에서는 어느 것에 속하는지 크게 고민하지 않아도 됩니다"
                projects={projects}
                notes={notes}
                onCreateProject={handleCreateProject}
                onCreateNote={handleCreateNote}
              />
            ) : (
              <NoteFormFields
                note={noteForm}
                onChange={setNoteForm}
                areas={areas}
                resources={resources}
                titlePlaceholder="예: 새로운 브랜딩 관점 변경된 분석틀"
                contentPlaceholder="세컨드 브레인에 관련된 노트들이 프로젝트에 연결되어 있지 않으면 일 때문에 하던 것들은 노트만 달랑 이 프로젝트에 연결하여라면 분류됩니다"
              />
            )}

            <div className="modal-action">
              <button
                onClick={() => {
                  setEditingItem(null);
                  resetForms();
                }}
                className="btn btn-ghost"
              >
                취소
              </button>
              <button
                onClick={handleUpdate}
                className="btn btn-primary"
              >
                저장
              </button>
            </div>
          </div>
          <div
            className="modal-backdrop"
            onClick={() => {
              setEditingItem(null);
              resetForms();
            }}
          />
        </div>
      )}

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}

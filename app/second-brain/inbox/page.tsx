'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { Plus, Trash2, Edit3, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import type { InboxItem, Project, Note } from '@/types/second-brain';
import { useModalStore } from '@/state/stores/modalStore';

export default function InboxPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const { inboxItems, fetchInboxItems, createInboxItem, updateInboxItem, deleteInboxItem } = useInboxStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { projects, createProject } = useProjectStore();
  const { notes, fetchNotes, createNote } = useNoteStore();

  const [activeTab, setActiveTab] = useState<'todo' | 'note'>('todo');
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);

  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { openModal, closeModal } = useModalStore();

  // 할일 폼 데이터
  const [todoForm, setTodoForm] = useState<TodoFormData>({
    title: '',
    clarification: '',
    nextActionStatuses: [],
    scheduledDate: undefined,
    isHighlight: false,
    completed: false,
    projectIds: [],
    noteIds: [],
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
    if (appUser?.id) {
      fetchInboxItems(appUser.id);
      fetchAreas(appUser.id);
      fetchResources(appUser.id);
      fetchNotes();
    }
  }, [appUser?.id, fetchInboxItems, fetchAreas, fetchResources, fetchNotes]);

  // 편집 모달 상태 관리는 InboxTodoEditModal 컴포넌트 내부에서 처리

  const resetForms = () => {
    setTodoForm({
      title: '',
      clarification: '',
      nextActionStatuses: [],
      scheduledDate: undefined,
      isHighlight: false,
      completed: false,
      projectIds: [],
      noteIds: [],
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
    if (isCreating || !appUser?.id) return; // 중복 생성 방지

    try {
      setIsCreating(true);

      if (activeTab === 'todo') {
        await createInboxItem(appUser.id, {
          content: '새 할일',
          status: 'inbox',
          item_type: 'todo',
          is_completed: false,
        });
      } else {
        await createInboxItem(appUser.id, {
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
        projectIds: item.project_id ? [item.project_id] : [],
        noteIds: [], // inbox item에는 noteId 연결 필드 없음 (추후 필요시 추가)
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
    if (!editingItem || !appUser?.id) return;

    try {
      // 탭 필터링과 동일한 조건: item_type이 없으면 todo로 간주
      if (!editingItem.item_type || editingItem.item_type === 'todo') {
        // nextActionStatuses 배열을 JSON 문자열로 변환
        const nextActionStatusJson =
          todoForm.nextActionStatuses && todoForm.nextActionStatuses.length > 0
            ? JSON.stringify(todoForm.nextActionStatuses)
            : '';

        await updateInboxItem(appUser.id, editingItem.id, {
          content: todoForm.title,
          clarification: todoForm.clarification,
          next_action_status: nextActionStatusJson,
          scheduled_date: todoForm.scheduledDate?.toISOString(),
          is_highlight: todoForm.isHighlight,
          is_completed: todoForm.completed,
          project_id: todoForm.projectIds?.[0] || undefined, // 첫 번째 프로젝트 ID만 저장
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

        await updateInboxItem(appUser.id, editingItem.id, {
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
    if (!confirm('정말 삭제하시겠습니까?') || !appUser?.id) return;
    try {
      await deleteInboxItem(appUser.id, id);
    } catch (error) {
      console.error('항목 삭제 실패:', error);
    }
  };


  // 새 프로젝트 생성 핸들러
  const handleCreateProject = async (title: string): Promise<Project> => {
    if (!appUser?.id) throw new Error('User not authenticated');
    return await createProject(appUser.id, {
      title,
      icon: 'lucide-FolderOpen',
      status: 'in_progress',
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

  // 탭별 개수 계산
  const todoCount = inboxItems.filter(item => !item.item_type || item.item_type === 'todo').length;
  const noteCount = inboxItems.filter(item => item.item_type === 'note').length;

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-10 pb-2' : 'py-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">수집</h1>
              <p className="text-sm text-base-content/70">
                {filteredItems.length}개의 항목
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <>
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="btn btn-ghost btn-sm rounded-full"
                  >
                    <Edit3 className="w-4 h-4" />
                    편집
                  </button>
                  <button
                    onClick={handleQuickAdd}
                    className="btn btn-primary btn-sm rounded-full"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <span className="loading loading-spinner loading-xs" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {isCreating ? '생성 중...' : '추가'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedIds(new Set());
                  }}
                  className="btn btn-ghost btn-sm rounded-full"
                >
                  <X className="w-4 h-4" />
                  완료
                </button>
              )}
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-2 p-2 bg-base-200 rounded-full">
            <button
              onClick={() => {
                setActiveTab('todo');
                if (isEditMode) setSelectedIds(new Set());
              }}
              className={`
                flex items-center justify-center gap-2 px-4 py-2 rounded-full flex-1 whitespace-nowrap transition-all duration-200
                ${activeTab === 'todo' ? 'bg-primary text-primary-content scale-105 shadow-lg' : 'bg-transparent hover:bg-base-300'}
              `}
            >
              <span>할 일</span>
              {todoCount > 0 && (
                <span className={`badge badge-sm ${activeTab === 'todo' ? 'badge-neutral' : 'badge-primary'}`}>
                  {todoCount}
                </span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab('note');
                if (isEditMode) setSelectedIds(new Set());
              }}
              className={`
                flex items-center justify-center gap-2 px-4 py-2 rounded-full flex-1 whitespace-nowrap transition-all duration-200
                ${activeTab === 'note' ? 'bg-primary text-primary-content scale-105 shadow-lg' : 'bg-transparent hover:bg-base-300'}
              `}
            >
              <span>노트</span>
              {noteCount > 0 && (
                <span className={`badge badge-sm ${activeTab === 'note' ? 'badge-neutral' : 'badge-primary'}`}>
                  {noteCount}
                </span>
              )}
            </button>
          </div>

          {/* 편집 모드 액션 바 */}
          {isEditMode && (
            <div className="mt-3 p-3 bg-base-200 rounded-lg flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="checkbox checkbox-sm"
                  checked={selectedIds.size === filteredItems.length && filteredItems.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(filteredItems.map(item => item.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
                <span className="text-sm font-medium">전체 선택</span>
              </label>

              <div className="flex items-center gap-2">
                {selectedIds.size > 0 && (
                  <span className="badge badge-primary">
                    {selectedIds.size}개 선택됨
                  </span>
                )}
                <button
                  onClick={() => {
                    if (!appUser?.id || selectedIds.size === 0) return;

                    if (!confirm(`선택한 ${selectedIds.size}개 항목을 삭제하시겠습니까?`)) {
                      return;
                    }

                    Promise.all(
                      Array.from(selectedIds).map(id => deleteInboxItem(appUser.id!, id))
                    ).then(() => {
                      setSelectedIds(new Set());
                      setIsEditMode(false);
                    }).catch(error => {
                      console.error('삭제 실패:', error);
                      alert('일부 항목 삭제에 실패했습니다.');
                    });
                  }}
                  className="btn btn-error btn-sm rounded-full"
                  disabled={selectedIds.size === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  삭제
                </button>
              </div>
            </div>
          )}
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
                스크린샷, 노트, 머릿속 아이디어 등을 고민 없이 바로 수집하세요.
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
                onClick={() => {
                  if (isEditMode) {
                    // 편집 모드: 체크박스 토글
                    const newSet = new Set(selectedIds);
                    if (newSet.has(item.id)) {
                      newSet.delete(item.id);
                    } else {
                      newSet.add(item.id);
                    }
                    setSelectedIds(newSet);
                  } else {
                    // 일반 모드: 편집 모달 열기
                    handleCardClick(item);
                  }
                }}
              >
                <div className="card-body p-4">
                  <div className="flex items-start gap-3">
                    {/* 편집 모드 체크박스 */}
                    {isEditMode && (
                      <input
                        type="checkbox"
                        className="checkbox mt-0.5"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();
                          const newSet = new Set(selectedIds);
                          if (e.target.checked) {
                            newSet.add(item.id);
                          } else {
                            newSet.delete(item.id);
                          }
                          setSelectedIds(newSet);
                        }}
                      />
                    )}

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

                    {/* 일반 모드 삭제 버튼 */}
                    {!isEditMode && (
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                          className="btn btn-ghost btn-sm btn-circle text-error"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 할일 편집 모달 */}
      <TodoEditModal
        open={editingItem !== null && (!editingItem?.item_type || editingItem?.item_type === 'todo')}
        todo={todoForm}
        onClose={() => {
          setEditingItem(null);
          resetForms();
        }}
        onSave={handleUpdate}
        onChange={setTodoForm}
        projects={projects}
        notes={notes}
        onCreateProject={handleCreateProject}
        onCreateNote={handleCreateNote}
        titlePlaceholder="예: 슈퍼업 레퍼런스 정리"
        clarificationPlaceholder="수집 과정에서는 어느 것에 속하는지 크게 고민하지 않아도 됩니다"
        showClarification={false}
        showNextActionStatus={false}
        showScheduledDate={false}
        showHighlight={false}
        showCompleted={false}
        showProjects={false}
      />

      {/* 노트 편집 모달 - DaisyUI dialog */}
      {editingItem && editingItem.item_type === 'note' && (
        <dialog open className="modal modal-open">
          <div className={`modal-box w-full max-w-7xl h-screen flex flex-col overflow-hidden ${process.env.BUILD_TARGET === 'web' ? 'pt-0' : ''}`}>
            <div className={`flex-shrink-0 flex items-center justify-between ${process.env.BUILD_TARGET === 'web' ? 'pt-2' : 'pt-[30px]'} pb-4 border-b border-base-300 sticky top-0 bg-base-100 z-10`}>
              <button
                onClick={() => {
                  setEditingItem(null);
                  resetForms();
                }}
                className="btn btn-primary btn-sm rounded-full"
              >
                취소
              </button>

              <h3 className="text-lg font-semibold">노트 편집</h3>

              <button
                onClick={handleUpdate}
                className="btn btn-primary btn-sm rounded-full"
              >
                저장
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <NoteFormFields
                  note={noteForm}
                  onChange={setNoteForm}
                  areas={areas}
                  resources={resources}
                  titlePlaceholder="예: 새로운 브랜딩 관점 변경된 분석틀"
                  contentPlaceholder="세컨드 브레인에 관련된 노트들이 프로젝트에 연결되어 있지 않으면 일 때문에 하던 것들은 노트만 달랑 이 프로젝트에 연결하여라면 분류됩니다"
                />
              </div>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setEditingItem(null);
            resetForms();
          }} />
        </dialog>
      )}

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}

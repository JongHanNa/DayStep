'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import { useProjectStore } from '@/state/stores/secondBrain/projectStore';
import { useNoteStore } from '@/state/stores/secondBrain/noteStore';
import { useTodoStore } from '@/state/stores/todoStore';
import { updateProjectWithJWT, deleteProjectWithJWT } from '@/lib/supabase/projects';
import { updateInboxTodo, updateInboxNote } from '@/lib/supabase/inbox';
import { updateTodoProjects } from '@/lib/supabase/todo-projects';
import { updateTodoNotes } from '@/lib/supabase/todo-notes';
import { updateNoteNotes } from '@/lib/supabase/note-notes';
import { saveLastVisitedRoute } from '@/lib/capacitor/lastVisitedRoute';
import { mapInboxItemToNoteForm } from '@/lib/helpers/noteDataMapper';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import SwipeableCard from '@/components/shared/SwipeableCard';
import { Plus, Trash2, Edit3, X, Boxes } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import NoteEditModal from '@/components/second-brain/NoteEditModal';
import type { InboxItem, Project, Note } from '@/types/second-brain';
import { useModalStore } from '@/state/stores/modalStore';
import { cn } from '@/lib/utils';
import TemplatePickerModal, { type PresetTask } from '@/components/modals/TemplatePickerModal';

// 날짜 유효성 검증 헬퍼 함수
const isValidDate = (date: string | Date | undefined | null): boolean => {
  if (!date) return false;
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
};

export default function InboxPage() {
  const router = useRouter();
  const { appUser } = useAuth();
  const { inboxItems, fetchInboxItems, createInboxItem, updateInboxItem, deleteInboxItem } = useInboxStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();
  const { projects, createProject } = useProjectStore();
  const { notes, fetchNotes, createNote } = useNoteStore();
  const { todos: entityTodos, fetchTodosForCurrentView } = useTodoStore();

  // Entity Todo를 database Todo 형식으로 변환
  const todos = entityTodos.map(todo => todo.toDatabase() as any);

  const [activeTab, setActiveTab] = useState<'todo' | 'note'>('todo');
  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<InboxItem | null>(null);

  // 편집 모드 상태
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  // 템플릿 모달 상태
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // 스와이프된 카드 ID 추적
  const [swipedItemId, setSwipedItemId] = useState<string | null>(null);

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
    note_category: 'work_in_progress', // DB note_category 사용
    linkedAreaOrResource: '',
    isPinned: false,
  });

  // 경로 저장 (Capacitor 앱 복귀 시 마지막 페이지 복원용)
  useEffect(() => {
    saveLastVisitedRoute('/second-brain/inbox');
  }, []);

  useEffect(() => {
    if (appUser?.id) {
      fetchInboxItems(appUser.id);
      fetchAreas(appUser.id);
      fetchResources(appUser.id);
      fetchNotes(appUser.id);
      fetchTodosForCurrentView();
    }
  }, [appUser?.id, fetchInboxItems, fetchAreas, fetchResources, fetchNotes, fetchTodosForCurrentView]);

  // 외부 클릭 시 스와이프된 카드 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (swipedItemId) {
        setSwipedItemId(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [swipedItemId]);

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
      note_category: 'work_in_progress', // DB note_category 사용
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

  // 템플릿 선택 핸들러
  const handleTemplateSelect = async (task: PresetTask) => {
    if (!appUser?.id) return;

    try {
      // 템플릿 제목으로 할일 생성
      await createInboxItem(appUser.id, {
        content: task.title,
        status: 'inbox',
        item_type: 'todo',
        is_completed: false,
      });

      // 모달 닫기
      setIsTemplateModalOpen(false);
    } catch (error) {
      console.error('템플릿 항목 생성 실패:', error);
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

      // start_time에서 HH:mm 포맷 추출 (시간지정일 때만)
      let startTime: string | undefined;
      if (item.schedule_type === 'timed' && item.scheduled_date) {
        const date = new Date(item.scheduled_date);
        startTime = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
      }

      setTodoForm({
        title: item.content,
        clarification: item.clarification || '',
        nextActionStatuses,
        scheduledDate: item.scheduled_date ? new Date(item.scheduled_date) : undefined,
        scheduleType: item.schedule_type || 'none',
        startTime,
        includeTime: item.schedule_type === 'timed',
        isHighlight: item.is_highlight || false,
        completed: item.is_completed || false,
        projectIds: item.project_id ? [item.project_id] : [],
        noteIds: [], // inbox item에는 noteId 연결 필드 없음 (추후 필요시 추가)
      });
    } else {
      // ✅ 공통 매핑 함수 사용 (중복 코드 제거, 일관성 보장)
      setNoteForm(mapInboxItemToNoteForm(item));
    }
  };

  // 항목 업데이트
  const handleUpdate = async () => {
    if (!editingItem || !appUser?.id) return;

    try {
      // 탭 필터링과 동일한 조건: item_type이 없으면 todo로 간주
      if (!editingItem.item_type || editingItem.item_type === 'todo') {
        // 시간지정일 때 날짜와 시간 결합
        let finalDateTime: Date | undefined = todoForm.scheduledDate;

        if (todoForm.scheduleType === 'timed' && todoForm.startTime && finalDateTime) {
          const [hours, minutes] = todoForm.startTime.split(':');
          finalDateTime = new Date(finalDateTime);
          finalDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }

        // DB 직접 업데이트 (로컬 상태 업데이트 제거)
        await updateInboxTodo(appUser.id, editingItem.id, {
          title: todoForm.title,
          clarification: todoForm.clarification,
          next_action_context_ids: todoForm.nextActionContextIds,
          scheduled_date: finalDateTime?.toISOString(),
          schedule_type: todoForm.scheduleType,
          is_today_highlight: todoForm.isHighlight,
          completed: todoForm.completed,
          project_id: todoForm.projectIds?.[0] || undefined,
        });
      } else {
        // linkedAreaOrResource를 area_resource_id로 변환
        // 'area-xxx' → 'xxx', 'resource-xxx' → 'xxx'
        let area_resource_id: string | undefined;
        if (noteForm.linkedAreaOrResource) {
          area_resource_id = noteForm.linkedAreaOrResource.replace(/^(area|resource)-/, '');
        }

        // DB 직접 업데이트 (로컬 상태 업데이트 제거)
        await updateInboxNote(appUser.id, editingItem.id, {
          title: noteForm.title,
          content: noteForm.content,
          note_category: noteForm.note_category,
          is_pinned: noteForm.isPinned,
          area_resource_id,
        });
      }

      // 전체 데이터 재조회로 UI 동기화 (데이터 일관성 보장)
      await fetchInboxItems(appUser.id);

      setEditingItem(null);
      resetForms();
    } catch (error) {
      console.error('❌ [InboxPage] 항목 수정 실패:', error);
      alert('항목 수정에 실패했습니다.');
    }
  };

  // 프로젝트 즉시 저장 핸들러
  const handleProjectImmediateSave = async (projectIds: string[]) => {
    if (!editingItem?.id || !appUser?.id) return;

    try {
      await updateTodoProjects(editingItem.id, projectIds, appUser.id);
      // UI 동기화를 위해 재조회
      await fetchInboxItems(appUser.id);
    } catch (error) {
      console.error('프로젝트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 노트 즉시 저장 핸들러 (할일-노트 연결)
  const handleNoteImmediateSave = async (noteIds: string[]) => {
    if (!editingItem?.id || !appUser?.id) return;

    try {
      await updateTodoNotes(editingItem.id, noteIds, appUser.id);
      // UI 동기화를 위해 재조회
      await fetchInboxItems(appUser.id);
    } catch (error) {
      console.error('노트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 노트-노트 즉시 저장 핸들러
  const handleNoteNoteImmediateSave = async (noteIds: string[]) => {
    if (!editingItem?.id || !appUser?.id) return;

    try {
      await updateNoteNotes(editingItem.id, noteIds, appUser.id);
      // UI 동기화를 위해 재조회
      await fetchInboxItems(appUser.id);
    } catch (error) {
      console.error('노트-노트 연결 저장 실패:', error);
      throw error;
    }
  };

  // 프로젝트 수정 핸들러
  const handleUpdateProject = async (id: string, title: string): Promise<void> => {
    if (!appUser?.id) throw new Error('사용자 정보가 없습니다.');
    await updateProjectWithJWT(id, appUser.id, { title });
    await fetchInboxItems(appUser.id);
  };

  // 프로젝트 삭제 핸들러
  const handleDeleteProject = async (id: string): Promise<void> => {
    if (!appUser?.id) throw new Error('사용자 정보가 없습니다.');
    await deleteProjectWithJWT(id, appUser.id);
    await fetchInboxItems(appUser.id);
  };

  // 프로젝트 클릭 핸들러
  const handleProjectClick = (project: Project) => {
    console.log('Project clicked:', project);
    // 필요시 프로젝트 편집 모달 구현
  };

  const handleDelete = async (id: string) => {
    if (!appUser?.id) return;
    try {
      await deleteInboxItem(appUser.id, id);
    } catch (error) {
      console.error('항목 삭제 실패:', error);
    }
  };

  /**
   * Shift + 클릭 시 범위 선택 처리
   */
  const handleRangeSelection = (
    currentIndex: number,
    isChecked: boolean,
    itemId: string
  ) => {
    if (lastSelectedIndex === null) {
      // 첫 선택: 일반 체크/해제
      const newSet = new Set(selectedIds);
      if (isChecked) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      setSelectedIds(newSet);
      setLastSelectedIndex(currentIndex);
      return;
    }

    // 범위 선택: lastSelectedIndex와 currentIndex 사이의 모든 아이템
    const start = Math.min(lastSelectedIndex, currentIndex);
    const end = Math.max(lastSelectedIndex, currentIndex);

    const newSet = new Set(selectedIds);
    for (let i = start; i <= end; i++) {
      if (isChecked) {
        newSet.add(filteredItems[i].id);
      } else {
        newSet.delete(filteredItems[i].id);
      }
    }

    setSelectedIds(newSet);
    setLastSelectedIndex(currentIndex);
  };

  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = (itemId: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      handleDelete(itemId);
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
    if (!appUser?.id) {
      throw new Error('사용자 정보가 없습니다.');
    }

    return await createNote(appUser.id, {
      title,
      content: '',
      note_category: 'work_in_progress', // 기본값
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
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen bg-base-200 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-200 border-b border-base-300">
        <div className={`max-w-3xl mx-auto px-4 ${process.env.BUILD_TARGET === 'mobile' ? 'pt-2 pb-2' : 'py-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="mt-2 text-sm font-medium text-base-content/70">빠른 수집을 위한 페이지입니다</p>
            </div>
            <div className="flex items-center gap-2">
              {!isEditMode ? (
                <>
                  <button
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="btn btn-ghost btn-sm rounded-full"
                  >
                    <Boxes className="w-4 h-4" />
                    템플릿
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
                  <button
                    onClick={() => setIsEditMode(true)}
                    className="btn btn-ghost btn-sm rounded-full"
                  >
                    <Edit3 className="w-4 h-4" />
                    편집
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setIsEditMode(false);
                    setSelectedIds(new Set());
                    setLastSelectedIndex(null);
                  }}
                  className="btn btn-ghost btn-sm rounded-full"
                >
                  <X className="w-4 h-4" />
                  취소
                </button>
              )}
            </div>
          </div>

          {/* 탭 */}
          <div className="overflow-x-auto">
            <div className="tabs tabs-boxed inline-flex">
              <button
                onClick={() => {
                  setActiveTab('todo');
                  if (isEditMode) {
                    setSelectedIds(new Set());
                    setLastSelectedIndex(null);
                  }
                }}
                className={cn('tab', activeTab === 'todo' && 'tab-active')}
              >
                할 일
                {todoCount > 0 && (
                  <span className="ml-1 badge badge-sm">
                    {todoCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('note');
                  if (isEditMode) {
                    setSelectedIds(new Set());
                    setLastSelectedIndex(null);
                  }
                }}
                className={cn('tab', activeTab === 'note' && 'tab-active')}
              >
                노트
                {noteCount > 0 && (
                  <span className="ml-1 badge badge-sm">
                    {noteCount}
                  </span>
                )}
              </button>
            </div>
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
              <SwipeableCard
                key={item.id}
                itemId={item.id}
                onDelete={handleDeleteClick}
                disabled={isEditMode}
                swipedItemId={swipedItemId}
                onSwipe={setSwipedItemId}
                onClick={(itemId) => {
                  if (isEditMode) {
                    // 편집 모드: 체크박스 토글
                    const newSet = new Set(selectedIds);
                    if (newSet.has(itemId)) {
                      newSet.delete(itemId);
                    } else {
                      newSet.add(itemId);
                    }
                    setSelectedIds(newSet);
                  } else {
                    // 일반 모드: 편집 모달 열기
                    handleCardClick(item);
                  }
                }}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* 편집 모드 체크박스 */}
                    {isEditMode && (
                      <input
                        type="checkbox"
                        className="checkbox mt-0.5"
                        checked={selectedIds.has(item.id)}
                        onChange={(e) => {
                          e.stopPropagation();

                          if ((e.nativeEvent as MouseEvent).shiftKey) {
                            // Shift + 클릭: 범위 선택
                            const currentIndex = filteredItems.findIndex(i => i.id === item.id);
                            handleRangeSelection(currentIndex, e.target.checked, item.id);
                          } else {
                            // 일반 클릭: 단일 체크/해제
                            const newSet = new Set(selectedIds);
                            if (e.target.checked) {
                              newSet.add(item.id);
                            } else {
                              newSet.delete(item.id);
                            }
                            setSelectedIds(newSet);
                            setLastSelectedIndex(filteredItems.findIndex(i => i.id === item.id));
                          }
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
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-base-content/50">
                          {isValidDate(item.created_at) ? (
                            formatDistanceToNow(new Date(item.created_at), {
                              addSuffix: true,
                              locale: ko
                            })
                          ) : (
                            '날짜 정보 없음'
                          )}
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
                  </div>
                </div>
              </SwipeableCard>
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
        todoId={editingItem?.id}
        userId={appUser?.id}
        onProjectImmediateSave={handleProjectImmediateSave}
        onNoteImmediateSave={handleNoteImmediateSave}
        showNextActionStatus={false}
        showScheduledDate={true}
        showHighlight={false}
        showCompleted={false}
        showProjects={false}
      />

      {/* 노트 편집 모달 */}
      <NoteEditModal
        open={editingItem !== null && editingItem?.item_type === 'note'}
        note={noteForm}
        onClose={() => {
          setEditingItem(null);
          resetForms();
        }}
        onSave={handleUpdate}
        onChange={setNoteForm}
        areas={areas}
        resources={resources}
        projects={projects}
        todos={todos}
        notes={notes}
        onNoteClick={(note) => {
          // 노트 클릭 시 처리 (필요시 구현)
          console.log('Note clicked:', note);
        }}
        onProjectClick={handleProjectClick}
        onCreateNote={handleCreateNote}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        onNoteNoteImmediateSave={handleNoteNoteImmediateSave}
        titlePlaceholder=""
        contentPlaceholder=""
      />

      {/* 템플릿 선택 모달 */}
      <TemplatePickerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onTemplateSelect={handleTemplateSelect}
      />

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
      </div>
    </AuthGuard>
  );
}

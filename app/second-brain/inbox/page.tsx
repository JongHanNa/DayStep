'use client';

import { useEffect, useState } from 'react';
import { useInboxStore } from '@/state/stores/secondBrain/inboxStore';
import { useAreaStore } from '@/state/stores/secondBrain/areaStore';
import { useResourceStore } from '@/state/stores/secondBrain/resourceStore';
import SecondBrainBottomNav from '@/components/layout/SecondBrainBottomNav';
import { Plus, Trash2, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import TodoFormFields, { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import NoteFormFields, { type NoteFormData } from '@/components/second-brain/shared/NoteFormFields';

export default function InboxPage() {
  const { inboxItems, fetchInboxItems, createInboxItem, deleteInboxItem } = useInboxStore();
  const { areas, fetchAreas } = useAreaStore();
  const { resources, fetchResources } = useResourceStore();

  const [activeTab, setActiveTab] = useState<'todo' | 'note'>('todo');
  const [showAddModal, setShowAddModal] = useState(false);

  // 할일 폼 데이터
  const [todoForm, setTodoForm] = useState<TodoFormData>({
    title: '',
    clarification: '',
    nextActionStatus: '',
    scheduledDate: undefined,
    isHighlight: false,
    completed: false,
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
  }, [fetchInboxItems, fetchAreas, fetchResources]);

  const resetForms = () => {
    setTodoForm({
      title: '',
      clarification: '',
      nextActionStatus: '',
      scheduledDate: undefined,
      isHighlight: false,
      completed: false,
    });
    setNoteForm({
      title: '',
      content: '',
      category: '중간 작업물',
      linkedAreaOrResource: '',
      isPinned: false,
    });
  };

  const handleAdd = async () => {
    try {
      if (activeTab === 'todo') {
        // 할일 추가
        if (!todoForm.title.trim()) {
          alert('할일 제목을 입력해주세요.');
          return;
        }

        await createInboxItem({
          content: todoForm.title,
          status: 'inbox',
          item_type: 'todo',
          clarification: todoForm.clarification,
          next_action_status: todoForm.nextActionStatus,
          scheduled_date: todoForm.scheduledDate?.toISOString(),
          is_highlight: todoForm.isHighlight,
          is_completed: todoForm.completed,
        });
      } else {
        // 노트 추가
        if (!noteForm.title.trim()) {
          alert('노트 제목을 입력해주세요.');
          return;
        }

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

        await createInboxItem({
          content: noteForm.title,
          status: 'inbox',
          item_type: 'note',
          note_title: noteForm.title,
          note_content: noteForm.content,
          note_category: noteForm.category,
          is_pinned: noteForm.isPinned,
          linked_area_or_resource: noteForm.linkedAreaOrResource,
          area_id,
          resource_id,
        });
      }

      resetForms();
      setShowAddModal(false);
    } catch (error) {
      console.error('항목 추가 실패:', error);
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
    // 명료화 페이지로 이동 (추후 구현)
    alert('명료화 기능은 추후 구현 예정입니다.');
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
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              추가
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
              <div key={item.id} className="card bg-base-200 hover:bg-base-300 transition-colors">
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
                        onClick={() => handleClarify(item.id)}
                        className="btn btn-ghost btn-sm btn-square"
                        title="명료화"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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

      {/* 추가 모달 */}
      {showAddModal && (
        <div className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">
              새로운 {activeTab === 'todo' ? '할 일' : '노트'} 추가
            </h3>

            {/* 탭 */}
            <div className="flex gap-2 mb-4">
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

            {/* 폼 필드 */}
            {activeTab === 'todo' ? (
              <TodoFormFields
                todo={todoForm}
                onChange={setTodoForm}
                titlePlaceholder="예: 슈퍼업 레퍼런스 정리"
                clarificationPlaceholder="수집 과정에서는 어느 것에 속하는지 크게 고민하지 않아도 됩니다"
                nextActionStatusPlaceholder="예: 감자기 생각난 해야 할 일"
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
              <button onClick={() => {
                setShowAddModal(false);
                resetForms();
              }} className="btn btn-ghost">
                취소
              </button>
              <button
                onClick={handleAdd}
                disabled={activeTab === 'todo' ? !todoForm.title.trim() : !noteForm.title.trim()}
                className="btn btn-primary"
              >
                추가
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => {
            setShowAddModal(false);
            resetForms();
          }} />
        </div>
      )}

      {/* 하단 네비게이션 */}
      <SecondBrainBottomNav />
    </div>
  );
}

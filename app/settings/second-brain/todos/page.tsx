'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTodoStore } from '@/state/stores/todoStore';
import { Plus, X, Pencil, ArrowLeft, Calendar, Clock, Lightbulb } from 'lucide-react';
import type { CreateTodoInput } from '@/types';

// 추천 할일 프리셋 (온보딩 step-5와 동일)
const TODO_PRESETS = [
  { content: '독서 시간 30분', priority: 'medium' as const, description: '매일 책 읽는 습관 만들기' },
  { content: '운동하기', priority: 'medium' as const, description: '건강한 몸 만들기' },
  { content: '프로젝트 계획 세우기', priority: 'high' as const, description: '체계적인 업무 진행' },
  { content: '정리 정돈하기', priority: 'low' as const, description: '깔끔한 환경 유지' },
  { content: '새로운 기술 학습', priority: 'medium' as const, description: '지속적인 성장' },
  { content: '건강 체크하기', priority: 'high' as const, description: '규칙적인 건강 관리' },
];

type TodoPreset = {
  content: string;
  priority: 'low' | 'medium' | 'high';
  description: string;
};

export default function TodosSettingsPage() {
  const router = useRouter();
  const { todos, createTodo, updateTodo, deleteTodo } = useTodoStore();

  // 완료되지 않은 할일만 표시
  const incompleteTodos = todos.filter(todo => !todo.completed);

  // 편집 관련 state
  const [editingTodo, setEditingTodo] = useState<any | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // 삭제 확인 다이얼로그
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<any | null>(null);

  // 추천 항목 추가 다이얼로그
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [selectedPresets, setSelectedPresets] = useState<TodoPreset[]>([]);

  // 새 할일 추가 핸들러
  const handleAddTodo = () => {
    setEditingTodo({
      id: '',
      title: '',
      description: '',
      start_time: '',
      end_time: '',
      isNew: true,
    });
    setEditDialogOpen(true);
  };

  // 할일 편집 핸들러
  const handleEditTodo = (todo: any) => {
    setEditingTodo({
      ...todo,
      start_time: todo.start_time ? new Date(todo.start_time).toISOString().slice(0, 16) : '',
      end_time: todo.end_time ? new Date(todo.end_time).toISOString().slice(0, 16) : '',
      isNew: false,
    });
    setEditDialogOpen(true);
  };

  // 저장 핸들러
  const handleSaveEdit = async () => {
    if (!editingTodo || !editingTodo.title.trim()) {
      alert('제목을 입력해주세요.');
      return;
    }

    try {
      const todoData: any = {
        title: editingTodo.title,
        description: editingTodo.description || '',
        start_time: editingTodo.start_time ? new Date(editingTodo.start_time).toISOString() : null,
        end_time: editingTodo.end_time ? new Date(editingTodo.end_time).toISOString() : null,
      };

      if (editingTodo.isNew) {
        // 새 할일 생성
        await createTodo(todoData);
      } else {
        // 기존 할일 수정
        await updateTodo(editingTodo.id, todoData);
      }

      setEditDialogOpen(false);
      setEditingTodo(null);
    } catch (error) {
      console.error('할일 저장 실패:', error);
      alert('할일 저장에 실패했습니다.');
    }
  };

  // 취소 핸들러
  const handleCancelEdit = () => {
    setEditDialogOpen(false);
    setEditingTodo(null);
  };

  // 삭제 확인 다이얼로그 열기
  const handleDeleteClick = (todo: any) => {
    setTodoToDelete(todo);
    setDeleteConfirmOpen(true);
  };

  // 삭제 실행
  const handleConfirmDelete = async () => {
    if (!todoToDelete) return;

    try {
      await deleteTodo(todoToDelete.id);
      setDeleteConfirmOpen(false);
      setTodoToDelete(null);
    } catch (error) {
      console.error('할일 삭제 실패:', error);
      alert('할일 삭제에 실패했습니다.');
    }
  };

  // 삭제 취소
  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setTodoToDelete(null);
  };

  // 추천 항목 추가 다이얼로그 열기
  const handleOpenPresetDialog = () => {
    setSelectedPresets([]);
    setPresetDialogOpen(true);
  };

  // 추천 항목 토글
  const handleTogglePreset = (preset: TodoPreset) => {
    if (selectedPresets.some((p) => p.content === preset.content)) {
      setSelectedPresets(selectedPresets.filter((p) => p.content !== preset.content));
    } else {
      setSelectedPresets([...selectedPresets, preset]);
    }
  };

  // 추천 항목 일괄 추가
  const handleAddPresets = async () => {
    if (selectedPresets.length === 0) {
      alert('최소 1개 이상의 할일을 선택해주세요.');
      return;
    }

    try {
      // 선택한 할일들을 생성
      for (const preset of selectedPresets) {
        const todoData: CreateTodoInput = {
          content: preset.content,
          completed: false,
          priority: preset.priority,
          schedule_type: 'anytime',
          recurrence_pattern: 'none',
        };
        await createTodo(todoData);
      }

      setPresetDialogOpen(false);
      setSelectedPresets([]);
    } catch (error) {
      console.error('할일 추가 실패:', error);
      alert('할일 추가에 실패했습니다.');
    }
  };

  // 추천 항목 추가 취소
  const handleCancelPresets = () => {
    setPresetDialogOpen(false);
    setSelectedPresets([]);
  };

  // 날짜/시간 포맷팅
  const formatDateTime = (dateTimeString: string) => {
    if (!dateTimeString) return '';
    const date = new Date(dateTimeString);
    return date.toLocaleString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-base-100 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-base-100 border-b border-base-300">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="뒤로가기"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">할일 (Todos)</h1>
              <p className="text-sm text-base-content/70">
                실행할 작업을 관리하세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* 할일 목록 */}
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">할일 목록 ({incompleteTodos.length}개)</h2>
            <div className="flex gap-2">
              <button onClick={handleOpenPresetDialog} className="btn btn-ghost btn-sm">
                <Lightbulb className="w-4 h-4" />
                추천 항목 추가
              </button>
              <button onClick={handleAddTodo} className="btn btn-primary btn-sm">
                <Plus className="w-4 h-4" />
                새 할일 추가
              </button>
            </div>
          </div>

          {incompleteTodos.length === 0 ? (
            <div className="card bg-base-200">
              <div className="card-body text-center py-12">
                <p className="text-base-content/60">
                  아직 할일이 없습니다. 새 할일을 추가해보세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {incompleteTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start justify-between p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{todo.title}</div>
                    {todo.description && (
                      <div className="text-sm text-base-content/60 mt-1">{todo.description}</div>
                    )}
                    {(todo.start_time || todo.end_time) && (
                      <div className="flex gap-3 mt-2 text-xs text-base-content/60">
                        {todo.start_time && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(todo.start_time)}
                          </div>
                        )}
                        {todo.end_time && (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDateTime(todo.end_time)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditTodo(todo)}
                      className="btn btn-ghost btn-sm btn-circle"
                      aria-label="수정"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(todo)}
                      className="btn btn-ghost btn-sm btn-circle text-error"
                      aria-label="삭제"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 편집/추가 다이얼로그 */}
      {editDialogOpen && editingTodo && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">
              {editingTodo.isNew ? '새 할일 추가' : '할일 편집'}
            </h3>

            {/* 제목 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">제목</span>
              </label>
              <input
                type="text"
                value={editingTodo.title}
                onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                className="input input-bordered"
                placeholder="예: 보고서 작성"
              />
            </div>

            {/* 설명 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">설명</span>
              </label>
              <textarea
                value={editingTodo.description || ''}
                onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
                className="textarea textarea-bordered h-20"
                placeholder="예: 월간 실적 보고서 작성 및 제출"
              />
            </div>

            {/* 시작 시간 */}
            <div className="form-control mb-4">
              <label className="label">
                <span className="label-text">시작 시간 (선택)</span>
              </label>
              <input
                type="datetime-local"
                value={editingTodo.start_time || ''}
                onChange={(e) => setEditingTodo({ ...editingTodo, start_time: e.target.value })}
                className="input input-bordered"
              />
            </div>

            {/* 종료 시간 */}
            <div className="form-control mb-6">
              <label className="label">
                <span className="label-text">종료 시간 (선택)</span>
              </label>
              <input
                type="datetime-local"
                value={editingTodo.end_time || ''}
                onChange={(e) => setEditingTodo({ ...editingTodo, end_time: e.target.value })}
                className="input input-bordered"
              />
            </div>

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelEdit} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleSaveEdit} className="btn btn-primary">
                저장
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelEdit} />
        </dialog>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {deleteConfirmOpen && todoToDelete && (
        <dialog open className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">할일 삭제</h3>
            <p className="mb-6">
              <strong>{todoToDelete.title}</strong> 할일을 삭제하시겠습니까?
              <br />
              <span className="text-sm text-base-content/60">
                이 작업은 되돌릴 수 없습니다.
              </span>
            </p>
            <div className="modal-action">
              <button onClick={handleCancelDelete} className="btn btn-ghost">
                취소
              </button>
              <button onClick={handleConfirmDelete} className="btn btn-error">
                삭제
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelDelete} />
        </dialog>
      )}

      {/* 추천 항목 추가 다이얼로그 */}
      {presetDialogOpen && (
        <dialog open className="modal modal-open">
          <div className="modal-box max-w-2xl">
            <h3 className="font-bold text-lg mb-4">추천 할일 추가하기</h3>
            <p className="text-sm text-base-content/70 mb-6">
              시작하기 좋은 할일들을 준비했어요. 여러 개를 선택할 수 있습니다.
            </p>

            {/* 프리셋 할일 그리드 */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {TODO_PRESETS.map((preset) => {
                const isSelected = selectedPresets.some((p) => p.content === preset.content);

                return (
                  <button
                    key={preset.content}
                    onClick={() => handleTogglePreset(preset)}
                    className={`card transition-all w-full ${
                      isSelected
                        ? 'bg-primary text-primary-content ring-2 ring-primary'
                        : 'bg-base-200 hover:bg-base-300'
                    }`}
                  >
                    <div className="card-body p-4">
                      <div className="flex items-start justify-between">
                        <div className="text-left flex-1">
                          <h3 className="font-semibold">{preset.content}</h3>
                          <p className={`text-xs mt-1 ${isSelected ? 'opacity-90' : 'text-base-content/60'}`}>
                            {preset.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary-content text-primary flex items-center justify-center ml-2">
                            <svg
                              className="w-3 h-3"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* 선택된 항목 표시 */}
            {selectedPresets.length > 0 && (
              <div className="alert alert-info mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">
                  {selectedPresets.length}개 할일이 선택되었습니다
                </span>
              </div>
            )}

            {/* 버튼 */}
            <div className="modal-action">
              <button onClick={handleCancelPresets} className="btn btn-ghost">
                취소
              </button>
              <button
                onClick={handleAddPresets}
                disabled={selectedPresets.length === 0}
                className="btn btn-primary"
              >
                {selectedPresets.length > 0 ? `${selectedPresets.length}개 추가` : '항목 선택'}
              </button>
            </div>
          </div>
          <div className="modal-backdrop" onClick={handleCancelPresets} />
        </dialog>
      )}
    </div>
  );
}

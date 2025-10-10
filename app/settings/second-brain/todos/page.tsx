'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTodoStore } from '@/state/stores/todoStore';
import { Plus, X, Pencil, ArrowLeft, Calendar, Clock } from 'lucide-react';

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
            <button onClick={handleAddTodo} className="btn btn-primary btn-sm">
              <Plus className="w-4 h-4" />
              새 할일 추가
            </button>
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
    </div>
  );
}

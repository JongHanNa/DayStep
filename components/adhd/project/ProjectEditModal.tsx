'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Check, FolderKanban, Trash2, ChevronDown, ChevronUp, Unlink, Play, Pause, CheckCircle, ListTodo } from 'lucide-react';
import { useProjectStore } from '@/state/stores/projectStore';
import { useAuth } from '@/app/context/AuthContext';
import type { Project, Todo, ProjectStatus } from '@/types';

// 기본 색상 팔레트
const COLOR_PALETTE = [
  '#A8DADC', // 민트
  '#F4A261', // 오렌지
  '#E76F51', // 코랄
  '#2A9D8F', // 틸
  '#E9C46A', // 골드
  '#457B9D', // 블루
  '#8338EC', // 퍼플
  '#FF6B6B', // 레드
  '#4ECDC4', // 시안
  '#95E1D3', // 라이트그린
];

// 기본 아이콘 목록 (이모지)
const ICON_LIST = [
  '📁', '🎯', '💼', '🎨', '📚', '💡', '🚀', '⭐',
  '🏠', '💪', '🎵', '✈️', '🌱', '🔧', '📱', '🎮',
];

// 상태 라벨 매핑
const STATUS_LABELS: Record<ProjectStatus, string> = {
  'not_started': '시작안함',
  'in_progress': '진행중',
  'on_hold': '중단',
  'completed': '완료',
};

// 상태 색상 매핑
const STATUS_COLORS: Record<ProjectStatus, string> = {
  'not_started': 'badge-outline',
  'in_progress': 'badge-primary',
  'on_hold': 'badge-warning',
  'completed': 'badge-success',
};

interface ProjectEditModalProps {
  project?: Project;
  onClose: () => void;
}

/**
 * 프로젝트 생성/편집 모달
 */
export default function ProjectEditModal({ project, onClose }: ProjectEditModalProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const {
    createProject,
    updateProject,
    deleteProject,
    deleteProjectWithTodos,
    fetchProjectTodos,
    projectTodos,
    completeProject,
    holdProject,
    startProject,
    unstartProject,
    resumeProject,
    unlinkTodoFromProject,
    fetchProjects,
  } = useProjectStore();

  const isEditing = !!project;

  // 폼 상태
  const [title, setTitle] = useState(project?.title || '');
  const [description, setDescription] = useState(project?.description || '');
  const [color, setColor] = useState(project?.color || COLOR_PALETTE[0]);
  const [icon, setIcon] = useState(project?.icon || '');
  const [status, setStatus] = useState<ProjectStatus>((project?.status as ProjectStatus) || 'not_started');
  const [isLoading, setIsLoading] = useState(false);

  // 연결된 할일 상태
  const [linkedTodos, setLinkedTodos] = useState<Todo[]>([]);
  const [isTodosExpanded, setIsTodosExpanded] = useState(false);
  const [loadingTodos, setLoadingTodos] = useState(false);

  // 삭제 확인 모달 상태
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOption, setDeleteOption] = useState<'project_only' | 'with_todos'>('project_only');

  // 프로젝트 할일 로드
  useEffect(() => {
    if (isEditing && project && userId) {
      setLoadingTodos(true);
      fetchProjectTodos(userId, project.id).then((todos) => {
        setLinkedTodos(todos);
        setLoadingTodos(false);
      });
    }
  }, [isEditing, project, userId, fetchProjectTodos]);

  // projectTodos 변경 시 업데이트
  useEffect(() => {
    if (project) {
      const todos = projectTodos.get(project.id);
      if (todos) {
        setLinkedTodos(todos);
      }
    }
  }, [projectTodos, project]);

  // 저장
  const handleSave = async () => {
    if (!userId || !title.trim()) return;

    setIsLoading(true);
    try {
      if (isEditing && project) {
        await updateProject(userId, {
          id: project.id,
          title: title.trim(),
          description: description.trim() || null,
          color,
          icon: icon || null,
        });
      } else {
        await createProject(userId, {
          title: title.trim(),
          description: description.trim() || null,
          color,
          icon: icon || null,
          status: status, // 사용자가 선택한 상태 사용
        });
      }
      onClose();
    } catch (error) {
      console.error('프로젝트 저장 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 삭제 모달 열기
  const handleDelete = () => {
    if (!userId || !project) return;
    setShowDeleteModal(true);
  };

  // 실제 삭제 실행
  const handleConfirmDelete = async () => {
    if (!userId || !project) return;

    setIsLoading(true);
    try {
      if (deleteOption === 'with_todos') {
        await deleteProjectWithTodos(userId, project.id);
      } else {
        await deleteProject(userId, project.id);
      }
      setShowDeleteModal(false);
      onClose();
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 상태 변경 핸들러들
  const handleStartProject = async () => {
    if (!userId || !project) return;
    await startProject(userId, project.id);
    setStatus('in_progress');
    // 프로젝트 목록 새로고침
    fetchProjects(userId);
  };

  const handleUnstartProject = async () => {
    if (!userId || !project) return;
    await unstartProject(userId, project.id);
    setStatus('not_started');
    // 프로젝트 목록 새로고침
    fetchProjects(userId);
  };

  const handleHoldProject = async () => {
    if (!userId || !project) return;
    if (!confirm('이 프로젝트를 중단하시겠습니까?')) return;
    await holdProject(userId, project.id);
    setStatus('on_hold');
    fetchProjects(userId);
  };

  const handleResumeProject = async () => {
    if (!userId || !project) return;
    await resumeProject(userId, project.id);
    setStatus('in_progress');
    fetchProjects(userId);
  };

  const handleCompleteProject = async () => {
    if (!userId || !project) return;
    await completeProject(userId, project.id);
    setStatus('completed');
    fetchProjects(userId);
  };

  // 할일 연결 해제
  const handleUnlinkTodo = async (todoId: string) => {
    if (!userId) return;
    await unlinkTodoFromProject(userId, todoId);
    setLinkedTodos((prev) => prev.filter((t) => t.id !== todoId));
  };

  return (
    <dialog open className="modal z-[110]">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="modal-box max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* 헤더 */}
        <div className="sticky top-0 z-10 bg-base-100 pt-2 pb-4 -mt-2 flex items-center justify-between">
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm rounded-full"
          >
            취소
          </button>
          <h3 className="text-lg font-bold">
            {isEditing ? '프로젝트 편집' : '새 프로젝트'}
          </h3>
          <div className="flex gap-1">
            {isEditing && (
              <button
                onClick={handleDelete}
                className="btn btn-ghost btn-sm btn-circle text-error"
                title="삭제"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!title.trim() || isLoading}
              className="btn btn-primary btn-sm rounded-full"
            >
              {isLoading ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  저장
                </>
              )}
            </button>
          </div>
        </div>

        {/* 아이콘 + 제목 */}
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            className="w-12 h-12 rounded-lg flex items-center justify-center text-xl relative flex-shrink-0"
            style={{
              backgroundColor: color ? `${color}20` : '#f3f4f6',
            }}
          >
            {icon || <FolderKanban className="w-6 h-6" style={{ color }} />}
            <div
              className="w-5 h-5 rounded-full absolute -bottom-1 -left-1 border-2 border-base-100"
              style={{ backgroundColor: color }}
            />
          </button>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="프로젝트 이름"
            className="input input-bordered flex-1 text-lg font-semibold"
            autoFocus
          />
        </div>

        {/* 설명 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">설명 (선택)</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="프로젝트에 대한 간단한 설명..."
            className="textarea textarea-bordered h-20"
          />
        </div>

        {/* 색상 선택 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">색상</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${
                  color === c ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* 아이콘 선택 */}
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text font-medium">아이콘 (선택)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIcon('')}
              className={`w-8 h-8 rounded-lg flex items-center justify-center bg-base-200 ${
                !icon ? 'ring-2 ring-primary' : ''
              }`}
            >
              <X className="w-4 h-4 text-base-content/40" />
            </button>
            {ICON_LIST.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIcon(i)}
                className={`w-8 h-8 rounded-lg flex items-center justify-center bg-base-200 ${
                  icon === i ? 'ring-2 ring-primary' : ''
                }`}
              >
                {i}
              </button>
            ))}
          </div>
        </div>

        {/* 시작 상태 선택 (새 프로젝트 생성 모드에서만) */}
        {!isEditing && (
          <div className="form-control mb-4">
            <label className="label">
              <span className="label-text font-medium">시작 상태</span>
            </label>
            <div className="space-y-2">
              <label className="flex items-start gap-3 p-3 rounded-lg bg-base-200 cursor-pointer hover:bg-base-300 transition-colors">
                <input
                  type="radio"
                  name="status"
                  className="radio radio-sm mt-0.5"
                  checked={status === 'not_started'}
                  onChange={() => setStatus('not_started')}
                />
                <div>
                  <div className="font-medium">시작안함</div>
                  <div className="text-sm text-base-content/60">나중에 시작할 프로젝트</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg bg-base-200 cursor-pointer hover:bg-base-300 transition-colors">
                <input
                  type="radio"
                  name="status"
                  className="radio radio-sm mt-0.5"
                  checked={status === 'in_progress'}
                  onChange={() => setStatus('in_progress')}
                />
                <div>
                  <div className="font-medium">진행중</div>
                  <div className="text-sm text-base-content/60">바로 시작할 프로젝트</div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* 연결된 할일 섹션 (편집 모드에서만) */}
        {isEditing && (
          <div className="border-t border-base-200 pt-4 mb-4">
            <button
              onClick={() => setIsTodosExpanded(!isTodosExpanded)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <ListTodo className="w-5 h-5 text-base-content/60" />
                <span className="font-medium">연결된 할일</span>
                <span className="badge badge-sm badge-ghost">{linkedTodos.length}개</span>
              </div>
              {isTodosExpanded ? (
                <ChevronUp className="w-5 h-5 text-base-content/40" />
              ) : (
                <ChevronDown className="w-5 h-5 text-base-content/40" />
              )}
            </button>

            {isTodosExpanded && (
              <div className="mt-3 space-y-2">
                {loadingTodos ? (
                  <div className="flex justify-center py-4">
                    <span className="loading loading-spinner loading-sm" />
                  </div>
                ) : linkedTodos.length === 0 ? (
                  <p className="text-sm text-base-content/50 py-2 text-center">
                    연결된 할일이 없습니다
                  </p>
                ) : (
                  linkedTodos.map((todo) => (
                    <div
                      key={todo.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-base-200"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                            todo.completed
                              ? 'bg-success border-success'
                              : 'border-base-content/30'
                          }`}
                        >
                          {todo.completed && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span
                          className={`text-sm truncate ${
                            todo.completed ? 'line-through text-base-content/50' : ''
                          }`}
                        >
                          {todo.title}
                        </span>
                      </div>
                      <button
                        onClick={() => handleUnlinkTodo(todo.id)}
                        className="btn btn-ghost btn-xs btn-circle flex-shrink-0"
                        title="연결 해제"
                      >
                        <Unlink className="w-3 h-3 text-base-content/40" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* 상태 섹션 (편집 모드에서만) */}
        {isEditing && (
          <div className="border-t border-base-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-medium">상태</span>
              <span className={`badge badge-sm ${STATUS_COLORS[status]}`}>
                {STATUS_LABELS[status]}
              </span>
            </div>

            <div className="flex gap-2 flex-wrap">
              {/* 시작안함 상태 */}
              {status === 'not_started' && (
                <button
                  onClick={handleStartProject}
                  className="btn btn-sm btn-primary rounded-full gap-1"
                >
                  <Play className="w-4 h-4" />
                  시작하기
                </button>
              )}

              {/* 진행중 상태 */}
              {status === 'in_progress' && (
                <>
                  <button
                    onClick={handleUnstartProject}
                    className="btn btn-sm btn-outline rounded-full gap-1"
                  >
                    <Play className="w-4 h-4 rotate-180" />
                    시작안함
                  </button>
                  <button
                    onClick={handleHoldProject}
                    className="btn btn-sm btn-warning btn-outline rounded-full gap-1"
                  >
                    <Pause className="w-4 h-4" />
                    중단
                  </button>
                  <button
                    onClick={handleCompleteProject}
                    className="btn btn-sm btn-success rounded-full gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    완료
                  </button>
                </>
              )}

              {/* 중단 상태 */}
              {status === 'on_hold' && (
                <>
                  <button
                    onClick={handleResumeProject}
                    className="btn btn-sm btn-primary rounded-full gap-1"
                  >
                    <Play className="w-4 h-4" />
                    재개
                  </button>
                  <button
                    onClick={handleCompleteProject}
                    className="btn btn-sm btn-success rounded-full gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    완료
                  </button>
                </>
              )}

              {/* 완료 상태 */}
              {status === 'completed' && (
                <button
                  onClick={handleResumeProject}
                  className="btn btn-sm btn-outline rounded-full gap-1"
                >
                  <Play className="w-4 h-4" />
                  다시 진행
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* 배경 클릭으로 닫기 */}
      <form method="dialog" className="modal-backdrop">
        <button onClick={onClose}>close</button>
      </form>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-base-100 rounded-2xl p-6 mx-4 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-lg font-bold mb-2">프로젝트 삭제</h3>
            <p className="text-base-content/70 mb-4">
              &ldquo;{project?.title}&rdquo;을(를) 삭제하시겠습니까?
            </p>

            {linkedTodos.length > 0 && (
              <p className="text-sm text-base-content/60 mb-4">
                연결된 할일: <span className="font-semibold">{linkedTodos.length}개</span>
              </p>
            )}

            <div className="space-y-2 mb-6">
              <label className="flex items-start gap-3 p-3 rounded-lg bg-base-200 cursor-pointer hover:bg-base-300 transition-colors">
                <input
                  type="radio"
                  name="deleteOption"
                  className="radio radio-sm mt-0.5"
                  checked={deleteOption === 'project_only'}
                  onChange={() => setDeleteOption('project_only')}
                />
                <div>
                  <div className="font-medium">프로젝트만 삭제</div>
                  <div className="text-sm text-base-content/60">
                    할일은 연결만 해제됩니다
                  </div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg bg-base-200 cursor-pointer hover:bg-base-300 transition-colors">
                <input
                  type="radio"
                  name="deleteOption"
                  className="radio radio-sm mt-0.5"
                  checked={deleteOption === 'with_todos'}
                  onChange={() => setDeleteOption('with_todos')}
                />
                <div>
                  <div className="font-medium text-error">프로젝트 + 할일 모두 삭제</div>
                  <div className="text-sm text-base-content/60">
                    {linkedTodos.length > 0
                      ? `연결된 ${linkedTodos.length}개의 할일도 함께 삭제됩니다`
                      : '연결된 할일이 없습니다'}
                  </div>
                </div>
              </label>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-ghost rounded-full"
              >
                취소
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isLoading}
                className="btn btn-error rounded-full"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  '삭제'
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </dialog>
  );
}

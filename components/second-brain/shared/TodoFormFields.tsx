'use client';

import { Star, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import type { Project, Note } from '@/types/second-brain';

/**
 * 할일 폼 필드 타입
 * ProjectEditDialog와 InboxPage에서 공통 사용
 */
export interface TodoFormData {
  title: string;
  clarification?: string;
  nextActionStatuses?: string[]; // 다중 선택
  scheduledDate?: Date;
  isHighlight: boolean;
  completed: boolean;
  projectId?: string; // 연결된 프로젝트 ID
  noteId?: string; // 연결된 노트 ID
}

interface TodoFormFieldsProps {
  todo: TodoFormData;
  onChange: (updatedTodo: TodoFormData) => void;
  titlePlaceholder?: string;
  clarificationPlaceholder?: string;
  nextActionStatusPlaceholder?: string;
  projects?: Project[]; // 프로젝트 목록
  notes?: Note[]; // 노트 목록
  onCreateProject?: (title: string) => Promise<Project>; // 새 프로젝트 생성
  onCreateNote?: (title: string) => Promise<Note>; // 새 노트 생성
}

// 다음행동상황 옵션
const NEXT_ACTION_OPTIONS = [
  '창의성',
  '단순노동',
  'Low battery',
  '스마트폰',
  '컴퓨터',
  '집에서',
  '밖에서',
  '어디서나',
  '사무실',
  '나중에 보기',
];

/**
 * 할일 입력 폼 필드 (재사용 컴포넌트)
 * - 프로젝트 편집 모달의 할일 편집
 * - 수집 페이지의 할일 추가
 */
export default function TodoFormFields({
  todo,
  onChange,
  titlePlaceholder = '예: 요구사항 정리',
  clarificationPlaceholder = '할일에 대한 자세한 설명을 입력하세요',
  projects = [],
  notes = [],
  onCreateProject,
  onCreateNote,
}: TodoFormFieldsProps) {
  const [showProjectInput, setShowProjectInput] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [isCreatingNote, setIsCreatingNote] = useState(false);

  const handleCreateProject = async () => {
    if (!newProjectTitle.trim() || !onCreateProject) return;
    try {
      setIsCreatingProject(true);
      const project = await onCreateProject(newProjectTitle.trim());
      onChange({ ...todo, projectId: project.id });
      setNewProjectTitle('');
      setShowProjectInput(false);
    } catch (error) {
      console.error('프로젝트 생성 실패:', error);
    } finally {
      setIsCreatingProject(false);
    }
  };

  const handleCreateNote = async () => {
    if (!newNoteTitle.trim() || !onCreateNote) return;
    try {
      setIsCreatingNote(true);
      const note = await onCreateNote(newNoteTitle.trim());
      onChange({ ...todo, noteId: note.id });
      setNewNoteTitle('');
      setShowNoteInput(false);
    } catch (error) {
      console.error('노트 생성 실패:', error);
    } finally {
      setIsCreatingNote(false);
    }
  };

  const toggleNextActionStatus = (status: string) => {
    const currentStatuses = todo.nextActionStatuses || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];
    onChange({ ...todo, nextActionStatuses: newStatuses });
  };

  return (
    <>
      {/* 제목 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">제목</span>
        </label>
        <input
          type="text"
          value={todo.title}
          onChange={(e) => onChange({ ...todo, title: e.target.value })}
          className="input input-bordered"
          placeholder={titlePlaceholder}
        />
      </div>

      {/* 명료화 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">명료화 (선택)</span>
        </label>
        <select
          value={todo.clarification || ''}
          onChange={(e) => onChange({ ...todo, clarification: e.target.value })}
          className="select select-bordered w-full"
        >
          <option value="">선택 안 함</option>
          <option value="다시알림">다시알림</option>
          <option value="언젠가">언젠가</option>
          <option value="대기중">대기중</option>
          <option value="다음행동">다음행동</option>
          <option value="일정">일정</option>
        </select>
      </div>

      {/* 프로젝트 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">프로젝트 (선택)</span>
        </label>
        {!showProjectInput ? (
          <div className="flex gap-2">
            <select
              value={todo.projectId || ''}
              onChange={(e) => onChange({ ...todo, projectId: e.target.value })}
              className="select select-bordered flex-1"
            >
              <option value="">선택 안 함</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.title}
                </option>
              ))}
            </select>
            {onCreateProject && (
              <button
                onClick={() => setShowProjectInput(true)}
                className="btn btn-ghost btn-square"
                title="새 프로젝트"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              className="input input-bordered flex-1"
              placeholder="새 프로젝트 제목"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateProject();
                if (e.key === 'Escape') {
                  setShowProjectInput(false);
                  setNewProjectTitle('');
                }
              }}
            />
            <button
              onClick={handleCreateProject}
              className="btn btn-primary"
              disabled={!newProjectTitle.trim() || isCreatingProject}
            >
              {isCreatingProject ? <span className="loading loading-spinner loading-xs" /> : '생성'}
            </button>
            <button
              onClick={() => {
                setShowProjectInput(false);
                setNewProjectTitle('');
              }}
              className="btn btn-ghost"
            >
              취소
            </button>
          </div>
        )}
      </div>

      {/* 노트 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">노트 (선택)</span>
        </label>
        {!showNoteInput ? (
          <div className="flex gap-2">
            <select
              value={todo.noteId || ''}
              onChange={(e) => onChange({ ...todo, noteId: e.target.value })}
              className="select select-bordered flex-1"
            >
              <option value="">선택 안 함</option>
              {notes.map((note) => (
                <option key={note.id} value={note.id}>
                  {note.title}
                </option>
              ))}
            </select>
            {onCreateNote && (
              <button
                onClick={() => setShowNoteInput(true)}
                className="btn btn-ghost btn-square"
                title="새 노트"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              className="input input-bordered flex-1"
              placeholder="새 노트 제목"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateNote();
                if (e.key === 'Escape') {
                  setShowNoteInput(false);
                  setNewNoteTitle('');
                }
              }}
            />
            <button
              onClick={handleCreateNote}
              className="btn btn-primary"
              disabled={!newNoteTitle.trim() || isCreatingNote}
            >
              {isCreatingNote ? <span className="loading loading-spinner loading-xs" /> : '생성'}
            </button>
            <button
              onClick={() => {
                setShowNoteInput(false);
                setNewNoteTitle('');
              }}
              className="btn btn-ghost"
            >
              취소
            </button>
          </div>
        )}
      </div>

      {/* 다음행동상황 (다중 선택) */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">다음행동상황 (선택)</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {NEXT_ACTION_OPTIONS.map((option) => {
            const isSelected = todo.nextActionStatuses?.includes(option);
            return (
              <button
                key={option}
                onClick={() => toggleNextActionStatus(option)}
                className={`btn btn-sm ${isSelected ? 'bg-base-300' : 'btn-ghost'}`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      {/* 날짜 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">날짜 (선택)</span>
        </label>
        <input
          type="date"
          value={todo.scheduledDate ? format(todo.scheduledDate, 'yyyy-MM-dd') : ''}
          onChange={(e) =>
            onChange({
              ...todo,
              scheduledDate: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          className="input input-bordered"
        />
      </div>

      {/* 오늘의 하이라이트 */}
      <div className="form-control mb-4">
        <label className="cursor-pointer flex items-center gap-2">
          <input
            type="checkbox"
            checked={todo.isHighlight}
            onChange={(e) => onChange({ ...todo, isHighlight: e.target.checked })}
            className="checkbox"
          />
          <span className="label-text flex items-center gap-1">
            <Star className="w-4 h-4" />
            오늘의 하이라이트
          </span>
        </label>
      </div>

      {/* 완료 여부 */}
      <div className="form-control mb-6">
        <label className="cursor-pointer flex items-center gap-2">
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={(e) => onChange({ ...todo, completed: e.target.checked })}
            className="checkbox"
          />
          <span className="label-text">완료됨</span>
        </label>
      </div>
    </>
  );
}

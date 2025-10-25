'use client';

import { Star, Folder, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import type { Project, Note, UpdateProjectInput, UpdateNoteInput } from '@/types/second-brain';
import ProjectSelector from './ProjectSelector';
import NoteSelector from './NoteSelector';

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
  projectIds?: string[]; // 연결된 프로젝트 IDs (다중 선택)
  noteIds?: string[]; // 연결된 노트 IDs (다중 선택)
  displayOrder?: number; // 같은 날짜 내 표시 순서
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
  onUpdateProject?: (id: string, title: string) => Promise<void>; // 프로젝트 수정
  onDeleteProject?: (id: string) => Promise<void>; // 프로젝트 삭제
  onCreateNote?: (title: string) => Promise<Note>; // 새 노트 생성
  onUpdateNote?: (id: string, title: string) => Promise<void>; // 노트 수정
  onDeleteNote?: (id: string) => Promise<void>; // 노트 삭제
  // 섹션 표시 여부 제어 (기본값: true)
  showClarification?: boolean;
  showNextActionStatus?: boolean;
  showHighlight?: boolean;
  showCompleted?: boolean;
  showProjects?: boolean;
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
  onUpdateProject,
  onDeleteProject,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  showClarification = true,
  showNextActionStatus = true,
  showHighlight = true,
  showCompleted = true,
  showProjects = true,
}: TodoFormFieldsProps) {

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
      {showClarification && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">명료화</span>
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
      )}

      {/* 다음행동상황 (다중 선택) */}
      {showNextActionStatus && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">다음행동상황</span>
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
      )}

      {/* 날짜 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">날짜</span>
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
      {showHighlight && (
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
      )}

      {/* 완료 여부 */}
      {showCompleted && (
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
      )}

      {/* 프로젝트 추가 (다중 선택) - onCreateProject prop이 있고 showProjects가 true일 때만 표시 */}
      {onCreateProject && showProjects && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <Folder className="w-4 h-4" />
              프로젝트 추가
            </span>
          </label>
          <ProjectSelector
            selectedProjectIds={todo.projectIds || []}
            projects={projects}
            onProjectsChange={(projectIds) => onChange({ ...todo, projectIds })}
            onCreateProject={onCreateProject}
            onUpdateProject={onUpdateProject}
            onDeleteProject={onDeleteProject}
          />
        </div>
      )}

      {/* 노트 추가 (다중 선택) - onCreateNote prop이 있을 때만 표시 */}
      {onCreateNote && (
        <div className="form-control mb-6">
          <label className="label">
            <span className="label-text flex items-center gap-2">
              <StickyNote className="w-4 h-4" />
              노트 추가
            </span>
          </label>
          <NoteSelector
            selectedNoteIds={todo.noteIds || []}
            notes={notes}
            onNotesChange={(noteIds) => onChange({ ...todo, noteIds })}
            onCreateNote={onCreateNote}
            onUpdateNote={onUpdateNote}
            onDeleteNote={onDeleteNote}
          />
        </div>
      )}
    </>
  );
}

'use client';

import type { AreaResource as Area, AreaResource as Resource, Project } from '@/types/second-brain';
import type { Todo } from '@/types';

/**
 * 노트 폼 필드 타입
 * ProjectEditDialog와 InboxPage에서 공통 사용
 */
export interface NoteFormData {
  title: string;
  content: string;
  category: '중간 작업물' | '나중에 보기' | '레퍼런스';
  linkedAreaOrResource?: string; // 'area-{id}' 또는 'resource-{id}'
  isPinned: boolean;
  projectId?: string; // 프로젝트 연결 (선택)
  todoId?: string; // 할일 연결 (선택)
}

interface NoteFormFieldsProps {
  note: NoteFormData;
  onChange: (updatedNote: NoteFormData) => void;
  areas: Area[];
  resources: Resource[];
  projects?: Project[]; // 프로젝트 목록 (선택)
  todos?: Todo[]; // 할일 목록 (선택)
  titlePlaceholder?: string;
  contentPlaceholder?: string;
}

/**
 * 노트 입력 폼 필드 (재사용 컴포넌트)
 * - 프로젝트 편집 모달의 노트 편집
 * - 수집 페이지의 노트 추가
 */
export default function NoteFormFields({
  note,
  onChange,
  areas,
  resources,
  projects = [],
  todos = [],
  titlePlaceholder = '예: 회의 내용',
  contentPlaceholder = '노트 내용을 입력하세요',
}: NoteFormFieldsProps) {
  return (
    <>
      {/* 제목 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">제목</span>
        </label>
        <input
          type="text"
          value={note.title}
          onChange={(e) => onChange({ ...note, title: e.target.value })}
          className="input input-bordered"
          placeholder={titlePlaceholder}
        />
      </div>

      {/* 분류 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">분류</span>
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...note, category: '중간 작업물' })}
            className={`btn btn-sm flex-1 ${
              note.category === '중간 작업물' ? 'bg-base-300' : ''
            }`}
          >
            중간 작업물
          </button>
          <button
            onClick={() => onChange({ ...note, category: '나중에 보기' })}
            className={`btn btn-sm flex-1 ${
              note.category === '나중에 보기' ? 'bg-base-300' : ''
            }`}
          >
            나중에 보기
          </button>
          <button
            onClick={() => onChange({ ...note, category: '레퍼런스' })}
            className={`btn btn-sm flex-1 ${
              note.category === '레퍼런스' ? 'bg-base-300' : ''
            }`}
          >
            레퍼런스
          </button>
        </div>
      </div>

      {/* 영역/자원 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">영역/자원 (선택)</span>
        </label>
        <select
          value={note.linkedAreaOrResource || ''}
          onChange={(e) => onChange({ ...note, linkedAreaOrResource: e.target.value })}
          className="select select-bordered"
        >
          <option value="">선택 안 함</option>
          <optgroup label="영역">
            {areas.map((area) => (
              <option key={area.id} value={`area-${area.id}`}>
                {area.title}
              </option>
            ))}
          </optgroup>
          <optgroup label="자원">
            {resources.map((resource) => (
              <option key={resource.id} value={`resource-${resource.id}`}>
                {resource.title}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* 프로젝트 (선택) */}
      {projects.length > 0 && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">프로젝트 (선택)</span>
          </label>
          <select
            value={note.projectId || ''}
            onChange={(e) => onChange({ ...note, projectId: e.target.value })}
            className="select select-bordered"
          >
            <option value="">선택 안 함</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 할일 (선택) */}
      {todos.length > 0 && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">할일 (선택)</span>
          </label>
          <select
            value={note.todoId || ''}
            onChange={(e) => onChange({ ...note, todoId: e.target.value })}
            className="select select-bordered"
          >
            <option value="">선택 안 함</option>
            {todos.map((todo) => (
              <option key={todo.id} value={todo.id}>
                {todo.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* 고정하기 */}
      <div className="form-control mb-4">
        <label className="cursor-pointer flex items-center gap-2">
          <input
            type="checkbox"
            checked={note.isPinned}
            onChange={(e) => onChange({ ...note, isPinned: e.target.checked })}
            className="checkbox"
          />
          <span className="label-text">고정하기</span>
        </label>
      </div>

      {/* 내용 */}
      <div className="form-control mb-6">
        <label className="label">
          <span className="label-text">내용</span>
        </label>
        <textarea
          value={note.content}
          onChange={(e) => onChange({ ...note, content: e.target.value })}
          className="textarea textarea-bordered h-24"
          placeholder={contentPlaceholder}
        />
      </div>
    </>
  );
}

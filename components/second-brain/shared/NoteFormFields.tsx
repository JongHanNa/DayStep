'use client';

import type { AreaResource as Area, AreaResource as Resource, Project, NoteCategory, Note } from '@/types/second-brain';
import type { Todo } from '@/types';
import CollapsibleNoteSection from './CollapsibleNoteSection';

/**
 * 노트 폼 필드 타입
 * ProjectEditDialog와 InboxPage에서 공통 사용
 */
export interface NoteFormData {
  id?: string; // 노트 ID (편집 모드에서 사용)
  title: string;
  content: string;
  note_category: NoteCategory; // DB note_category 컬럼과 일치
  linkedAreaOrResource?: string; // 'area-{id}' 또는 'resource-{id}'
  isPinned: boolean;
  projectIds?: string[]; // 여러 프로젝트 연결 (N:N)
  todoIds?: string[]; // 여러 할일 연결 (N:N)
  noteIds?: string[]; // 여러 노트 연결 (N:N)
}

interface NoteFormFieldsProps {
  note: NoteFormData;
  onChange: (updatedNote: NoteFormData) => void;
  areas: Area[];
  resources: Resource[];
  projects?: Project[]; // 프로젝트 목록 (선택)
  todos?: Todo[]; // 할일 목록 (선택)
  notes?: Note[]; // 선택 가능한 노트 목록
  currentNoteId?: string; // 순환 참조 방지용 (현재 편집 중인 노트)
  onNoteClick?: (note: Note) => void; // 노트 클릭 시 모달 열기
  onCreateNote?: (title: string) => Promise<Note>; // 새 노트 생성
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  // 즉시 DB 저장을 위한 props
  noteId?: string;
  userId?: string;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
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
  notes = [],
  currentNoteId,
  onNoteClick,
  onCreateNote,
  titlePlaceholder = '예: 회의 내용',
  contentPlaceholder = '노트 내용을 입력하세요',
  noteId,
  userId,
  onNoteImmediateSave,
}: NoteFormFieldsProps) {
  // 순환 참조 방지: 현재 편집 중인 노트 제외
  const availableNotes = currentNoteId
    ? notes.filter(n => n.id !== currentNoteId)
    : notes;

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

      {/* 영역/자원 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">영역/자원</span>
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

      {/* 분류 */}
      <div className="form-control mb-4">
        <label className="label">
          <span className="label-text">분류</span>
        </label>
        <select
          value={note.note_category}
          onChange={(e) => onChange({ ...note, note_category: e.target.value as NoteCategory })}
          className="select select-bordered"
        >
          <option value="none">선택 안함</option>
          <option value="work_in_progress">중간 작업물</option>
          <option value="read_later">나중에 보기</option>
          <option value="reference">레퍼런스</option>
        </select>
      </div>

      {/* 프로젝트 (다중 선택) */}
      {projects.length > 0 && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">프로젝트</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {projects.map((project) => {
              const isSelected = note.projectIds?.includes(project.id);
              return (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => {
                    const currentIds = note.projectIds || [];
                    const newIds = isSelected
                      ? currentIds.filter(id => id !== project.id)
                      : [...currentIds, project.id];
                    onChange({ ...note, projectIds: newIds });
                  }}
                  className={`btn btn-sm ${isSelected ? 'bg-base-300' : 'btn-ghost'}`}
                >
                  {project.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 할일 (다중 선택) */}
      {todos.length > 0 && (
        <div className="form-control mb-4">
          <label className="label">
            <span className="label-text">할일</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {todos.map((todo) => {
              const isSelected = note.todoIds?.includes(todo.id);
              return (
                <button
                  key={todo.id}
                  type="button"
                  onClick={() => {
                    const currentIds = note.todoIds || [];
                    const newIds = isSelected
                      ? currentIds.filter(id => id !== todo.id)
                      : [...currentIds, todo.id];
                    onChange({ ...note, todoIds: newIds });
                  }}
                  className={`btn btn-sm ${isSelected ? 'bg-base-300' : 'btn-ghost'}`}
                >
                  {todo.title}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 연결된 노트 (다중 선택) - onCreateNote prop이 있을 때만 표시 */}
      {onCreateNote && (
        <CollapsibleNoteSection
          selectedNoteIds={note.noteIds || []}
          allNotes={availableNotes}
          onChange={(noteIds) => onChange({ ...note, noteIds })}
          onCreateNote={onCreateNote}
          onNoteClick={onNoteClick}
          todoColor="#808080"
          todoId={noteId}
          userId={userId}
          onImmediateSave={onNoteImmediateSave}
        />
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

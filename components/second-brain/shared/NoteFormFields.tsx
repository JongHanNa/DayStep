'use client';

import type { AreaResource as Area, AreaResource as Resource, Project, NoteCategory, Note } from '@/types/second-brain';
import type { Todo } from '@/types';
import { FileText, FolderTree, StickyNote, Star } from 'lucide-react';
import CollapsibleNoteSection from './CollapsibleNoteSection';
import CollapsibleTodoSection from './CollapsibleTodoSection';
import CollapsibleProjectSection from './CollapsibleProjectSection';
import MarkdownViewer from '@/components/notes/MarkdownViewer';

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
  onTodoClick?: (todo: Todo) => void; // 할일 클릭 시 모달 열기
  onProjectClick?: (project: Project) => void; // 프로젝트 클릭 시 모달 열기
  onCreateNote?: (title: string) => Promise<Note>; // 새 노트 생성
  onCreateTodo?: (title: string) => Promise<Todo>; // 새 할일 생성
  onCreateProject?: (title: string) => Promise<Project>; // 새 프로젝트 생성
  titlePlaceholder?: string;
  contentPlaceholder?: string;
  onContentClick?: () => void; // 내용 클릭 시 편집 모달 열기
  // 즉시 DB 저장을 위한 props
  noteId?: string;
  userId?: string;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
  onTodoImmediateSave?: (todoIds: string[]) => Promise<void>;
  onProjectImmediateSave?: (projectIds: string[]) => Promise<void>;
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
  onTodoClick,
  onProjectClick,
  onCreateNote,
  onCreateTodo,
  onCreateProject,
  titlePlaceholder = '예: 회의 내용',
  contentPlaceholder = '노트 내용을 입력하세요...',
  onContentClick,
  noteId,
  userId,
  onNoteImmediateSave,
  onTodoImmediateSave,
  onProjectImmediateSave,
}: NoteFormFieldsProps) {
  // 순환 참조 방지: 현재 편집 중인 노트 제외
  const availableNotes = currentNoteId
    ? notes.filter(n => n.id !== currentNoteId)
    : notes;

  return (
    <>
      {/* 제목 */}
      <div className="my-4">
        <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
          <StickyNote className="h-5 w-5" style={{ color: '#808080' }} />
          제목
        </label>

        <div className="rounded-lg bg-base-200 overflow-hidden" style={{ paddingTop: '0px' }}>
          {/* 제목 입력 - iOS WebView scale 문제 해결 */}
          <div className="input-scale-wrapper" style={{
            transform: 'scale(1.6)',
            transformOrigin: 'left bottom',
            WebkitTransform: 'scale(1.6)',
            WebkitTransformOrigin: 'left bottom',
            width: '62.5%',
            height: '44px',
            position: 'relative'
          }}>
            <input
              type="text"
              value={note.title}
              onChange={(e) => onChange({ ...note, title: e.target.value })}
              placeholder={titlePlaceholder}
              className="bg-base-200 border-0 border-b-2 border-base-300 rounded-none focus:outline-none transition-none text-base-content"
              style={{
                fontSize: '20px',
                outline: 'none',
                boxShadow: 'none',
                fontWeight: '600',
                height: '44px',
                lineHeight: '0.9',
                paddingTop: '16px',
                paddingBottom: '0px',
                width: '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* 영역/자원 */}
      <div className="my-4">
        <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
          <FolderTree className="h-5 w-5" style={{ color: '#808080' }} />
          영역/자원
        </label>

        <select
          value={note.linkedAreaOrResource || ''}
          onChange={(e) => onChange({ ...note, linkedAreaOrResource: e.target.value })}
          className="select select-bordered w-full bg-base-100"
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
      <div className="my-4">
        <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
          <FileText className="h-5 w-5" style={{ color: '#808080' }} />
          분류
        </label>

        <select
          value={note.note_category}
          onChange={(e) => onChange({ ...note, note_category: e.target.value as NoteCategory })}
          className="select select-bordered w-full bg-base-100"
        >
          <option value="none">선택 안함</option>
          <option value="read_later">나중에 보기 - 시간이 붕뜨는데 뭘 해야할지 모를 때</option>
          <option value="work_in_progress">중간 작업물 - 내가 작성하던 중간 작업물, 최근에 작업했던 노트</option>
          <option value="reference">레퍼런스 - 자주 찾아보는 정보나 나중에 참고할 자료나 링크</option>
        </select>
      </div>

      {/* 내용 (프리뷰 - 클릭 시 편집 모달) */}
      <div className="my-4">
        <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
          <FileText className="h-5 w-5" style={{ color: '#808080' }} />
          내용
        </label>

        <div
          className="p-3 rounded-lg bg-base-100 border border-base-300 cursor-pointer hover:bg-base-300 transition-colors min-h-[100px]"
          onClick={onContentClick}
        >
          {note.content ? (
            <MarkdownViewer content={note.content} className="prose prose-sm max-w-none" />
          ) : (
            <p className="text-gray-400">내용 추가..</p>
          )}
        </div>
      </div>

      {/* 프로젝트 (다중 선택) - onCreateProject prop이 있을 때만 표시 */}
      {onCreateProject && projects.length > 0 && (
        <CollapsibleProjectSection
          selectedProjectIds={note.projectIds || []}
          allProjects={projects}
          onChange={(projectIds) => onChange({ ...note, projectIds })}
          onCreateProject={onCreateProject}
          onProjectClick={onProjectClick}
          todoColor="#808080"
          todoId={noteId}
          userId={userId}
          onImmediateSave={onProjectImmediateSave}
        />
      )}

      {/* 할일 (다중 선택) */}
      <CollapsibleTodoSection
        selectedTodoIds={note.todoIds || []}
        allTodos={todos}
        onChange={(todoIds) => onChange({ ...note, todoIds })}
        noteColor="#808080"
        noteId={noteId}
        userId={userId}
        onCreateTodo={onCreateTodo}
        onTodoClick={onTodoClick}
        onImmediateSave={onTodoImmediateSave}
      />

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
      <div className="my-4">
        <div className="p-3 rounded-lg bg-base-100">
          <label className="cursor-pointer flex items-center justify-between">
            <span className="label-text flex items-center gap-2">
              <Star className="w-4 h-4" />
              고정하기
            </span>
            <input
              type="checkbox"
              checked={note.isPinned}
              onChange={(e) => onChange({ ...note, isPinned: e.target.checked })}
              className="toggle toggle-primary"
            />
          </label>
        </div>
      </div>
    </>
  );
}

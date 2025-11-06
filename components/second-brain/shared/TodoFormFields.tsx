'use client';

import { useState } from 'react';
import { Star, Folder, StickyNote, Tag, Calendar, CheckCircle2, Sparkles, Clock, Target, Palette } from 'lucide-react';
import { format } from 'date-fns';
import type { Project, Note, UpdateProjectInput, UpdateNoteInput } from '@/types/second-brain';
import ProjectSelector from './ProjectSelector';
import NoteSelector from './NoteSelector';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';

/**
 * 할일 폼 필드 타입
 * ProjectEditDialog와 InboxPage에서 공통 사용
 */
export interface TodoFormData {
  title: string;
  icon?: string; // 아이콘 키 (UnifiedIconKey)
  color?: string; // 색상 hex 값
  clarification?: string;
  nextActionStatuses?: string[]; // 다중 선택
  scheduledDate?: Date;
  isHighlight: boolean;
  completed: boolean;
  projectIds?: string[]; // 연결된 프로젝트 IDs (다중 선택)
  noteIds?: string[]; // 연결된 노트 IDs (다중 선택)
  displayOrder?: number; // 같은 날짜 내 표시 순서

  // 시간 관련 필드
  includeTime?: boolean; // 시간 포함 여부
  includeEndDate?: boolean; // 종료일 포함 여부
  startTime?: string; // 시작 시간 (HH:mm 형식)
  endDate?: Date; // 종료 날짜
  endTime?: string; // 종료 시간 (HH:mm 형식)
}

interface TodoFormFieldsProps {
  todo: TodoFormData;
  onChange: (updatedTodo: TodoFormData) => void;
  titlePlaceholder?: string;
  clarificationPlaceholder?: string;
  nextActionStatusPlaceholder?: string;
  projects?: Project[]; // 프로젝트 목록
  notes?: Note[]; // 노트 목록
  onNoteClick?: (note: Note) => void; // 노트 클릭 핸들러 (편집 모달 열기)
  onCreateProject?: (title: string) => Promise<Project>; // 새 프로젝트 생성
  onUpdateProject?: (id: string, title: string) => Promise<void>; // 프로젝트 수정
  onDeleteProject?: (id: string) => Promise<void>; // 프로젝트 삭제
  onCreateNote?: (title: string) => Promise<Note>; // 새 노트 생성
  onUpdateNote?: (id: string, title: string) => Promise<void>; // 노트 수정
  onDeleteNote?: (id: string) => Promise<void>; // 노트 삭제
  // 섹션 표시 여부 제어 (기본값: true)
  showClarification?: boolean;
  showNextActionStatus?: boolean;
  showScheduledDate?: boolean;
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
  onNoteClick,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  showClarification = true,
  showNextActionStatus = true,
  showScheduledDate = true,
  showHighlight = true,
  showCompleted = true,
  showProjects = true,
}: TodoFormFieldsProps) {
  // 아이콘 브라우저 모달
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

  // 아이콘 변경
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    onChange({ ...todo, icon: iconKey });
  };

  // 색상 변경
  const handleColorChange = (colorId: string) => {
    const color = getColorById(colorId).hex;
    onChange({ ...todo, color });
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
      {/* 아이콘 및 제목 - 통합 섹션 */}
      <div className="my-4">
        <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
          <Tag className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
          아이콘 및 제목
        </label>

        <div className="p-3 rounded-lg bg-base-200 border border-base-300">
          <div className="flex items-center gap-3">
            {/* 아이콘 버튼 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIconBrowserOpen(true)}
                className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group"
                style={{ backgroundColor: '#f3f4f6' }}
                title="아이콘 변경하기"
              >
                {(() => {
                  const IconComponent = getUnifiedIcon((todo.icon || 'CheckSquare') as UnifiedIconKey);
                  return <IconComponent
                    className="group-hover:scale-110 transition-transform"
                    style={{ color: todo.color || '#808080' }}
                    size={24}
                  />;
                })()}
              </button>

              {/* 색상 인디케이터 */}
              <div
                className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                style={{
                  backgroundColor: todo.color || '#808080',
                  border: '2px solid white'
                }}
              >
                <Palette className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>
            </div>

            {/* 제목 입력 */}
            <input
              type="text"
              value={todo.title}
              onChange={(e) => onChange({ ...todo, title: e.target.value })}
              placeholder={titlePlaceholder}
              className="flex-1 bg-base-100 border-0 border-b-2 rounded-none focus:outline-none transition-none"
              style={{
                fontSize: '20px',
                color: '#333333',
                borderBottomColor: '#D1D5DB',
                outline: 'none',
                boxShadow: 'none',
                fontWeight: '600',
                height: '44px',
              }}
              required
            />
          </div>
        </div>
      </div>

      {/* 명료화 */}
      {showClarification && (
        <div className="my-4">
          <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
            <Target className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
            명료화
          </label>

          <div className="p-3 rounded-lg bg-base-200 border border-base-300">
            <select
              value={todo.clarification || ''}
              onChange={(e) => onChange({ ...todo, clarification: e.target.value })}
              className="select select-bordered w-full"
            >
              <option value="">선택 안 함</option>
              <option value="reminder">다시알림</option>
              <option value="someday">언젠가</option>
              <option value="waiting">대기중</option>
              <option value="next_action">다음행동</option>
              <option value="scheduled">일정</option>
            </select>
          </div>
        </div>
      )}

      {/* 다음행동상황 (다중 선택) */}
      {showNextActionStatus && todo.clarification === 'next_action' && (
        <div className="my-4">
          <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
            <Sparkles className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
            다음행동상황
          </label>

          <div className="p-3 rounded-lg bg-base-200 border border-base-300">
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
        </div>
      )}

      {/* 날짜 */}
      {showScheduledDate && (todo.clarification === 'reminder' || todo.clarification === 'scheduled') && (
        <>
          {/* 시작 날짜 */}
          <div className="my-4">
            <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
              <Calendar className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
              날짜
            </label>

            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <input
                type="date"
                value={todo.scheduledDate ? format(todo.scheduledDate, 'yyyy-MM-dd') : ''}
                onChange={(e) =>
                  onChange({
                    ...todo,
                    scheduledDate: e.target.value ? new Date(e.target.value) : undefined,
                  })
                }
                className="input input-bordered w-full"
              />
            </div>
          </div>

          {/* 시작 시간 (시간 포함 ON일 때만) */}
          {todo.includeTime && (
            <div className="my-4">
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Clock className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
                시작 시간
              </label>

              <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                <input
                  type="time"
                  value={todo.startTime || '09:00'}
                  onChange={(e) => onChange({ ...todo, startTime: e.target.value })}
                  className="input input-bordered w-full"
                />
              </div>
            </div>
          )}

          {/* 종료일 (종료일 토글 ON일 때만) */}
          {todo.includeEndDate && (
            <>
              <div className="my-4">
                <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                  <Calendar className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
                  종료 날짜
                </label>

                <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                  <input
                    type="date"
                    value={todo.endDate ? format(todo.endDate, 'yyyy-MM-dd') : ''}
                    onChange={(e) =>
                      onChange({
                        ...todo,
                        endDate: e.target.value ? new Date(e.target.value) : undefined,
                      })
                    }
                    className="input input-bordered w-full"
                  />
                </div>
              </div>

              {/* 종료 시간 (종료일 ON + 시간 포함 ON일 때만) */}
              {todo.includeTime && (
                <div className="my-4">
                  <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                    <Clock className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
                    종료 시간
                  </label>

                  <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                    <input
                      type="time"
                      value={todo.endTime || '18:00'}
                      onChange={(e) => onChange({ ...todo, endTime: e.target.value })}
                      className="input input-bordered w-full"
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* 종료일 토글 */}
          <div className="my-4">
            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <label className="cursor-pointer flex items-center justify-between">
                <span className="label-text">종료일</span>
                <input
                  type="checkbox"
                  checked={todo.includeEndDate || false}
                  onChange={(e) => onChange({ ...todo, includeEndDate: e.target.checked })}
                  className="toggle toggle-primary"
                />
              </label>
            </div>
          </div>

          {/* 시간 포함 토글 */}
          <div className="my-4">
            <div className="p-3 rounded-lg bg-base-200 border border-base-300">
              <label className="cursor-pointer flex items-center justify-between">
                <span className="label-text">시간 포함</span>
                <input
                  type="checkbox"
                  checked={todo.includeTime || false}
                  onChange={(e) => onChange({ ...todo, includeTime: e.target.checked })}
                  className="toggle toggle-primary"
                />
              </label>
            </div>
          </div>
        </>
      )}

      {/* 오늘의 하이라이트 */}
      {showHighlight && (
        <div className="my-4">
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
        <div className="my-4">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={(e) => onChange({ ...todo, completed: e.target.checked })}
              className="checkbox"
            />
            <span className="label-text flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              완료됨
            </span>
          </label>
        </div>
      )}

      {/* 프로젝트 추가 (다중 선택) - onCreateProject prop이 있고 showProjects가 true일 때만 표시 */}
      {onCreateProject && showProjects && (
        <div className="my-4">
          <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
            <Folder className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
            프로젝트 추가
          </label>

          <div className="p-3 rounded-lg bg-base-200 border border-base-300">
            <ProjectSelector
              selectedProjectIds={todo.projectIds || []}
              projects={projects}
              onProjectsChange={(projectIds) => onChange({ ...todo, projectIds })}
              onCreateProject={onCreateProject}
              onUpdateProject={onUpdateProject}
              onDeleteProject={onDeleteProject}
            />
          </div>
        </div>
      )}

      {/* 노트 추가 (다중 선택) - onCreateNote prop이 있을 때만 표시 */}
      {onCreateNote && (
        <div className="my-4">
          <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
            <StickyNote className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
            노트 추가
          </label>

          <div className="p-3 rounded-lg bg-base-200 border border-base-300">
            <NoteSelector
              selectedNoteIds={todo.noteIds || []}
              notes={notes}
              onNotesChange={(noteIds) => onChange({ ...todo, noteIds })}
              onNoteClick={onNoteClick}
              onCreateNote={onCreateNote}
              onDeleteNote={onDeleteNote}
            />
          </div>
        </div>
      )}

      {/* 아이콘 브라우저 모달 */}
      <EnhancedIconBrowserModal
        open={iconBrowserOpen}
        onClose={() => setIconBrowserOpen(false)}
        onIconSelect={handleIconChange}
        selectedIcon={todo.icon}
        selectedColor={todo.color}
        onColorSelect={handleColorChange}
      />
    </>
  );
}

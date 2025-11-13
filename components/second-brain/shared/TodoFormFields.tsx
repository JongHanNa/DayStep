'use client';

import { useState } from 'react';
import { Star, Folder, StickyNote, Tag, Calendar, CheckCircle2, Sparkles, Clock, Target, Palette, X } from 'lucide-react';
import { format } from 'date-fns';
import type { Project, Note, UpdateProjectInput, UpdateNoteInput } from '@/types/second-brain';
import type { RecurrencePattern } from '@/types';
import CollapsibleProjectSection from './CollapsibleProjectSection';
import CollapsibleNoteSection from './CollapsibleNoteSection';
import CollapsibleNextActionSection from './CollapsibleNextActionSection';
import RecurrenceSettings from '@/components/todos/form/RecurrenceSettings';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { ScrollDurationPicker } from '@/components/ui/scroll-duration-picker';

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

  // 일정 유형 관련
  scheduleType?: 'all_day' | 'anytime' | 'timed' | 'none';
  anytimeDuration?: number; // 예상 소요 시간 (분 단위)

  // 반복 설정 관련
  recurrencePattern?: string; // 반복 패턴
  recurrenceInterval?: number; // 반복 간격
  recurrenceEndType?: 'never' | 'date' | 'count'; // 반복 종료 유형
  recurrenceEndDate?: Date; // 반복 종료 날짜
  recurrenceCount?: number; // 반복 횟수
  selectedDaysOfWeek?: number[]; // 반복 요일 선택 (0=일요일, 6=토요일)
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
  // 즉시 DB 저장을 위한 props
  todoId?: string;
  userId?: string;
  onProjectImmediateSave?: (projectIds: string[]) => Promise<void>;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
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
  todoId,
  userId,
  onProjectImmediateSave,
  onNoteImmediateSave,
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
              onChange={(e) => {
                const clarification = e.target.value;
                const updates: any = { clarification };

                // 일정으로 선택 시 scheduleType 자동 초기화
                if (clarification === 'schedule_clear') {
                  if (!todo.scheduleType || todo.scheduleType === 'none') {
                    updates.scheduleType = 'anytime';
                    updates.scheduledDate = new Date(); // 오늘 날짜
                    updates.includeEndDate = false;
                    updates.includeTime = false;
                  }
                }

                onChange({ ...todo, ...updates });
              }}
              className="select select-bordered w-full"
            >
              <option value="">선택 안 함(수집함으로 이동됨)</option>
              {/* 임시 숨김: 다시알림 옵션
              <option value="reminder">⏰ 다시알림 · 특정 날짜 또는 시간에 알림 (시간 설정 시 수집함에서 사라짐)</option>
              */}
              <option value="someday">⏳ 언젠가 · 당장은 실행할 수 없음 (즉시 수집함에서 사라짐)</option>
              <option value="waiting">⏸️ 대기중 · 타인에게 위임, 응답 대기 중. 당장은 날짜나 시간을 넣기에 불명확하지만 나중에 계획 페이지에서 날짜를 지정해줄 수 있음 (즉시 수집함에서 사라짐)</option>
              <option value="next_action">⚡ 다음행동 · 특정 행동상황이 되면 할 일. 당장은 날짜나 시간을 넣기에 불명확하지만 나중에 계획 페이지에서 날짜를 지정해줄 수 있음 (다음행동상황 선택 시 수집함에서 사라짐)</option>
              <option value="schedule_clear">📅 일정 · 당장 날짜나 시간을 넣기에 명확한 할일 (날짜 설정 시 수집함에서 사라짐)</option>
            </select>
          </div>
        </div>
      )}

      {/* 일정 유형 */}
      {showScheduledDate && (todo.clarification === 'reminder' || todo.clarification === 'schedule_clear') && (
        <div className="my-4">
          <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
            <Calendar className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
            일정 유형
          </label>

          <div className="p-3 rounded-lg bg-base-200 border border-base-300">
            <select
              value={todo.scheduleType || 'anytime'}
              onChange={(e) => {
                const scheduleType = e.target.value as 'anytime' | 'timed' | 'all_day' | 'none';
                const updates: any = { scheduleType };

                // 자동 세팅
                if (scheduleType === 'anytime' || scheduleType === 'all_day') {
                  updates.scheduledDate = new Date(); // 오늘
                  updates.includeEndDate = false;
                  updates.includeTime = false;
                } else if (scheduleType === 'timed') {
                  updates.scheduledDate = new Date(); // 오늘
                  updates.includeTime = true;
                  const now = new Date();
                  updates.startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                } else if (scheduleType === 'none') {
                  // 선택 안함: 날짜/시간 정보 초기화
                  updates.scheduledDate = undefined;
                  updates.includeEndDate = false;
                  updates.includeTime = false;
                  updates.startTime = undefined;
                  updates.endDate = undefined;
                  updates.endTime = undefined;
                }

                onChange({ ...todo, ...updates });
              }}
              className="select select-bordered w-full"
            >
              {todo.clarification !== 'schedule_clear' && (
                <option value="none">📝 선택 안함 · 일정 없음</option>
              )}
              <option value="anytime">⏰ 언제든지 · 특정 날짜에 타임라인에서 언제든지 바로 시작하거나 추후 계획 페이지에서 시간 지정해서 사용 가능(이때 시간 지정하면 일정유형이 시간지정으로 변경됨)</option>
              <option value="timed">🕐 시간지정 · 특정 시간에 시작</option>
              <option value="all_day">📅 종일 · 하루 종일</option>
            </select>
          </div>
        </div>
      )}

      {/* 다음행동상황 (다중 선택) */}
      {showNextActionStatus && todo.clarification === 'next_action' && (
        <div>
          {/* 선택된 항목 뱃지 표시 */}
          {todo.nextActionStatuses && todo.nextActionStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {todo.nextActionStatuses.map(status => (
                <div
                  key={status}
                  className="badge gap-2"
                  style={{
                    backgroundColor: todo.color || '#808080',
                    color: '#ffffff',
                    border: 'none'
                  }}
                >
                  {status}
                  <button
                    type="button"
                    onClick={() => toggleNextActionStatus(status)}
                    className="hover:opacity-70 rounded-full p-0.5 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* CollapsibleNextActionSection 컴포넌트 */}
          <CollapsibleNextActionSection
            selectedStatuses={todo.nextActionStatuses || []}
            onChange={(statuses) => onChange({ ...todo, nextActionStatuses: statuses })}
            options={NEXT_ACTION_OPTIONS}
            todoColor={todo.color || '#808080'}
          />
        </div>
      )}

      {/* 날짜 */}
      {showScheduledDate && (todo.clarification === 'reminder' || todo.clarification === 'schedule_clear') && todo.scheduleType !== 'none' && (
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
                    scheduledDate: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined,
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

          {/* 종료일 토글 - 언제든지/종일일 때 숨김 */}
          {todo.scheduleType && todo.scheduleType !== 'anytime' && todo.scheduleType !== 'all_day' && (
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
          )}

          {/* 시간 포함 토글 */}
          {todo.scheduleType === 'timed' ? (
            // 시간지정일 때는 강제 활성화 (비활성화 불가)
            <div className="my-4">
              <div className="p-3 rounded-lg bg-base-200 border border-base-300 opacity-50">
                <label className="cursor-not-allowed flex items-center justify-between">
                  <span className="label-text">시간 포함 (자동)</span>
                  <input
                    type="checkbox"
                    checked={true}
                    disabled
                    className="toggle toggle-primary"
                  />
                </label>
              </div>
            </div>
          ) : todo.scheduleType && todo.scheduleType !== 'anytime' && todo.scheduleType !== 'all_day' && (
            // 언제든지/종일이 아닐 때만 표시
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
          )}

          {/* 예상 소요 시간 (언제든지일 때만) */}
          {(!todo.scheduleType || todo.scheduleType === 'anytime') && (
            <div className="my-4">
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Clock className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
                예상 소요 시간
              </label>

              <div className="p-3 rounded-lg bg-base-200 border border-base-300">
                <ScrollDurationPicker
                  selectedHours={Math.floor((todo.anytimeDuration ?? 30) / 60)}
                  selectedMinutes={(todo.anytimeDuration ?? 30) % 60}
                  onDurationChange={(hours, minutes) => {
                    onChange({ ...todo, anytimeDuration: hours * 60 + minutes });
                  }}
                  accentColor={todo.color}
                  className="py-2"
                />
              </div>
            </div>
          )}

          {/* 반복 설정 */}
          <RecurrenceSettings
            showRecurrenceSettings={true}
            recurrencePattern={(todo.recurrencePattern as RecurrencePattern) || 'none'}
            recurrenceInterval={todo.recurrenceInterval || 1}
            recurrenceEndDate={todo.recurrenceEndDate ? format(todo.recurrenceEndDate, 'yyyy-MM-dd') : ''}
            recurrenceCount={todo.recurrenceCount}
            recurrenceEndType={todo.recurrenceEndType || 'never'}
            selectedDaysOfWeek={todo.selectedDaysOfWeek || []}
            onRecurrencePatternChange={(pattern) => onChange({ ...todo, recurrencePattern: pattern })}
            onRecurrenceIntervalChange={(interval) => onChange({ ...todo, recurrenceInterval: interval })}
            onRecurrenceEndDateChange={(date) => onChange({ ...todo, recurrenceEndDate: date ? new Date(date) : undefined })}
            onRecurrenceCountChange={(count) => onChange({ ...todo, recurrenceCount: count })}
            onRecurrenceEndTypeChange={(type) => onChange({ ...todo, recurrenceEndType: type })}
            onDayOfWeekToggle={(day) => {
              const currentDays = todo.selectedDaysOfWeek || [];
              if (currentDays.includes(day)) {
                // 이미 선택된 요일이면 제거
                onChange({ ...todo, selectedDaysOfWeek: currentDays.filter(d => d !== day) });
              } else {
                // 선택되지 않은 요일이면 추가하고 정렬
                onChange({ ...todo, selectedDaysOfWeek: [...currentDays, day].sort() });
              }
            }}
            selectedColor={todo.color}
          />
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
        <CollapsibleProjectSection
          selectedProjectIds={todo.projectIds || []}
          allProjects={projects}
          onChange={(projectIds) => onChange({ ...todo, projectIds })}
          onCreateProject={onCreateProject}
          todoColor={todo.color}
          todoId={todoId}
          userId={userId}
          onImmediateSave={onProjectImmediateSave}
        />
      )}

      {/* 노트 추가 (다중 선택) - onCreateNote prop이 있을 때만 표시 */}
      {onCreateNote && (
        <CollapsibleNoteSection
          selectedNoteIds={todo.noteIds || []}
          allNotes={notes}
          onChange={(noteIds) => onChange({ ...todo, noteIds })}
          onCreateNote={onCreateNote}
          onNoteClick={onNoteClick}
          todoColor={todo.color}
          todoId={todoId}
          userId={userId}
          onImmediateSave={onNoteImmediateSave}
        />
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, StickyNote, Tag, Calendar, CheckCircle2, Sparkles, Clock, Target, Palette, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Note } from '@/types/second-brain';
import type { RecurrencePattern } from '@/types';
import CollapsibleNoteSection from './CollapsibleNoteSection';
import RecurrenceSettings from '@/components/todos/form/RecurrenceSettings';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { ScrollDurationPicker } from '@/components/ui/scroll-duration-picker';
import { useTypingEffect } from '@/hooks/useTypingEffect';
import { PersonSelector } from '@/components/cherished/PersonSelector';

/**
 * 할일 폼 필드 타입
 * ProjectEditDialog와 InboxPage에서 공통 사용
 */
export interface TodoFormData {
  title: string;
  icon?: string; // 아이콘 키 (UnifiedIconKey)
  color?: string; // 색상 hex 값
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

  // 반복 할일 원본 정보
  originalStartDate?: Date; // 할일 원본 시작 날짜 (반복 할일 편집 시 표시용)
  isRecurrenceInstance?: boolean; // 반복 인스턴스 여부 (날짜 잠금용)

  // 관계 균형 관련
  isRelationshipTask?: boolean; // 관계 할일 여부

  // 소중한 사람 연결 필드
  joyfulPeopleIds?: string[];
  shamefulPeopleIds?: string[];
}

interface TodoFormFieldsProps {
  todo: TodoFormData;
  onChange: (updatedTodo: TodoFormData) => void;
  titlePlaceholder?: string;
  notes?: Note[]; // 노트 목록
  onNoteClick?: (note: Note) => void; // 노트 클릭 핸들러 (편집 모달 열기)
  onCreateNote?: (title: string) => Promise<Note>; // 새 노트 생성
  onUpdateNote?: (id: string, title: string) => Promise<void>; // 노트 수정
  onDeleteNote?: (id: string) => Promise<void>; // 노트 삭제
  // 섹션 표시 여부 제어 (기본값: true)
  showScheduledDate?: boolean;
  showHighlight?: boolean;
  showCompleted?: boolean;
  // 즉시 DB 저장을 위한 props
  todoId?: string;
  userId?: string;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
}

/**
 * 할일 입력 폼 필드 (재사용 컴포넌트)
 * - 프로젝트 편집 모달의 할일 편집
 * - 수집 페이지의 할일 추가
 */
export default function TodoFormFields({
  todo,
  onChange,
  titlePlaceholder = '예: 요구사항 정리',
  notes = [],
  onNoteClick,
  onCreateNote,
  onUpdateNote,
  onDeleteNote,
  showScheduledDate = true,
  showHighlight = true,
  showCompleted = true,
  todoId,
  userId,
  onNoteImmediateSave,
}: TodoFormFieldsProps) {
  // 타이핑 효과를 위한 플레이스홀더 텍스트
  const placeholderTexts = [
    "예: 요구사항 정리",
    "예: 미팅 일정 잡기",
    "예: 보고서 작성하기",
    "예: 고객 문의 답변"
  ];

  const typingPlaceholder = useTypingEffect({
    texts: placeholderTexts,
    speed: 80,
    deleteSpeed: 40,
    delayBetweenTexts: 2000,
    loop: true
  });

  // 시간 문자열을 분 단위로 변환
  const timeToMinutes = useCallback((time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  // 시간 간격 검증 (최대 23시간 59분 = 1439분)
  const validateTimeGap = useCallback((startTime: string, endTime: string): boolean => {
    const startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);

    // 종료 시간이 시작 시간보다 작으면 다음날로 계산
    if (endMinutes < startMinutes) {
      endMinutes += 24 * 60; // 1440분 추가
    }

    const gap = endMinutes - startMinutes;
    return gap <= 23 * 60 + 59; // 1439분 이하
  }, [timeToMinutes]);

  // 시작 시간 변경 핸들러 (간격 검증 포함)
  const handleStartTimeChange = useCallback((newStartTime: string) => {
    // 반복 인스턴스이고 종료 시간이 있는 경우 간격 검증
    if (todo.isRecurrenceInstance && todo.endTime) {
      if (!validateTimeGap(newStartTime, todo.endTime)) {
        toast.error('시작~종료 시간 간격은 최대 23시간 59분입니다');
        return; // 변경 취소
      }
    }
    onChange({ ...todo, startTime: newStartTime });
  }, [todo, onChange, validateTimeGap]);

  // 종료 시간 변경 핸들러 (간격 검증 포함)
  const handleEndTimeChange = useCallback((newEndTime: string) => {
    // 반복 인스턴스이고 시작 시간이 있는 경우 간격 검증
    if (todo.isRecurrenceInstance && todo.startTime) {
      if (!validateTimeGap(todo.startTime, newEndTime)) {
        toast.error('시작~종료 시간 간격은 최대 23시간 59분입니다');
        return; // 변경 취소
      }
    }
    onChange({ ...todo, endTime: newEndTime });
  }, [todo, onChange, validateTimeGap]);

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

  return (
    <>
      {/* 아이콘 및 제목 - 통합 섹션 */}
      <div className="my-2">
        <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#808080' }}>
          <Tag className="h-5 w-5" style={{ color: todo.color || '#DBAC6C' }} />
          아이콘 및 제목
        </label>

        <div className="rounded-lg bg-base-200 overflow-visible">
          <div className="flex items-center gap-3 pl-0 pr-16 pt-2 pb-3">
            {/* 아이콘 버튼 */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIconBrowserOpen(true)}
                className="flex items-center justify-center w-12 h-12 rounded-lg hover:opacity-80 transition-opacity cursor-pointer group bg-base-100"
                title="아이콘 변경하기"
              >
                {(() => {
                  const IconComponent = getUnifiedIcon((todo.icon || 'CheckSquare') as UnifiedIconKey);
                  return <IconComponent
                    className="group-hover:scale-110 transition-transform"
                    style={{ color: todo.color || '#DBAC6C' }}
                    size={24}
                  />;
                })()}
              </button>

              {/* 색상 인디케이터 */}
              <div
                className="absolute -bottom-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center shadow-md"
                style={{
                  backgroundColor: todo.color || '#DBAC6C',
                  border: '2px solid white'
                }}
              >
                <Palette className="w-3 h-3 text-white" strokeWidth={2.5} />
              </div>
            </div>

            {/* 제목 입력 - iOS WebView scale 문제 해결 */}
            <div className="flex-1">
              <div className="input-scale-wrapper" style={{
                transform: 'scale(1.6)',
                transformOrigin: 'left bottom',
                WebkitTransform: 'scale(1.6)',
                WebkitTransformOrigin: 'left bottom',
                width: '80%',
                height: '44px',
                position: 'relative'
              }}>
                <input
                  type="text"
                  value={todo.title}
                  onChange={(e) => onChange({ ...todo, title: e.target.value })}
                  placeholder={typingPlaceholder}
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
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 반복 할일 원본 날짜 (일정 섹션 상단, 반복 할일 편집 시에만) */}
      {todo.originalStartDate && todo.recurrencePattern && todo.recurrencePattern !== 'none' && (
        <div className="my-4">
          <div className="p-3 rounded-lg bg-info/10 border border-info/20">
            <span className="text-sm text-info flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              원본 일정 날짜: {format(todo.originalStartDate, 'yyyy년 M월 d일')}
            </span>
          </div>
        </div>
      )}

      {/* 일정 유형 */}
      {showScheduledDate && (
        <div className="my-4">
          <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
            <Calendar className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
            일정 유형
          </label>

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
                updates.includeEndDate = true; // 종료일 토글 활성화
                updates.endDate = new Date(); // 오늘 날짜로 기본 설정
                const now = new Date();
                updates.startTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                // 종료 시간은 시작 시간 + 30분
                const endMinutes = now.getMinutes() + 30;
                const endHour = endMinutes >= 60 ? (now.getHours() + 1) % 24 : now.getHours();
                const endMin = endMinutes % 60;
                updates.endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
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
            className="select select-bordered w-full bg-base-100"
          >
            <option value="none">📝 선택 안함 · 일정 없음</option>
            <option value="anytime">⏰ 언제든지 · 특정 날짜에 타임라인에서 언제든지 바로 시작하거나 추후 계획 페이지에서 시간 지정해서 사용 가능(이때 시간 지정하면 일정유형이 시간지정으로 변경됨)</option>
            <option value="timed">🕐 시간지정 · 특정 시간에 시작</option>
            <option value="all_day">📅 종일 · 하루 종일</option>
          </select>
        </div>
      )}

      {/* 날짜 */}
      {showScheduledDate && todo.scheduleType !== 'none' && (
        <>
          {/* 시작 날짜 */}
          <div className="my-4">
            <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
              <Calendar className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
              날짜
              {todo.isRecurrenceInstance && (
                <span className="text-xs text-info font-normal">(반복 인스턴스)</span>
              )}
            </label>

            <input
              type="date"
              value={todo.scheduledDate ? format(todo.scheduledDate, 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                onChange({
                  ...todo,
                  scheduledDate: e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined,
                })
              }
              disabled={todo.isRecurrenceInstance}
              className={`input input-bordered w-full bg-base-100 ${todo.isRecurrenceInstance ? 'opacity-60 cursor-not-allowed' : ''}`}
            />
          </div>

          {/* 시작 시간 (시간 포함 ON일 때만) */}
          {todo.includeTime && (
            <div className="my-4">
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Clock className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
                시작 시간
              </label>

              <input
                type="time"
                value={todo.startTime || '09:00'}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="input input-bordered w-full bg-base-100"
              />
            </div>
          )}

          {/* 종료일 (종료일 토글 ON일 때만) */}
          {todo.includeEndDate && (
            <>
              <div className="my-4">
                <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                  <Calendar className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
                  종료 날짜
                  {todo.isRecurrenceInstance && (
                    <span className="text-xs text-info font-normal">(반복 인스턴스)</span>
                  )}
                </label>

                <input
                  type="date"
                  value={todo.endDate ? format(todo.endDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) =>
                    onChange({
                      ...todo,
                      endDate: e.target.value ? new Date(e.target.value) : undefined,
                    })
                  }
                  disabled={todo.isRecurrenceInstance}
                  className={`input input-bordered w-full bg-base-100 ${todo.isRecurrenceInstance ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
              </div>

              {/* 종료 시간 (종료일 ON + 시간 포함 ON일 때만) */}
              {todo.includeTime && (
                <div className="my-4">
                  <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                    <Clock className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
                    종료 시간
                  </label>

                  <input
                    type="time"
                    value={todo.endTime || '18:00'}
                    onChange={(e) => handleEndTimeChange(e.target.value)}
                    className="input input-bordered w-full bg-base-100"
                  />
                </div>
              )}
            </>
          )}

          {/* 종료일 토글 - 언제든지/종일일 때 숨김 */}
          {todo.scheduleType && todo.scheduleType !== 'anytime' && todo.scheduleType !== 'all_day' && (
            <div className="my-4">
              <div className="p-3 rounded-lg bg-base-100 border border-base-300">
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

          {/* 시간 포함 토글 - 숨김 처리 (scheduleType으로 자동 결정됨) */}

          {/* 예상 소요 시간 (언제든지일 때만) */}
          {(!todo.scheduleType || todo.scheduleType === 'anytime') && (
            <div className="my-4">
              <label className="flex items-center gap-3 text-lg font-semibold mb-3" style={{ color: '#666666' }}>
                <Clock className="h-5 w-5" style={{ color: todo.color || '#808080' }} />
                예상 소요 시간
              </label>

              <div className="p-3 rounded-lg bg-base-100 border border-base-300">
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

      {/* 오늘의 하이라이트 - 임시 숨김 */}
      {/* {showHighlight && (
        <div className="my-4">
          <label className="cursor-pointer flex items-center gap-2">
            <input
              type="checkbox"
              checked={todo.isHighlight}
              onChange={(e) => onChange({ ...todo, isHighlight: e.target.checked })}
              className="checkbox bg-base-100"
            />
            <span className="label-text flex items-center gap-1">
              <Star className="w-4 h-4" />
              오늘의 하이라이트
            </span>
          </label>
        </div>
      )} */}

      {/* 완료 여부 */}
      {showCompleted && (
        <div className="my-4">
          <label className="cursor-pointer flex items-center gap-2">
            <span className="label-text flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" />
              완료됨
            </span>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={(e) => onChange({ ...todo, completed: e.target.checked })}
              className="checkbox bg-base-100"
            />
          </label>
        </div>
      )}

      {/* 소중한 사람 연결 섹션 */}
      <div className="my-4 space-y-3">
        <PersonSelector
          selectedPeopleIds={todo.joyfulPeopleIds || []}
          onSelectionChange={(ids) => onChange({ ...todo, joyfulPeopleIds: ids })}
          linkType="joyful"
        />
        <PersonSelector
          selectedPeopleIds={todo.shamefulPeopleIds || []}
          onSelectionChange={(ids) => onChange({ ...todo, shamefulPeopleIds: ids })}
          linkType="shameful"
        />
      </div>

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

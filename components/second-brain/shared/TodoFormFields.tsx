'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Star, StickyNote, CheckCircle2, Sparkles, Target, Palette, Repeat, Calendar, Clock, Heart, AlertTriangle, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Note } from '@/types/second-brain';
import type { RecurrencePattern, Project } from '@/types';
import CollapsibleNoteSection from './CollapsibleNoteSection';
import CollapsibleProjectSection from './CollapsibleProjectSection';
import RecurrenceSettings from '@/components/todos/form/RecurrenceSettings';
import EnhancedIconBrowserModal from '@/components/ui/EnhancedIconBrowserModal';
import { getUnifiedIcon } from '@/lib/icon-collection';
import { getColorById } from '@/lib/color-palette';
import type { UnifiedIconKey } from '@/lib/icon-collection';
import { ScrollDurationPicker } from '@/components/ui/scroll-duration-picker';
import { useTypingEffect } from '@/hooks/useTypingEffect';
import { PersonSelector } from '@/components/cherished/PersonSelector';
import { useCherishedPeopleStore } from '@/state/stores/cherishedPeopleStore';

// 요약 행 및 상세 모달 컴포넌트
import TodoSummaryRow from '@/components/todos/form/TodoSummaryRow';
import DateDetailModal from '@/components/todos/form/DateDetailModal';
import TimeDetailModal from '@/components/todos/form/TimeDetailModal';
import RecurrenceDetailModal from '@/components/todos/form/RecurrenceDetailModal';
import PersonDetailModal from '@/components/todos/form/PersonDetailModal';
import RecurringInstanceNoticeDialog from '@/components/todos/form/RecurringInstanceNoticeDialog';

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
  // 프로젝트 관련 props
  projects?: Project[]; // 프로젝트 목록
  onProjectClick?: (project: Project) => void; // 프로젝트 클릭 핸들러
  onCreateProject?: (title: string) => Promise<Project>; // 새 프로젝트 생성
  onProjectImmediateSave?: (projectId: string | null) => Promise<void>; // 프로젝트 즉시 저장
  // 섹션 표시 여부 제어 (기본값: true)
  showScheduledDate?: boolean;
  showHighlight?: boolean;
  showCompleted?: boolean;
  showProject?: boolean; // 프로젝트 섹션 표시 여부
  // 즉시 DB 저장을 위한 props
  todoId?: string;
  userId?: string;
  onNoteImmediateSave?: (noteIds: string[]) => Promise<void>;
  // 반복 인스턴스 날짜 (반복 할일 편집 시)
  occurrenceDate?: string;
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
  projects = [],
  onProjectClick,
  onCreateProject,
  onProjectImmediateSave,
  showScheduledDate = true,
  showHighlight = true,
  showCompleted = true,
  showProject = true,
  todoId,
  userId,
  onNoteImmediateSave,
  occurrenceDate,
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

  // 소중한 사람 store
  const { people } = useCherishedPeopleStore();

  // 상세 모달 상태
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showRecurrenceModal, setShowRecurrenceModal] = useState(false);
  const [showJoyfulModal, setShowJoyfulModal] = useState(false);
  const [showShamefulModal, setShowShamefulModal] = useState(false);

  // 반복 인스턴스 안내 다이얼로그 상태
  const [showRecurrenceNotice, setShowRecurrenceNotice] = useState(false);

  // 아이콘 브라우저 모달
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);

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

  // 아이콘 변경
  const handleIconChange = (iconKey: UnifiedIconKey) => {
    onChange({ ...todo, icon: iconKey });
  };

  // 색상 변경
  const handleColorChange = (colorId: string) => {
    const color = getColorById(colorId).hex;
    onChange({ ...todo, color });
  };

  // 메인 화면에 표시할 날짜 결정
  const displayDate = useMemo(() => {
    if (todo.isRecurrenceInstance && occurrenceDate) {
      // 반복 인스턴스: 인스턴스 날짜 표시
      return new Date(occurrenceDate);
    }
    // 일반 할일: 실제 예정 날짜
    return todo.scheduledDate;
  }, [todo.isRecurrenceInstance, occurrenceDate, todo.scheduledDate]);

  // 날짜 레이블 생성
  const getDateLabel = (date: Date | undefined): string => {
    if (!date) return '날짜 선택';

    const formattedDate = format(date, 'yyyy년 M월 d일 (EEE)', { locale: ko });
    return formattedDate;
  };

  // 날짜 상대적 표시 (오늘, 내일, 어제)
  const getDateSuffix = (date: Date | undefined): string | undefined => {
    if (!date) return undefined;

    if (isToday(date)) return '오늘';
    if (isTomorrow(date)) return '내일';
    if (isYesterday(date)) return '어제';
    return undefined;
  };

  // 시간 레이블 생성
  const getTimeLabel = (): string => {
    const scheduleType = todo.scheduleType || 'anytime';

    if (scheduleType === 'all_day') return '종일';
    if (scheduleType === 'anytime') {
      const duration = todo.anytimeDuration || 30;
      if (duration >= 60) {
        const hours = Math.floor(duration / 60);
        const mins = duration % 60;
        return mins > 0 ? `언제든지 · ${hours}시간 ${mins}분` : `언제든지 · ${hours}시간`;
      }
      return `언제든지 · ${duration}분`;
    }
    if (scheduleType === 'timed') {
      const start = todo.startTime || '00:00';
      if (todo.includeEndDate && todo.endTime) {
        return `${start} ~ ${todo.endTime}`;
      }
      return start;
    }
    return '시간 선택';
  };

  // 시간 서픽스 (소요 시간)
  const getTimeSuffix = (): string | undefined => {
    if (todo.scheduleType === 'timed' && todo.startTime && todo.endTime && todo.includeEndDate) {
      const startMins = timeToMinutes(todo.startTime);
      let endMins = timeToMinutes(todo.endTime);
      if (endMins < startMins) endMins += 24 * 60;
      const diff = endMins - startMins;

      if (diff >= 60) {
        const hours = Math.floor(diff / 60);
        const mins = diff % 60;
        return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`;
      }
      return `${diff}분`;
    }
    return undefined;
  };

  // 반복 레이블 생성
  const getRecurrenceLabel = (): string => {
    const pattern = (todo.recurrencePattern as RecurrencePattern) || 'none';
    if (pattern === 'none') return '반복 안함';

    const interval = todo.recurrenceInterval || 1;

    switch (pattern) {
      case 'daily':
        return interval === 1 ? '매일' : `${interval}일마다`;
      case 'weekly':
        if (todo.selectedDaysOfWeek && todo.selectedDaysOfWeek.length > 0) {
          const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
          const days = todo.selectedDaysOfWeek.map(d => dayNames[d]).join(', ');
          return interval === 1 ? `매주 ${days}` : `${interval}주마다 ${days}`;
        }
        return interval === 1 ? '매주' : `${interval}주마다`;
      case 'monthly':
        return interval === 1 ? '매월' : `${interval}개월마다`;
      default:
        return '반복 안함';
    }
  };

  // 사람 수 레이블
  const getPeopleCountLabel = (ids: string[] | undefined): string => {
    const count = ids?.length || 0;
    if (count === 0) return '선택 안함';
    return `${count}명`;
  };

  // 날짜 행 클릭 핸들러
  const handleDateRowClick = () => {
    if (todo.isRecurrenceInstance) {
      // 반복 인스턴스면 안내 다이얼로그 먼저 표시
      setShowRecurrenceNotice(true);
    } else {
      // 일반 할일이면 바로 날짜 선택기 열기
      setShowDateModal(true);
    }
  };

  // 반복 안내 다이얼로그 확인 핸들러
  const handleRecurrenceNoticeConfirm = () => {
    setShowRecurrenceNotice(false);
    setShowDateModal(true);
  };

  // 날짜 변경 핸들러
  const handleDateChange = (date: Date) => {
    onChange({ ...todo, scheduledDate: date });
  };

  // 일정 유형 없을 때 처리
  const scheduleType = todo.scheduleType || 'none';
  const hasSchedule = scheduleType !== 'none';

  return (
    <>
      {/* 제목 섹션 */}
      <div className="my-2">
        <input
          type="text"
          value={todo.title}
          onChange={(e) => onChange({ ...todo, title: e.target.value })}
          placeholder={typingPlaceholder}
          className="input input-bordered w-full text-lg font-semibold"
          required
        />
      </div>

      {/* 요약 뷰 섹션 */}
      {showScheduledDate && (
        <div className="my-4 space-y-1">
          {/* 날짜 행 */}
          <TodoSummaryRow
            icon={<Calendar className="w-5 h-5" />}
            label={getDateLabel(displayDate)}
            suffix={getDateSuffix(displayDate)}
            onClick={handleDateRowClick}
            iconClassName="text-primary"
          />

          {/* 시간 행 - 날짜가 있을 때만 */}
          {hasSchedule && (
            <TodoSummaryRow
              icon={<Clock className="w-5 h-5" />}
              label={getTimeLabel()}
              suffix={getTimeSuffix()}
              onClick={() => setShowTimeModal(true)}
              iconClassName="text-orange-500"
            />
          )}

          {/* 반복 행 - 날짜가 있을 때만 */}
          {hasSchedule && (
            <TodoSummaryRow
              icon={<Repeat className="w-5 h-5" />}
              label={getRecurrenceLabel()}
              onClick={() => setShowRecurrenceModal(true)}
              iconClassName="text-blue-500"
            />
          )}
        </div>
      )}

      {/* 완료 여부 */}
      {showCompleted && (
        <div className="my-4">
          <label className="cursor-pointer flex items-center gap-3 p-3 rounded-lg bg-base-200 hover:bg-base-300 transition-colors">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="flex-1 font-medium">완료됨</span>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={(e) => onChange({ ...todo, completed: e.target.checked })}
              className="checkbox checkbox-primary"
            />
          </label>
        </div>
      )}

      {/* 소중한 사람 연결 섹션 */}
      <div className="my-4 space-y-1">
        {/* 기쁜 분들 */}
        <TodoSummaryRow
          icon={<Heart className="w-5 h-5" />}
          label="기쁜 분들"
          suffix={getPeopleCountLabel(todo.joyfulPeopleIds)}
          onClick={() => setShowJoyfulModal(true)}
          iconClassName="text-pink-500"
        />

        {/* 부끄러운 행동 */}
        <TodoSummaryRow
          icon={<AlertTriangle className="w-5 h-5" />}
          label="부끄러운 행동"
          suffix={getPeopleCountLabel(todo.shamefulPeopleIds)}
          onClick={() => setShowShamefulModal(true)}
          iconClassName="text-amber-500"
        />
      </div>

      {/* 프로젝트 연결 (단일 선택) - showProject이고 프로젝트 목록이 있을 때 표시 */}
      {showProject && projects.length > 0 && (
        <CollapsibleProjectSection
          selectedProjectId={todo.projectIds?.[0] || null}
          allProjects={projects}
          onChange={(projectId) =>
            onChange({
              ...todo,
              projectIds: projectId ? [projectId] : [],
            })
          }
          onCreateProject={onCreateProject}
          onProjectClick={onProjectClick}
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

      {/* 상세 모달들 */}

      {/* 날짜 상세 모달 */}
      <DateDetailModal
        isOpen={showDateModal}
        onClose={() => setShowDateModal(false)}
        date={displayDate}
        onDateChange={handleDateChange}
      />

      {/* 시간 상세 모달 */}
      <TimeDetailModal
        isOpen={showTimeModal}
        onClose={() => setShowTimeModal(false)}
        scheduleType={scheduleType as 'none' | 'anytime' | 'timed' | 'all_day'}
        startTime={todo.startTime}
        endTime={todo.endTime}
        includeEndDate={todo.includeEndDate}
        anytimeDuration={todo.anytimeDuration}
        // 통합 콜백 사용 (모든 시간 관련 값을 한 번에 업데이트)
        onConfirm={(data) => {
          const updates: Partial<TodoFormData> = {
            scheduleType: data.scheduleType,
          };

          if (data.scheduleType === 'timed') {
            updates.scheduledDate = todo.scheduledDate || new Date();
            updates.includeTime = true;
            updates.startTime = data.startTime;
            updates.endTime = data.endTime;
            updates.includeEndDate = data.includeEndDate;
            updates.endDate = todo.scheduledDate || new Date();
          } else if (data.scheduleType === 'anytime') {
            updates.scheduledDate = todo.scheduledDate || new Date();
            updates.includeEndDate = false;
            updates.includeTime = false;
            updates.anytimeDuration = data.anytimeDuration;
          } else if (data.scheduleType === 'all_day') {
            updates.scheduledDate = todo.scheduledDate || new Date();
            updates.includeEndDate = false;
            updates.includeTime = false;
          } else if (data.scheduleType === 'none') {
            updates.scheduledDate = undefined;
            updates.includeEndDate = false;
            updates.includeTime = false;
            updates.startTime = undefined;
            updates.endDate = undefined;
            updates.endTime = undefined;
          }

          onChange({ ...todo, ...updates });
        }}
        // 기존 개별 콜백 유지 (하위 호환성)
        onScheduleTypeChange={(type) => {
          const updates: Partial<TodoFormData> = { scheduleType: type };

          // 자동 세팅
          if (type === 'anytime' || type === 'all_day') {
            updates.scheduledDate = todo.scheduledDate || new Date();
            updates.includeEndDate = false;
            updates.includeTime = false;
          } else if (type === 'timed') {
            updates.scheduledDate = todo.scheduledDate || new Date();
            updates.includeTime = true;
            updates.includeEndDate = true;
            updates.endDate = todo.scheduledDate || new Date();
            const now = new Date();
            updates.startTime = todo.startTime || `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            const endMinutes = now.getMinutes() + 30;
            const endHour = endMinutes >= 60 ? (now.getHours() + 1) % 24 : now.getHours();
            const endMin = endMinutes % 60;
            updates.endTime = todo.endTime || `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
          } else if (type === 'none') {
            updates.scheduledDate = undefined;
            updates.includeEndDate = false;
            updates.includeTime = false;
            updates.startTime = undefined;
            updates.endDate = undefined;
            updates.endTime = undefined;
          }

          onChange({ ...todo, ...updates });
        }}
        onStartTimeChange={(time) => onChange({ ...todo, startTime: time })}
        onEndTimeChange={(time) => onChange({ ...todo, endTime: time })}
        onIncludeEndDateChange={(include) => onChange({ ...todo, includeEndDate: include })}
        onAnytimeDurationChange={(duration) => onChange({ ...todo, anytimeDuration: duration })}
      />

      {/* 반복 상세 모달 */}
      <RecurrenceDetailModal
        isOpen={showRecurrenceModal}
        onClose={() => setShowRecurrenceModal(false)}
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
            onChange({ ...todo, selectedDaysOfWeek: currentDays.filter(d => d !== day) });
          } else {
            onChange({ ...todo, selectedDaysOfWeek: [...currentDays, day].sort() });
          }
        }}
        originalStartDate={todo.originalStartDate}
        onOriginalStartDateChange={(date) => onChange({ ...todo, originalStartDate: date })}
        isRecurrenceInstance={todo.isRecurrenceInstance}
      />

      {/* 기쁜 분들 상세 모달 */}
      <PersonDetailModal
        isOpen={showJoyfulModal}
        onClose={() => setShowJoyfulModal(false)}
        title="기쁜 분들"
        description="이 일로 기뻐하실 분들을 선택하세요"
        linkType="joyful"
        selectedPeopleIds={todo.joyfulPeopleIds || []}
        onSelectionChange={(ids) => onChange({ ...todo, joyfulPeopleIds: ids })}
      />

      {/* 부끄러운 행동 상세 모달 */}
      <PersonDetailModal
        isOpen={showShamefulModal}
        onClose={() => setShowShamefulModal(false)}
        title="부끄러운 행동"
        description="이 분들 앞에선 부끄러운 행동"
        linkType="shameful"
        selectedPeopleIds={todo.shamefulPeopleIds || []}
        onSelectionChange={(ids) => onChange({ ...todo, shamefulPeopleIds: ids })}
      />

      {/* 반복 인스턴스 안내 다이얼로그 */}
      <RecurringInstanceNoticeDialog
        isOpen={showRecurrenceNotice}
        onClose={() => setShowRecurrenceNotice(false)}
        onConfirm={handleRecurrenceNoticeConfirm}
      />

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

import { useState, useMemo, useCallback, useEffect } from 'react';
import { format, addMinutes, addDays } from 'date-fns';
import type { Todo, ScheduleType, RecurrencePattern } from '@/types';
import { UnifiedIconKey } from '@/lib/icon-collection';
import { DEFAULT_COLOR, getColorByHex, getColorById } from '@/lib/color-palette';
import type { MemoData } from '@/components/todos/form/MemoInput';
import type { Contact } from '@/types/contacts';
import type { MotivationMessage } from '@/types/motivation';

export interface TodoFormStateValues {
  // 기본 필드
  content: string;
  priority: 'low' | 'medium' | 'high';
  selectedIcon: UnifiedIconKey;
  selectedColor: string;

  // 스케줄 관련 상태
  scheduleType: ScheduleType;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;

  // 출발 정보 관련 상태
  departureLocation: string;
  departureDate: string;
  departureTime: string;

  // 시간 간격 설정
  durationHours: number;
  durationMins: number;
  
  // 반복 설정 상태
  showRecurrenceSettings: boolean;
  recurrencePattern: RecurrencePattern;
  recurrenceInterval: number;
  recurrenceEndDate: string;
  recurrenceCount?: number;
  recurrenceEndType: 'never' | 'date' | 'count';
  selectedDaysOfWeek: number[];
  
  // 메모 관련 상태
  memos: MemoData[];
  
  // 연락처 관련 상태
  selectedContacts: Contact[];

  // 동기부여 메시지 관련 상태
  selectedMotivations: MotivationMessage[];
}

export interface TodoFormStateActions {
  setContent: (content: string) => void;
  setPriority: (priority: 'low' | 'medium' | 'high') => void;
  setSelectedIcon: (icon: UnifiedIconKey) => void;
  setSelectedColor: (color: string) => void;
  setScheduleType: (type: ScheduleType) => void;
  setStartDate: (date: string) => void;
  setStartTime: (time: string) => void;
  setEndDate: (date: string) => void;
  setEndTime: (time: string) => void;
  setDepartureLocation: (location: string) => void;
  setDepartureDate: (date: string) => void;
  setDepartureTime: (time: string) => void;
  setDurationHours: (hours: number) => void;
  setDurationMins: (mins: number) => void;
  setShowRecurrenceSettings: (show: boolean) => void;
  setRecurrencePattern: (pattern: RecurrencePattern) => void;
  setRecurrenceInterval: (interval: number) => void;
  setRecurrenceEndDate: (date: string) => void;
  setRecurrenceCount: (count?: number) => void;
  setRecurrenceEndType: (type: 'never' | 'date' | 'count') => void;
  setSelectedDaysOfWeek: (days: number[]) => void;
  setMemos: (memos: MemoData[]) => void;
  setSelectedContacts: (contacts: Contact[]) => void;
  setSelectedMotivations: (motivations: MotivationMessage[]) => void;
}

export interface TodoFormStateConfig {
  editingTodo?: Todo | null;
  initialStartTime?: Date | null;
  initialEndTime?: Date | null;
  open: boolean;
}

export const useTodoFormState = (config: TodoFormStateConfig) => {
  const { editingTodo, initialStartTime, initialEndTime } = config;
  
  // 기본 필드
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [selectedIcon, setSelectedIcon] = useState<UnifiedIconKey>('lucide-Home');
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLOR.id);
  
  // 스케줄 관련 상태
  const [scheduleType, setScheduleType] = useState<ScheduleType>('anytime');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');

  // 출발 정보 관련 상태
  const [departureLocation, setDepartureLocation] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  
  // 시간 간격 설정 (시간과 분으로 분리)
  const [durationHours, setDurationHours] = useState(1);
  const [durationMins, setDurationMins] = useState(0);
  
  // 반복 설정 상태
  const [showRecurrenceSettings, setShowRecurrenceSettings] = useState(false);
  const [recurrencePattern, setRecurrencePattern] = useState<RecurrencePattern>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceCount, setRecurrenceCount] = useState<number | undefined>();
  const [recurrenceEndType, setRecurrenceEndType] = useState<'never' | 'date' | 'count'>('never');
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  
  // 메모 관련 상태
  const [memos, setMemos] = useState<MemoData[]>([]);
  
  // 연락처 관련 상태
  const [selectedContacts, setSelectedContacts] = useState<Contact[]>([]);

  // 동기부여 메시지 관련 상태
  const [selectedMotivations, setSelectedMotivations] = useState<MotivationMessage[]>([]);

  // UI 상태
  const [iconBrowserOpen, setIconBrowserOpen] = useState(false);
  const [dragDisabled, setDragDisabled] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 삭제 관련 상태
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRecurringDeleteDialog, setShowRecurringDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 반복 할일 시간 변경 모달 상태
  const [showRecurringUpdateDialog, setShowRecurringUpdateDialog] = useState(false);
  const [originalTimeForUpdate, setOriginalTimeForUpdate] = useState<{ start: Date; end?: Date } | null>(null);
  const [newTimeForUpdate, setNewTimeForUpdate] = useState<{ start: Date; end?: Date } | null>(null);
  const [occurrenceDate, setOccurrenceDate] = useState<Date | null>(null);

  // 수정 모드인지 확인
  const isEditMode = !!editingTodo;

  // 총 간격 (분 단위)
  const durationMinutes = useMemo(() => {
    return durationHours * 60 + durationMins;
  }, [durationHours, durationMins]);

  // 실시간 기본값 함수 (매번 새로운 현재 시간 계산)
  const getCurrentDefaultValues = useCallback(() => {
    const now = new Date();
    const defaultTime = now; // 현재 시간
    const endTime = addMinutes(defaultTime, 60);
    return {
      date: format(now, 'yyyy-MM-dd'),
      time: format(defaultTime, 'HH:mm'),
      endTime: format(endTime, 'HH:mm'),
      today: format(new Date(), 'yyyy-MM-dd'),
      tomorrow: format(addDays(new Date(), 1), 'yyyy-MM-dd')
    };
  }, []);

  // 시간 값 검증 및 정제 함수
  const validateAndFormatTime = useCallback((timeValue: string): string => {
    if (!timeValue || typeof timeValue !== 'string') return '';
    
    // 이미 올바른 HH:MM 형식인지 확인
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (timePattern.test(timeValue)) {
      return timeValue;
    }
    
    // Date 객체에서 format된 시간인지 확인
    try {
      const date = new Date(`2000-01-01T${timeValue}`);
      if (!isNaN(date.getTime())) {
        return format(date, 'HH:mm');
      }
    } catch (e) {
      // 시간 형식 검증 실패
    }
    
    return '';
  }, []);

  // 초기화 함수 (useCallback으로 메모이제이션)
  const initializeFormFromTodo = useCallback((todo: Todo) => {
    setContent(todo.content || '');
    setPriority((todo.priority as 'low' | 'medium' | 'high') || 'medium');
    setSelectedIcon((todo.icon as UnifiedIconKey) || 'home');
    // DB에서 hex 값 또는 colorId가 올 수 있으므로 둘 다 처리
    const colorValue = todo.color;
    let colorData = DEFAULT_COLOR;
    
    if (colorValue) {
      if (colorValue.startsWith('#')) {
        // hex 값인 경우
        colorData = getColorByHex(colorValue);
      } else {
        // colorId인 경우
        colorData = getColorById(colorValue);
      }
    }
    
    setSelectedColor(colorData.id);
    
    // 스케줄 타입 설정 (시간 정보가 있으면 'timed'로 자동 판단)
    const hasTimeInfo = todo.start_time || todo.end_time;
    const scheduleType = todo.schedule_type || (hasTimeInfo ? 'timed' : 'anytime');
    setScheduleType(scheduleType as ScheduleType);
    
    // 시간 설정
    if (todo.start_time) {
      const startTime = new Date(todo.start_time);
      setStartDate(format(startTime, 'yyyy-MM-dd'));
      
      // 시간 정보가 있으면 timed 모드로 처리
      if (hasTimeInfo) {
        const formattedStartTime = validateAndFormatTime(format(startTime, 'HH:mm'));
        setStartTime(formattedStartTime);
      }
      
      if (todo.end_time) {
        const endTime = new Date(todo.end_time);
        setEndDate(format(endTime, 'yyyy-MM-dd'));
        if (hasTimeInfo) {
          const formattedEndTime = validateAndFormatTime(format(endTime, 'HH:mm'));
          setEndTime(formattedEndTime);
          
          // 시간 간격(duration) 계산
          const durationMs = endTime.getTime() - startTime.getTime();
          const durationMinutes = Math.round(durationMs / (1000 * 60)); // 밀리초를 분으로 변환
          const hours = Math.floor(durationMinutes / 60);
          const mins = durationMinutes % 60;
          
          
          if (!isNaN(hours) && !isNaN(mins)) {
            setDurationHours(hours);
            setDurationMins(mins);
          } else {
            setDurationHours(1);
            setDurationMins(0);
          }
        }
      } else {
        // end_time이 없으면 기본 1시간으로 설정
        setDurationHours(1);
        setDurationMins(0);
      }
    } else {
      const currentDefaults = getCurrentDefaultValues();
      setStartDate(currentDefaults.date);
      setStartTime(currentDefaults.time);
      setEndDate(currentDefaults.date);
      setEndTime(currentDefaults.endTime);
      // 기본 1시간 간격 설정
      setDurationHours(1);
      setDurationMins(0);
    }

    // 출발 정보 설정 (타입 안전성 보장)
    console.log('🔥🔥🔥 [DEBUG] Todo 출발 정보 매핑:', {
      departure_location: todo.departure_location,
      departure_time: todo.departure_time,
      todoId: todo.id
    });

    setDepartureLocation(todo.departure_location || '');
    if (todo.departure_time) {
      try {
        const departureTime = new Date(todo.departure_time);
        if (!isNaN(departureTime.getTime())) {
          const formattedDate = format(departureTime, 'yyyy-MM-dd');
          const formattedTime = validateAndFormatTime(format(departureTime, 'HH:mm'));

          console.log('🔥🔥🔥 [DEBUG] 출발 정보 설정 완료:', {
            원본시간: todo.departure_time,
            파싱된날짜: formattedDate,
            파싱된시간: formattedTime
          });

          setDepartureDate(formattedDate);
          setDepartureTime(formattedTime);
        } else {
          // 잘못된 날짜 형식인 경우 기본값 설정
          console.warn('⚠️ 잘못된 출발 시간 형식:', todo.departure_time);
          setDepartureDate(format(new Date(), 'yyyy-MM-dd'));
          setDepartureTime('');
        }
      } catch (error) {
        console.warn('출발 시간 파싱 실패:', error);
        setDepartureDate(format(new Date(), 'yyyy-MM-dd'));
        setDepartureTime('');
      }
    } else {
      // 출발 시간이 없는 경우 기본값 설정
      console.log('🔥🔥🔥 [DEBUG] 출발 시간 없음, 기본값 설정');
      setDepartureDate(format(new Date(), 'yyyy-MM-dd'));
      setDepartureTime('');
    }

    // 반복 설정 - 빈 문자열도 'none'으로 처리
    const hasRecurrence = todo.recurrence_pattern && 
                         todo.recurrence_pattern !== 'none';
    setShowRecurrenceSettings(hasRecurrence);
    
    // 빈 문자열이나 falsy 값을 'none'으로 정규화
    const normalizedPattern = todo.recurrence_pattern 
                             ? (todo.recurrence_pattern as RecurrencePattern)
                             : 'none';
    setRecurrencePattern(normalizedPattern);
    setRecurrenceInterval(todo.recurrence_interval || 1);
    
    // 반복 종료 날짜 및 타입 설정
    const endDateValue = todo.recurrence_end_date ? 
      (typeof todo.recurrence_end_date === 'string' ? 
        todo.recurrence_end_date.split('T')[0] : 
        todo.recurrence_end_date) : '';
    const endCountValue = todo.recurrence_count || undefined;
    
    setRecurrenceEndDate(endDateValue);
    setRecurrenceCount(endCountValue);
    
    // 반복 종료 타입 결정
    let endType: 'never' | 'date' | 'count' = 'never';
    if (endDateValue && endDateValue.trim()) {
      endType = 'date';
    } else if (endCountValue && endCountValue > 0) {
      endType = 'count';
    }
    setRecurrenceEndType(endType);
    
    // 반복 요일 설정
    const daysOfWeek = todo.recurrence_days_of_week;
    let selectedDays: number[] = [];
    
    if (Array.isArray(daysOfWeek)) {
      selectedDays = daysOfWeek
        .filter((day): day is number => typeof day === 'number')
        .filter(day => day >= 0 && day <= 6);
    } else if (typeof daysOfWeek === 'string') {
      try {
        const parsed = JSON.parse(daysOfWeek);
        if (Array.isArray(parsed)) {
          selectedDays = parsed
            .filter((day): day is number => typeof day === 'number')
            .filter(day => day >= 0 && day <= 6);
        }
      } catch (e) {
        console.warn('반복 요일 파싱 실패:', daysOfWeek);
        selectedDays = [];
      }
    }
    setSelectedDaysOfWeek(selectedDays);
  }, [getCurrentDefaultValues, validateAndFormatTime]);

  const initializeFormForNew = useCallback(() => {
    setContent('');
    setPriority('medium');
    setSelectedIcon('lucide-Home');
    
    // 초기 시간이 제공된 경우 시간 지정 모드로 설정
    if (initialStartTime && initialEndTime) {
      setScheduleType('timed');
      setStartDate(format(initialStartTime, 'yyyy-MM-dd'));
      
      const formattedStartTime = validateAndFormatTime(format(initialStartTime, 'HH:mm'));
      const formattedEndTime = validateAndFormatTime(format(initialEndTime, 'HH:mm'));
      
      setStartTime(formattedStartTime);
      setEndDate(format(initialEndTime, 'yyyy-MM-dd'));
      setEndTime(formattedEndTime);
      
      // 제공된 시간으로 duration 계산
      const durationMs = initialEndTime.getTime() - initialStartTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      const hours = Math.floor(durationMinutes / 60);
      const mins = durationMinutes % 60;
      
      setDurationHours(hours);
      setDurationMins(mins);
    } else {
      const currentDefaults = getCurrentDefaultValues();
      setScheduleType('timed');
      setStartDate(currentDefaults.date);

      const validatedStartTime = validateAndFormatTime(currentDefaults.time);
      const validatedEndTime = validateAndFormatTime(currentDefaults.endTime);

      setStartTime(validatedStartTime);
      setEndDate(currentDefaults.date);
      setEndTime(validatedEndTime);

      // 기본값으로 duration 계산 (1시간)
      setDurationHours(1);
      setDurationMins(0);
    }
    
    // 출발 정보 초기화 (출발 날짜는 기본적으로 오늘 날짜)
    setDepartureLocation('');
    setDepartureDate(format(new Date(), 'yyyy-MM-dd')); // 오늘 날짜로 기본 설정
    setDepartureTime('');

    // 반복 설정 초기화
    setShowRecurrenceSettings(true);
    setRecurrencePattern('none');
    setRecurrenceInterval(1);
    setRecurrenceEndDate('');
    setRecurrenceCount(undefined);
    setRecurrenceEndType('never');
    setSelectedDaysOfWeek([]);

    // 메모 상태 초기화
    setMemos([]);

    // 연락처 상태 초기화
    setSelectedContacts([]);

    // 동기부여 메시지 상태 초기화
    setSelectedMotivations([]);
  }, [getCurrentDefaultValues, initialStartTime, initialEndTime, validateAndFormatTime]);

  // 폼 초기화 (useCallback으로 감싸서 의존성 배열 안정화)
  const initializeForm = useCallback(() => {
    if (isEditMode && editingTodo) {
      initializeFormFromTodo(editingTodo);
    } else {
      initializeFormForNew();
    }
  }, [isEditMode, editingTodo, initializeFormFromTodo, initializeFormForNew]);

  // 상태 값들 반환
  const values: TodoFormStateValues = {
    content,
    priority,
    selectedIcon,
    selectedColor,
    scheduleType,
    startDate,
    startTime,
    endDate,
    endTime,
    departureLocation,
    departureDate,
    departureTime,
    durationHours,
    durationMins,
    showRecurrenceSettings,
    recurrencePattern,
    recurrenceInterval,
    recurrenceEndDate,
    recurrenceCount,
    recurrenceEndType,
    selectedDaysOfWeek,
    memos,
    selectedContacts,
    selectedMotivations,
  };

  // 액션 함수들 반환
  const actions: TodoFormStateActions = {
    setContent,
    setPriority,
    setSelectedIcon,
    setSelectedColor,
    setScheduleType,
    setStartDate,
    setStartTime,
    setEndDate,
    setEndTime,
    setDepartureLocation,
    setDepartureDate,
    setDepartureTime,
    setDurationHours,
    setDurationMins,
    setShowRecurrenceSettings,
    setRecurrencePattern,
    setRecurrenceInterval,
    setRecurrenceEndDate,
    setRecurrenceCount,
    setRecurrenceEndType,
    setSelectedDaysOfWeek,
    setMemos,
    setSelectedContacts,
    setSelectedMotivations,
  };

  // UI 상태들 반환
  const uiState = {
    iconBrowserOpen,
    setIconBrowserOpen,
    dragDisabled,
    setDragDisabled,
    scrollTop,
    setScrollTop,
    showDeleteDialog,
    setShowDeleteDialog,
    showRecurringDeleteDialog,
    setShowRecurringDeleteDialog,
    isDeleting,
    setIsDeleting,
    isSubmitting,
    setIsSubmitting,
    // 반복 할일 시간 변경 모달 상태
    showRecurringUpdateDialog,
    setShowRecurringUpdateDialog,
    originalTimeForUpdate,
    setOriginalTimeForUpdate,
    newTimeForUpdate,
    setNewTimeForUpdate,
    occurrenceDate,
    setOccurrenceDate,
  };

  // duration 변경 시 자동으로 endTime 업데이트
  useEffect(() => {
    // 시간 지정 모드이고, 시작 시간이 설정되어 있을 때만 실행
    if (scheduleType === 'timed' && startDate && startTime) {
      try {
        // 시작 시간 파싱
        const startDateTime = new Date(`${startDate}T${startTime}`);

        if (!isNaN(startDateTime.getTime())) {
          // duration을 사용하여 종료 시간 계산
          const endDateTime = addMinutes(startDateTime, durationMinutes);

          // 종료 날짜와 시간 업데이트
          const newEndDate = format(endDateTime, 'yyyy-MM-dd');
          const newEndTime = format(endDateTime, 'HH:mm');

          // 현재 endDate, endTime과 다른 경우에만 업데이트 (무한 루프 방지)
          if (newEndDate !== endDate || newEndTime !== endTime) {
            setEndDate(newEndDate);
            setEndTime(newEndTime);
          }
        }
      } catch (error) {
        console.warn('⚠️ endTime 자동 계산 실패:', error);
      }
    }
  }, [durationHours, durationMins, startDate, startTime, scheduleType]); // eslint-disable-line react-hooks/exhaustive-deps

  // 계산된 값들
  const computed = {
    isEditMode,
    durationMinutes,
    getCurrentDefaultValues,
  };

  return {
    values,
    actions,
    uiState,
    computed,
    initializeForm,
  };
};
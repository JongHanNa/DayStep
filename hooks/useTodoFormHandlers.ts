import { useCallback } from 'react';
import { format, addMinutes } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTodoStore } from '@/state/stores/todoStore';
import { useNoteStore } from '@/state/stores/noteStore';
import { useMotivationStore } from '@/state/stores/motivationStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/app/context/AuthContext';
import { getColorById } from '@/lib/color-palette';
import type { Todo, ScheduleType, RecurrencePattern } from '@/types';
import type { TodoFormStateValues, TodoFormStateActions } from './useTodoFormState';

export interface TodoFormHandlersConfig {
  values: TodoFormStateValues;
  actions: TodoFormStateActions;
  editingTodo?: Todo | null;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  setIsSubmitting: (submitting: boolean) => void;
  isDeleting: boolean;
  setIsDeleting: (deleting: boolean) => void;
  setShowDeleteDialog: (show: boolean) => void;
  setShowRecurringDeleteDialog: (show: boolean) => void;
  // 반복 할일 시간 변경 모달 관련
  showRecurringUpdateDialog: boolean;
  setShowRecurringUpdateDialog: (show: boolean) => void;
  originalTimeForUpdate: { start: Date; end?: Date } | null;
  setOriginalTimeForUpdate: (time: { start: Date; end?: Date } | null) => void;
  newTimeForUpdate: { start: Date; end?: Date } | null;
  setNewTimeForUpdate: (time: { start: Date; end?: Date } | null) => void;
  occurrenceDate: Date | null;
  setOccurrenceDate: (date: Date | null) => void;
}

export const useTodoFormHandlers = (config: TodoFormHandlersConfig) => {
  const {
    values,
    actions,
    editingTodo,
    onOpenChange,
    isSubmitting,
    setIsSubmitting,
    isDeleting,
    setIsDeleting,
    setShowDeleteDialog,
    setShowRecurringDeleteDialog,
    // 반복 할일 시간 변경 모달 관련
    showRecurringUpdateDialog,
    setShowRecurringUpdateDialog,
    originalTimeForUpdate,
    setOriginalTimeForUpdate,
    newTimeForUpdate,
    setNewTimeForUpdate,
    occurrenceDate,
    setOccurrenceDate,
  } = config;

  const { toast } = useToast();
  const { user, isAuthenticated } = useAuth();
  const createTodo = useTodoStore(state => state.createTodo);
  const updateTodo = useTodoStore(state => state.updateTodo);
  const updateRecurringTodo = useTodoStore(state => state.updateRecurringTodo);
  const deleteTodo = useTodoStore(state => state.deleteTodo);
  const deleteRecurringTodo = useTodoStore(state => state.deleteRecurringTodo);
  const createMemo = useNoteStore(state => state.createMemo);
  const deleteLinkedMemos = useNoteStore(state => state.deleteLinkedMemos);
  const getLinkedMemosByTaskId = useNoteStore(state => state.getLinkedMemosByTaskId);
  const linkMotivationToTodo = useMotivationStore(state => state.linkMotivationToTodo);

  const isEditMode = !!editingTodo;

  // 시간 간격에 따른 종료 시간 자동 계산
  const calculateEndTime = useCallback((startTime: string, duration: number) => {
    if (!startTime) return { endDate: '', endTime: '' };
    
    try {
      // startTime 형식 검증 강화
      if (!startTime.includes(':')) {
        throw new Error(`Invalid startTime format: ${startTime} - missing colon`);
      }
      
      const timeParts = startTime.split(':');
      if (timeParts.length !== 2) {
        throw new Error(`Invalid time format: ${startTime} - must be HH:MM format`);
      }
      
      // 각 부분이 비어있지 않은지 확인
      if (!timeParts[0] || !timeParts[1]) {
        throw new Error(`Invalid time format: ${startTime} - missing hours or minutes`);
      }
      
      // 각 부분이 올바른 길이인지 확인
      if (timeParts[0].length === 0 || timeParts[1].length === 0) {
        throw new Error(`Invalid time format: ${startTime} - empty hours or minutes`);
      }
      
      const [hours, minutes] = timeParts.map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        throw new Error(`Invalid time values: hours=${hours}, minutes=${minutes} from ${startTime}`);
      }
      
      // 시간 범위 검증
      if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        throw new Error(`Invalid time range: ${hours}:${minutes}`);
      }
      
      const currentDate = values.startDate;
      
      // 안전한 날짜 처리
      let startDateTime: Date;
      if (currentDate && currentDate.includes('-')) {
        // YYYY-MM-DD 형식
        startDateTime = new Date(currentDate + 'T00:00:00');
      } else {
        // 기본값으로 오늘 날짜 사용
        startDateTime = new Date();
      }
      
      // 유효한 날짜인지 확인
      if (isNaN(startDateTime.getTime())) {
        console.warn('Invalid date:', currentDate, '- using today');
        startDateTime = new Date();
      }
      
      startDateTime.setHours(hours, minutes, 0, 0);
      
      // 지속 시간을 더한 종료 시간
      const endDateTime = addMinutes(startDateTime, duration);
      
      return {
        endDate: format(endDateTime, 'yyyy-MM-dd'),
        endTime: format(endDateTime, 'HH:mm')
      };
    } catch (error) {
      console.error('calculateEndTime error:', error, { startTime, duration, startDate: values.startDate });
      // 에러 발생시 기본값 반환
      return {
        endDate: values.startDate || format(new Date(), 'yyyy-MM-dd'),
        endTime: '09:00'
      };
    }
  }, [values.startDate]);

  // 스케줄 타입 변경시 시간 필드 자동 조정
  const handleScheduleTypeChange = useCallback((value: ScheduleType) => {
    actions.setScheduleType(value);
    
    if (value === 'all_day') {
      // 종일 일정으로 변경시 시간 필드 초기화
      actions.setEndDate(values.startDate);
      actions.setEndTime('');
    } else if (value === 'timed') {
      // 시간 지정으로 변경시 종료 시간 자동 설정
      actions.setEndDate(values.startDate);
      if (values.startTime) {
        const startDateTime = new Date(`2000-01-01T${values.startTime}`);
        const endDateTime = addMinutes(startDateTime, 60);
        actions.setEndTime(format(endDateTime, 'HH:mm'));
      }
    }
  }, [values.startDate, values.startTime, actions]);

  // 스케줄 설정 변경 핸들러들
  const handleStartDateChange = useCallback((date: string) => {
    actions.setStartDate(date);
    
    // 종료 날짜가 시작 날짜보다 이전인 경우 자동 조정
    if (values.endDate && values.endDate < date) {
      actions.setEndDate(date);
    }
  }, [values.endDate, actions]);

  const handleStartTimeChange = useCallback((time: string) => {
    actions.setStartTime(time);
    
    // 유효한 시간 형식인지 검증
    const isValidTime = time && 
                       time.includes(':') && 
                       time.split(':').length === 2 &&
                       time.split(':').every(part => part.length > 0 && !isNaN(Number(part)));
    
    if (isValidTime) {
      try {
        // 시간 간격에 따른 자동 종료 시간 계산
        const durationMinutes = values.durationHours * 60 + values.durationMins;
        if (!isNaN(durationMinutes) && durationMinutes > 0) {
          const { endDate: newEndDate, endTime: newEndTime } = calculateEndTime(time, durationMinutes);
          actions.setEndDate(newEndDate);
          actions.setEndTime(newEndTime);
        }
      } catch (error) {
        console.warn('Start time 변경 중 계산 에러:', error);
      }
    } else {
      console.warn('유효하지 않은 시작 시간:', time);
    }
  }, [calculateEndTime, values.durationHours, values.durationMins, actions]);

  const handleDurationHoursChange = useCallback((hours: number) => {
    // 입력값 검증
    if (typeof hours !== 'number' || isNaN(hours)) {
      console.warn('Invalid hours value:', hours);
      return;
    }
    
    actions.setDurationHours(hours);
    
    // 0시간이면 분을 최소 1분으로 설정
    let adjustedMins = values.durationMins;
    if (hours === 0 && values.durationMins === 0) {
      adjustedMins = 1;
      actions.setDurationMins(1);
    }
    
    // 종료 시간 업데이트 (강화된 검증)
    const isValidTime = values.startTime && 
                       values.startTime.includes(':') && 
                       values.startTime.split(':').length === 2 &&
                       values.startTime.split(':').every(part => part.length > 0 && !isNaN(Number(part)));
    
    if (isValidTime) {
      const newDuration = hours * 60 + adjustedMins;
      if (!isNaN(newDuration) && newDuration > 0) {
        try {
          const { endDate: newEndDate, endTime: newEndTime } = calculateEndTime(values.startTime, newDuration);
          actions.setEndDate(newEndDate);
          actions.setEndTime(newEndTime);
        } catch (error) {
          console.warn('Duration 변경 중 계산 에러:', error);
        }
      }
    } else {
      console.warn('Duration 변경 시 유효하지 않은 startTime:', values.startTime);
    }
  }, [values.durationMins, values.startTime, calculateEndTime, actions]);

  const handleDurationMinsChange = useCallback((mins: number) => {
    // 입력값 검증
    if (typeof mins !== 'number' || isNaN(mins)) {
      console.warn('Invalid mins value:', mins);
      return;
    }
    
    actions.setDurationMins(mins);
    
    // 종료 시간 업데이트 (강화된 검증)
    const isValidTime = values.startTime && 
                       values.startTime.includes(':') && 
                       values.startTime.split(':').length === 2 &&
                       values.startTime.split(':').every(part => part.length > 0 && !isNaN(Number(part)));
    
    if (isValidTime) {
      const newDuration = values.durationHours * 60 + mins;
      if (!isNaN(newDuration) && newDuration > 0) {
        try {
          const { endDate: newEndDate, endTime: newEndTime } = calculateEndTime(values.startTime, newDuration);
          actions.setEndDate(newEndDate);
          actions.setEndTime(newEndTime);
        } catch (error) {
          console.warn('Duration 분 변경 중 계산 에러:', error);
        }
      }
    } else {
      console.warn('Duration 분 변경 시 유효하지 않은 startTime:', values.startTime);
    }
  }, [values.durationHours, values.startTime, calculateEndTime, actions]);

  // 반복 설정 핸들러들
  const handleRecurrencePatternChange = useCallback((pattern: RecurrencePattern) => {
    actions.setRecurrencePattern(pattern);

    // 반복 패턴이 'none'이 아닌 경우 반복 설정 활성화
    if (pattern !== 'none') {
      actions.setShowRecurrenceSettings(true);
    }

    // '매주' 패턴을 선택했을 때 오늘 요일을 기본으로 선택
    if (pattern === 'weekly' && values.selectedDaysOfWeek.length === 0) {
      const today = new Date();
      const todayDayOfWeek = today.getDay(); // 0 = 일요일, 1 = 월요일, ... 6 = 토요일
      actions.setSelectedDaysOfWeek([todayDayOfWeek]);
    }
  }, [actions, values.selectedDaysOfWeek]);

  const handleDayOfWeekToggle = useCallback((dayValue: number) => {
    const currentDays = values.selectedDaysOfWeek;
    if (currentDays.includes(dayValue)) {
      actions.setSelectedDaysOfWeek(currentDays.filter(d => d !== dayValue));
    } else {
      actions.setSelectedDaysOfWeek([...currentDays, dayValue].sort());
    }
  }, [actions, values.selectedDaysOfWeek]);

  // 폼 제출 핸들러
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAuthenticated || !user?.id) {
      toast({
        title: '로그인이 필요합니다',
        description: '할일을 추가하려면 먼저 로그인해주세요.',
        variant: 'destructive',
      });
      return;
    }

    if (!values.content.trim()) {
      toast({
        title: '할일 내용을 입력해주세요',
        description: '할일 내용은 필수 항목입니다.',
        variant: 'destructive',
      });
      return;
    }

    // 반복 할일 수정 시 시간 변경 확인
    if (isEditMode && editingTodo && editingTodo.recurrence_pattern && 
        editingTodo.recurrence_pattern !== 'none' && values.scheduleType === 'timed') {
      
      const originalStart = editingTodo.start_time ? new Date(editingTodo.start_time) : null;
      const originalEnd = editingTodo.end_time ? new Date(editingTodo.end_time) : null;
      
      if (originalStart) {
        const newStart = new Date(`${values.startDate}T${values.startTime}+09:00`);
        const newEnd = values.endDate && values.endTime 
          ? new Date(`${values.endDate}T${values.endTime}+09:00`) 
          : addMinutes(newStart, 60);
        
        // 시간이 변경되었는지 확인
        const startTimeChanged = Math.abs(newStart.getTime() - originalStart.getTime()) > 60000; // 1분 이상 차이
        const endTimeChanged = originalEnd ? 
          Math.abs(newEnd.getTime() - originalEnd.getTime()) > 60000 : false;
        
        if (startTimeChanged || endTimeChanged) {
          // 시간 변경 모달 데이터 설정
          setOriginalTimeForUpdate({
            start: originalStart,
            end: originalEnd || undefined
          });
          setNewTimeForUpdate({
            start: newStart,
            end: newEnd
          });
          setOccurrenceDate(originalStart); // 현재 수정 중인 할일의 날짜
          setShowRecurringUpdateDialog(true);
          return; // 여기서 중단하여 시간 변경 모달을 표시
        }
      }
    }

    // 시간 지정 일정인 경우 시작/종료 시간 검증
    if (values.scheduleType === 'timed') {
      if (!values.startDate || !values.startTime) {
        toast({
          title: '시작 시간을 입력해주세요',
          description: '시간 지정 일정에는 시작 시간이 필요합니다.',
          variant: 'destructive',
        });
        return;
      }
      
      const startDateTime = new Date(`${values.startDate}T${values.startTime}`);
      const endDateTime = values.endDate && values.endTime ? 
        new Date(`${values.endDate}T${values.endTime}`) : 
        addMinutes(startDateTime, 60);
      
      if (endDateTime <= startDateTime) {
        toast({
          title: '시간 설정 오류',
          description: '종료 시간은 시작 시간보다 늦어야 합니다.',
          variant: 'destructive',
        });
        return;
      }
      
      // 다음날 12시 초과 제한 검증
      if (values.endDate > values.startDate) {
        const endHour = parseInt(values.endTime.split(':')[0]);
        if (endHour > 12) {
          toast({
            title: '시간 설정 오류',
            description: '다음날 종료 시간은 12:00을 넘을 수 없습니다.',
            variant: 'destructive',
          });
          return;
        }
      }
    }

    // 종일 일정인 경우 날짜 검증
    if (values.scheduleType === 'all_day') {
      if (!values.startDate) {
        toast({
          title: '날짜를 선택해주세요',
          description: '종일 일정에는 날짜가 필요합니다.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 기본 할일 데이터 구성
      const todoData: any = {
        title: values.content.trim(), // ✅ title 필드로 전송 (UI는 content 사용)
        priority: values.priority,
        icon: values.selectedIcon,
        color: getColorById(values.selectedColor).hex,
        schedule_type: values.scheduleType,
      };

      // 스케줄 타입별 시간 설정
      if (values.scheduleType === 'all_day') {
        // 한국시간(KST)으로 날짜 처리
        const selectedDate = new Date(`${values.startDate}T00:00:00+09:00`);
        todoData.start_time = new Date(selectedDate.getTime()).toISOString();
        
        const endDate = new Date(`${values.startDate}T23:59:59+09:00`);
        todoData.end_time = new Date(endDate.getTime()).toISOString();
      } else if (values.scheduleType === 'anytime') {
        // anytime 스케줄: 한국시간으로 날짜 설정
        const selectedDate = new Date(`${values.startDate}T00:00:00+09:00`);
        todoData.start_time = new Date(selectedDate.getTime()).toISOString();
      } else if (values.scheduleType === 'timed') {
        // 한국시간(KST)으로 명시적 지정
        const startDateTime = new Date(`${values.startDate}T${values.startTime}+09:00`);
        const endDateTime = values.endDate && values.endTime 
          ? new Date(`${values.endDate}T${values.endTime}+09:00`) 
          : addMinutes(startDateTime, 60);
        
        todoData.start_time = startDateTime.toISOString();
        todoData.end_time = endDateTime.toISOString();
      }

      // 반복 설정
      if (values.showRecurrenceSettings && 
          values.recurrencePattern && 
          values.recurrencePattern !== 'none') {
        todoData.recurrence_pattern = values.recurrencePattern;
        todoData.recurrence_interval = values.recurrenceInterval;
        
        if (values.recurrencePattern === 'weekly' && values.selectedDaysOfWeek.length > 0) {
          todoData.recurrence_days_of_week = values.selectedDaysOfWeek;
        }
        
        if (values.recurrenceEndType === 'date' && values.recurrenceEndDate) {
          todoData.recurrence_end_date = values.recurrenceEndDate;
        } else if (values.recurrenceEndType === 'count' && values.recurrenceCount) {
          todoData.recurrence_count = values.recurrenceCount;
        }
      } else {
        // 반복 설정이 없거나 빈 문자열인 경우 'none'으로 설정
        todoData.recurrence_pattern = 'none';
      }

      // 출발 정보 설정 (선택사항)
      // 출발 장소는 빈 문자열이어도 저장 (사용자가 지울 수 있도록)
      todoData.departure_location = values.departureLocation;

      // 출발 시간은 날짜와 시간이 모두 있을 때만 저장
      if (values.departureDate && values.departureTime) {
        try {
          // 출발 시간을 ISO 문자열로 변환 (한국시간 기준)
          const departureDateTime = new Date(`${values.departureDate}T${values.departureTime}+09:00`);
          if (!isNaN(departureDateTime.getTime())) {
            todoData.departure_time = departureDateTime.toISOString();
          }
        } catch (error) {
          console.warn('출발 시간 변환 실패:', error);
          // 변환에 실패하면 저장하지 않음
        }
      }

      let createdTodoId: string | null = null;
      
      if (isEditMode && editingTodo?.id) {
        await updateTodo(editingTodo.id, todoData);
      } else {
        const createdTodo = await createTodo(todoData);
        createdTodoId = createdTodo?.id || null;
        
        // 할일 생성 후 연결된 메모들 자동 생성
        if (createdTodoId && values.memos.length > 0) {
          for (const memo of values.memos) {
            if (memo.content.trim()) {
              try {
                await createMemo({
                  content: memo.content.trim(),
                  related_task_id: createdTodoId,
                  is_pinned: false,
                  is_floating: false,
                  user_id: user.id,
                });
              } catch (memoError) {
                console.error('메모 생성 실패:', memoError);
                // 메모 생성 실패는 할일 생성을 방해하지 않음
              }
            }
          }
        }

        // 할일 생성 후 선택된 동기부여 메시지들 연결
        if (createdTodoId && values.selectedMotivations.length > 0) {
          for (const motivation of values.selectedMotivations) {
            try {
              await linkMotivationToTodo(createdTodoId, motivation.id);
            } catch (motivationError) {
              console.error('동기부여 메시지 연결 실패:', motivationError);
              // 동기부여 메시지 연결 실패는 할일 생성을 방해하지 않음
            }
          }
        }
      }

      // 성공 메시지 구성
      let successMessage = isEditMode ? '할일이 수정되었습니다' : '할일이 추가되었습니다';
      
      // 메모가 함께 생성된 경우 메시지에 추가
      if (!isEditMode && values.memos.length > 0) {
        const validMemosCount = values.memos.filter(memo => memo.content.trim()).length;
        if (validMemosCount > 0) {
          successMessage += `\n연결된 메모 ${validMemosCount}개도 함께 생성되었습니다.`;
        }
      }

      // 동기부여 메시지가 함께 연결된 경우 메시지에 추가
      if (!isEditMode && values.selectedMotivations.length > 0) {
        successMessage += `\n동기부여 메시지 ${values.selectedMotivations.length}개도 함께 연결되었습니다.`;
      }
      if (values.scheduleType === 'timed' && values.startDate && values.startTime) {
        const startDateTime = new Date(`${values.startDate}T${values.startTime}`);
        const actionText = isEditMode ? '수정되었습니다' : '추가되었습니다';
        successMessage = `${format(startDateTime, 'MM월 dd일 HH:mm', { locale: ko })}에 예정된 할일이 ${actionText}.`;
      } else if (values.scheduleType === 'all_day' && values.startDate) {
        const startDateTime = new Date(values.startDate);
        const actionText = isEditMode ? '수정되었습니다' : '추가되었습니다';
        successMessage = `${format(startDateTime, 'MM월 dd일', { locale: ko })} 종일 일정이 ${actionText}.`;
      }

      if (values.showRecurrenceSettings && values.recurrencePattern !== 'none') {
        const descriptions = {
          'daily': values.recurrenceInterval === 1 ? '매일 반복' : `${values.recurrenceInterval}일마다 반복`,
          'weekly': values.recurrenceInterval === 1 ? '매주 반복' : `${values.recurrenceInterval}주마다 반복`,
          'monthly': values.recurrenceInterval === 1 ? '매달 반복' : `${values.recurrenceInterval}달마다 반복`,
          'custom': '사용자 지정 반복',
          'none': ''
        };
        successMessage += ` (${descriptions[values.recurrencePattern]})`;
      }

      toast({
        title: '성공!',
        description: successMessage,
      });

      onOpenChange(false);
    } catch (error) {
      console.error(`🔴 [ERROR] 할일 ${isEditMode ? '수정' : '추가'} 실패:`, error);
      
      toast({
        title: isEditMode ? '할일 수정 실패' : '할일 추가 실패',
        description: `할일을 ${isEditMode ? '수정' : '추가'}하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    isAuthenticated, user?.id, values, createTodo, updateTodo, toast, 
    onOpenChange, isEditMode, editingTodo?.id, setIsSubmitting
  ]);

  // 삭제 버튼 클릭 핸들러
  const handleDeleteClick = useCallback((e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (!editingTodo) return;
    
    console.log('🗑️ [DELETE] 할일 삭제 클릭:', {
      todoId: editingTodo.id,
      recurrence_pattern: editingTodo.recurrence_pattern,
      recurrencePattern: (editingTodo as any).recurrencePattern,
      isRecurrenceInstance: (editingTodo as any)._instanceInfo ? true : false
    });
    
    // 반복 일정인지 확인 (snake_case와 camelCase 모두 지원)
    const recurrencePattern = editingTodo.recurrence_pattern || (editingTodo as any).recurrencePattern;
    const isRecurring = recurrencePattern && recurrencePattern !== 'none';
    
    console.log('🗑️ [DELETE] 반복 할일 여부:', { recurrencePattern, isRecurring });
    
    if (isRecurring) {
      console.log('🗑️ [DELETE] 반복 삭제 모달 표시 호출');
      setShowRecurringDeleteDialog(true);
    } else {
      console.log('🗑️ [DELETE] 일반 삭제 모달 표시 호출');
      setShowDeleteDialog(true);
    }
  }, [editingTodo, setShowRecurringDeleteDialog, setShowDeleteDialog]);

  // 일반 할일 삭제 확인
  const handleSimpleDelete = useCallback(async (deleteLinkedMemosOption?: boolean) => {
    if (!editingTodo) return;
    
    setIsDeleting(true);
    try {
      let deletedMemoCount = 0;
      
      // 연결된 메모 삭제 옵션이 선택된 경우
      if (deleteLinkedMemosOption) {
        try {
          deletedMemoCount = await deleteLinkedMemos(editingTodo.id);
          console.log(`✅ 연결된 메모 ${deletedMemoCount}개 삭제 완료`);
        } catch (memoError) {
          console.error('⚠️ 연결된 메모 삭제 중 일부 실패:', memoError);
          // 메모 삭제 실패는 할일 삭제를 중단시키지 않음
        }
      }
      
      await deleteTodo(editingTodo.id);
      
      let successMessage = '할일이 삭제되었습니다.';
      if (deleteLinkedMemosOption && deletedMemoCount > 0) {
        successMessage += `\n연결된 메모 ${deletedMemoCount}개도 함께 삭제되었습니다.`;
      }
      
      toast({
        title: '삭제 완료',
        description: successMessage,
      });
      
      setShowDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('🔴 [ERROR] 할일 삭제 실패:', error);
      
      toast({
        title: '삭제 실패',
        description: `할일을 삭제하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [editingTodo, deleteTodo, deleteLinkedMemos, toast, onOpenChange, setIsDeleting, setShowDeleteDialog]);

  // 반복 일정 삭제 확인
  const handleRecurringDelete = useCallback(async (deleteType: 'this' | 'future' | 'all', deleteLinkedMemosOption?: boolean) => {
    if (!editingTodo) return;
    
    setIsDeleting(true);
    try {
      let deletedMemoCount = 0;
      
      // 연결된 메모 삭제 옵션이 선택된 경우
      if (deleteLinkedMemosOption) {
        try {
          deletedMemoCount = await deleteLinkedMemos(editingTodo.id);
          console.log(`✅ 반복 할일 연결된 메모 ${deletedMemoCount}개 삭제 완료`);
        } catch (memoError) {
          console.error('⚠️ 반복 할일 연결된 메모 삭제 중 일부 실패:', memoError);
          // 메모 삭제 실패는 할일 삭제를 중단시키지 않음
        }
      }
      
      // 반복 인스턴스인지 확인하여 적절한 ID와 날짜 전달
      const isInstance = editingTodo.recurrence_pattern && (editingTodo as any)._instanceInfo;
      const targetId = editingTodo.id;
      let excludedDate: string | undefined;
      
      if (isInstance && deleteType === 'this') {
        const instanceInfo = (editingTodo as any)._instanceInfo;
        
        if (instanceInfo?.instanceDate) {
          excludedDate = instanceInfo.instanceDate;
        } else if (instanceInfo?.startTime) {
          const startTime = new Date(instanceInfo.startTime);
          excludedDate = startTime.toISOString().split('T')[0];
        } else if (editingTodo.start_time) {
          const startTime = new Date(editingTodo.start_time);
          excludedDate = startTime.toISOString().split('T')[0];
        }
      }
      
      await deleteRecurringTodo(targetId, deleteType, excludedDate);
      
      const deleteMessages = {
        'this': '이 일정만 삭제되었습니다.',
        'future': '이 일정부터 모든 미래 일정이 삭제되었습니다.',
        'all': '모든 반복 일정이 삭제되었습니다.'
      };
      
      let successMessage = deleteMessages[deleteType];
      if (deleteLinkedMemosOption && deletedMemoCount > 0) {
        successMessage += `\n연결된 메모 ${deletedMemoCount}개도 함께 삭제되었습니다.`;
      }
      
      toast({
        title: '삭제 완료',
        description: successMessage,
      });
      
      setShowRecurringDeleteDialog(false);
      onOpenChange(false);
    } catch (error) {
      console.error('🔴 [ERROR] 반복 일정 삭제 실패:', error);
      
      toast({
        title: '삭제 실패',
        description: `반복 일정을 삭제하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  }, [editingTodo, deleteRecurringTodo, deleteLinkedMemos, toast, onOpenChange, setIsDeleting, setShowRecurringDeleteDialog]);

  // 반복 할일 시간 변경 핸들러
  const handleRecurringTimeUpdate = useCallback(async (choice: 'this-only' | 'from-now' | 'all') => {
    if (!editingTodo || !newTimeForUpdate || !occurrenceDate) return;

    setIsSubmitting(true);
    try {
      // 기본 할일 데이터 구성
      const todoData: any = {
        title: values.content.trim(), // ✅ title 필드로 전송 (UI는 content 사용)
        priority: values.priority,
        icon: values.selectedIcon,
        color: getColorById(values.selectedColor).hex,
        schedule_type: values.scheduleType,
        start_time: newTimeForUpdate.start.toISOString(),
        end_time: newTimeForUpdate.end?.toISOString() || addMinutes(newTimeForUpdate.start, 60).toISOString(),
      };

      // 반복 설정
      if (values.showRecurrenceSettings && 
          values.recurrencePattern && 
          values.recurrencePattern !== 'none') {
        todoData.recurrence_pattern = values.recurrencePattern;
        todoData.recurrence_interval = values.recurrenceInterval;
        
        if (values.recurrencePattern === 'weekly' && values.selectedDaysOfWeek.length > 0) {
          todoData.recurrence_days_of_week = values.selectedDaysOfWeek;
        }
        
        if (values.recurrenceEndType === 'date' && values.recurrenceEndDate) {
          todoData.recurrence_end_date = values.recurrenceEndDate;
        } else if (values.recurrenceEndType === 'count' && values.recurrenceCount) {
          todoData.recurrence_count = values.recurrenceCount;
        }
      }

      // updateRecurringTodo 호출 (선택에 따라 업데이트 범위가 결정됨)
      const updateType: 'this' | 'future' | 'all' = choice === 'this-only' ? 'this' : choice === 'from-now' ? 'future' : 'all';
      await updateRecurringTodo?.(editingTodo.id, todoData, updateType);

      const successMessages = {
        'this-only': '이 일정만 시간이 변경되었습니다.',
        'from-now': '이 일정부터 모든 미래 일정의 시간이 변경되었습니다.',
        'all': '모든 반복 일정의 시간이 변경되었습니다.'
      };

      toast({
        title: '시간 변경 완료!',
        description: successMessages[choice],
      });

      setShowRecurringUpdateDialog(false);
      onOpenChange(false);

    } catch (error) {
      console.error('🔴 [ERROR] 반복 할일 시간 변경 실패:', error);
      
      toast({
        title: '시간 변경 실패',
        description: `반복 할일 시간을 변경하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [editingTodo, newTimeForUpdate, occurrenceDate, values, updateRecurringTodo, toast, setShowRecurringUpdateDialog, onOpenChange, setIsSubmitting]);

  return {
    // 계산 유틸리티
    calculateEndTime,
    
    // 스케줄 관련 핸들러
    handleScheduleTypeChange,
    handleStartDateChange,
    handleStartTimeChange,
    handleDurationHoursChange,
    handleDurationMinsChange,
    
    // 반복 설정 핸들러
    handleRecurrencePatternChange,
    handleDayOfWeekToggle,
    
    // 폼 제출 및 삭제
    handleSubmit,
    handleDeleteClick,
    handleSimpleDelete,
    handleRecurringDelete,
    
    // 반복 할일 시간 변경
    handleRecurringTimeUpdate,
  };
};
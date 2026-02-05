import { useState, useCallback } from 'react';
import { format, startOfMonth } from 'date-fns';
import { useTodoStore } from '@/state/stores/todoStore';
import { usePomodoroStore } from '@/state/stores/pomodoroStore';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useProjectStore } from '@/state/stores/projectStore';
import { Todo } from '@/entities/todo/Todo';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { TodoCompletionsService } from '@/services/todo-completions.service';
import { createTodoExclusionWithJWT, deleteTodoExclusionWithJWT } from '@/lib/supabase/todo-exclusions';
import { postponeTodoInstance, removeAnytimeOverrideWithJWT } from '@/lib/supabase/todo-postpone';
import { useToast } from '@/hooks/use-toast';
import type { PostponeOptions } from '@/types';
import type { TimeGap } from '@/lib/timeGapUtils';
import type { TimelineItem } from '../types';

interface UseTimelineActionsParams {
  userId: string;
  setRecurrenceInstances: React.Dispatch<React.SetStateAction<TimelineItem[]>>;
  setCompletions: React.Dispatch<React.SetStateAction<{ todo_id: string; completion_date: string }[]>>;
  loadAnytimeCount: (navigatedMonth: Date) => Promise<void>;
  navigatedMonth: Date;
}

export function useTimelineActions({
  userId,
  setRecurrenceInstances,
  setCompletions,
  loadAnytimeCount,
  navigatedMonth,
}: UseTimelineActionsParams) {
  const { todos, fetchAllTodos, updateTodo, deleteTodo, updateRecurringTodo, deleteRecurringTodo } = useTodoStore();
  const { connectRecurringTodo } = usePomodoroStore();
  const { createProject } = useProjectStore();
  const {
    setLinkedRecurringTodo,
    startAdhocMode,
    enterExecuteMode,
  } = useADHDStore();
  const { toast } = useToast();

  // 편집 모달 상태
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [editFormData, setEditFormData] = useState<TodoFormData | null>(null);

  // 삭제 확인 상태
  const [deletingTodoId, setDeletingTodoId] = useState<string | null>(null);

  // 미루기 옵션 시트 상태
  const [postponeSheetOpen, setPostponeSheetOpen] = useState(false);
  const [postponingItem, setPostponingItem] = useState<TimelineItem | null>(null);
  const [isPostponeProcessing, setIsPostponeProcessing] = useState(false);

  // 빈 시간 사후 기록 모달 상태
  const [isQuickLogModalOpen, setIsQuickLogModalOpen] = useState(false);
  const [quickLogPrefillTime, setQuickLogPrefillTime] = useState<{ start: Date; end: Date } | null>(null);
  const [quickLogInitialMode, setQuickLogInitialMode] = useState<'detailed' | 'new' | undefined>(undefined);

  // 완료 토글
  const handleToggleComplete = useCallback(async (item: TimelineItem) => {
    // "미룸 완료" 항목의 완료 취소
    if (item.id?.endsWith('-actual-completion') && item.completed) {
      if (item.recurrenceSourceId && item.recurrenceOccurrenceDate) {
        try {
          await TodoCompletionsService.markRecurrenceAsIncomplete(
            item.recurrenceSourceId,
            userId,
            item.recurrenceOccurrenceDate
          );
          await deleteTodoExclusionWithJWT(
            item.recurrenceSourceId,
            item.recurrenceOccurrenceDate,
            userId
          );
          await fetchAllTodos();
        } catch (error) {
          console.error('❌ 미룸 완료 항목 미완료 처리 실패:', error);
        }
      }
      return;
    }

    if (item.isRecurrenceInstance && item.recurrenceSourceId && item.recurrenceOccurrenceDate) {
      try {
        await TodoCompletionsService.toggleCompletion(
          item.recurrenceSourceId,
          userId,
          new Date(item.recurrenceOccurrenceDate),
          item.completed
        );

        if (item.completed) {
          setCompletions(prev => prev.filter(c =>
            !(c.todo_id === item.recurrenceSourceId && c.completion_date === item.recurrenceOccurrenceDate)
          ));
        } else {
          setCompletions(prev => [...prev, {
            todo_id: item.recurrenceSourceId!,
            completion_date: item.recurrenceOccurrenceDate!
          }]);
        }

        setRecurrenceInstances(prev => prev.map(inst =>
          inst.id === item.id
            ? { ...inst, completed: !inst.completed }
            : inst
        ));
      } catch (error) {
        console.error('반복 인스턴스 완료 토글 실패:', error);
      }
    } else if (item.originalTodo) {
      // 미룸 생성 독립 할일의 완료 취소: 원본 복원
      if (item.originalTodo.parentRecurringTodoId && item.completed) {
        try {
          await removeAnytimeOverrideWithJWT({
            todoId: item.originalTodo.id,
            parentTodoId: item.originalTodo.parentRecurringTodoId,
            occurrenceDate: item.originalTodo.occurrenceDate!,
            userId
          });
          await fetchAllTodos();
        } catch (error) {
          console.error('❌ 미룸 생성 독립 할일 완료 취소 실패:', error);
        }
        return;
      }

      await updateTodo(item.originalTodo.id, { completed: !item.completed });
    }
  }, [userId, updateTodo, fetchAllTodos, setCompletions, setRecurrenceInstances]);

  // 삭제 처리
  const handleDelete = useCallback(async (todoId: string) => {
    await deleteTodo(todoId);
    setDeletingTodoId(null);
  }, [deleteTodo]);

  // 미룸 생성 항목 원래대로 복원
  const handleRestoreOriginal = useCallback(async (item: TimelineItem) => {
    if (!item.originalTodo?.parentRecurringTodoId || !item.originalTodo?.occurrenceDate) {
      console.error('원래대로 복원 실패: 필수 정보 없음');
      return;
    }

    try {
      await removeAnytimeOverrideWithJWT({
        todoId: item.originalTodo.id,
        parentTodoId: item.originalTodo.parentRecurringTodoId,
        occurrenceDate: item.originalTodo.occurrenceDate,
        userId
      });

      toast({
        title: '원래대로 복원',
        description: '미룸을 취소하고 원래 시간으로 복원했어요',
      });

      await fetchAllTodos();
    } catch (error) {
      console.error('원래대로 복원 실패:', error);
      toast({
        title: '복원 실패',
        description: '다시 시도해주세요',
        variant: 'destructive'
      });
    }
  }, [userId, fetchAllTodos, toast]);

  // Todo → TodoFormData 변환
  const todoToFormData = useCallback((todo: Todo, isInstance?: boolean): TodoFormData => {
    return {
      title: todo.title,
      icon: todo.icon || undefined,
      color: todo.color || undefined,
      scheduledDate: todo.startTime ? new Date(todo.startTime) : undefined,
      isHighlight: false,
      completed: todo.completed,
      projectIds: todo.projectId ? [todo.projectId] : [],
      noteIds: [],
      displayOrder: todo.orderIndex,
      includeTime: todo.scheduleType === 'timed',
      includeEndDate: !!todo.endTime,
      startTime: todo.startTime ? new Date(todo.startTime).toTimeString().slice(0, 5) : undefined,
      endDate: todo.endTime ? new Date(todo.endTime) : undefined,
      endTime: todo.endTime ? new Date(todo.endTime).toTimeString().slice(0, 5) : undefined,
      scheduleType: todo.scheduleType || 'none',
      anytimeDuration: undefined,
      recurrencePattern: todo.recurrencePattern,
      recurrenceInterval: todo.recurrenceInterval,
      recurrenceEndType: todo.recurrenceEndDate ? 'date' : (todo.recurrenceCount ? 'count' : 'never'),
      recurrenceEndDate: todo.recurrenceEndDate ? new Date(todo.recurrenceEndDate) : undefined,
      recurrenceCount: todo.recurrenceCount || undefined,
      selectedDaysOfWeek: todo.recurrenceDaysOfWeek || undefined,
      isRecurrenceInstance: isInstance ?? false,
      originalStartDate: todo.startTime ? new Date(todo.startTime) : undefined,
    };
  }, []);

  // 편집 모달 열기
  const handleEditClick = useCallback((item: TimelineItem) => {
    if (item.id?.endsWith('-actual-completion')) {
      toast({
        title: '완료된 미룸 항목',
        description: '체크 버튼을 눌러 되돌릴 수 있어요',
      });
      return;
    }

    if (item.originalTodo?.parentRecurringTodoId) {
      if (item.completed) {
        toast({
          title: '완료된 미룸 항목',
          description: '체크 버튼을 눌러 되돌릴 수 있어요',
        });
      } else {
        toast({
          title: '미룸 할일',
          description: '"미룸완료" 또는 "원래대로 복원"을 사용하세요',
        });
      }
      return;
    }

    if (item.isRecurrenceInstance && item.exclusionReason === 'postponed') {
      toast({
        title: '미룬 할일',
        description: '미룸 완료 항목의 체크 버튼을 눌러 되돌릴 수 있어요',
      });
      return;
    }

    if (item.originalTodo) {
      setEditingTodo(item.originalTodo);
      setEditingItem(item);

      const formData = todoToFormData(item.originalTodo, item.isRecurrenceInstance);
      if (item.isRecurrenceInstance && item.startTime) {
        formData.scheduledDate = item.startTime;
        formData.startTime = item.startTime.toTimeString().slice(0, 5);
        if (item.endTime) {
          formData.endDate = item.endTime;
          formData.endTime = item.endTime.toTimeString().slice(0, 5);
        }
      }
      setEditFormData(formData);
    }
  }, [todoToFormData, toast]);

  // 건너뛰기 처리 (반복 인스턴스)
  const handleSkipInstance = useCallback(async (
    item: TimelineItem,
    reason: 'postponed' | 'not_needed' | 'missed' = 'not_needed'
  ) => {
    if (!item.isRecurrenceInstance || !item.recurrenceSourceId || !item.recurrenceOccurrenceDate) {
      console.error('건너뛰기 실패: 필수 정보 없음');
      return;
    }

    try {
      await createTodoExclusionWithJWT({
        parent_todo_id: item.recurrenceSourceId,
        excluded_date: item.recurrenceOccurrenceDate,
        user_id: userId,
        exclusion_reason: reason
      });

      setRecurrenceInstances(prev => prev.map(inst =>
        inst.id === item.id
          ? { ...inst, isSkipped: true, exclusionReason: reason }
          : inst
      ));
    } catch (error) {
      console.error('건너뛰기 실패:', error);
    }
  }, [userId, setRecurrenceInstances]);

  // 일반 할일/반복 할일 통합 스킵 핸들러
  const handleSkipTodo = useCallback(async (
    item: TimelineItem,
    reason: 'not_needed' | 'missed'
  ) => {
    if (item.isRecurrenceInstance) {
      await handleSkipInstance(item, reason);
    } else {
      try {
        await updateTodo(item.id, { skip_status: reason });
        await fetchAllTodos();
      } catch (error) {
        console.error('일반 할일 스킵 실패:', error);
      }
    }
  }, [handleSkipInstance, updateTodo, fetchAllTodos]);

  // 일반 할일 스킵 취소 핸들러
  const handleUnskipTodo = useCallback(async (item: TimelineItem) => {
    if (item.isRecurrenceInstance) {
      if (!item.recurrenceSourceId || !item.recurrenceOccurrenceDate) {
        console.error('제외 취소 실패: 필수 정보 없음');
        return;
      }
      try {
        await deleteTodoExclusionWithJWT(
          item.recurrenceSourceId,
          item.recurrenceOccurrenceDate,
          userId
        );
        setRecurrenceInstances(prev => prev.map(inst =>
          inst.id === item.id
            ? { ...inst, isSkipped: false, exclusionReason: undefined }
            : inst
        ));
      } catch (error) {
        console.error('제외 취소 실패:', error);
      }
    } else {
      try {
        await updateTodo(item.id, { skip_status: null });
        await fetchAllTodos();
      } catch (error) {
        console.error('일반 할일 스킵 취소 실패:', error);
      }
    }
  }, [updateTodo, fetchAllTodos, userId, setRecurrenceInstances]);

  // 제외 상태 취소 핸들러
  const handleCancelExclusion = useCallback(async (item: TimelineItem) => {
    if (!item.isRecurrenceInstance || !item.recurrenceSourceId || !item.recurrenceOccurrenceDate) {
      console.error('제외 취소 실패: 필수 정보 없음');
      return;
    }

    if (item.exclusionReason === 'postponed') {
      toast({
        title: '미룬 할일',
        description: '미룸 완료 항목의 체크 버튼을 눌러 되돌릴 수 있어요',
      });
      return;
    }

    try {
      await deleteTodoExclusionWithJWT(
        item.recurrenceSourceId,
        item.recurrenceOccurrenceDate,
        userId
      );
      setRecurrenceInstances(prev => prev.map(inst =>
        inst.id === item.id
          ? { ...inst, isSkipped: false, exclusionReason: undefined }
          : inst
      ));
    } catch (error) {
      console.error('제외 취소 실패:', error);
    }
  }, [userId, toast, setRecurrenceInstances]);

  // 미루기 옵션 시트 열기
  const handleOpenPostponeSheet = useCallback((item: TimelineItem) => {
    setPostponingItem(item);
    setPostponeSheetOpen(true);
  }, []);

  // 미루기 처리
  const handlePostpone = useCallback(async (options: PostponeOptions) => {
    if (!postponingItem) {
      console.error('미루기 실패: postponingItem 없음');
      return;
    }

    setIsPostponeProcessing(true);

    try {
      const { action, recordPostponement, newTime } = options;

      const isRecurrenceInstance = postponingItem.isRecurrenceInstance &&
        postponingItem.recurrenceSourceId &&
        postponingItem.recurrenceOccurrenceDate;

      if (isRecurrenceInstance) {
        if (action === 'start_now') {
          if (recordPostponement) {
            await createTodoExclusionWithJWT({
              parent_todo_id: postponingItem.recurrenceSourceId!,
              excluded_date: postponingItem.recurrenceOccurrenceDate!,
              user_id: userId,
              exclusion_reason: 'postponed'
            });
          }

          await enterExecuteMode(userId);

          setLinkedRecurringTodo(
            postponingItem.recurrenceSourceId!,
            postponingItem.recurrenceOccurrenceDate!,
            postponingItem.title
          );

          startAdhocMode();
        } else {
          await postponeTodoInstance({
            parentTodoId: postponingItem.recurrenceSourceId!,
            occurrenceDate: postponingItem.recurrenceOccurrenceDate!,
            userId,
            action,
            recordPostponement,
            newTime,
            originalStartTime: postponingItem.startTime
              ? format(postponingItem.startTime, 'HH:mm')
              : undefined,
          });

          if (action === 'anytime') {
            loadAnytimeCount(navigatedMonth);
          }

          if (recordPostponement) {
            let newEndTime: string | undefined;
            let newStartTime: string | undefined;
            if (action === 'reschedule' && newTime) {
              const [hours, minutes] = newTime.split(':').map(Number);
              const occDate = postponingItem.recurrenceOccurrenceDate!;
              const startDate = new Date(`${occDate}T00:00:00+09:00`);
              startDate.setHours(hours, minutes, 0, 0);
              newStartTime = startDate.toISOString();

              if (postponingItem.startTime && postponingItem.endTime) {
                const originalDuration = new Date(postponingItem.endTime).getTime() - new Date(postponingItem.startTime).getTime();
                newEndTime = new Date(startDate.getTime() + originalDuration).toISOString();
              }
            }

            setRecurrenceInstances(prev => prev.map(inst =>
              inst.id === postponingItem.id
                ? {
                    ...inst,
                    isSkipped: true,
                    exclusionReason: 'postponed',
                    postponedToTime: newEndTime,
                    postponedToStartTime: newStartTime,
                  }
                : inst
            ));
          }

          await fetchAllTodos();
        }
      } else {
        if (action === 'start_now') {
          await enterExecuteMode(userId);
          startAdhocMode();
        } else if (action === 'reschedule' && newTime) {
          const [hours, minutes] = newTime.split(':').map(Number);
          const newStart = new Date(postponingItem.startTime || new Date());
          newStart.setHours(hours, minutes, 0, 0);

          let newEnd: Date | null = null;
          if (postponingItem.endTime && postponingItem.startTime) {
            const duration = new Date(postponingItem.endTime).getTime() -
                            new Date(postponingItem.startTime).getTime();
            newEnd = new Date(newStart.getTime() + duration);
          }

          await updateTodo(postponingItem.id, {
            start_time: newStart.toISOString(),
            end_time: newEnd?.toISOString() ?? undefined,
          });

          await fetchAllTodos();
        } else if (action === 'anytime') {
          await updateTodo(postponingItem.id, {
            schedule_type: 'anytime',
            start_time: undefined,
            end_time: undefined,
          });

          loadAnytimeCount(navigatedMonth);
          await fetchAllTodos();
        }
      }

      setPostponeSheetOpen(false);
      setPostponingItem(null);
    } catch (error) {
      console.error('미루기 처리 실패:', error);
    } finally {
      setIsPostponeProcessing(false);
    }
  }, [postponingItem, userId, connectRecurringTodo, updateTodo, fetchAllTodos, setRecurrenceInstances, loadAnytimeCount, navigatedMonth, enterExecuteMode, setLinkedRecurringTodo, startAdhocMode]);

  // 빈 시간 클릭 핸들러
  const handleTimeGapClick = useCallback((gap: TimeGap) => {
    setQuickLogPrefillTime({
      start: gap.startTime,
      end: gap.endTime
    });
    setQuickLogInitialMode('detailed');
    setIsQuickLogModalOpen(true);
  }, []);

  // 할일 추가 핸들러
  const handleAddTodo = useCallback(() => {
    const startDate = startOfMonth(navigatedMonth);
    const endDate = new Date(startDate);
    endDate.setHours(1, 0, 0, 0);
    setQuickLogPrefillTime({
      start: startDate,
      end: endDate
    });
    setQuickLogInitialMode('new');
    setIsQuickLogModalOpen(true);
  }, [navigatedMonth]);

  // 프로젝트 생성 핸들러
  const handleCreateProject = useCallback(async (title: string) => {
    const newProject = await createProject(userId, { title });
    if (!newProject) {
      throw new Error('프로젝트 생성에 실패했습니다.');
    }
    return newProject;
  }, [userId, createProject]);

  // 프로젝트 즉시 저장 핸들러
  const handleProjectImmediateSave = useCallback(async (projectId: string | null) => {
    if (!editingTodo) return;
    await updateTodo(editingTodo.id, { project_id: projectId });
  }, [editingTodo, updateTodo]);

  // 편집 저장
  const handleEditSave = useCallback(async (formData: TodoFormData) => {
    if (!editingTodo) return;

    const formatTimeToISO = (timeStr: string | undefined, baseDate: Date): string | undefined => {
      if (!timeStr) return undefined;
      if (timeStr.includes('T')) return timeStr;
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(baseDate);
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString();
    };

    const baseDate = formData.scheduledDate || new Date();

    await updateTodo(editingTodo.id, {
      title: formData.title,
      icon: formData.icon,
      color: formData.color,
      start_time: formData.startTime
        ? formatTimeToISO(formData.startTime, baseDate)
        : formData.scheduledDate?.toISOString(),
      end_time: formData.endTime
        ? formatTimeToISO(formData.endTime, baseDate)
        : undefined,
      schedule_type: formData.scheduleType,
      completed: formData.completed,
      recurrence_pattern: formData.recurrencePattern as any,
      recurrence_interval: formData.recurrenceInterval,
      recurrence_end_date: formData.recurrenceEndDate?.toISOString().split('T')[0],
      recurrence_count: formData.recurrenceCount,
      recurrence_days_of_week: formData.selectedDaysOfWeek,
      project_id: formData.projectIds?.[0] || null,
    });

    setEditingTodo(null);
    setEditFormData(null);
  }, [editingTodo, updateTodo]);

  // 편집 삭제
  const handleEditDelete = useCallback(async () => {
    if (!editingTodo) return;

    if (editingItem?.id?.endsWith('-actual-completion')) {
      if (editingItem.recurrenceSourceId && editingItem.recurrenceOccurrenceDate) {
        try {
          await TodoCompletionsService.markRecurrenceAsIncomplete(
            editingItem.recurrenceSourceId,
            userId,
            editingItem.recurrenceOccurrenceDate
          );
          await deleteTodoExclusionWithJWT(
            editingItem.recurrenceSourceId,
            editingItem.recurrenceOccurrenceDate,
            userId
          );
          await fetchAllTodos();
        } catch (error) {
          console.error('❌ 미룸 완료 항목 삭제 실패:', error);
        }
      }
      setEditingTodo(null);
      setEditFormData(null);
      setEditingItem(null);
      return;
    }

    if (editingItem?.isRecurrenceInstance && editingItem?.recurrenceSourceId && editingItem?.recurrenceOccurrenceDate) {
      try {
        await createTodoExclusionWithJWT({
          parent_todo_id: editingItem.recurrenceSourceId,
          excluded_date: editingItem.recurrenceOccurrenceDate,
          user_id: userId,
          exclusion_reason: 'deleted'
        });
        await fetchAllTodos();
      } catch (error) {
        console.error('❌ 반복 인스턴스 제외 처리 실패:', error);
      }
    } else {
      await deleteTodo(editingTodo.id);
    }

    setEditingTodo(null);
    setEditFormData(null);
    setEditingItem(null);
  }, [editingTodo, editingItem, deleteTodo, fetchAllTodos, userId]);

  // 반복 할일 삭제
  const handleRecurringDelete = useCallback(async (
    deleteType: 'this' | 'future' | 'all'
  ) => {
    if (!editingTodo || !editingItem) return;

    const isInstance = editingItem.isRecurrenceInstance;
    const sourceId = isInstance ? editingItem.recurrenceSourceId : editingTodo.id;
    const occurrenceDate = isInstance && editingItem.recurrenceOccurrenceDate
      ? editingItem.recurrenceOccurrenceDate
      : undefined;

    if (!sourceId) {
      console.error('반복 할일 ID를 찾을 수 없습니다.');
      return;
    }

    try {
      await deleteRecurringTodo(sourceId, deleteType, occurrenceDate);
      await fetchAllTodos();
    } catch (error) {
      console.error('반복 할일 삭제 실패:', error);
    }

    setEditingTodo(null);
    setEditFormData(null);
    setEditingItem(null);
  }, [editingTodo, editingItem, deleteRecurringTodo, fetchAllTodos]);

  // 반복 할일 변경 저장
  const handleRecurringSave = useCallback(async (
    formData: TodoFormData,
    updateType: 'this' | 'future' | 'all'
  ) => {
    if (!editingTodo || !editingItem) return;

    const isInstance = editingItem.isRecurrenceInstance;
    const sourceId = isInstance ? editingItem.recurrenceSourceId : editingTodo.id;
    const occurrenceDate = isInstance && editingItem.recurrenceOccurrenceDate
      ? new Date(editingItem.recurrenceOccurrenceDate)
      : formData.scheduledDate || new Date();

    if (!sourceId) {
      console.error('반복 할일 ID를 찾을 수 없습니다.');
      return;
    }

    const formatTimeToISO = (timeStr: string | undefined, baseDate: Date): string | undefined => {
      if (!timeStr) return undefined;
      if (timeStr.includes('T')) return timeStr;
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(baseDate);
      date.setHours(hours, minutes, 0, 0);
      return date.toISOString();
    };

    const formatTimeToISOPreservingOriginalDate = (
      timeStr: string | undefined,
      originalStartTime: string | undefined
    ): string | undefined => {
      if (!timeStr) return undefined;
      if (timeStr.includes('T')) return timeStr;
      if (!originalStartTime) return formatTimeToISO(timeStr, new Date());
      const [hours, minutes] = timeStr.split(':').map(Number);
      const originalDate = new Date(originalStartTime);
      originalDate.setHours(hours, minutes, 0, 0);
      return originalDate.toISOString();
    };

    let startTimeISO: string | undefined;
    let endTimeISO: string | undefined;

    if (updateType === 'all') {
      const originalTodo = todos.find(t => t.id === sourceId);
      const originalStartTime = originalTodo?.startTime?.toISOString();
      startTimeISO = formatTimeToISOPreservingOriginalDate(formData.startTime, originalStartTime);
      endTimeISO = formatTimeToISOPreservingOriginalDate(formData.endTime, originalStartTime);
    } else {
      startTimeISO = formatTimeToISO(formData.startTime, occurrenceDate);
      endTimeISO = formatTimeToISO(formData.endTime, occurrenceDate);
    }

    await updateRecurringTodo(
      sourceId,
      {
        title: formData.title,
        icon: formData.icon,
        color: formData.color,
        start_time: startTimeISO,
        end_time: endTimeISO,
        schedule_type: formData.scheduleType,
      },
      updateType,
      occurrenceDate
    );

    setEditingTodo(null);
    setEditingItem(null);
    setEditFormData(null);
  }, [editingTodo, editingItem, updateRecurringTodo, todos]);

  // 편집 모달 닫기 핸들러 (X 버튼용)
  const closeEditModal = useCallback(() => {
    setEditingTodo(null);
    setEditingItem(null);
    setEditFormData(null);
  }, []);

  // QuickLog 모달 닫기 핸들러
  const handleCloseQuickLog = useCallback(() => {
    setIsQuickLogModalOpen(false);
    setQuickLogPrefillTime(null);
    setQuickLogInitialMode(undefined);
  }, []);

  return {
    // 편집 모달 상태
    editingTodo,
    editingItem,
    editFormData,
    setEditFormData,
    closeEditModal,
    // 삭제 확인 상태
    deletingTodoId,
    setDeletingTodoId,
    // 미루기 상태
    postponeSheetOpen,
    postponingItem,
    isPostponeProcessing,
    setPostponeSheetOpen,
    setPostponingItem,
    // 빠른 기록 상태
    isQuickLogModalOpen,
    quickLogPrefillTime,
    quickLogInitialMode,
    handleCloseQuickLog,
    // 핸들러
    handleToggleComplete,
    handleDelete,
    handleRestoreOriginal,
    handleEditClick,
    handleSkipTodo,
    handleUnskipTodo,
    handleCancelExclusion,
    handleOpenPostponeSheet,
    handlePostpone,
    handleTimeGapClick,
    handleAddTodo,
    handleCreateProject,
    handleProjectImmediateSave,
    handleEditSave,
    handleEditDelete,
    handleRecurringDelete,
    handleRecurringSave,
  };
}

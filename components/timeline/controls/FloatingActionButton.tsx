'use client';

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import TodoEditModal from '@/components/second-brain/TodoEditModal';
import { type TodoFormData } from '@/components/second-brain/shared/TodoFormFields';
import { useTodoStore } from '@/state/stores/todoStore';
import { useAuth } from '@/app/context/AuthContext';

interface FloatingActionButtonProps {
  className?: string;
  currentDate?: Date; // 타임라인에서 현재 보고 있는 날짜
}

// 빈 폼 데이터 초기화
const getEmptyTodoForm = (scheduledDate?: Date): TodoFormData => {
  const now = new Date();
  const endTime = new Date(now.getTime() + 30 * 60 * 1000); // 현재 시간 + 30분

  return {
    title: '',
    scheduledDate: scheduledDate || new Date(),
    isHighlight: false,
    completed: false,
    projectIds: [],
    noteIds: [],
    scheduleType: 'timed', // 타임라인에서는 시간지정이 기본
    includeTime: true,
    includeEndDate: true,
    startTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    endDate: scheduledDate || new Date(),
    endTime: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
  };
};

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  className,
  currentDate
}) => {
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [todoForm, setTodoForm] = useState<TodoFormData>(getEmptyTodoForm(currentDate));

  const { user } = useAuth();
  const { createTodo } = useTodoStore();

  const handleAddTodo = () => {
    // 모달 열 때 폼 초기화 (현재 날짜로)
    setTodoForm(getEmptyTodoForm(currentDate));
    setTodoModalOpen(true);
  };

  const handleClose = () => {
    setTodoModalOpen(false);
    setTodoForm(getEmptyTodoForm(currentDate));
  };

  const handleSave = async (formData: TodoFormData) => {
    if (!user?.id || !formData.title.trim()) return;

    try {
      // 시간 처리
      let finalDateTime: Date | undefined = formData.scheduledDate;

      if (formData.scheduleType === 'timed' && formData.startTime && finalDateTime) {
        const [hours, minutes] = formData.startTime.split(':');
        finalDateTime = new Date(finalDateTime);
        finalDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      }

      // end_time 처리: endDate + endTime 결합하여 ISO 타임스탬프 생성
      let finalEndDateTime: string | undefined;
      if (formData.scheduleType === 'timed' && formData.endTime && formData.endDate) {
        const [endHours, endMinutes] = formData.endTime.split(':');
        const endDateTime = new Date(formData.endDate);
        endDateTime.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
        finalEndDateTime = endDateTime.toISOString();
      }

      // createTodo 호출
      await createTodo({
        user_id: user.id,
        title: formData.title,
        schedule_type: formData.scheduleType || 'anytime',
        start_time: finalDateTime?.toISOString(),
        end_time: finalEndDateTime,
        is_today_highlight: formData.isHighlight,
        completed: formData.completed,
        project_ids: formData.projectIds,
        icon: formData.icon,
        color: formData.color,
        // 반복 설정 필드
        recurrence_pattern: (formData.recurrencePattern || 'none') as 'none' | 'daily' | 'weekly' | 'monthly' | 'custom',
        recurrence_interval: formData.recurrenceInterval || 1,
        recurrence_end_date: formData.recurrenceEndDate
          ? new Date(formData.recurrenceEndDate).toISOString().split('T')[0]
          : undefined,
        recurrence_count: formData.recurrenceCount || undefined,
        recurrence_days_of_week: formData.selectedDaysOfWeek || undefined,
      });

      handleClose();
    } catch (error) {
      console.error('할일 생성 실패:', error);
    }
  };

  const handleChange = (updated: TodoFormData) => {
    setTodoForm(prev => ({ ...prev, ...updated }));
  };

  return (
    <>
      <div className={cn('fixed bottom-24 right-6 z-10', className)}>
        <Button
          size="lg"
          onClick={handleAddTodo}
          className={cn(
            'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
            'bg-primary hover:bg-primary/90 text-primary-content border-0',
            'hover:scale-110 active:scale-95',
            'flex items-center justify-center p-0'
          )}
        >
          <Plus className="h-8 w-8 stroke-[3]" />
        </Button>
      </div>

      {/* 할일 추가 모달 */}
      <TodoEditModal
        open={todoModalOpen}
        todo={todoForm}
        onClose={handleClose}
        onSave={handleSave}
        onChange={handleChange}
        headerTitle="할일 추가"
        showScheduledDate={true}
        showHighlight={true}
      />
    </>
  );
};

export default FloatingActionButton;

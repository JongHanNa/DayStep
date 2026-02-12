import { Todo } from '@/entities/todo/Todo'

// Test data factory functions
export const createMockTodo = (overrides: Partial<Todo> = {}): Todo => {
  const defaultData = {
    id: 'test-todo-id',
    userId: 'test-user-id',
    title: 'Test todo title',
    completed: false,
    orderIndex: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  
  return Todo.fromDatabase({
    id: overrides.id || defaultData.id,
    user_id: overrides.userId || defaultData.userId,
    title: (overrides as any).title || defaultData.title,
    completed: overrides.completed ?? defaultData.completed,
    order_index: overrides.orderIndex ?? defaultData.orderIndex,
    category: (overrides as any).category || null,
    description: (overrides as any).description || null,
    schedule_type: (overrides as any).scheduleType || 'anytime',
    start_time: (overrides as any).startTime ? (overrides as any).startTime.toISOString() : null,
    end_time: (overrides as any).endTime ? (overrides as any).endTime.toISOString() : null,
    recurrence_pattern: (overrides as any).recurrencePattern || 'none',
    recurrence_end_date: (overrides as any).recurrenceEndDate ? (overrides as any).recurrenceEndDate.toISOString().split('T')[0] : null,
    recurrence_count: (overrides as any).recurrenceCount || null,
    recurrence_interval: (overrides as any).recurrenceInterval || 1,
    recurrence_days_of_week: (overrides as any).recurrenceDaysOfWeek || null,
    recurrence_day_of_month: (overrides as any).recurrenceDayOfMonth || null,
    parent_todo_id: (overrides as any).parentTodoId || null,
    created_at: (overrides.createdAt || defaultData.createdAt).toISOString(),
    updated_at: (overrides.updatedAt || defaultData.updatedAt).toISOString(),
  })
}

// Test user data
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: new Date().toISOString(),
}

// Test error messages
export const mockErrorMessages = {
  network: '네트워크 오류가 발생했습니다.',
  auth: '인증에 실패했습니다.',
  notFound: '데이터를 찾을 수 없습니다.',
  serverError: '서버 오류가 발생했습니다.',
}
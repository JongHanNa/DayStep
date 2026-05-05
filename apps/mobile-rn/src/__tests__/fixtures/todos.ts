/**
 * Todo Test Fixtures
 */

export function createMockTodo(overrides: Record<string, any> = {}) {
  return {
    id: 'todo-1',
    user_id: 'user-1',
    title: '테스트 할일',
    content: null,
    completed: false,
    schedule_type: 'timed',
    start_time: '2026-03-12T09:00:00.000Z',
    end_time: '2026-03-12T10:00:00.000Z',
    icon: null,
    color: null,
    importance: false,
    urgency: false,
    is_reluctant_must_do: false,
    recurrence_pattern: 'none',
    recurrence_days_of_week: null,
    recurrence_end_date: null,
    order_index: 0,
    skip_status: null,
    parent_recurring_todo_id: null,
    occurrence_date: null,
    original_start_time: null,
    original_end_time: null,
    parent_todo_id: null,
    project_id: null,
    alarm_offset_minutes: null,
    anytime_duration: null,
    created_at: '2026-03-12T00:00:00.000Z',
    updated_at: '2026-03-12T00:00:00.000Z',
    ...overrides,
  };
}

export function createMockRecurringTodo(overrides: Record<string, any> = {}) {
  return createMockTodo({
    id: 'recurring-todo-1',
    recurrence_pattern: 'daily',
    recurrence_days_of_week: null,
    ...overrides,
  });
}

export function createMockDeferredTodo(overrides: Record<string, any> = {}) {
  return createMockTodo({
    id: 'deferred-todo-1',
    parent_recurring_todo_id: 'recurring-todo-1',
    original_start_time: '2026-03-12T09:00:00.000Z',
    occurrence_date: '2026-03-12',
    schedule_type: 'anytime',
    start_time: null,
    end_time: null,
    ...overrides,
  });
}

'use client';

import { useState, useMemo } from 'react';
import { CheckSquare, Search, ChevronDown, ChevronUp, Clock, Repeat, Calendar, Plus } from 'lucide-react';
import type { Todo } from '@/types';
import { Badge } from '@/components/ui/badge';
import { format, startOfDay, addDays, isBefore } from 'date-fns';
import { ko } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface CollapsibleTodoSectionProps {
  selectedTodoIds: string[];
  allTodos: Todo[];
  onChange: (todoIds: string[]) => void;
  noteColor?: string;
  // 즉시 DB 저장을 위한 props
  noteId?: string;
  userId?: string;
  onImmediateSave?: (todoIds: string[]) => Promise<void>;
  // 할일 생성
  onCreateTodo?: (title: string) => Promise<Todo>;
  // 할일 클릭 시 편집 모달 열기
  onTodoClick?: (todo: Todo) => void;
}

export default function CollapsibleTodoSection({
  selectedTodoIds = [],
  allTodos = [],
  onChange,
  noteColor = '#808080',
  noteId,
  userId,
  onImmediateSave,
  onCreateTodo,
  onTodoClick,
}: CollapsibleTodoSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'normal' | 'recurring'>('normal');

  // 반복 할일 연결 방식 상태
  const [recurrenceType, setRecurrenceType] = useState<'single' | 'recurring' | 'instance'>('single');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedRecurringTodo, setSelectedRecurringTodo] = useState<Todo | null>(null);

  // 반복 할일의 인스턴스 날짜 생성
  const generateDateInstances = (todo: Todo): string[] => {
    const isRecurring = todo.recurrence_pattern && todo.recurrence_pattern !== 'none';
    if (!isRecurring) return [];

    const instances: string[] = [];
    const today = startOfDay(new Date());
    const startDate = addDays(today, -30);
    const endDate = todo.recurrence_end_date ? new Date(todo.recurrence_end_date) : addDays(today, 30);

    let currentDate = new Date(startDate);

    while (isBefore(currentDate, endDate) && instances.length < 60) {
      let shouldInclude = false;

      if (todo.recurrence_pattern === 'daily') {
        // daily 패턴은 모든 날짜 포함
        shouldInclude = true;
      } else {
        // weekly 등 다른 패턴은 recurrence_days_of_week 확인
        const dayOfWeek = currentDate.getDay();
        const recurringDays = Array.isArray(todo.recurrence_days_of_week)
          ? todo.recurrence_days_of_week as number[]
          : [];
        shouldInclude = recurringDays.includes(dayOfWeek);
      }

      if (shouldInclude) {
        instances.push(format(currentDate, 'yyyy-MM-dd'));
      }

      currentDate = addDays(currentDate, 1);
    }

    return instances;
  };

  // 선택된 반복 할일의 인스턴스 날짜 목록
  const dateInstances = useMemo(() => {
    if (recurrenceType === 'instance' && selectedRecurringTodo) {
      return generateDateInstances(selectedRecurringTodo);
    }
    return [];
  }, [recurrenceType, selectedRecurringTodo]);

  // 검색 필터링
  const filteredTodos = useMemo(() => {
    let filtered = allTodos;

    // 탭 필터링
    filtered = filtered.filter((todo) => {
      const isRecurring = todo.recurrence_pattern && todo.recurrence_pattern !== 'none';
      if (activeTab === 'normal' && isRecurring) return false;
      if (activeTab === 'recurring' && !isRecurring) return false;
      return true;
    });

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(todo =>
        todo.title?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [allTodos, searchQuery, activeTab]);

  // 연결된 할일과 다른 할일 분리
  const connectedTodos = useMemo(() =>
    filteredTodos.filter(t => selectedTodoIds.includes(t.id)),
    [filteredTodos, selectedTodoIds]
  );

  const otherTodos = useMemo(() =>
    filteredTodos.filter(t => !selectedTodoIds.includes(t.id)),
    [filteredTodos, selectedTodoIds]
  );

  // 할일 선택/해제 토글
  const toggleTodo = async (todoId: string, todo?: Todo) => {
    // 반복 할일 선택 시 selectedRecurringTodo 설정
    if (activeTab === 'recurring' && todo && !selectedTodoIds.includes(todoId)) {
      setSelectedRecurringTodo(todo);
    }

    const newIds = selectedTodoIds.includes(todoId)
      ? selectedTodoIds.filter(id => id !== todoId)
      : [...selectedTodoIds, todoId];

    // 로컬 상태 즉시 업데이트
    onChange(newIds);

    // DB에 즉시 저장 (선택적)
    if (onImmediateSave) {
      try {
        await onImmediateSave(newIds);
      } catch (error) {
        console.error('할일 연결 저장 실패:', error);
        // 실패 시 원래 상태로 되돌리기
        onChange(selectedTodoIds);
      }
    }
  };

  // 할일 생성 및 자동 연결
  const handleCreateTodo = async () => {
    if (!onCreateTodo || !searchQuery.trim()) return;

    try {
      const newTodo = await onCreateTodo(searchQuery.trim());
      const newIds = [...selectedTodoIds, newTodo.id];

      // 로컬 상태 즉시 업데이트
      onChange(newIds);

      // DB에 즉시 저장 (선택적)
      if (onImmediateSave) {
        await onImmediateSave(newIds);
      }

      // 검색어 초기화
      setSearchQuery('');
    } catch (error) {
      console.error('할일 생성 실패:', error);
    }
  };

  // 축약 상태 렌더링
  if (!isExpanded) {
    return (
      <div className="my-4">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 rounded-lg bg-base-100 border border-base-300 hover:bg-base-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckSquare className="h-5 w-5" style={{ color: noteColor }} />
              <span className="text-lg font-semibold" style={{ color: '#666666' }}>
                할일 {selectedTodoIds.length}개
              </span>
            </div>
            <ChevronDown className="h-5 w-5 text-base-content/50" />
          </div>
        </button>
      </div>
    );
  }

  // 확장 상태 렌더링
  return (
    <div className="my-4">
      {/* 헤더 */}
      <button
        type="button"
        onClick={() => setIsExpanded(false)}
        className="w-full p-3 rounded-t-lg bg-base-100 border border-base-300 hover:bg-base-300 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckSquare className="h-5 w-5" style={{ color: noteColor }} />
            <span className="text-lg font-semibold" style={{ color: '#666666' }}>
              할일 {selectedTodoIds.length}개
            </span>
          </div>
          <ChevronUp className="h-5 w-5 text-base-content/50" />
        </div>
      </button>

      {/* 확장된 내용 */}
      <div className="border border-t-0 border-base-300 rounded-b-lg bg-base-100">
        {/* 검색 입력창 */}
        <div className="p-3 border-b border-base-300">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/50" />
            <input
              type="text"
              placeholder="할일 검색"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input input-bordered w-full pl-10"
            />
          </div>
        </div>

        {/* 탭 (일반 / 반복) */}
        <div className="flex border-b border-base-300">
          <button
            type="button"
            onClick={() => setActiveTab('normal')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'normal'
                ? 'text-primary border-b-2 border-primary'
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            일반 할일
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('recurring')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'recurring'
                ? 'text-primary border-b-2 border-primary'
                : 'text-base-content/60 hover:text-base-content'
            }`}
          >
            반복 할일
          </button>
        </div>

        {/* 반복 할일 연결 방식 선택 (반복 할일 탭일 때만 표시) */}
        {activeTab === 'recurring' && (
          <div className="p-3 border-b border-base-300 bg-base-100">
            <div className="text-sm font-medium text-base-content/70 mb-2">
              노트 연결 방식
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrenceType"
                  value="single"
                  checked={recurrenceType === 'single'}
                  onChange={(e) => setRecurrenceType(e.target.value as 'single')}
                  className="radio radio-sm radio-primary"
                />
                <span className="text-sm">단일 연결 - 모든 반복 인스턴스에 동일한 노트 표시</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrenceType"
                  value="recurring"
                  checked={recurrenceType === 'recurring'}
                  onChange={(e) => setRecurrenceType(e.target.value as 'recurring')}
                  className="radio radio-sm radio-primary"
                />
                <span className="text-sm">반복 연결 - 각 반복 인스턴스마다 개별 노트 생성</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="recurrenceType"
                  value="instance"
                  checked={recurrenceType === 'instance'}
                  onChange={(e) => setRecurrenceType(e.target.value as 'instance')}
                  className="radio radio-sm radio-primary"
                />
                <span className="text-sm">특정 날짜 연결 - 선택한 반복 인스턴스에만 노트 연결</span>
              </label>
            </div>
          </div>
        )}

        {/* 연결된 할일 */}
        {connectedTodos.length > 0 && (
          <div className="p-3 border-b border-base-300">
            <div className="text-sm text-base-content/70 mb-2">
              연결된 할일 {connectedTodos.length}개
            </div>
            <div className="space-y-1">
              {connectedTodos.map(todo => {
                const isRecurring = todo.recurrence_pattern && todo.recurrence_pattern !== 'none';

                return (
                  <div key={todo.id}>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors">
                      {/* 체크박스 - 연결/해제 */}
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleTodo(todo.id, todo);
                        }}
                        className="checkbox checkbox-sm cursor-pointer"
                      />

                      {/* 클릭 가능 영역 - 할일 편집 모달 열기 */}
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onTodoClick?.(todo)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{todo.title}</span>
                          {isRecurring && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              <Repeat className="h-3 w-3 mr-0.5" />
                              반복
                            </Badge>
                          )}
                        </div>
                        {todo.start_time && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-base-content/60">
                            <Clock className="h-3 w-3" />
                            {todo.schedule_type === 'anytime' && '날짜 미정'}
                            {todo.schedule_type === 'timed' &&
                              format(new Date(todo.start_time), 'M월 d일 HH:mm', { locale: ko })}
                            {todo.schedule_type === 'all_day' &&
                              format(new Date(todo.start_time), 'M월 d일', { locale: ko })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 특정 날짜 연결 선택 시 DatePicker 표시 */}
                    {selectedRecurringTodo?.id === todo.id &&
                     recurrenceType === 'instance' &&
                     dateInstances.length > 0 && (
                      <div className="px-2 pb-2 border-t border-base-300 mt-2">
                        <div className="flex items-center gap-2 mb-3 mt-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium">연결할 날짜를 선택하세요</p>
                        </div>

                        <DatePicker
                          selected={selectedDate}
                          onChange={(date) => setSelectedDate(date)}
                          locale={ko}
                          inline
                          dateFormat="yyyy년 MM월 dd일"
                          includeDates={dateInstances.map(d => new Date(d))}
                          className="w-full"
                        />

                        {selectedDate && (
                          <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-primary">
                                선택: {format(selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 다른 할일들 */}
        {otherTodos.length > 0 && (
          <div className="p-3">
            <div className="text-sm text-base-content/70 mb-2">
              다른 할일들
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {otherTodos.map(todo => {
                const isRecurring = todo.recurrence_pattern && todo.recurrence_pattern !== 'none';

                return (
                  <div key={todo.id}>
                    <div className="flex items-center gap-2 p-2 rounded hover:bg-base-200 transition-colors">
                      {/* 체크박스 - 연결/해제 */}
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleTodo(todo.id, todo);
                        }}
                        className="checkbox checkbox-sm cursor-pointer"
                      />

                      {/* 클릭 가능 영역 - 할일 편집 모달 열기 */}
                      <div
                        className="flex-1 cursor-pointer"
                        onClick={() => onTodoClick?.(todo)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{todo.title}</span>
                          {isRecurring && (
                            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                              <Repeat className="h-3 w-3 mr-0.5" />
                              반복
                            </Badge>
                          )}
                        </div>
                        {todo.start_time && (
                          <div className="flex items-center gap-1 mt-0.5 text-xs text-base-content/60">
                            <Clock className="h-3 w-3" />
                            {todo.schedule_type === 'anytime' && '날짜 미정'}
                            {todo.schedule_type === 'timed' &&
                              format(new Date(todo.start_time), 'M월 d일 HH:mm', { locale: ko })}
                            {todo.schedule_type === 'all_day' &&
                              format(new Date(todo.start_time), 'M월 d일', { locale: ko })}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 특정 날짜 연결 선택 시 DatePicker 표시 */}
                    {selectedRecurringTodo?.id === todo.id &&
                     recurrenceType === 'instance' &&
                     dateInstances.length > 0 && (
                      <div className="px-2 pb-2 border-t border-base-300 mt-2">
                        <div className="flex items-center gap-2 mb-3 mt-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <p className="text-sm font-medium">연결할 날짜를 선택하세요</p>
                        </div>

                        <DatePicker
                          selected={selectedDate}
                          onChange={(date) => setSelectedDate(date)}
                          locale={ko}
                          inline
                          dateFormat="yyyy년 MM월 dd일"
                          includeDates={dateInstances.map(d => new Date(d))}
                          className="w-full"
                        />

                        {selectedDate && (
                          <div className="mt-3 p-2 bg-primary/10 rounded-lg">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-primary">
                                선택: {format(selectedDate, 'yyyy년 M월 d일 (E)', { locale: ko })}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 할일이 없을 때 */}
        {filteredTodos.length === 0 && (
          <div className="p-8 text-center text-base-content/50">
            {searchQuery
              ? '검색 결과가 없습니다'
              : activeTab === 'normal'
              ? '일반 할일이 없습니다'
              : '반복 할일이 없습니다'}
          </div>
        )}

        {/* 검색어가 있을 때 항상 생성 버튼 표시 */}
        {onCreateTodo && searchQuery.trim() && (
          <div className="p-3 border-t border-base-300">
            <button
              type="button"
              onClick={handleCreateTodo}
              className="w-full flex items-center gap-2 p-3 rounded-lg hover:bg-base-200 transition-colors text-left"
            >
              <Plus className="h-5 w-5 text-base-content/70" />
              <CheckSquare className="h-5 w-5 text-base-content/70" />
              <span className="text-sm">
                새로운 <strong>{searchQuery}</strong> 할일 생성
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

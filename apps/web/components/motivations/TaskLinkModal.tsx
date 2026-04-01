'use client';

import React, { useState, useEffect } from 'react';
import { Sheet } from 'react-modal-sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Search,
  X,
  Link,
  Calendar,
  Clock,
  Repeat,
  Hash,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTodoStore } from '@/state/stores/todoStore';
import { useMotivationStore } from '@/state/stores/motivationStore';
import { fetchAllTodosWithJWT } from '@/lib/supabaseWebViewHelper';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import type { Todo } from '@/types';

// 한국어 로케일 등록
registerLocale('ko', ko);

interface TaskLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memoId: string;
  currentLinkedTaskId?: string | null;
  currentLinkedDate?: string | null;
  currentTimelineTaskId?: string | null;
}

const TaskLinkModal: React.FC<TaskLinkModalProps> = ({ 
  open, 
  onOpenChange, 
  memoId, 
  currentLinkedTaskId,
  currentLinkedDate,
  currentTimelineTaskId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(currentLinkedTaskId || null);
  const [selectedDate, setSelectedDate] = useState<string | null>(currentLinkedDate || null);
  const [activeTab, setActiveTab] = useState<'regular' | 'recurring'>('regular');
  const [todos, setTodos] = useState<any[]>([]); // DB 형태(snake_case)로 저장
  const [loading, setLoading] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<'single' | 'recurring' | 'instance'>('single');
  
  const { linkToTask } = useMotivationStore();

  // 현재 연결된 할일 찾기
  const linkedTodo = todos.find(todo => todo.id === currentLinkedTaskId);

  // 모든 할일 조회
  useEffect(() => {
    const fetchAllTodos = async () => {
      if (!open) {
        console.log('🚫 할일 조회 스킵: 모달 닫힘');
        return;
      }

      console.log('📋 할일 목록 조회 시작 - 사용자 ID 확보 중...');
      setLoading(true);

      try {
        let userId: string | null = null;

        try {
          const { supabase } = await import('@/lib/supabase');
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            userId = session.user.id;
            console.log('✅ 웹 세션에서 사용자 ID 확보:', userId);
          }
        } catch (authError) {
          console.log('⚠️ 웹 세션 확보 실패:', authError);
        }

        if (!userId) {
          console.error('❌ 사용자 ID를 확보할 수 없습니다');
          return;
        }

        console.log('📋 할일 목록 조회 시작:', { userId });
        const allTodos = await fetchAllTodosWithJWT(userId);

        // Entity 객체를 DB 형태(snake_case)로 변환
        const dbTodos = allTodos.map((todo: any) =>
          typeof todo.toDatabase === 'function' ? todo.toDatabase() : todo
        );

        console.log('✅ 할일 목록 조회 완료:', { todosCount: dbTodos.length, todos: dbTodos });
        setTodos(dbTodos);
      } catch (error) {
        console.error('❌ 할일 목록 조회 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllTodos();
  }, [open]);

  useEffect(() => {
    if (currentLinkedTaskId) {
      setSelectedTaskId(currentLinkedTaskId);
      const todo = todos.find(t => t.id === currentLinkedTaskId);
      // 반복 할일 여부 확인: recurrence_pattern이 'none'이 아니거나 null이 아닌 경우
      const isRecurring = todo?.recurrence_pattern && todo.recurrence_pattern !== 'none';
      if (isRecurring) {
        setActiveTab('recurring');
      }
    }
  }, [currentLinkedTaskId, todos]);

  const handleLinkTask = async () => {
    if (!selectedTaskId) return;

    try {
      // 선택된 할일이 반복 할일인지 확인
      const selectedTodo = todos.find(todo => todo.id === selectedTaskId);
      const isRecurring = selectedTodo?.recurrence_pattern && selectedTodo.recurrence_pattern !== 'none';

      // 반복 할일에 연결하는 경우 옵션 설정
      const options: {
        linkDate?: string;
        timelineTaskId?: string;
        recurrenceType?: 'single' | 'recurring' | 'instance';
      } = {};

      if (isRecurring && activeTab === 'recurring') {
        options.recurrenceType = recurrenceType;
        if (recurrenceType === 'instance' && selectedDate) {
          // 특정 인스턴스 연결: 날짜는 필수
          options.linkDate = selectedDate;
        } else if (recurrenceType === 'recurring' && selectedDate) {
          // 반복 노트: 선택적으로 날짜 설정 가능
          options.linkDate = selectedDate;
        }
      }

      await linkToTask(memoId, selectedTaskId, options);

      console.log('✅ 할일 연결 완료:', {
        memoId,
        selectedTaskId,
        isRecurring,
        recurrenceType,
        selectedDate
      });

      onOpenChange(false);
    } catch (error) {
      console.error('할일 연결 중 오류:', error);
    }
  };

  const handleUnlinkTask = async () => {
    try {
      await linkToTask(memoId, null);
      onOpenChange(false);
    } catch (error) {
      console.error('할일 연결 해제 중 오류:', error);
    }
  };

  // 디버깅: 실제 데이터 구조 확인
  console.log('🔍 필터링 디버깅:', todos.slice(0, 3).map(t => ({
    id: t.id,
    title: t.title,
    recurrence_pattern: t.recurrence_pattern,
    activeTab
  })));

  const filteredTodos = todos.filter(todo => {
    // 반복 할일 여부 확인: DB 형태(snake_case) 사용
    const recurrencePattern = todo.recurrence_pattern;
    const isRecurring = recurrencePattern !== 'none' &&
                        recurrencePattern !== null &&
                        recurrencePattern !== undefined;

    if (activeTab === 'regular' && isRecurring) return false;
    if (activeTab === 'recurring' && !isRecurring) return false;

    if (!searchQuery) return true;
    return todo.title.toLowerCase().includes(searchQuery.toLowerCase());
  });


  // 반복 할일의 날짜 인스턴스 생성 (과거 30일 ~ 미래 30일)
  const generateDateInstances = (todo: Todo): string[] => {
    // 반복 할일 여부 확인: DB 형태(snake_case) 사용
    const recurrencePattern = todo.recurrence_pattern;
    const isRecurring = recurrencePattern !== 'none' &&
                        recurrencePattern !== null &&
                        recurrencePattern !== undefined;
    if (!isRecurring) return [];

    const instances: string[] = [];
    const today = startOfDay(new Date());

    // 과거 30일부터 시작
    const startDate = addDays(today, -30);
    // 할일의 종료일 또는 미래 30일까지
    const endDate = todo.recurrence_end_date ? new Date(todo.recurrence_end_date) : addDays(today, 30);

    let currentDate = new Date(startDate);

    while (isBefore(currentDate, endDate) && instances.length < 60) { // 최대 60개 인스턴스
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


  const formatTodoTime = (todo: any): string => {
    if (!todo.start_time) return '날짜 미정';
    
    if (todo.schedule_type === 'timed') {
      const startTime = new Date(todo.start_time);
      return format(startTime, 'HH:mm', { locale: ko });
    }
    return todo.schedule_type === 'all_day' ? '하루종일' : '언제든지';
  };

  return (
    <Sheet 
      isOpen={open} 
      onClose={() => onOpenChange(false)}
      snapPoints={[0.95, 0.6, 0]}
      initialSnap={0}
      dragCloseThreshold={0.6}
      dragVelocityThreshold={500}
    >
      <Sheet.Container>
        <Sheet.Header>
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold">할일 연결</h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-4 pb-2">
            <p className="text-sm text-muted-foreground">
              메모를 할일에 연결하여 관련성을 표시하세요. 반복 할일의 경우 특정 날짜를 선택할 수 있습니다.
            </p>
          </div>
        </Sheet.Header>

        <Sheet.Content>
          <Sheet.Scroller draggableAt="top" style={{ overflowX: 'hidden' }}>
            <div className="px-4 pb-4" style={{ overflowX: 'hidden', touchAction: 'pan-y' }}>
              <div className="space-y-4">
                {/* 현재 연결된 할일 표시 */}
                {linkedTodo && (
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center">
                          <Link className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          현재 연결된 할일
                        </h4>
                        <div className="mt-2">
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            {linkedTodo.title}
                            {currentLinkedDate && ` (${format(new Date(currentLinkedDate), 'M월 d일', { locale: ko })})`}
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400">
                            {formatTodoTime(linkedTodo)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 검색 입력 */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="할일 검색..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* 할일 타입 탭 */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'regular' | 'recurring')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="regular" className="flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      일반 할일
                    </TabsTrigger>
                    <TabsTrigger value="recurring" className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      반복 할일
                    </TabsTrigger>
                  </TabsList>

                  {/* 일반 할일 목록 */}
                  <TabsContent value="regular" className="space-y-2">
                    <ScrollArea className="h-64">
                      <div className="space-y-2 pr-3">
                        {loading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <div className="animate-spin h-8 w-8 mx-auto mb-2 border-2 border-current border-t-transparent rounded-full opacity-40" />
                            <p className="text-sm">할일 목록 불러오는 중...</p>
                          </div>
                        ) : filteredTodos.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Hash className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">일반 할일이 없습니다</p>
                          </div>
                        ) : (
                          filteredTodos.map(todo => (
                            <div
                              key={todo.id}
                              className={cn(
                                "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                                selectedTaskId === todo.id
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                  : "border-border hover:border-blue-300 hover:bg-blue-25 dark:hover:bg-blue-900/10"
                              )}
                              onClick={() => {
                                if (selectedTaskId === todo.id) {
                                  // 이미 선택된 할일을 클릭하면 선택 해제
                                  setSelectedTaskId(null);
                                  setSelectedDate(null);
                                } else {
                                  // 새로운 할일 선택
                                  setSelectedTaskId(todo.id);
                                  setSelectedDate(null);
                                }
                              }}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                <div className={cn(
                                  "w-4 h-4 rounded border-2 flex items-center justify-center",
                                  selectedTaskId === todo.id
                                    ? "border-blue-500 bg-blue-500"
                                    : "border-muted-foreground/30"
                                )}>
                                  {selectedTaskId === todo.id && (
                                    <Check className="h-2.5 w-2.5 text-white" />
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {todo.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {formatTodoTime(todo)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  {/* 반복 할일 목록 */}
                  <TabsContent value="recurring" className="space-y-2">
                    {/* 반복 노트 연결 방식 선택 */}
                    <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                      <h4 className="text-sm font-medium mb-2">노트 연결 방식</h4>
                      <RadioGroup value={recurrenceType} onValueChange={(value: 'single' | 'recurring' | 'instance') => setRecurrenceType(value)}>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="single" id="single" />
                          <Label htmlFor="single" className="text-sm">
                            단일 연결 - 모든 반복 인스턴스에 동일한 노트 표시
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="recurring" id="recurring" />
                          <Label htmlFor="recurring" className="text-sm">
                            반복 노트 - 각 반복 인스턴스마다 개별 노트 생성
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="instance" id="instance" />
                          <Label htmlFor="instance" className="text-sm">
                            특정 날짜 연결 - 선택한 반복 인스턴스에만 노트 연결
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <ScrollArea className="h-64">
                      <div className="space-y-2 pr-3">
                        {loading ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <div className="animate-spin h-8 w-8 mx-auto mb-2 border-2 border-current border-t-transparent rounded-full opacity-40" />
                            <p className="text-sm">할일 목록 불러오는 중...</p>
                          </div>
                        ) : filteredTodos.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <Repeat className="h-8 w-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">반복 할일이 없습니다</p>
                          </div>
                        ) : (
                          filteredTodos.map(todo => {
                            const dateInstances = generateDateInstances(todo);
                            
                            return (
                              <div
                                key={todo.id}
                                className={cn(
                                  "rounded-lg border transition-colors",
                                  selectedTaskId === todo.id
                                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                                    : "border-border"
                                )}
                              >
                                <div
                                  className="flex items-start gap-3 p-3 cursor-pointer"
                                  onClick={() => {
                                    if (selectedTaskId === todo.id) {
                                      // 이미 선택된 할일을 클릭하면 선택 해제
                                      setSelectedTaskId(null);
                                      setSelectedDate(null);
                                    } else {
                                      // 새로운 할일 선택
                                      setSelectedTaskId(todo.id);
                                      setSelectedDate(null);
                                    }
                                  }}
                                >
                                  <div className="flex-shrink-0 mt-0.5">
                                    <div className={cn(
                                      "w-4 h-4 rounded border-2 flex items-center justify-center",
                                      selectedTaskId === todo.id
                                        ? "border-blue-500 bg-blue-500"
                                        : "border-muted-foreground/30"
                                    )}>
                                      {selectedTaskId === todo.id && (
                                        <Check className="h-2.5 w-2.5 text-white" />
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      {todo.title}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="outline" className="text-xs">
                                        <Repeat className="h-3 w-3 mr-1" />
                                        반복
                                      </Badge>
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {formatTodoTime(todo)}
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* react-datepicker 달력 - 특정 날짜 연결 방식일 때만 표시 */}
                                {selectedTaskId === todo.id && recurrenceType === 'instance' && dateInstances.length > 0 && (
                                  <div className="px-3 pb-3 border-t border-border/50 mt-2">
                                    <div className="flex items-center gap-2 mb-3 mt-2">
                                      <Calendar className="h-4 w-4 text-blue-600" />
                                      <p className="text-sm font-medium text-foreground">
                                        연결할 날짜를 선택하세요
                                      </p>
                                    </div>

                                    <div className="flex justify-center">
                                      <div className="react-datepicker-custom">
                                        <DatePicker
                                          selected={selectedDate ? new Date(selectedDate) : null}
                                          onChange={(date: Date | null) => {
                                            if (date) {
                                              const dateStr = format(date, 'yyyy-MM-dd');
                                              if (dateInstances.includes(dateStr)) {
                                                setSelectedDate(dateStr);
                                              }
                                            } else {
                                              setSelectedDate(null);
                                            }
                                          }}
                                          locale="ko"
                                          inline
                                          dateFormat="yyyy년 MM월 dd일"
                                          includeDates={dateInstances.map(date => new Date(date))}
                                          calendarClassName="custom-datepicker"
                                          showMonthDropdown
                                          showYearDropdown
                                          dropdownMode="select"
                                        />
                                      </div>
                                    </div>

                                    {selectedDate && (
                                      <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                        <div className="flex items-center gap-2 text-sm">
                                          <Check className="h-3 w-3 text-blue-600" />
                                          <span className="text-blue-800 dark:text-blue-200">
                                            선택된 날짜: {format(new Date(selectedDate), 'yyyy년 M월 d일 (E)', { locale: ko })}
                                          </span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>

                {/* 하단 액션 버튼 */}
                <div className="flex items-center justify-between pt-4 border-t border-border/10">
                  <Button
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    취소
                  </Button>
                  
                  <div className="flex items-center gap-2">
                    {currentLinkedTaskId && (
                      <Button
                        variant="outline"
                        onClick={handleUnlinkTask}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-1" />
                        연결 해제
                      </Button>
                    )}
                    
                    <Button
                      onClick={handleLinkTask}
                      disabled={
                        !selectedTaskId ||
                        (selectedTaskId === currentLinkedTaskId && selectedDate === currentLinkedDate) ||
                        (activeTab === 'recurring' && recurrenceType === 'instance' && !selectedDate)
                      }
                    >
                      <Link className="h-4 w-4 mr-1" />
                      {(selectedTaskId === currentLinkedTaskId && selectedDate === currentLinkedDate)
                        ? '이미 연결됨'
                        : (activeTab === 'recurring' && recurrenceType === 'instance' && !selectedDate)
                          ? '날짜를 선택하세요'
                          : '연결하기'
                      }
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </Sheet.Scroller>
        </Sheet.Content>
      </Sheet.Container>

      {/* react-datepicker 커스텀 스타일 */}
      <style jsx global>{`
        .react-datepicker-custom .react-datepicker {
          border: 1px solid hsl(var(--border));
          border-radius: 8px;
          background-color: hsl(var(--card));
          color: hsl(var(--foreground));
          font-family: inherit;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          font-size: 14px;
        }

        .react-datepicker-custom .react-datepicker__header {
          background-color: hsl(var(--muted));
          border-bottom: 1px solid hsl(var(--border));
          border-top-left-radius: 8px;
          border-top-right-radius: 8px;
          padding: 8px 0;
        }

        .react-datepicker-custom .react-datepicker__current-month {
          color: hsl(var(--foreground));
          font-weight: 600;
          font-size: 1rem;
          margin-bottom: 8px;
        }

        .react-datepicker-custom .react-datepicker__month-dropdown,
        .react-datepicker-custom .react-datepicker__year-dropdown {
          background-color: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 6px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .react-datepicker-custom .react-datepicker__month-option,
        .react-datepicker-custom .react-datepicker__year-option {
          color: hsl(var(--foreground));
          padding: 6px 12px;
        }

        .react-datepicker-custom .react-datepicker__month-option:hover,
        .react-datepicker-custom .react-datepicker__year-option:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }

        .react-datepicker-custom .react-datepicker__day-names {
          margin-bottom: 0.5rem;
        }

        .react-datepicker-custom .react-datepicker__day-name {
          color: hsl(var(--muted-foreground));
          font-weight: 500;
          width: 2.25rem;
          line-height: 2.25rem;
          font-size: 0.75rem;
        }

        .react-datepicker-custom .react-datepicker__day {
          color: hsl(var(--foreground));
          width: 2.25rem;
          height: 2.25rem;
          line-height: 2.25rem;
          margin: 0.125rem;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease-in-out;
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
          font-size: 0.875rem;
        }

        .react-datepicker-custom .react-datepicker__day:hover {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          transform: scale(1.05);
        }

        .react-datepicker-custom .react-datepicker__day--selected {
          background-color: hsl(var(--primary)) !important;
          color: hsl(var(--primary-foreground)) !important;
          font-weight: 600;
          transform: scale(1.05);
        }

        .react-datepicker-custom .react-datepicker__day--today {
          background-color: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          font-weight: 600;
        }

        .react-datepicker-custom .react-datepicker__day--outside-month {
          color: hsl(var(--muted-foreground));
          opacity: 0.5;
        }

        .react-datepicker-custom .react-datepicker__day--disabled {
          color: hsl(var(--muted-foreground));
          opacity: 0.3;
          cursor: not-allowed;
        }

        .react-datepicker-custom .react-datepicker__day--disabled:hover {
          background-color: transparent;
          transform: none;
        }

        .react-datepicker-custom .react-datepicker__navigation {
          background: none;
          border: none;
          top: 13px;
          width: 24px;
          height: 24px;
          border-radius: 4px;
          transition: all 0.2s ease-in-out;
          outline: none;
        }

        .react-datepicker-custom .react-datepicker__navigation:hover {
          background-color: hsl(var(--accent));
        }

        .react-datepicker-custom .react-datepicker__navigation-icon::before {
          border-color: hsl(var(--foreground));
          border-width: 2px 2px 0 0;
          width: 7px;
          height: 7px;
        }

        .react-datepicker-custom .react-datepicker__navigation--previous {
          left: 12px;
        }

        .react-datepicker-custom .react-datepicker__navigation--next {
          right: 12px;
        }

        .react-datepicker-custom .react-datepicker__month {
          padding: 0.4rem;
        }
      `}</style>
    </Sheet>
  );
};

export default TaskLinkModal;
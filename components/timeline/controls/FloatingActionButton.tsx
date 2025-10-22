'use client';

import React, { useState } from 'react';
import { Plus, Clock, Archive, Smartphone, StickyNote, Users, User, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTodoStore } from '@/state/stores/todoStore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/app/context/AuthContext';
import TodoFormModal from '@/components/todos/TodoFormModal';
import NoteSheet from '@/components/notes/NoteSheet';
import ContactListSheet from '@/components/contacts/ContactListSheet';
import ContactDetailModal from '@/components/contacts/ContactDetailModal';
import MotivationSheet from '@/components/motivation/MotivationSheet';
import { Capacitor } from '@capacitor/core';
import { widgetSyncService } from '@/services/widget-sync.service';
import { isRecurringTodo } from '@/lib/recurrence-utils';

interface FloatingActionButtonProps {
  className?: string;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [quickMemoSheetOpen, setNoteSheetOpen] = useState(false);
  const [contactListSheetOpen, setContactListSheetOpen] = useState(false);
  const [contactDetailOpen, setContactDetailOpen] = useState(false);
  const [motivationSheetOpen, setMotivationSheetOpen] = useState(false);
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  
  const todos = useTodoStore(state => state.todos);

  const handleAddTodo = () => {
    setTodoModalOpen(true);
    setIsOpen(false);
  };

  const handleOpenNote = () => {
    setNoteSheetOpen(true);
    setIsOpen(false);
  };

  const handleOpenContactList = () => {
    setContactListSheetOpen(true);
    setIsOpen(false);
  };

  const handleAddNewContact = () => {
    setContactDetailOpen(true);
    setIsOpen(false);
  };



  // 위젯 동기화 테스트 함수
  const handleTestWidgetSync = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast({
        title: '네이티브 환경에서만 작동',
        description: '위젯은 iOS/Android 앱에서만 지원됩니다.',
        variant: 'destructive',
      });
      return;
    }

    console.log('🧪 [테스트] 수동 위젯 동기화 시작...');
    
    try {
      // 1. 원본 할일 데이터 가져오기 (반복 할일 변환을 위함)
      const allTodos = todos;
      console.log('🧪 [테스트] 전체 할일 목록:', allTodos.length, '개');
      
      // 2. 오늘 날짜 범위 설정
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      console.log('🧪 [디버그] 현재 시간:', now.toLocaleString('ko-KR'));
      console.log('🧪 [디버그] 오늘 범위:', today.toLocaleString('ko-KR'), '~', tomorrow.toLocaleString('ko-KR'));
      
      // 3. 반복 할일과 일반 할일 분리
      const recurringTodos = allTodos.filter(todo => isRecurringTodo(todo));
      const regularTodos = allTodos.filter(todo => !isRecurringTodo(todo));
      
      console.log('🧪 [디버그] 반복 할일:', recurringTodos.length, '개');
      console.log('🧪 [디버그] 일반 할일:', regularTodos.length, '개');
      
      // 4. 반복 할일을 오늘 날짜로 변환 + 필터링 (직접 시간 변환)
      let todayRecurringTodos: any[] = [];
      if (recurringTodos.length > 0) {
        console.log('🧪 [디버그] 반복 할일 직접 변환 시작...');
        
        // 오늘 요일 확인 (0=일요일, 1=월요일, 2=화요일, 3=수요일, 4=목요일, 5=금요일, 6=토요일)
        const todayDayOfWeek = today.getDay();
        console.log('🧪 [디버그] 오늘 요일:', todayDayOfWeek, '(0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토)');
        
        todayRecurringTodos = recurringTodos
          .filter(todo => {
            // 1. 반복 종료일 체크
            if (todo.recurrenceEndDate) {
              const endDate = new Date(todo.recurrenceEndDate);
              if (today > endDate) {
                console.log(`🚫 [필터] ${todo.title}: 반복 종료됨 (${endDate.toLocaleDateString('ko-KR')})`);
                return false;
              }
            }
            
            // 2. 요일 체크 (recurrence_days_of_week가 있는 경우)
            if (todo.recurrenceDaysOfWeek && Array.isArray(todo.recurrenceDaysOfWeek)) {
              const isValidDay = todo.recurrenceDaysOfWeek.includes(todayDayOfWeek);
              if (!isValidDay) {
                console.log(`🚫 [필터] ${todo.title}: 오늘 요일(${todayDayOfWeek}) 해당 안됨 (허용: ${JSON.stringify(todo.recurrenceDaysOfWeek)})`);
                return false;
              }
            }

            console.log(`✅ [통과] ${todo.title}: 오늘 반복 할일에 포함`);
            return true;
          })
          .map(todo => {
            if (!todo.startTime) {
          return { ...todo, startTime: null };
        }
            
            // 원본 시간 정보 추출 (시, 분, 초)
            const originalTime = new Date(todo.startTime);
            const hours = originalTime.getHours();
            const minutes = originalTime.getMinutes();
            const seconds = originalTime.getSeconds();
            
            // 오늘 날짜에 원본 시간 적용
            const todayWithTime = new Date(today);
            todayWithTime.setHours(hours, minutes, seconds, 0);

            console.log(`🔄 [변환] ${todo.title}: ${originalTime.toLocaleString('ko-KR')} → ${todayWithTime.toLocaleString('ko-KR')}`);
            
            return {
              ...todo,
              startTime: todayWithTime,
              endTime: todo.endTime ? new Date(new Date(todo.endTime).getTime() + (todayWithTime.getTime() - originalTime.getTime())) : null
            };
          });
        
        console.log('🧪 [디버그] 필터링 후 오늘 반복 할일:', todayRecurringTodos.length, '개');
      }
      
      // 5. 일반 할일 중 오늘 할일 필터링
      const todayRegularTodos = regularTodos.filter(todo => {
        if (!todo.startTime) {
          return false;
        }
        const todoTime = new Date(todo.startTime);
        const isToday = todoTime >= today && todoTime < tomorrow;
        return isToday;
      });
      
      console.log('🧪 [디버그] 오늘 일반 할일:', todayRegularTodos.length, '개');
      
      // 6. 오늘 할일 통합 (반복 + 일반)
      const todayTodos = [...todayRecurringTodos, ...todayRegularTodos];
      console.log('🧪 [테스트] 오늘 통합 할일:', todayTodos.length, '개');
      
      // 타임라인 할일들 확인
      todayTodos.forEach(todo => {
        const todoTime = todo.startTime ? new Date(todo.startTime) : null;
        console.log(`🧪 [디버그] ${todo.title}: ${todoTime ? todoTime.toLocaleString('ko-KR') : '시간 없음'}`);
      });
      
      // 현재 시간 이후 할일 필터링
      const upcomingTodos = todayTodos.filter(todo => {
        if (!todo.startTime) {
          return false;
        }
        const todoTime = new Date(todo.startTime);
        const isUpcoming = todoTime > now;
        console.log(`🧪 [디버그] ${todo.title}: 현재 시간 이후: ${isUpcoming}`);
        return isUpcoming;
      });
      
      console.log('🧪 [테스트] 현재 시간 이후 할일:', upcomingTodos.length, '개');
      upcomingTodos.forEach(todo => {
        console.log(`🧪 [테스트] - ${todo.title}: ${todo.startTime ? new Date(todo.startTime).toLocaleTimeString('ko-KR') : '시간 없음'}`);
      });

      // 위젯 동기화는 타임라인에서 필터링된 오늘 할일 전송
      await widgetSyncService.syncTodos(todayTodos as any);
      
      toast({
        title: '위젯 동기화 완료',
        description: `오늘 ${todayTodos.length}개 할일 동기화 (${upcomingTodos.length}개 예정)`,
      });
    } catch (error) {
      console.error('🧪 [테스트] 위젯 동기화 실패:', error);
      toast({
        title: '위젯 동기화 실패',
        description: error instanceof Error ? error.message : '알 수 없는 오류',
        variant: 'destructive',
      });
    }

    setIsOpen(false);
  };

  return (
    <>
      <div className={cn('fixed bottom-24 right-6 z-10', className)}>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="lg"
              className={cn(
                'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
                'bg-primary hover:bg-primary/90 text-primary-foreground border-0',
                'hover:scale-110 active:scale-95',
                'flex items-center justify-center p-0',
                isOpen && 'rotate-45'
              )}
            >
              <Plus className="h-8 w-8 stroke-[3]" />
            </Button>
          </DropdownMenuTrigger>
          
          <DropdownMenuContent
            align="end"
            sideOffset={8}
            className="w-60 animate-in slide-in-from-bottom-2 shadow-md border border-border bg-card"
          >
            <DropdownMenuItem
              onClick={handleAddTodo}
              className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-accent focus:bg-accent"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <Clock className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">할일 추가</div>
                <div className="text-xs text-muted-foreground">맞춤 설정</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleOpenNote}
              className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-accent focus:bg-accent"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <StickyNote className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">퀵메모</div>
                <div className="text-xs text-muted-foreground">빠른 노트 작성</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleOpenContactList}
              className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-accent focus:bg-accent"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">인물</div>
                <div className="text-xs text-muted-foreground">연락처 보기</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={handleAddNewContact}
              className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-accent focus:bg-accent"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">새 연락처</div>
                <div className="text-xs text-muted-foreground">연락처 추가</div>
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setMotivationSheetOpen(true)}
              className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-accent focus:bg-accent"
            >
              <div className="p-2 rounded-full bg-primary/10">
                <Heart className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-foreground">동기부여</div>
                <div className="text-xs text-muted-foreground">의지력 강화</div>
              </div>
            </DropdownMenuItem>

            {Capacitor.isNativePlatform() && (
              <>
                <div className="h-px bg-border mx-2 my-1" />
                <DropdownMenuItem
                  onClick={handleTestWidgetSync}
                  className="flex items-center gap-3 py-3 px-3 cursor-pointer hover:bg-accent focus:bg-accent"
                >
                  <div className="p-2 rounded-full bg-muted">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-foreground">위젯 동기화</div>
                    <div className="text-xs text-muted-foreground">디버깅용</div>
                  </div>
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 할일 추가 모달 */}
      <TodoFormModal
        open={todoModalOpen}
        onOpenChange={setTodoModalOpen}
      />
      
      {/* 퀵메모 시트 */}
      <NoteSheet
        open={quickMemoSheetOpen}
        onOpenChange={setNoteSheetOpen}
      />
      
      {/* 연락처 목록 시트 */}
      <ContactListSheet
        open={contactListSheetOpen}
        onOpenChange={setContactListSheetOpen}
      />

      {/* 연락처 상세 모달 */}
      <ContactDetailModal
        open={contactDetailOpen}
        onOpenChange={setContactDetailOpen}
        mode="create"
      />

      {/* 동기부여 시트 */}
      <MotivationSheet
        open={motivationSheetOpen}
        onOpenChange={setMotivationSheetOpen}
      />
    </>
  );
};

export default FloatingActionButton;
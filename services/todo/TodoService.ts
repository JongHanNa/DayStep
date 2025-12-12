/**
 * 할일 서비스 구현체
 * 할일 관련 비즈니스 로직과 데이터베이스 연동
 */

import { Todo } from '@/entities/todo/Todo';
import { TodoInsert, TodoUpdate, CreateTodoInput, UpdateTodoInput, ScheduleType, RecurrencePattern } from '@/types';
import { BaseService, ServiceError } from '../base/BaseService';
import { TodoRepository, TodoService as ITodoService } from './TodoRepository';
import { reminderScheduler } from '@/features/reminder/reminder-scheduler';
import { isCapacitorEnvironment } from '@/lib/supabase/core';
import {
  createTodoWithJWT,
  updateTodoWithJWT,
  deleteTodoWithJWT,
  getMaxOrderIndexWithJWT,
  queryRLSTableWithJWT,
  createTodoExclusionWithJWT,
  queryTodoExclusionsWithJWT,
  deleteAllTodoExclusionsWithJWT,
  updateWithJWT
} from '@/lib/supabaseWebViewHelper';
import {
  createTimeOverrideWithJWT,
  updateTimeOverrideWithJWT,
  queryTimeOverridesWithJWT,
  deleteTimeOverridesFromDateWithJWT,
  deleteAllTimeOverridesWithJWT
} from '@/lib/supabase/time-overrides';
import { format } from 'date-fns';
// getCurrentUser는 Capacitor 백업 세션 패턴으로 교체됨
import { supabase } from '@/lib/supabase';

/**
 * 할일 서비스 구현
 */
export class TodoService extends BaseService implements TodoRepository, ITodoService {
  constructor() {
    super('TodoService');
  }

  /**
   * ID로 할일 조회
   */
  async findById(id: string): Promise<Todo | null> {
    return this.executeWithPerformanceTracking(
      'findById',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'findById');

        try {
          // 🔑 JWT 방식으로 할일 조회 (Capacitor 환경 호환)
          const data = await queryRLSTableWithJWT('todos', [
            { column: 'id', operator: 'eq', value: id }
          ], { single: true });

          return data ? Todo.fromDatabase(data as any) : null;
        } catch (error) {
          // JWT 방식 실패 시 일반 클라이언트로 fallback
          
          // Fallback: 일반 Supabase 클라이언트 사용 (웹 환경)
          const data = await this.executeSingleQuery(
            this.client
              .from('todos')
              .select('*')
              .eq('id', id),
            { todoId: id }
          );

          return data ? Todo.fromDatabase(data as any) : null;
        }
      },
      { todoId: id }
    );
  }

  /**
   * 사용자의 모든 할일 조회 (순서대로)
   */
  async findByUserId(userId: string): Promise<Todo[]> {
    return this.executeWithPerformanceTracking(
      'findByUserId',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'findByUserId');

        const data = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .order('order_index', { ascending: true }),
          { userId }
        );

        return (data as any[]).map(item => Todo.fromDatabase(item));
      },
      { userId }
    );
  }

  /**
   * 사용자의 완료된 할일 조회
   */
  async findCompletedByUserId(userId: string): Promise<Todo[]> {
    return this.executeWithPerformanceTracking(
      'findCompletedByUserId',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'findCompletedByUserId');

        const data = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .eq('completed', true)
            .order('updated_at', { ascending: false }),
          { userId }
        );

        return (data as any[]).map(item => Todo.fromDatabase(item));
      },
      { userId }
    );
  }

  /**
   * 사용자의 미완료 할일 조회
   */
  async findPendingByUserId(userId: string): Promise<Todo[]> {
    return this.executeWithPerformanceTracking(
      'findPendingByUserId',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'findPendingByUserId');

        const data = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .eq('completed', false)
            .order('order_index', { ascending: true }),
          { userId }
        );

        return (data as any[]).map(item => Todo.fromDatabase(item));
      },
      { userId }
    );
  }

  /**
   * 새로운 스키마로 할일 생성 (반복 일정 지원)
   */
  async createWithRecurrence(input: CreateTodoInput): Promise<Todo[]> {
    return this.executeWithPerformanceTracking(
      'createWithRecurrence',
      async () => {
        this.validateRequiredFields(
          input,
          ['title', 'schedule_type'],
          'createWithRecurrence'
        );

        // 비즈니스 규칙 검증
        if (input.schedule_type === 'timed' && (!input.start_time || !input.end_time)) {
          throw new ServiceError(
            '시간 지정 일정은 시작/종료 시간이 필요합니다.',
            'MISSING_TIME_INFO',
            undefined,
            { input }
          );
        }

        if (input.start_time && input.end_time) {
          const startTime = new Date(input.start_time);
          const endTime = new Date(input.end_time);
          if (endTime <= startTime) {
            throw new ServiceError(
              '종료 시간은 시작 시간보다 늦어야 합니다.',
              'INVALID_TIME_RANGE',
              undefined,
              { startTime: input.start_time, endTime: input.end_time }
            );
          }
        }

        console.log('🔥 [TodoService] createWithRecurrence 호출됨:', { input, isCapacitor: isCapacitorEnvironment() });
    console.log('🔍 [DEBUG] input.order_index 초기값:', input.order_index, typeof input.order_index);

        // Capacitor 환경에서는 JWT 방식 사용
        if (isCapacitorEnvironment()) {
          console.log('🔑 [TodoService] Capacitor 환경 감지 - JWT 방식 사용');

          // 🔑 Capacitor 백업 세션 패턴으로 사용자 ID 획득
          let userId: string | undefined = undefined;

          try {
            // 순서 인덱스 자동 설정
            if (input.order_index === undefined) {
              console.log('📊 [TodoService] order_index 자동 설정 시작');
              
              try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.id) {
                  userId = session.user.id;
                }
              } catch (sessionError) {
                console.log("⚠️ 세션 조회 실패:", sessionError);
              }
              
              if (!userId && typeof window !== 'undefined' && (window as any).Capacitor) {
                try {
                  const { Preferences } = await import('@capacitor/preferences');
                  const sessionDataStr = await Preferences.get({ key: 'supabase_auth_session' });
                  
                  if (sessionDataStr.value) {
                    const sessionData = JSON.parse(sessionDataStr.value);
                    if (sessionData.user?.id) {
                      userId = sessionData.user.id;
                    }
                  }
                } catch (capacitorError) {
                  console.log("⚠️ Capacitor 백업 사용자 ID 로드 실패:", capacitorError);
                }
              }
              
              if (!userId) {
                throw new ServiceError('인증된 사용자를 찾을 수 없습니다.', 'UNAUTHORIZED');
              }
              
              const maxOrder = await getMaxOrderIndexWithJWT('todos', userId);
              input.order_index = maxOrder + 1;
              console.log('📊 [TodoService] order_index 설정 완료:', { maxOrder, newOrderIndex: input.order_index });
            }

            console.log('🔥 [TodoService] JWT 할일 생성 시작:', { finalInput: input });

            // 부모 할일 생성 (userId 전달하여 project_ids 처리 보장)
            const parentTodo = await createTodoWithJWT({
              ...input,
              recurrence_pattern: input.recurrence_pattern || 'none',
              recurrence_interval: input.recurrence_interval || 1
            }, userId);
            
            const todos = [Todo.fromDatabase(parentTodo)];
            
            console.log('ℹ️ [TodoService] 할일 생성 완료 - 리마인더는 앱 시작 시 일괄 스케줄링됨');

            // ✅ 반복 일정 인스턴스는 DB에 저장하지 않음 (클라이언트에서 가상 생성)
            // recurrence-utils.ts의 generateRecurrenceInstances()가 메모리에서 인스턴스 생성
            if (input.recurrence_pattern && input.recurrence_pattern !== 'none') {
              console.log('✅ 반복 할일 parent 저장 완료 - 인스턴스는 클라이언트(TimelineContainer)에서 생성됨');
            }

            console.log('✅ [TodoService] JWT 할일 생성 성공:', { parentTodo });
            return todos;
          } catch (error) {
            console.error('❌ [TodoService] JWT 할일 생성 실패:', error);
            throw new ServiceError(
              'JWT 방식으로 할일 생성에 실패했습니다.',
              'JWT_CREATE_FAILED',
              error as Error,
              { input }
            );
          }
        }

        // 웹 환경에서는 기존 Supabase 클라이언트 사용
        console.log('🌐 [TodoService] 웹 환경 감지 - Supabase 클라이언트 사용');

        // 부모 할일 생성 - user_id가 누락되어 있어서 RLS 정책 위반
        // 🔑 Capacitor 백업 세션 패턴으로 사용자 ID 획득
        let userId: string | null = null;
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            userId = session.user.id;
          }
        } catch (sessionError) {
          console.log("⚠️ 세션 조회 실패:", sessionError);
        }
        
        if (!userId && typeof window !== 'undefined' && (window as any).Capacitor) {
          try {
            const { Preferences } = await import('@capacitor/preferences');
            const sessionDataStr = await Preferences.get({ key: 'supabase_auth_session' });
            
            if (sessionDataStr.value) {
              const sessionData = JSON.parse(sessionDataStr.value);
              if (sessionData.user?.id) {
                userId = sessionData.user.id;
              }
            }
          } catch (capacitorError) {
            console.log("⚠️ Capacitor 백업 사용자 ID 로드 실패:", capacitorError);
          }
        }
        
        if (!userId) {
          throw new ServiceError('인증된 사용자를 찾을 수 없습니다.', 'UNAUTHORIZED');
        }

        // 순서 인덱스 자동 설정 (userId 확보 후) - 기존 패턴과 동일하게 수정
        if (input.order_index === undefined) {
          console.log('📊 [TodoService] 웹 환경 order_index 자동 설정 시작');
          
          // 기존 할일들의 order_index를 가져와서 최댓값 계산 (기존 코드 패턴과 동일)
          const existingTodos = await this.executeQuery(
            this.client
              .from('todos')
              .select('order_index')
              .eq('user_id', userId)
          ) as { data: Array<{ order_index: number }> };
          
          // Math.max 패턴: 빈 배열이면 -1, 그 다음 +1 하여 0부터 시작 (기존 코드와 동일)
          console.log('🔍 [TodoService] existingTodos 원본 데이터:', existingTodos);
          
          const orderIndexes = existingTodos.data?.map(t => {
            console.log('🔍 [TodoService] order_index 값:', t.order_index, typeof t.order_index);
            return t.order_index;
          }) || [];
          
          console.log('🔍 [TodoService] orderIndexes 배열:', orderIndexes);
          
          const maxOrder = orderIndexes.length > 0 
            ? Math.max(...orderIndexes, -1)
            : -1;
          
          console.log('🔍 [TodoService] Math.max 결과:', maxOrder);
          
          input.order_index = maxOrder + 1;
          console.log('📊 [TodoService] 웹 환경 order_index 설정 완료:', {
            existingCount: existingTodos.data?.length || 0,
            orderIndexes,
            maxOrder,
            newOrderIndex: input.order_index
          });
        }

        // ✅ JWT 방식 사용 (Capacitor 환경과 동일)
        console.log('🔥 [TodoService] 웹 환경 JWT 할일 생성 시작:', { finalInput: input });

        const parentTodo = await createTodoWithJWT({
          ...input,
          recurrence_pattern: input.recurrence_pattern || 'none',
          recurrence_interval: input.recurrence_interval || 1
        }, userId);

        if (!parentTodo) {
          throw new ServiceError('Failed to create parent todo', 'CREATE_FAILED');
        }

        const todos = [Todo.fromDatabase(parentTodo)];

        // ✅ 반복 일정 인스턴스는 DB에 저장하지 않음 (클라이언트에서 가상 생성)
        // recurrence-utils.ts의 generateRecurrenceInstances()가 메모리에서 인스턴스 생성
        if (input.recurrence_pattern && input.recurrence_pattern !== 'none') {
          console.log('✅ 반복 할일 parent 저장 완료 - 인스턴스는 클라이언트(TimelineContainer)에서 생성됨');
        }

        return todos;
      },
      { operation: 'findByScheduleRange' }
    );
  }

  /**
   * 새 할일 생성 (기존 호환성 유지)
   */
  async create(todoData: TodoInsert): Promise<Todo> {
    return this.executeWithPerformanceTracking(
      'create',
      async () => {
        this.validateRequiredFields(
          todoData,
          ['user_id', 'title'],
          'create'
        );

        console.log('🔥 [TodoService] create 호출됨:', { todoData, isCapacitor: isCapacitorEnvironment() });

        // Capacitor 환경에서는 JWT 방식 사용
        if (isCapacitorEnvironment()) {
          console.log('🔑 [TodoService] Capacitor 환경 감지 - JWT 방식 사용');

          try {
            // 순서 인덱스 자동 설정
            if (todoData.order_index === undefined) {
              console.log('📊 [TodoService] order_index 자동 설정 시작');
              const maxOrder = await getMaxOrderIndexWithJWT('todos', todoData.user_id);
              todoData.order_index = maxOrder + 1;
              console.log('📊 [TodoService] order_index 설정 완료:', { maxOrder, newOrderIndex: todoData.order_index });
            }

            console.log('🔥 [TodoService] JWT 할일 생성 시작:', { finalTodoData: todoData });
            const data = await createTodoWithJWT(todoData, todoData.user_id);
            const todo = Todo.fromDatabase(data);
            
            console.log('ℹ️ [TodoService] 단일 할일 생성 완료 - 리마인더는 앱 시작 시 일괄 스케줄링됨');
            
            console.log('✅ [TodoService] JWT 할일 생성 성공:', { data });
            return todo;
          } catch (error) {
            console.error('❌ [TodoService] JWT 할일 생성 실패:', error);
            throw new ServiceError(
              'JWT 방식으로 할일 생성에 실패했습니다.',
              'JWT_CREATE_FAILED',
              error as Error,
              { todoData }
            );
          }
        }

        // 웹 환경에서는 기존 Supabase 클라이언트 사용
        console.log('🌐 [TodoService] 웹 환경 감지 - Supabase 클라이언트 사용');

        // 순서 인덱스 자동 설정 - 기존 패턴과 동일하게 수정
        if (todoData.order_index === undefined) {
          console.log('📊 [TodoService] create 웹 환경 order_index 자동 설정 시작');
          
          // 기존 할일들의 order_index를 가져와서 최댓값 계산 (기존 코드 패턴과 동일)
          const existingTodos = await this.executeQuery(
            this.client
              .from('todos')
              .select('order_index')
              .eq('user_id', todoData.user_id)
          ) as { data: Array<{ order_index: number }> };
          
          // Math.max 패턴: 빈 배열이면 -1, 그 다음 +1 하여 0부터 시작 (기존 코드와 동일)
          const maxOrder = existingTodos.data && existingTodos.data.length > 0 
            ? Math.max(...existingTodos.data.map(t => t.order_index), -1)
            : -1;
          
          todoData.order_index = maxOrder + 1;
          console.log('📊 [TodoService] create 웹 환경 order_index 설정 완료:', {
            existingCount: existingTodos.data?.length || 0,
            maxOrder,
            newOrderIndex: todoData.order_index
          });
        }

        // 새로운 스키마에 맞게 변환
        const createInput: CreateTodoInput = {
          title: todoData.title,
          priority: todoData.priority as any,
          schedule_type: (todoData as any).schedule_type || 'anytime',
          start_time: (todoData as any).start_time,
          end_time: (todoData as any).end_time,
          recurrence_pattern: (todoData as any).recurrence_pattern,
          recurrence_end_date: (todoData as any).recurrence_end_date,
          recurrence_count: (todoData as any).recurrence_count,
          recurrence_interval: (todoData as any).recurrence_interval,
          recurrence_days_of_week: (todoData as any).recurrence_days_of_week,
          recurrence_day_of_month: (todoData as any).recurrence_day_of_month,
          completed: todoData.completed,
          order_index: todoData.order_index,
          parent_todo_id: (todoData as any).parent_todo_id,
          // 출발 정보 필드 추가
          departure_location: (todoData as any).departure_location,
          departure_time: (todoData as any).departure_time,
          // ✅ 프로젝트/노트 연결 필드 추가
          project_ids: (todoData as any).project_ids,
          note_ids: (todoData as any).note_ids,
          // ✅ Second Brain System 필드 추가
          is_today_highlight: (todoData as any).is_today_highlight,
          assigned_to: (todoData as any).assigned_to,
          assigned_date: (todoData as any).assigned_date,
          // ✅ 아이콘/색상 필드 추가
          icon: todoData.icon || undefined,
          color: todoData.color || undefined
        };

        // 새로운 생성 메서드 사용 (첫 번째 할일만 반환)
        const todos = await this.createWithRecurrence(createInput);
        
        return todos[0]; // 첫 번째 할일 반환 (호환성 유지)
      },
      { userId: todoData.user_id }
    );
  }

  /**
   * 할일 업데이트
   */
  async update(id: string, todoData: TodoUpdate): Promise<Todo> {
    return this.executeWithPerformanceTracking(
      'update',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'update');

        // 할일 존재 확인
        const existingTodo = await this.findById(id);
        if (!existingTodo) {
          throw new ServiceError(
            '할일을 찾을 수 없습니다.',
            'TODO_NOT_FOUND',
            undefined,
            { todoId: id }
          );
        }

        // ✅ project_ids, note_ids 분리 (DB 컬럼이 아닌 연결 테이블로 관리)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { project_ids, note_ids, ...todoDataWithoutRelations } = todoData as any;

        const updateData = {
          ...todoDataWithoutRelations,
          updated_at: new Date().toISOString(),
        };

        // 🔑 JWT 방식으로 할일 업데이트 (Capacitor 환경 호환)
        const data = await updateWithJWT('todos', 
          { column: 'id', operator: 'eq', value: id },
          updateData
        );
        
        if (!data) {
          throw new Error('할일 업데이트 응답 데이터가 없습니다.');
        }
        
        // 📋 updateWithJWT는 배열을 반환하므로 첫 번째 요소 추출
        const updatedTodoData = Array.isArray(data) ? data[0] : data;
        
        const todo = Todo.fromDatabase(updatedTodoData);
        return todo;
      },
      { todoId: id }
    );
  }

  /**
   * 할일 삭제
   */
  async delete(id: string): Promise<void> {
    return this.executeWithPerformanceTracking(
      'delete',
      async () => {
        this.validateRequiredFields({ id }, ['id'], 'delete');

        // 할일 존재 확인
        const todo = await this.findById(id);
        if (!todo) {
          throw new ServiceError(
            '할일을 찾을 수 없습니다.',
            'TODO_NOT_FOUND',
            undefined,
            { todoId: id }
          );
        }

        await this.executeQuery(
          this.client
            .from('todos')
            .delete()
            .eq('id', id),
          { todoId: id }
        );
      },
      { todoId: id }
    );
  }

  /**
   * 할일 순서 일괄 업데이트
   */
  async reorderTodos(userId: string, todoIds: string[]): Promise<void> {
    return this.executeWithPerformanceTracking(
      'reorderTodos',
      async () => {
        this.validateRequiredFields({ userId, todoIds }, ['userId', 'todoIds'], 'reorderTodos');

        if (todoIds.length === 0) return;

        // 사용자의 할일인지 확인
        const userTodos = await this.findByUserId(userId);
        const userTodoIds = new Set(userTodos.map(t => t.id));
        
        const invalidIds = todoIds.filter(id => !userTodoIds.has(id));
        if (invalidIds.length > 0) {
          throw new ServiceError(
            '권한이 없는 할일이 포함되어 있습니다.',
            'UNAUTHORIZED_TODO_ACCESS',
            undefined,
            { userId, invalidIds }
          );
        }

        // 순서 업데이트를 위한 배치 작업
        const updates = todoIds.map((id, index) => ({
          id,
          order_index: index,
          updated_at: new Date().toISOString(),
        }));

        // RPC 함수를 사용한 일괄 업데이트
        await this.executeQuery(
          this.client.rpc('bulk_update_todo_order', {
            updates: updates
          }),
          { userId, updates }
        );
      },
      { userId, todoCount: todoIds.length }
    );
  }

  /**
   * 사용자의 할일 개수 조회
   */
  async countByUserId(userId: string): Promise<number> {
    return this.executeWithPerformanceTracking(
      'countByUserId',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'countByUserId');

        const { count } = (await this.executeQuery(
          this.client
            .from('todos')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId),
          { userId }
        )) as any;

        return count || 0;
      },
      { userId }
    );
  }

  /**
   * 사용자의 완료된 할일 개수 조회
   */
  async countCompletedByUserId(userId: string): Promise<number> {
    return this.executeWithPerformanceTracking(
      'countCompletedByUserId',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'countCompletedByUserId');

        const { count } = (await this.executeQuery(
          this.client
            .from('todos')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('completed', true),
          { userId }
        )) as any;

        return count || 0;
      },
      { userId }
    );
  }

  /**
   * 할일 통계 조회
   */
  async getTodoStats(userId: string): Promise<{
    totalCount: number;
    completedCount: number;
    pendingCount: number;
    completionRate: number;
    averageCompletionTime: number;
    oldestPendingTodo: Date | null;
    todayCompleted: number;
    weekCompleted: number;
  }> {
    return this.executeWithPerformanceTracking(
      'getTodoStats',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'getTodoStats');

        // 모든 통계를 병렬로 조회
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);

        const [
          totalCount,
          completedCount,
          todayCompleted,
          weekCompleted,
          completedTodos,
          oldestPending
        ] = await Promise.all([
          this.countByUserId(userId),
          this.countCompletedByUserId(userId),
          // 오늘 완료된 할일
          this.executeQuery(
            this.client
              .from('todos')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('completed', true)
              .gte('updated_at', today.toISOString())
          ).then(result => (result as any).count || 0),
          // 일주일간 완료된 할일
          this.executeQuery(
            this.client
              .from('todos')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', userId)
              .eq('completed', true)
              .gte('updated_at', weekAgo.toISOString())
          ).then(result => (result as any).count || 0),
          // 완료된 할일들 (완료 시간 계산용)
          this.executeQuery(
            this.client
              .from('todos')
              .select('created_at, updated_at')
              .eq('user_id', userId)
              .eq('completed', true)
          ),
          // 가장 오래된 미완료 할일
          this.executeSingleQuery(
            this.client
              .from('todos')
              .select('created_at')
              .eq('user_id', userId)
              .eq('completed', false)
              .order('created_at', { ascending: true })
              .limit(1)
          )
        ]);

        const pendingCount = totalCount - completedCount;
        const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

        // 평균 완료 시간 계산 (일 단위)
        let averageCompletionTime = 0;
        if ((completedTodos as any[]).length > 0) {
          const completionTimes = (completedTodos as any[]).map((todo: any) => {
            const created = new Date(todo.created_at);
            const completed = new Date(todo.updated_at);
            return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24); // 일 단위
          });
          
          averageCompletionTime = completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length;
        }

        return {
          totalCount,
          completedCount,
          pendingCount,
          completionRate: Math.round(completionRate * 100) / 100,
          averageCompletionTime: Math.round(averageCompletionTime * 100) / 100,
          oldestPendingTodo: oldestPending ? new Date((oldestPending as any).created_at) : null,
          todayCompleted,
          weekCompleted,
        };
      },
      { userId }
    );
  }

  /**
   * 할일 완료율 추이 조회 (지난 30일)
   */
  async getCompletionTrend(userId: string): Promise<Array<{
    date: string;
    completed: number;
    created: number;
    completionRate: number;
  }>> {
    return this.executeWithPerformanceTracking(
      'getCompletionTrend',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'getCompletionTrend');

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // RPC 함수를 사용하여 일별 통계 조회
        const data = await this.executeQuery(
          this.client.rpc('get_todo_completion_trend', {
            p_user_id: userId,
            p_start_date: thirtyDaysAgo.toISOString().split('T')[0],
            p_end_date: new Date().toISOString().split('T')[0]
          }),
          { userId, startDate: thirtyDaysAgo }
        );

        return (data as any[]).map((item: any) => ({
          date: item.date,
          completed: item.completed || 0,
          created: item.created || 0,
          completionRate: item.completion_rate || 0,
        }));
      },
      { userId }
    );
  }

  /**
   * 할일 검색
   */
  async searchTodos(userId: string, query: string): Promise<Todo[]> {
    return this.executeWithPerformanceTracking(
      'searchTodos',
      async () => {
        this.validateRequiredFields({ userId, query }, ['userId', 'query'], 'searchTodos');

        const data = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .ilike('title', `%${query}%`)
            .order('order_index', { ascending: true }),
          { userId, query }
        );

        return (data as any[]).map(item => Todo.fromDatabase(item));
      },
      { userId, query }
    );
  }

  /**
   * 오래된 미완료 할일 정리 제안
   */
  async suggestCleanup(userId: string): Promise<{
    oldTodos: Todo[];
    duplicates: Todo[][];
    suggestions: string[];
  }> {
    return this.executeWithPerformanceTracking(
      'suggestCleanup',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'suggestCleanup');

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // 7일 이상 된 미완료 할일 조회
        const oldTodosData = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .eq('completed', false)
            .lt('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true }),
          { userId }
        );

        const oldTodos = (oldTodosData as any[]).map(item => Todo.fromDatabase(item));

        // 중복 가능성이 있는 할일 찾기 (내용이 유사한 것들)
        const allTodos = await this.findPendingByUserId(userId);
        const duplicates: Todo[][] = [];
        const processed = new Set<string>();

        for (const todo of allTodos) {
          if (processed.has(todo.id)) continue;

          const similar = allTodos.filter(other =>
            other.id !== todo.id &&
            !processed.has(other.id) &&
            this.isSimilarContent(todo.title, other.title)
          );

          if (similar.length > 0) {
            duplicates.push([todo, ...similar]);
            processed.add(todo.id);
            similar.forEach(s => processed.add(s.id));
          }
        }

        // 정리 제안 생성
        const suggestions: string[] = [];
        
        if (oldTodos.length > 0) {
          suggestions.push(`${oldTodos.length}개의 오래된 할일을 검토해보세요.`);
        }
        
        if (duplicates.length > 0) {
          suggestions.push(`${duplicates.length}개의 중복 가능한 할일 그룹이 있습니다.`);
        }

        if (allTodos.length > 20) {
          suggestions.push('할일이 많습니다. 우선순위를 정해보세요.');
        }

        return {
          oldTodos,
          duplicates,
          suggestions,
        };
      },
      { userId }
    );
  }


  /**
   * 할일 일괄 작업
   */
  async bulkOperation(
    todoIds: string[],
    operation: 'complete' | 'delete'
  ): Promise<{
    success: number;
    failed: number;
    errors: string[];
  }> {
    return this.executeWithPerformanceTracking(
      'bulkOperation',
      async () => {
        this.validateRequiredFields({ todoIds, operation }, ['todoIds', 'operation'], 'bulkOperation');

        if (todoIds.length === 0) {
          return { success: 0, failed: 0, errors: [] };
        }

        const operationMap = {
          complete: async (id: string) => {
            return await this.update(id, { completed: true });
          },
          delete: async (id: string) => {
            const todo = await this.findById(id);
            await this.delete(id);
            return todo!;
          },
        };

        const operationFn = operationMap[operation];
        if (!operationFn) {
          throw new ServiceError(
            '지원하지 않는 작업입니다.',
            'INVALID_OPERATION',
            undefined,
            { operation }
          );
        }

        const results = await this.executeBatch(
          todoIds,
          operationFn,
          5 // 배치 크기
        );

        const success = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;
        const errors = results
          .filter(r => !r.success)
          .map(r => r.error?.getLocalizedMessage() || '알 수 없는 오류');

        return { success, failed, errors };
      },
      { operation, todoCount: todoIds.length }
    );
  }

  /**
   * 할일 내보내기
   */
  async exportTodos(userId: string, format: 'json' | 'csv'): Promise<string> {
    return this.executeWithPerformanceTracking(
      'exportTodos',
      async () => {
        this.validateRequiredFields({ userId, format }, ['userId', 'format'], 'exportTodos');

        const todos = await this.findByUserId(userId);

        if (format === 'json') {
          return JSON.stringify(todos.map(todo => ({
            id: todo.id,
            title: todo.title,
            completed: todo.completed,
            orderIndex: todo.orderIndex,
            createdAt: todo.createdAt.toISOString(),
            updatedAt: todo.updatedAt.toISOString(),
          })), null, 2);
        } else if (format === 'csv') {
          const headers = ['ID', '제목', '완료여부', '순서', '생성일', '수정일'];
          const rows = todos.map(todo => [
            todo.id,
            `"${todo.title.replace(/"/g, '""')}"`, // CSV 이스케이프
            todo.completed ? '완료' : '미완료',
            todo.orderIndex.toString(),
            todo.createdAt.toISOString(),
            todo.updatedAt.toISOString(),
          ]);

          return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        }

        throw new ServiceError(
          '지원하지 않는 형식입니다.',
          'INVALID_FORMAT',
          undefined,
          { format }
        );
      },
      { userId, format }
    );
  }

  /**
   * 할일 가져오기
   */
  async importTodos(userId: string, data: string): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    return this.executeWithPerformanceTracking(
      'importTodos',
      async () => {
        this.validateRequiredFields({ userId, data }, ['userId', 'data'], 'importTodos');

        let todos: any[];
        
        try {
          // JSON 형식으로 파싱 시도
          todos = JSON.parse(data);
        } catch {
          throw new ServiceError(
            '올바른 JSON 형식이 아닙니다.',
            'INVALID_JSON_FORMAT',
            undefined,
            { userId }
          );
        }

        if (!Array.isArray(todos)) {
          throw new ServiceError(
            '할일 목록은 배열 형태여야 합니다.',
            'INVALID_DATA_FORMAT',
            undefined,
            { userId }
          );
        }

        const results = await this.executeBatch(
          todos,
          async (todoData: any) => {
            // 필수 필드 확인
            if (!todoData.title || typeof todoData.title !== 'string') {
              throw new ServiceError('할일 제목이 필요합니다.', 'MISSING_TITLE');
            }

            const insertData: TodoInsert = {
              user_id: userId,
              title: todoData.title.trim(),
              completed: Boolean(todoData.completed),
              order_index: todoData.orderIndex || 0,
            };

            return await this.create(insertData);
          },
          3 // 작은 배치 크기로 부담 줄이기
        );

        const imported = results.filter(r => r.success).length;
        const skipped = results.filter(r => !r.success).length;
        const errors = results
          .filter(r => !r.success)
          .map(r => r.error?.getLocalizedMessage() || '알 수 없는 오류');

        return { imported, skipped, errors };
      },
      { userId }
    );
  }

  /**
   * 제목 유사도 검사 (간단한 구현)
   */
  private isSimilarContent(title1: string, title2: string): boolean {
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, '');
    const norm1 = normalize(title1);
    const norm2 = normalize(title2);
    
    // 완전히 동일하거나 한쪽이 다른 쪽을 포함하는 경우
    return norm1 === norm2 || 
           norm1.includes(norm2) || 
           norm2.includes(norm1) ||
           this.levenshteinDistance(norm1, norm2) / Math.max(norm1.length, norm2.length) < 0.3;
  }

  /**
   * 레벤슈타인 거리 계산
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  // ========== 새로운 스키마 지원 메서드들 ==========

  /**
   * 반복 일정 인스턴스들 생성
   */
  private async generateRecurrenceInstances(parentTodo: any, input: CreateTodoInput): Promise<any[]> {
    const instances: any[] = [];
    
    if (!input.recurrence_pattern || input.recurrence_pattern === 'none') {
      return instances;
    }

    const startDate = input.start_time ? new Date(input.start_time) : new Date();
    const endDate = input.recurrence_end_date 
      ? new Date(input.recurrence_end_date)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1년

    // 🚫 제외된 날짜들 조회 (JWT 방식)
    let excludedDates: Set<string> = new Set();
    if (parentTodo.id && input.user_id) {
      try {
        const excludedDateArray = await queryTodoExclusionsWithJWT(parentTodo.id, input.user_id);
        excludedDates = new Set(excludedDateArray);
        console.log('📅 반복 일정 제외 날짜 조회:', {
          parentTodoId: parentTodo.id,
          excludedCount: excludedDates.size,
          excludedDates: Array.from(excludedDates)
        });
      } catch (error) {
        console.warn('⚠️ 제외 날짜 조회 실패, 빈 세트로 진행:', error);
        excludedDates = new Set();
      }
    }

    let currentDate = new Date(startDate);
    let count = 0;
    const maxCount = input.recurrence_count || 365; // 최대 365개 인스턴스
    const interval = input.recurrence_interval || 1;

    while (currentDate <= endDate && count < maxCount) {
      currentDate = this.getNextRecurrenceDate(currentDate, input.recurrence_pattern, interval, input);
      if (currentDate > endDate) break;

      // 🚫 제외된 날짜인지 체크
      const currentDateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD 형식
      if (excludedDates.has(currentDateString)) {
        console.log('🚫 제외된 날짜 스킵:', {
          date: currentDateString,
          parentTodoId: parentTodo.id,
          todoTitle: input.title
        });
        continue; // 제외된 날짜는 인스턴스 생성하지 않음
      }

      const instanceData = {
        ...input,
        user_id: input.user_id || parentTodo.user_id, // RLS 정책을 위한 user_id 추가
        completed: input.completed || false, // NOT NULL 제약 조건을 위한 기본값
        parent_todo_id: parentTodo.id,
        start_time: currentDate.toISOString(),
        end_time: input.end_time 
          ? new Date(currentDate.getTime() + (new Date(input.end_time).getTime() - new Date(input.start_time!).getTime())).toISOString()
          : undefined,
        order_index: (input.order_index || 0) + count + 1
      };

      instances.push(instanceData);
      count++;
    }

    console.log('✅ 반복 일정 인스턴스 생성 완료:', {
      parentTodoId: parentTodo.id,
      totalGenerated: instances.length,
      excludedCount: excludedDates.size,
      dateRange: `${startDate.toISOString().split('T')[0]} ~ ${endDate.toISOString().split('T')[0]}`
    });

    return instances;
  }

  /**
   * 다음 반복 날짜 계산
   */
  private getNextRecurrenceDate(current: Date, pattern: RecurrencePattern, interval: number, input: CreateTodoInput): Date {
    const next = new Date(current);

    switch (pattern) {
      case 'daily':
        next.setDate(next.getDate() + interval);
        break;
      
      case 'weekly':
        if (input.recurrence_days_of_week && input.recurrence_days_of_week.length > 0) {
          // 특정 요일들에만 반복
          const currentDay = next.getDay(); // 0=일요일, 6=토요일
          const validDays = input.recurrence_days_of_week.sort();
          
          // 현재 주에서 다음 유효한 요일 찾기
          let foundInCurrentWeek = false;
          for (const day of validDays) {
            if (day > currentDay) {
              next.setDate(next.getDate() + (day - currentDay));
              foundInCurrentWeek = true;
              break;
            }
          }
          
          // 현재 주에 없으면 다음 주의 첫 번째 유효한 요일
          if (!foundInCurrentWeek) {
            const daysToAdd = 7 - currentDay + validDays[0] + (7 * (interval - 1));
            next.setDate(next.getDate() + daysToAdd);
          }
        } else {
          next.setDate(next.getDate() + (7 * interval));
        }
        break;
      
      case 'monthly':
        if (input.recurrence_day_of_month) {
          next.setMonth(next.getMonth() + interval);
          next.setDate(input.recurrence_day_of_month);
          
          // 해당 월에 없는 날짜인 경우 (예: 2월 31일) 마지막 날로 설정
          if (next.getDate() !== input.recurrence_day_of_month) {
            next.setDate(0); // 이전 달의 마지막 날
          }
        } else {
          next.setMonth(next.getMonth() + interval);
        }
        break;
      
      case 'custom':
        // 커스텀 패턴은 기본적으로 매일로 처리
        next.setDate(next.getDate() + interval);
        break;
      
      default:
        next.setDate(next.getDate() + 1);
    }

    return next;
  }

  /**
   * 날짜 범위로 할일 조회 (타임라인용)
   */
  async getTodosByDateRange(userId: string, startDate: Date, endDate: Date): Promise<Todo[]> {
    return this.executeWithPerformanceTracking(
      'getTodosByDateRange',
      async () => {
        this.validateRequiredFields({ userId, startDate, endDate }, ['userId', 'startDate', 'endDate'], 'getTodosByDateRange');

        const data = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .or(`start_time.gte.${startDate.toISOString()},schedule_type.eq.all_day`)
            .lte('start_time', endDate.toISOString())
            .order('start_time', { ascending: true }),
          { userId, startDate, endDate }
        );

        return (data as any[]).map(item => Todo.fromDatabase(item));
      },
      { userId, startDate, endDate }
    );
  }

  /**
   * 스케줄 타입별 할일 조회
   */
  async getTodosByScheduleType(userId: string, scheduleType: ScheduleType): Promise<Todo[]> {
    return this.executeWithPerformanceTracking(
      'getTodosByScheduleType',
      async () => {
        this.validateRequiredFields({ userId, scheduleType }, ['userId', 'scheduleType'], 'getTodosByScheduleType');

        const data = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .eq('schedule_type', scheduleType)
            .order('start_time', { ascending: true, nullsFirst: true }),
          { userId, scheduleType }
        );

        return (data as any[]).map(item => Todo.fromDatabase(item));
      },
      { userId, scheduleType }
    );
  }

  /**
   * 반복 일정 할일들 조회
   */
  async getRecurringTodos(userId: string): Promise<Todo[]> {
    return this.executeWithPerformanceTracking(
      'getRecurringTodos',
      async () => {
        this.validateRequiredFields({ userId }, ['userId'], 'getRecurringTodos');

        const data = await this.executeQuery(
          this.client
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .neq('recurrence_pattern', 'none')
            .order('start_time', { ascending: true }),
          { userId }
        );

        return (data as any[]).map(item => Todo.fromDatabase(item));
      },
      { userId }
    );
  }

  /**
   * 특정 날짜의 일정별 할일 조회
   */
  async getScheduledTodos(userId: string, date: Date): Promise<{
    allDay: Todo[];
    timed: Todo[];
    anytime: Todo[];
  }> {
    return this.executeWithPerformanceTracking(
      'getScheduledTodos',
      async () => {
        this.validateRequiredFields({ userId, date }, ['userId', 'date'], 'getScheduledTodos');

        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // 모든 일정 타입을 병렬로 조회
        const [allDayData, timedData, anytimeData] = await Promise.all([
          this.executeQuery(
            this.client
              .from('todos')
              .select('*')
              .eq('user_id', userId)
              .eq('schedule_type', 'all_day')
              .gte('start_time', dayStart.toISOString())
              .lte('start_time', dayEnd.toISOString())
              .order('order_index', { ascending: true }),
            { userId, date, type: 'all_day' }
          ),
          this.executeQuery(
            this.client
              .from('todos')
              .select('*')
              .eq('user_id', userId)
              .eq('schedule_type', 'timed')
              .gte('start_time', dayStart.toISOString())
              .lte('start_time', dayEnd.toISOString())
              .order('start_time', { ascending: true }),
            { userId, date, type: 'timed' }
          ),
          this.executeQuery(
            this.client
              .from('todos')
              .select('*')
              .eq('user_id', userId)
              .eq('schedule_type', 'anytime')
              .order('order_index', { ascending: true }),
            { userId, date, type: 'anytime' }
          )
        ]);

        return {
          allDay: (allDayData as any[]).map(item => Todo.fromDatabase(item)),
          timed: (timedData as any[]).map(item => Todo.fromDatabase(item)),
          anytime: (anytimeData as any[]).map(item => Todo.fromDatabase(item))
        };
      },
      { userId, date }
    );
  }

  /**
   * 반복 일정 할일 업데이트
   */
  async updateRecurringTodo(
    id: string,
    updates: UpdateTodoInput,
    updateType: 'this' | 'future' | 'all',
    occurrenceDate?: Date // 특정 날짜 인스턴스 업데이트용
  ): Promise<void> {
    // ✅ 클로저 캡처를 위한 명시적 변수 저장
    const capturedOccurrenceDate = occurrenceDate;

    return this.executeWithPerformanceTracking(
      'updateRecurringTodo',
      async () => {
        console.log('🔍 [TodoService.updateRecurringTodo] 콜백 진입:', {
          capturedOccurrenceDate,
          occurrenceDateType: typeof capturedOccurrenceDate,
          occurrenceDateString: capturedOccurrenceDate?.toISOString(),
          updateType,
          id
        });

        this.validateRequiredFields({ id, updates, updateType }, ['id', 'updates', 'updateType'], 'updateRecurringTodo');

        const todo = await this.findById(id);
        if (!todo) {
          throw new ServiceError(
            '할일을 찾을 수 없습니다.',
            'TODO_NOT_FOUND',
            undefined,
            { todoId: id }
          );
        }

        // userId 획득 (Capacitor 백업 세션 패턴 사용)
        let userId: string | null = null;

        if (isCapacitorEnvironment()) {
          const { Preferences } = await import('@capacitor/preferences');
          const sessionData = await Preferences.get({ key: 'supabase_auth_session' });
          if (sessionData.value) {
            try {
              const session = JSON.parse(sessionData.value);
              userId = session?.user?.id || null;
            } catch (e) {
              console.error('세션 파싱 실패:', e);
            }
          }
        } else {
          const { data } = await supabase.auth.getSession();
          userId = data?.session?.user?.id || null;
        }

        if (!userId) {
          throw new ServiceError(
            '사용자 인증 정보를 찾을 수 없습니다.',
            'UNAUTHORIZED',
            undefined,
            { todoId: id }
          );
        }

        const updateData = {
          ...updates,
          updated_at: new Date().toISOString(),
        };

        switch (updateType) {
          case 'this':
            // 🔧 수정: 특정 날짜 인스턴스만 업데이트 (todo_time_overrides 사용)
            if (!capturedOccurrenceDate) {
              throw new ServiceError(
                '특정 인스턴스 업데이트에는 날짜 정보가 필요합니다.',
                'MISSING_OCCURRENCE_DATE',
                undefined,
                { todoId: id }
              );
            }

            // 날짜를 YYYY-MM-DD 형식으로 변환 (로컬 날짜 기준)
            const overrideDate = format(capturedOccurrenceDate, 'yyyy-MM-dd');

            // 🆕 제목 변경 정보 추출 (handleRecurringUpdate에서 _titleChange로 전달됨)
            const titleChange = (updates as any)._titleChange;
            const newTitleForOverride = titleChange?.newTitle;

            // 기존 override 확인
            const existingOverrides = await queryTimeOverridesWithJWT(
              id,
              userId,
              { start: overrideDate, end: overrideDate }
            );

            // override 데이터 구성 (시간과 제목 모두 선택적)
            const overrideUpdateData: { start_time?: string; end_time?: string; title?: string } = {};
            if (updates.start_time) overrideUpdateData.start_time = updates.start_time;
            if (updates.end_time) overrideUpdateData.end_time = updates.end_time;
            if (newTitleForOverride) overrideUpdateData.title = newTitleForOverride;

            console.log('🔍 [TodoService] 인스턴스 override 데이터:', {
              overrideDate,
              overrideUpdateData,
              hasTitleChange: !!newTitleForOverride,
              hasTimeChange: !!(updates.start_time || updates.end_time)
            });

            if (existingOverrides.length > 0) {
              // 업데이트
              await updateTimeOverrideWithJWT(id, overrideDate, overrideUpdateData);
            } else {
              // 생성 - 시간이나 제목 중 하나라도 있으면 생성
              if (Object.keys(overrideUpdateData).length > 0) {
                await createTimeOverrideWithJWT({
                  parent_todo_id: id,
                  user_id: userId,
                  override_date: overrideDate,
                  start_time: updates.start_time,
                  end_time: updates.end_time,
                  title: newTitleForOverride
                });
              }
            }
            break;

          case 'future':
            // 🔧 수정: 이후 모든 일정 업데이트
            // 1. 해당 날짜 이후의 모든 override 삭제
            if (!capturedOccurrenceDate) {
              throw new ServiceError(
                '이후 일정 업데이트에는 날짜 정보가 필요합니다.',
                'MISSING_OCCURRENCE_DATE',
                undefined,
                { todoId: id }
              );
            }

            const fromDate = format(capturedOccurrenceDate, 'yyyy-MM-dd');
            await deleteTimeOverridesFromDateWithJWT(id, fromDate, userId);

            // 2. 원본 todos 업데이트
            if (todo.parentTodoId) {
              await this.executeQuery(
                this.client
                  .from('todos')
                  .update(updateData)
                  .eq('parent_todo_id', todo.parentTodoId)
                  .gte('start_time', capturedOccurrenceDate.toISOString())
                  .select(),
                { parentId: todo.parentTodoId, fromDate: capturedOccurrenceDate }
              );
            } else {
              // 자신이 부모인 경우
              await this.executeQuery(
                this.client
                  .from('todos')
                  .update(updateData)
                  .or(`id.eq.${id},parent_todo_id.eq.${id}`)
                  .gte('start_time', capturedOccurrenceDate.toISOString())
                  .select(),
                { todoId: id, fromDate: capturedOccurrenceDate }
              );
            }
            break;

          case 'all':
            // 🔧 수정: 모든 일정 업데이트
            // 1. 모든 override 삭제
            await deleteAllTimeOverridesWithJWT(id, userId);

            // 2. 원본 todos 업데이트
            const parentId = todo.parentTodoId || id;
            await this.executeQuery(
              this.client
                .from('todos')
                .update(updateData)
                .or(`id.eq.${parentId},parent_todo_id.eq.${parentId}`)
                .select(),
              { parentId, updateData }
            );
            break;
        }
      },
      { todoId: id, updateType }
    );
  }

  /**
   * 반복 일정 할일 삭제 (날짜 지정 방식)
   */
  async deleteRecurringTodoWithDate(parentId: string, deleteType: 'this' | 'future' | 'all', excludedDate: string): Promise<void> {
    return this.executeWithPerformanceTracking(
      'deleteRecurringTodoWithDate',
      async () => {
        this.validateRequiredFields({ parentId, deleteType, excludedDate }, ['parentId', 'deleteType', 'excludedDate'], 'deleteRecurringTodoWithDate');

        // 현재 사용자 정보 가져오기 (createTodo와 동일한 패턴 사용)
        console.log('🔴 [DEBUG] deleteRecurringTodoWithDate - 사용자 ID 조회 시작:', {
          parentId,
          deleteType,
          excludedDate,
          isCapacitor: typeof window !== 'undefined' && window.location?.protocol === 'capacitor:'
        });
        
        let userId: string | null = null;
        
        // 먼저 일반 세션에서 사용자 ID 시도
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            userId = session.user.id;
            console.log("🔑 deleteRecurringTodoWithDate - 세션에서 사용자 ID 획득:", {
              userId: userId?.substring(0, 8),
            });
          }
        } catch (sessionError) {
          console.log("⚠️ deleteRecurringTodoWithDate - 세션 조회 실패:", sessionError);
        }

        // Capacitor 백업 시도 (createTodo와 동일한 로직)
        if (!userId && isCapacitorEnvironment()) {
          try {
            const { Preferences } = await import('@capacitor/preferences');
            const sessionDataStr = await Preferences.get({ key: 'supabase_auth_session' });
            
            if (sessionDataStr.value) {
              const sessionData = JSON.parse(sessionDataStr.value);
              if (sessionData.user?.id) {
                userId = sessionData.user.id;
                console.log("🔑 deleteRecurringTodoWithDate - Capacitor 저장소에서 사용자 ID 획득:", {
                  userId: userId?.substring(0, 8),
                });
              }
            }
          } catch (capacitorError) {
            console.log(
              "⚠️ deleteRecurringTodoWithDate - Capacitor 백업 사용자 ID 로드 실패:",
              capacitorError
            );
          }
        }
        
        if (!userId) {
          console.error('🔴 [DEBUG] 사용자 ID 없음 (모든 시도 실패)');
          throw new ServiceError(
            '사용자 인증이 필요합니다.',
            'AUTHENTICATION_REQUIRED',
            undefined,
            { parentId, excludedDate }
          );
        }

        console.log('🔴 [DEBUG] 최종 사용자 ID 확보:', { userId: userId.substring(0, 8) + '...' });

        switch (deleteType) {
          case 'this':
            console.log('🚫 반복 일정 개별 인스턴스 삭제 - 제외 날짜 기록:', {
              parentId,
              excludedDate,
              userId
            });

            // JWT 방식으로 제외 날짜 기록
            await createTodoExclusionWithJWT({
              parent_todo_id: parentId,
              excluded_date: excludedDate,
              user_id: userId
            });

            console.log('✅ 제외 날짜 기록 완료 - 인스턴스는 다음 로드 시 제외됨');
            break;

          default:
            throw new ServiceError(
              'deleteRecurringTodoWithDate는 "this" 타입만 지원합니다.',
              'INVALID_DELETE_TYPE',
              undefined,
              { parentId, deleteType, excludedDate }
            );
        }
      },
      { parentId, deleteType, excludedDate }
    );
  }

  /**
   * 반복 일정 할일 삭제 (JWT 방식, 제외 날짜 처리 포함)
   */
  async deleteRecurringTodo(id: string, deleteType: 'this' | 'future' | 'all'): Promise<void> {
    return this.executeWithPerformanceTracking(
      'deleteRecurringTodo',
      async () => {
        this.validateRequiredFields({ id, deleteType }, ['id', 'deleteType'], 'deleteRecurringTodo');

        const todo = await this.findById(id);
        if (!todo) {
          throw new ServiceError(
            '할일을 찾을 수 없습니다.',
            'TODO_NOT_FOUND',
            undefined,
            { todoId: id }
          );
        }

        // 현재 사용자 정보 가져오기 (createTodo와 동일한 패턴 사용)
        console.log('🔴 [DEBUG] deleteRecurringTodo - 사용자 ID 조회 시작:', {
          id,
          deleteType,
          isCapacitor: typeof window !== 'undefined' && window.location?.protocol === 'capacitor:'
        });
        
        let userId: string | null = null;
        
        // 먼저 일반 세션에서 사용자 ID 시도
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            userId = session.user.id;
            console.log("🔑 deleteRecurringTodo - 세션에서 사용자 ID 획득:", {
              userId: userId?.substring(0, 8),
            });
          }
        } catch (sessionError) {
          console.log("⚠️ deleteRecurringTodo - 세션 조회 실패:", sessionError);
        }

        // Capacitor 백업 시도 (createTodo와 동일한 로직)
        if (!userId && isCapacitorEnvironment()) {
          try {
            const { Preferences } = await import('@capacitor/preferences');
            const sessionDataStr = await Preferences.get({ key: 'supabase_auth_session' });
            
            if (sessionDataStr.value) {
              const sessionData = JSON.parse(sessionDataStr.value);
              if (sessionData.user?.id) {
                userId = sessionData.user.id;
                console.log("🔑 deleteRecurringTodo - Capacitor 저장소에서 사용자 ID 획득:", {
                  userId: userId?.substring(0, 8),
                });
              }
            }
          } catch (capacitorError) {
            console.log(
              "⚠️ deleteRecurringTodo - Capacitor 백업 사용자 ID 로드 실패:",
              capacitorError
            );
          }
        }
        
        if (!userId) {
          console.error('🔴 [DEBUG] deleteRecurringTodo - 사용자 ID 없음 (모든 시도 실패)');
          throw new ServiceError(
            '사용자 인증이 필요합니다.',
            'AUTHENTICATION_REQUIRED',
            undefined,
            { todoId: id }
          );
        }

        console.log('🔴 [DEBUG] deleteRecurringTodo - 최종 사용자 ID 확보:', { userId: userId.substring(0, 8) + '...' });
        const parentId = todo.parentTodoId || id;

        switch (deleteType) {
          case 'this':
            // 현재 인스턴스만 삭제 → todo_exclusions에 제외 날짜 기록
            if (!todo.startTime) {
              throw new ServiceError(
                '시간이 지정되지 않은 할일은 개별 삭제할 수 없습니다.',
                'INVALID_DELETE_OPERATION',
                undefined,
                { todoId: id }
              );
            }

            const excludedDate = todo.startTime.toISOString().split('T')[0]; // YYYY-MM-DD 형식
            
            console.log('🚫 반복 일정 개별 인스턴스 삭제 - 제외 날짜 기록:', {
              parentId,
              excludedDate,
              userId,
              todoTitle: todo.title
            });

            // JWT 방식으로 제외 날짜 기록
            await createTodoExclusionWithJWT({
              parent_todo_id: parentId,
              excluded_date: excludedDate,
              user_id: userId
            });

            // 클라이언트에서 해당 인스턴스만 제거 (실제 DB에서는 삭제하지 않음)
            // 다음 앱 실행 시 제외된 날짜는 인스턴스 생성에서 제외됨
            console.log('✅ 제외 날짜 기록 완료 - 인스턴스는 다음 로드 시 제외됨');
            break;

          case 'future':
            // 현재와 미래 인스턴스 모두 삭제 → 부모 할일의 recurrence_end_date 수정
            if (!todo.startTime) {
              throw new ServiceError(
                '시간이 지정되지 않은 할일은 미래 삭제할 수 없습니다.',
                'INVALID_DELETE_OPERATION',
                undefined,
                { todoId: id }
              );
            }

            // 어제 날짜로 recurrence_end_date 설정 (오늘 이후는 생성되지 않음)
            const yesterday = new Date(todo.startTime);
            yesterday.setDate(yesterday.getDate() - 1);
            const endDate = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD 형식

            console.log('🔚 반복 일정 미래 인스턴스 삭제 - 종료 날짜 수정:', {
              parentId,
              originalStartTime: todo.startTime.toISOString(),
              newEndDate: endDate,
              userId
            });

            // JWT 방식으로 부모 할일의 종료 날짜 수정
            await updateWithJWT('todos', {
              column: 'id',
              operator: 'eq',
              value: parentId
            }, {
              recurrence_end_date: endDate,
              updated_at: new Date().toISOString()
            });

            // 기존 미래 인스턴스들은 클라이언트에서 제거 (다음 로드 시 생성되지 않음)
            console.log('✅ 반복 종료 날짜 수정 완료 - 미래 인스턴스는 다음 로드 시 생성되지 않음');
            break;

          case 'all':
            // 부모와 모든 자식 인스턴스 삭제 + 관련 제외 날짜도 삭제
            console.log('🗑️ 반복 일정 전체 삭제:', {
              parentId,
              userId,
              todoTitle: todo.title
            });

            try {
              // 1. 모든 관련 제외 날짜 삭제 (CASCADE로 자동 삭제되지만 명시적으로 삭제)
              await deleteAllTodoExclusionsWithJWT(parentId, userId);
              console.log('✅ 관련 제외 날짜 삭제 완료');

              // 2. JWT 방식으로 부모 할일과 모든 자식 인스턴스 삭제
              // 부모 할일 삭제 (CASCADE로 자식들도 자동 삭제됨)
              await deleteTodoWithJWT(parentId);
              console.log('✅ 부모 할일 삭제 완료 (자식들도 CASCADE로 삭제됨)');

            } catch (error: any) {
              console.error('❌ 반복 일정 전체 삭제 실패:', error);
              throw new ServiceError(
                '반복 일정 삭제 중 오류가 발생했습니다.',
                'DELETE_RECURRING_TODO_FAILED',
                error,
                { parentId, userId, deleteType }
              );
            }
            break;

          default:
            throw new ServiceError(
              `지원하지 않는 삭제 유형입니다: ${deleteType}`,
              'INVALID_DELETE_TYPE',
              undefined,
              { deleteType, todoId: id }
            );
        }
      },
      { todoId: id, deleteType }
    );
  }

  // ========== 인터페이스 구현 메서드들 ==========

  /**
   * 새로운 스키마로 할일 생성
   */
  async createTodoWithSchedule(input: CreateTodoInput): Promise<Todo[]> {
    return await this.createWithRecurrence(input);
  }

  /**
   * 할일 스케줄 업데이트
   */
  async updateTodoSchedule(id: string, scheduleData: {
    scheduleType: ScheduleType;
    startTime?: Date;
    endTime?: Date;
  }): Promise<Todo> {
    const updates: UpdateTodoInput = {
      id,
      schedule_type: scheduleData.scheduleType,
      start_time: scheduleData.startTime?.toISOString(),
      end_time: scheduleData.endTime?.toISOString()
    };

    return await this.update(id, updates);
  }

  /**
   * 반복 일정 업데이트
   */
  async updateRecurrence(id: string, recurrenceData: {
    pattern: RecurrencePattern;
    endDate?: Date;
    count?: number;
    interval?: number;
    daysOfWeek?: number[];
    dayOfMonth?: number;
  }): Promise<void> {
    const updates: UpdateTodoInput = {
      id,
      recurrence_pattern: recurrenceData.pattern,
      recurrence_end_date: recurrenceData.endDate?.toISOString().split('T')[0],
      recurrence_count: recurrenceData.count,
      recurrence_interval: recurrenceData.interval,
      recurrence_days_of_week: recurrenceData.daysOfWeek,
      recurrence_day_of_month: recurrenceData.dayOfMonth
    };

    await this.updateRecurringTodo(id, updates, 'all');
  }

  /**
   * 타임라인용 할일 조회
   */
  async getTodosForTimeline(userId: string, startDate: Date, endDate: Date): Promise<Todo[]> {
    return await this.getTodosByDateRange(userId, startDate, endDate);
  }
}
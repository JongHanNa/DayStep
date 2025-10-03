import { format, startOfDay } from 'date-fns';
import { 
  queryRLSTableWithJWT, 
  createWithJWT, 
  deleteWithJWT 
} from '@/lib/supabaseWebViewHelper';

export interface TodoCompletion {
  id: string;
  todo_id: string;
  user_id: string;
  completion_date: string;
  created_at: string;
}

/**
 * 반복 할일 완료 상태 관리 서비스
 */
export class TodoCompletionsService {
  /**
   * 특정 사용자의 완료 기록들을 날짜 범위로 조회
   */
  static async getCompletionsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<TodoCompletion[]> {
    try {
      // 🔑 JWT 방식으로 완료 기록 조회 (Capacitor 환경 호환)
      const data = await queryRLSTableWithJWT('todo_completions', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'completion_date', operator: 'gte', value: format(startDate, 'yyyy-MM-dd') },
        { column: 'completion_date', operator: 'lte', value: format(endDate, 'yyyy-MM-dd') }
      ], { order: 'completion_date.asc' });

      return data || [];
    } catch (error) {
      console.error('❌ 완료 기록 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 할일의 완료 기록들 조회
   */
  static async getCompletionsByTodoId(
    todoId: string,
    userId: string
  ): Promise<TodoCompletion[]> {
    try {
      // 🔑 JWT 방식으로 할일별 완료 기록 조회 (Capacitor 환경 호환)
      const data = await queryRLSTableWithJWT('todo_completions', [
        { column: 'todo_id', operator: 'eq', value: todoId },
        { column: 'user_id', operator: 'eq', value: userId }
      ], { order: 'completion_date.asc' });

      return data || [];
    } catch (error) {
      console.error('❌ 할일별 완료 기록 조회 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 할일 완료 처리
   */
  static async markAsCompleted(
    todoId: string,
    userId: string,
    completionDate: Date
  ): Promise<TodoCompletion> {
    const completionData = {
      todo_id: todoId,
      user_id: userId,
      completion_date: format(startOfDay(completionDate), 'yyyy-MM-dd')
    };

    try {
      // 🔑 JWT 방식으로 완료 기록 생성 (Capacitor 환경 호환)
      const data = await createWithJWT('todo_completions', completionData);

      console.log('✅ 할일 완료 처리 성공:', {
        todoId,
        completionDate: completionData.completion_date,
        createdAt: data[0]?.created_at
      });

      return data[0];
    } catch (error) {
      console.error('❌ 완료 처리 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 할일 완료 취소 처리
   */
  static async markAsIncomplete(
    todoId: string,
    userId: string,
    completionDate: Date
  ): Promise<void> {
    const targetDateString = format(startOfDay(completionDate), 'yyyy-MM-dd');

    try {
      // 🔑 JWT 방식으로 완료 기록 삭제 (Capacitor 환경 호환)
      await deleteWithJWT('todo_completions', [
        { column: 'todo_id', operator: 'eq', value: todoId },
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'completion_date', operator: 'eq', value: targetDateString }
      ]);

      console.log('✅ 할일 완료 취소 성공:', {
        todoId,
        completionDate: targetDateString
      });
    } catch (error) {
      console.error('❌ 완료 취소 처리 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 완료 상태 토글
   */
  static async toggleCompletion(
    todoId: string,
    userId: string,
    completionDate: Date,
    isCurrentlyCompleted: boolean
  ): Promise<{ isCompleted: boolean; completion?: TodoCompletion }> {
    try {
      if (isCurrentlyCompleted) {
        // 완료 → 미완료
        await this.markAsIncomplete(todoId, userId, completionDate);
        return { isCompleted: false };
      } else {
        // 미완료 → 완료
        const completion = await this.markAsCompleted(todoId, userId, completionDate);
        return { isCompleted: true, completion };
      }
    } catch (error) {
      console.error('❌ 완료 상태 토글 오류:', error);
      throw error;
    }
  }

  /**
   * 특정 날짜의 완료 상태 확인
   */
  static async isCompletedOnDate(
    todoId: string,
    userId: string,
    targetDate: Date
  ): Promise<boolean> {
    const targetDateString = format(startOfDay(targetDate), 'yyyy-MM-dd');

    try {
      // 🔑 JWT 방식으로 완료 상태 확인 (Capacitor 환경 호환)
      const data = await queryRLSTableWithJWT('todo_completions', [
        { column: 'todo_id', operator: 'eq', value: todoId },
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'completion_date', operator: 'eq', value: targetDateString }
      ], { select: 'id', limit: 1 });

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('❌ 완료 상태 확인 오류:', error);
      return false;
    }
  }

  /**
   * 할일이 삭제될 때 관련 완료 기록도 모두 삭제 (CASCADE로 자동 처리되지만, 명시적 호출용)
   */
  static async deleteAllCompletionsByTodoId(
    todoId: string,
    userId: string
  ): Promise<void> {
    try {
      // 🔑 JWT 방식으로 완료 기록 전체 삭제 (Capacitor 환경 호환)
      await deleteWithJWT('todo_completions', [
        { column: 'todo_id', operator: 'eq', value: todoId },
        { column: 'user_id', operator: 'eq', value: userId }
      ]);

      console.log('✅ 할일 완료 기록 전체 삭제 성공:', { todoId });
    } catch (error) {
      console.error('❌ 완료 기록 전체 삭제 오류:', error);
      throw error;
    }
  }

  /**
   * 완료 통계 조회 (옵션: 나중에 확장 가능)
   */
  static async getCompletionStats(
    userId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    totalCompletions: number;
    completionsByDate: Record<string, number>;
    completionsByTodo: Record<string, number>;
  }> {
    const completions = await this.getCompletionsByDateRange(userId, startDate, endDate);
    
    const completionsByDate: Record<string, number> = {};
    const completionsByTodo: Record<string, number> = {};

    completions.forEach(completion => {
      // 날짜별 통계
      const date = completion.completion_date;
      completionsByDate[date] = (completionsByDate[date] || 0) + 1;

      // 할일별 통계
      const todoId = completion.todo_id;
      completionsByTodo[todoId] = (completionsByTodo[todoId] || 0) + 1;
    });

    return {
      totalCompletions: completions.length,
      completionsByDate,
      completionsByTodo
    };
  }
}
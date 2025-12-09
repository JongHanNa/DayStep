import {
  queryRLSTableWithJWT,
  createWithJWT,
  deleteWithJWT
} from '@/lib/supabaseWebViewHelper';
import { SkipReason } from '@/state/stores/adhdModeStore';

export interface TodoSkip {
  id: string;
  todo_id: string;
  user_id: string;
  skip_reason: SkipReason;
  skipped_at: string;
  cooldown_until: string;
  created_at: string;
}

// 쿨다운 시간 (30분)
const COOLDOWN_MINUTES = 30;

/**
 * ADHD 실행 모드 - Skip 기록 관리 서비스
 * 30분 쿨다운 기능 지원
 */
export class TodoSkipsService {
  /**
   * Skip 기록 생성 (30분 쿨다운 설정)
   */
  static async recordSkip(
    todoId: string,
    userId: string,
    reason: SkipReason
  ): Promise<TodoSkip> {
    // not_needed는 삭제이므로 기록하지 않음
    if (reason === 'not_needed') {
      throw new Error('not_needed 사유는 Skip 기록 대상이 아닙니다.');
    }

    const now = new Date();
    const cooldownUntil = new Date(now.getTime() + COOLDOWN_MINUTES * 60 * 1000);

    const skipData = {
      todo_id: todoId,
      user_id: userId,
      skip_reason: reason,
      skipped_at: now.toISOString(),
      cooldown_until: cooldownUntil.toISOString()
    };

    try {
      const data = await createWithJWT('todo_skips', skipData);

      console.log('⏭️ Skip 기록 생성:', {
        todoId,
        reason,
        cooldownUntil: cooldownUntil.toISOString()
      });

      return data[0];
    } catch (error) {
      console.error('❌ Skip 기록 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 현재 쿨다운 중인 Skip 목록 조회 (cooldown_until > now)
   */
  static async getActiveSkips(userId: string): Promise<TodoSkip[]> {
    const now = new Date().toISOString();

    try {
      const data = await queryRLSTableWithJWT('todo_skips', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'cooldown_until', operator: 'gt', value: now }
      ], { order: 'cooldown_until.asc' });

      return data || [];
    } catch (error: any) {
      // AbortError는 React 재렌더링으로 인한 정상적인 취소이므로 무시
      if (error?.name !== 'AbortError') {
        console.error('❌ 활성 Skip 조회 오류:', error);
      }
      throw error;
    }
  }

  /**
   * 쿨다운 중인 할일 ID 목록만 조회 (추천 필터링용)
   */
  static async getActiveSkipTodoIds(userId: string): Promise<string[]> {
    const activeSkips = await this.getActiveSkips(userId);
    return activeSkips.map(skip => skip.todo_id);
  }

  /**
   * 특정 할일이 쿨다운 중인지 확인
   */
  static async isSkipped(todoId: string, userId: string): Promise<boolean> {
    const now = new Date().toISOString();

    try {
      const data = await queryRLSTableWithJWT('todo_skips', [
        { column: 'todo_id', operator: 'eq', value: todoId },
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'cooldown_until', operator: 'gt', value: now }
      ], { select: 'id', limit: 1 });

      return (data?.length || 0) > 0;
    } catch (error) {
      console.error('❌ Skip 상태 확인 오류:', error);
      return false;
    }
  }

  /**
   * 특정 할일의 Skip 기록 삭제 (수동으로 쿨다운 해제 시)
   */
  static async removeSkip(todoId: string, userId: string): Promise<void> {
    try {
      await deleteWithJWT('todo_skips', [
        { column: 'todo_id', operator: 'eq', value: todoId },
        { column: 'user_id', operator: 'eq', value: userId }
      ]);

      console.log('✅ Skip 기록 삭제:', { todoId });
    } catch (error) {
      console.error('❌ Skip 기록 삭제 오류:', error);
      throw error;
    }
  }

  /**
   * 만료된 Skip 기록 정리 (선택적, 주기적 정리용)
   */
  static async clearExpiredSkips(userId: string): Promise<number> {
    const now = new Date().toISOString();

    try {
      // 만료된 기록 조회
      const expiredSkips = await queryRLSTableWithJWT('todo_skips', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'cooldown_until', operator: 'lte', value: now }
      ], { select: 'id' });

      if (!expiredSkips || expiredSkips.length === 0) {
        return 0;
      }

      // 만료된 기록 삭제
      await deleteWithJWT('todo_skips', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'cooldown_until', operator: 'lte', value: now }
      ]);

      console.log(`🧹 만료된 Skip ${expiredSkips.length}개 정리 완료`);
      return expiredSkips.length;
    } catch (error) {
      console.error('❌ 만료 Skip 정리 오류:', error);
      return 0;
    }
  }

  /**
   * Skip 통계 조회 (분석용)
   */
  static async getSkipStats(
    userId: string,
    days: number = 7
  ): Promise<{
    totalSkips: number;
    skipsByReason: Record<string, number>;
    skipsByTodo: Record<string, number>;
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const data = await queryRLSTableWithJWT('todo_skips', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'created_at', operator: 'gte', value: startDate.toISOString() }
      ]);

      const skips = data || [];
      const skipsByReason: Record<string, number> = {};
      const skipsByTodo: Record<string, number> = {};

      skips.forEach((skip: TodoSkip) => {
        // 사유별 통계
        skipsByReason[skip.skip_reason] = (skipsByReason[skip.skip_reason] || 0) + 1;
        // 할일별 통계
        skipsByTodo[skip.todo_id] = (skipsByTodo[skip.todo_id] || 0) + 1;
      });

      return {
        totalSkips: skips.length,
        skipsByReason,
        skipsByTodo
      };
    } catch (error) {
      console.error('❌ Skip 통계 조회 오류:', error);
      return {
        totalSkips: 0,
        skipsByReason: {},
        skipsByTodo: {}
      };
    }
  }
}

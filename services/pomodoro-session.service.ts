import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT
} from '@/lib/supabaseWebViewHelper';

export interface PomodoroSessionData {
  id: string;
  user_id: string;
  start_time: string;
  end_time: string | null;
  duration: number;
  is_completed: boolean;
  break_duration: number | null;
  linked_todo_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 포모도로 세션 관리 서비스
 * - DB 영속화를 통한 세션 유지 (뒤로가기 시 복원 가능)
 * - 미완료 할일 연결 기능
 */
export class PomodoroSessionService {
  /**
   * 새 포모도로 세션 생성
   * @param userId 사용자 ID
   * @param duration 세션 시간 (밀리초)
   * @returns 생성된 세션 ID
   */
  static async createSession(userId: string, duration: number): Promise<string> {
    const sessionData = {
      user_id: userId,
      start_time: new Date().toISOString(),
      duration,
      is_completed: false,
      break_duration: 5 // 기본 휴식 시간 (분)
    };

    try {
      const data = await createWithJWT('pomodoro_sessions', sessionData);
      console.log('🍅 포모도로 세션 시작:', { sessionId: data.id, duration });
      return data.id;
    } catch (error) {
      console.error('❌ 포모도로 세션 생성 오류:', error);
      throw error;
    }
  }

  /**
   * 사용자의 진행 중인 활성 세션 조회
   * (is_completed = false인 세션)
   * @param userId 사용자 ID
   * @returns 활성 세션 또는 null
   */
  static async getActiveSession(userId: string): Promise<PomodoroSessionData | null> {
    try {
      const data = await queryRLSTableWithJWT('pomodoro_sessions', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'is_completed', operator: 'eq', value: false }
      ], {
        order: 'created_at.desc',
        limit: 1
      });

      if (!data || data.length === 0) {
        return null;
      }

      const session = data[0] as PomodoroSessionData;

      // 세션 유효성 검증: 시작 시간 + duration 이 현재 시간보다 이전이면 만료
      const startTime = new Date(session.start_time).getTime();
      const endTime = startTime + session.duration;
      const now = Date.now();

      if (now > endTime) {
        console.log('⏰ 만료된 세션 발견, 자동 완료 처리');
        await this.completeSession(session.id);
        return null;
      }

      console.log('🔄 활성 세션 발견:', {
        sessionId: session.id,
        remaining: Math.floor((endTime - now) / 1000) + '초'
      });

      return session;
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        console.error('❌ 활성 세션 조회 오류:', error);
      }
      return null;
    }
  }

  /**
   * 세션 완료 처리
   * @param sessionId 세션 ID
   */
  static async completeSession(sessionId: string): Promise<void> {
    try {
      await updateWithJWT('pomodoro_sessions', [
        { column: 'id', operator: 'eq', value: sessionId }
      ], {
        is_completed: true,
        end_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log('✅ 포모도로 세션 완료:', { sessionId });
    } catch (error) {
      console.error('❌ 세션 완료 처리 오류:', error);
      throw error;
    }
  }

  /**
   * 세션 삭제 (그만할래)
   * @param sessionId 세션 ID
   */
  static async deleteSession(sessionId: string): Promise<void> {
    try {
      await deleteWithJWT('pomodoro_sessions', [
        { column: 'id', operator: 'eq', value: sessionId }
      ]);

      console.log('🗑️ 포모도로 세션 삭제:', { sessionId });
    } catch (error) {
      console.error('❌ 세션 삭제 오류:', error);
      throw error;
    }
  }

  /**
   * 세션에 할일 연결
   * @param sessionId 세션 ID
   * @param todoId 할일 ID
   */
  static async linkTodo(sessionId: string, todoId: string): Promise<void> {
    try {
      await updateWithJWT('pomodoro_sessions', [
        { column: 'id', operator: 'eq', value: sessionId }
      ], {
        linked_todo_id: todoId,
        updated_at: new Date().toISOString()
      });

      console.log('🔗 세션에 할일 연결:', { sessionId, todoId });
    } catch (error) {
      console.error('❌ 할일 연결 오류:', error);
      throw error;
    }
  }

  /**
   * 세션에서 할일 연결 해제
   * @param sessionId 세션 ID
   */
  static async unlinkTodo(sessionId: string): Promise<void> {
    try {
      await updateWithJWT('pomodoro_sessions', [
        { column: 'id', operator: 'eq', value: sessionId }
      ], {
        linked_todo_id: null,
        updated_at: new Date().toISOString()
      });

      console.log('🔓 세션에서 할일 연결 해제:', { sessionId });
    } catch (error) {
      console.error('❌ 할일 연결 해제 오류:', error);
      throw error;
    }
  }

  /**
   * 세션 정보 조회
   * @param sessionId 세션 ID
   */
  static async getSession(sessionId: string): Promise<PomodoroSessionData | null> {
    try {
      const data = await queryRLSTableWithJWT('pomodoro_sessions', [
        { column: 'id', operator: 'eq', value: sessionId }
      ], { limit: 1 });

      return data?.[0] as PomodoroSessionData || null;
    } catch (error) {
      console.error('❌ 세션 조회 오류:', error);
      return null;
    }
  }

  /**
   * 만료된 미완료 세션 정리 (선택적)
   * @param userId 사용자 ID
   */
  static async cleanupExpiredSessions(userId: string): Promise<number> {
    try {
      // 미완료 세션 조회
      const data = await queryRLSTableWithJWT('pomodoro_sessions', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'is_completed', operator: 'eq', value: false }
      ]);

      if (!data || data.length === 0) {
        return 0;
      }

      const now = Date.now();
      let cleanedCount = 0;

      for (const session of data as PomodoroSessionData[]) {
        const startTime = new Date(session.start_time).getTime();
        const endTime = startTime + session.duration;

        // 만료된 세션 삭제 또는 완료 처리
        if (now > endTime) {
          await this.completeSession(session.id);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 만료된 세션 ${cleanedCount}개 정리 완료`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ 만료 세션 정리 오류:', error);
      return 0;
    }
  }
}

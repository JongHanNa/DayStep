import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
} from '@/lib/supabaseWebViewHelper';
import type {
  CherishedPerson,
  CherishedPersonInput,
  CareInteraction,
  CareInteractionInput,
  ContactRecommendation,
  PriorityReminder,
  RelationshipStats,
} from '@/types/cherished-people';

// ============================================
// 소중한 사람 관리 서비스
// ============================================

/**
 * 소중한 사람 관리 서비스
 * 관계 균형 시스템의 사람 관리 + 관심 기록 담당
 */
export class CherishedPeopleService {

  // ============================================
  // 소중한 사람 CRUD
  // ============================================

  /**
   * 소중한 사람 목록 조회
   */
  static async getPeople(userId: string): Promise<CherishedPerson[]> {
    try {
      const data = await queryRLSTableWithJWT('cherished_people', [
        { column: 'user_id', operator: 'eq', value: userId },
      ], { order: 'name.asc' });

      console.log('👥 소중한 사람 목록 조회:', data?.length || 0, '명');
      return data || [];
    } catch (error) {
      console.error('❌ 소중한 사람 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 소중한 사람 추가
   */
  static async addPerson(
    userId: string,
    input: CherishedPersonInput
  ): Promise<CherishedPerson | null> {
    const personData = {
      user_id: userId,
      name: input.name.trim(),
      nickname: input.nickname?.trim() || null,
      interaction_count: 0,
    };

    try {
      const data = await createWithJWT('cherished_people', personData);
      console.log('➕ 소중한 사람 추가:', input.name);
      return data;
    } catch (error) {
      console.error('❌ 소중한 사람 추가 오류:', error);
      return null;
    }
  }

  /**
   * 소중한 사람 정보 수정
   */
  static async updatePerson(
    personId: string,
    userId: string,
    updates: Partial<CherishedPersonInput>
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'cherished_people',
        [
          { column: 'id', operator: 'eq', value: personId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { ...updates, updated_at: new Date().toISOString() }
      );
      console.log('✏️ 소중한 사람 수정:', personId);
      return true;
    } catch (error) {
      console.error('❌ 소중한 사람 수정 오류:', error);
      return false;
    }
  }

  /**
   * 특정 소중한 사람 조회
   */
  static async getPerson(
    personId: string,
    userId: string
  ): Promise<CherishedPerson | null> {
    try {
      const data = await queryRLSTableWithJWT('cherished_people', [
        { column: 'id', operator: 'eq', value: personId },
        { column: 'user_id', operator: 'eq', value: userId },
      ]);
      return data?.[0] || null;
    } catch (error) {
      console.error('❌ 소중한 사람 조회 오류:', error);
      return null;
    }
  }

  // ============================================
  // 관심 기록 CRUD
  // ============================================

  /**
   * 관심 기록 추가
   */
  static async addInteraction(
    userId: string,
    input: CareInteractionInput
  ): Promise<CareInteraction | null> {
    const interactionData = {
      user_id: userId,
      person_id: input.person_id,
      interaction_type: input.interaction_type,
      interaction_date: input.interaction_date,
      description: input.description?.trim() || null,
      gratitude_note: input.gratitude_note?.trim() || null,
      recent_news: input.recent_news?.trim() || null,
    };

    try {
      // 1. 관심 기록 생성
      const data = await createWithJWT('care_interactions', interactionData);

      // 2. 소중한 사람의 마지막 상호작용 시간 + 카운트 업데이트
      await this.updatePersonLastInteraction(input.person_id, userId);

      console.log('💝 관심 기록 추가:', input.interaction_type);
      return data[0];
    } catch (error) {
      console.error('❌ 관심 기록 추가 오류:', error);
      return null;
    }
  }

  /**
   * 소중한 사람의 마지막 상호작용 업데이트
   */
  private static async updatePersonLastInteraction(
    personId: string,
    userId: string
  ): Promise<void> {
    try {
      // 현재 interaction_count 조회
      const person = await this.getPerson(personId, userId);
      if (!person) return;

      await updateWithJWT(
        'cherished_people',
        [
          { column: 'id', operator: 'eq', value: personId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        {
          last_interaction_at: new Date().toISOString(),
          interaction_count: person.interaction_count + 1,
          updated_at: new Date().toISOString(),
        }
      );
    } catch (error) {
      console.error('❌ 마지막 상호작용 업데이트 오류:', error);
    }
  }

  /**
   * 특정 사람의 관심 기록 조회
   */
  static async getInteractionsByPerson(
    userId: string,
    personId: string,
    limit: number = 10
  ): Promise<CareInteraction[]> {
    try {
      const data = await queryRLSTableWithJWT('care_interactions', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'person_id', operator: 'eq', value: personId },
      ], { order: 'interaction_date.desc', limit });

      return data || [];
    } catch (error) {
      console.error('❌ 관심 기록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 최근 관심 기록 조회
   */
  static async getRecentInteractions(
    userId: string,
    days: number = 7
  ): Promise<CareInteraction[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    try {
      const data = await queryRLSTableWithJWT('care_interactions', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'interaction_date', operator: 'gte', value: startDate.toISOString().split('T')[0] },
      ], { order: 'interaction_date.desc' });

      return data || [];
    } catch (error) {
      console.error('❌ 최근 관심 기록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 관심 기록 삭제
   */
  static async deleteInteraction(
    interactionId: string,
    userId: string
  ): Promise<boolean> {
    try {
      await deleteWithJWT('care_interactions', [
        { column: 'id', operator: 'eq', value: interactionId },
        { column: 'user_id', operator: 'eq', value: userId },
      ]);
      console.log('🗑️ 관심 기록 삭제:', interactionId);
      return true;
    } catch (error) {
      console.error('❌ 관심 기록 삭제 오류:', error);
      return false;
    }
  }

  /**
   * 관심 기록 수정
   */
  static async updateInteraction(
    interactionId: string,
    userId: string,
    updates: Partial<CareInteractionInput>
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'care_interactions',
        [
          { column: 'id', operator: 'eq', value: interactionId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        updates
      );
      console.log('✏️ 관심 기록 수정:', interactionId);
      return true;
    } catch (error) {
      console.error('❌ 관심 기록 수정 오류:', error);
      return false;
    }
  }

  /**
   * 관심 기록 + 할일 연결 저장 (CareMode에서 사용)
   *
   * 1. todos 테이블에 완료된 할일 생성
   * 2. care_interactions 테이블에 기록 생성 (todo_id 연결)
   * 3. cherished_people 업데이트
   */
  static async addInteractionWithTodo(
    userId: string,
    input: CareInteractionInput,
    todoTitle: string
  ): Promise<{ interaction: CareInteraction; todoId: string } | null> {
    try {
      // 1. 완료된 할일 생성
      const todoData = {
        user_id: userId,
        title: todoTitle,
        completed: true,
        is_relationship_task: true,
        schedule_type: 'anytime',
        start_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const todoResult = await createWithJWT('todos', todoData);
      if (!todoResult || !todoResult.id) {
        throw new Error('할일 생성 실패');
      }

      const todoId = todoResult.id;

      // 2. 관심 기록 생성 (todo_id 연결)
      const interactionData = {
        user_id: userId,
        person_id: input.person_id,
        interaction_type: input.interaction_type,
        interaction_date: input.interaction_date,
        description: input.description?.trim() || null,
        gratitude_note: input.gratitude_note?.trim() || null,
        recent_news: input.recent_news?.trim() || null,
        request_from_them: input.request_from_them?.trim() || null,
        request_to_them: input.request_to_them?.trim() || null,
        meeting_note: input.meeting_note?.trim() || null,
        todo_id: todoId,
      };

      const interactionResult = await createWithJWT('care_interactions', interactionData);
      if (!interactionResult || !interactionResult.id) {
        throw new Error('관심 기록 생성 실패');
      }

      // 3. 소중한 사람의 마지막 상호작용 시간 + 카운트 업데이트
      await this.updatePersonLastInteraction(input.person_id, userId);

      console.log('💝 관심 기록 + 할일 연결 저장:', todoTitle);
      return {
        interaction: interactionResult,
        todoId,
      };
    } catch (error) {
      console.error('❌ 관심 기록 + 할일 저장 오류:', error);
      return null;
    }
  }

  // ============================================
  // 연락 추천 시스템
  // ============================================

  /**
   * 오래 연락 안 한 사람 추천
   */
  static async getContactRecommendations(
    userId: string,
    thresholdDays: number = 7
  ): Promise<ContactRecommendation[]> {
    try {
      const people = await this.getPeople(userId);
      const now = new Date();

      // 1단계: 추천 대상 필터링 (API 호출 없이 클라이언트에서 판단)
      const candidates: { person: CherishedPerson; daysSinceLastContact: number }[] = [];

      for (const person of people) {
        let daysSinceLastContact = -1; // -1 = 한 번도 연락 안 함

        if (person.last_interaction_at) {
          const lastDate = new Date(person.last_interaction_at);
          daysSinceLastContact = Math.floor(
            (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
          );
        }

        if (daysSinceLastContact >= thresholdDays || daysSinceLastContact === -1) {
          candidates.push({ person, daysSinceLastContact });
        }
      }

      // 2단계: 배치 쿼리로 전체 interactions 한 번에 조회 (N+1 → 1회)
      const candidateIds = candidates.map(c => c.person.id);
      let interactionMap = new Map<string, CareInteraction>();

      if (candidateIds.length > 0) {
        const allInteractions = await queryRLSTableWithJWT('care_interactions', [
          { column: 'user_id', operator: 'eq', value: userId },
          { column: 'person_id', operator: 'in', value: candidateIds },
        ], { order: 'interaction_date.desc' });

        // person_id별 최신 1건만 유지
        for (const interaction of (allInteractions || [])) {
          if (!interactionMap.has(interaction.person_id)) {
            interactionMap.set(interaction.person_id, interaction);
          }
        }
      }

      // 3단계: 추천 목록 구성
      const recommendations: ContactRecommendation[] = candidates.map(({ person, daysSinceLastContact }) => {
        let priority: 'high' | 'medium' | 'normal' = 'normal';
        if (daysSinceLastContact >= 30 || daysSinceLastContact === -1) {
          priority = 'high';
        } else if (daysSinceLastContact >= 14) {
          priority = 'medium';
        }

        return {
          person,
          daysSinceLastContact,
          lastInteraction: interactionMap.get(person.id) || null,
          priority,
        };
      });

      // 우선순위 + 일수 기준 정렬
      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, normal: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        // 한 번도 연락 안 한 사람 먼저
        if (a.daysSinceLastContact === -1) return -1;
        if (b.daysSinceLastContact === -1) return 1;
        return b.daysSinceLastContact - a.daysSinceLastContact;
      });
    } catch (error) {
      console.error('❌ 연락 추천 조회 오류:', error);
      return [];
    }
  }

  // ============================================
  // 우선순위 상기 메시지
  // ============================================

  /**
   * 랜덤 우선순위 상기 메시지 조회
   */
  static async getRandomPriorityReminder(): Promise<PriorityReminder | null> {
    try {
      const data = await queryRLSTableWithJWT('priority_reminders', [
        { column: 'is_active', operator: 'eq', value: true },
      ]);

      if (!data || data.length === 0) return null;

      // 가중치 기반 랜덤 선택
      const totalWeight = data.reduce((sum: number, r: PriorityReminder) => sum + r.display_weight, 0);
      let random = Math.random() * totalWeight;

      for (const reminder of data) {
        random -= reminder.display_weight;
        if (random <= 0) {
          console.log('💭 우선순위 메시지 선택:', reminder.message_key);
          return reminder;
        }
      }

      return data[0];
    } catch (error) {
      console.error('❌ 우선순위 메시지 조회 오류:', error);
      return null;
    }
  }

  /**
   * 특정 카테고리의 우선순위 메시지 조회
   */
  static async getPriorityRemindersByCategory(
    category: PriorityReminder['category']
  ): Promise<PriorityReminder[]> {
    try {
      const data = await queryRLSTableWithJWT('priority_reminders', [
        { column: 'category', operator: 'eq', value: category },
        { column: 'is_active', operator: 'eq', value: true },
      ]);
      return data || [];
    } catch (error) {
      console.error('❌ 카테고리별 메시지 조회 오류:', error);
      return [];
    }
  }

  // ============================================
  // 통계
  // ============================================

  /**
   * 관계 통계 조회
   */
  static async getRelationshipStats(userId: string): Promise<RelationshipStats> {
    try {
      const people = await this.getPeople(userId);
      const recommendations = await this.getContactRecommendations(userId, 7);
      const recentInteractions = await this.getRecentInteractions(userId, 7);

      // 이번 주 활성 사람 수 (unique person_id)
      const activePersonIds = new Set(recentInteractions.map(i => i.person_id));

      return {
        totalPeople: people.length,
        activeThisWeek: activePersonIds.size,
        needsAttention: recommendations.length,
        totalInteractions: people.reduce((sum, p) => sum + p.interaction_count, 0),
      };
    } catch (error) {
      console.error('❌ 관계 통계 조회 오류:', error);
      return {
        totalPeople: 0,
        activeThisWeek: 0,
        needsAttention: 0,
        totalInteractions: 0,
      };
    }
  }

  // ============================================
  // 관계 인사이트 (히스토리, 감사, 소식, 통계, 기분)
  // ============================================

  /**
   * 전체 관심 기록 조회 (사람 정보 포함)
   */
  static async getAllInteractionsWithPerson(
    userId: string,
    personId?: string,
    limit: number = 50
  ): Promise<(CareInteraction & { person?: CherishedPerson })[]> {
    try {
      const filters: any[] = [
        { column: 'user_id', operator: 'eq', value: userId },
      ];
      if (personId) {
        filters.push({ column: 'person_id', operator: 'eq', value: personId });
      }

      const interactions = await queryRLSTableWithJWT('care_interactions', filters, {
        order: 'interaction_date.desc',
        limit,
      });

      // 사람 정보 조인
      const people = await this.getPeople(userId);
      const peopleMap = new Map(people.map(p => [p.id, p]));

      return (interactions || []).map((interaction: CareInteraction) => ({
        ...interaction,
        person: peopleMap.get(interaction.person_id),
      }));
    } catch (error) {
      console.error('❌ 전체 관심 기록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 감사 노트만 조회
   */
  static async getGratitudeNotes(
    userId: string,
    personId?: string
  ): Promise<{ interaction: CareInteraction; person?: CherishedPerson }[]> {
    try {
      const allInteractions = await this.getAllInteractionsWithPerson(userId, personId, 100);
      return allInteractions
        .filter(i => i.gratitude_note && i.gratitude_note.trim() !== '')
        .map(i => ({ interaction: i, person: i.person }));
    } catch (error) {
      console.error('❌ 감사 노트 조회 오류:', error);
      return [];
    }
  }

  /**
   * 소식 메모만 조회
   */
  static async getRecentNewsNotes(
    userId: string,
    personId?: string
  ): Promise<{ interaction: CareInteraction; person?: CherishedPerson }[]> {
    try {
      const allInteractions = await this.getAllInteractionsWithPerson(userId, personId, 100);
      return allInteractions
        .filter(i => i.recent_news && i.recent_news.trim() !== '')
        .map(i => ({ interaction: i, person: i.person }));
    } catch (error) {
      console.error('❌ 소식 메모 조회 오류:', error);
      return [];
    }
  }

  /**
   * 상세 통계 (연락 방식별, 월별, TOP 연락 등)
   */
  static async getDetailedStats(userId: string): Promise<{
    totalInteractions: number;
    thisMonthCount: number;
    interactionTypeStats: Record<string, number>;
    topContacts: { person: CherishedPerson; count: number }[];
    monthlyTrend: { month: string; count: number }[];
  }> {
    try {
      const allInteractions = await this.getAllInteractionsWithPerson(userId, undefined, 500);
      const people = await this.getPeople(userId);
      const peopleMap = new Map(people.map(p => [p.id, p]));

      // 이번 달 시작
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      // 연락 방식별 집계
      const typeStats: Record<string, number> = {};
      const personCountMap = new Map<string, number>();
      const monthlyMap = new Map<string, number>();

      let thisMonthCount = 0;

      allInteractions.forEach(i => {
        // 연락 방식
        typeStats[i.interaction_type] = (typeStats[i.interaction_type] || 0) + 1;

        // 사람별 카운트
        personCountMap.set(i.person_id, (personCountMap.get(i.person_id) || 0) + 1);

        // 이번 달 카운트
        const interactionDate = new Date(i.interaction_date);
        if (interactionDate >= thisMonthStart) {
          thisMonthCount++;
        }

        // 월별 트렌드
        const monthKey = `${interactionDate.getFullYear()}-${String(interactionDate.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
      });

      // TOP 연락 (상위 5명)
      const topContacts = Array.from(personCountMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([personId, count]) => ({
          person: peopleMap.get(personId)!,
          count,
        }))
        .filter(item => item.person);

      // 월별 트렌드 (최근 6개월)
      const monthlyTrend = Array.from(monthlyMap.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .slice(0, 6)
        .reverse()
        .map(([month, count]) => ({ month, count }));

      return {
        totalInteractions: allInteractions.length,
        thisMonthCount,
        interactionTypeStats: typeStats,
        topContacts,
        monthlyTrend,
      };
    } catch (error) {
      console.error('❌ 상세 통계 조회 오류:', error);
      return {
        totalInteractions: 0,
        thisMonthCount: 0,
        interactionTypeStats: {},
        topContacts: [],
        monthlyTrend: [],
      };
    }
  }

  // ============================================
  // 유틸리티
  // ============================================

  /**
   * 오늘 날짜 문자열 (YYYY-MM-DD, 한국 시간)
   */
  static getTodayDateString(): string {
    const now = new Date();
    const koreaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    return koreaTime.toISOString().split('T')[0];
  }

  /**
   * 일수를 정확한 숫자로 표시
   */
  static formatDaysSince(days: number): string {
    if (days === -1) return '아직 연락한 적 없어요';
    if (days === 0) return '오늘';
    if (days === 1) return '어제';
    return `${days}일 전`;
  }

  // ============================================
  // 자동완성 추천 목록
  // ============================================

  /**
   * 관계 추천 목록 조회 (자동완성용)
   * 사용자가 입력한 기존 값들만 반환
   */
  static async getRelationshipSuggestions(userId: string): Promise<string[]> {
    try {
      const people = await this.getPeople(userId);
      const allRelationships = people.flatMap((p) => p.relationships || []);
      const uniqueRelationships = [...new Set(allRelationships)].filter(Boolean);
      return uniqueRelationships.sort();
    } catch (error) {
      console.error('❌ 관계 추천 조회 오류:', error);
      return [];
    }
  }

  /**
   * 역할/직분 추천 목록 조회 (자동완성용)
   * 사용자가 입력한 기존 값들만 반환
   */
  static async getRoleSuggestions(userId: string): Promise<string[]> {
    try {
      const people = await this.getPeople(userId);
      const allRoles = people.flatMap((p) => p.roles || []);
      const uniqueRoles = [...new Set(allRoles)].filter(Boolean);
      return uniqueRoles.sort();
    } catch (error) {
      console.error('❌ 역할 추천 조회 오류:', error);
      return [];
    }
  }

}

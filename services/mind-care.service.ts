import {
  queryRLSTableWithJWT,
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
} from '@/lib/supabaseWebViewHelper';
import type { QueryCondition } from '@/lib/supabase/core';
import type {
  MindCareEntry,
  MindCareEntryInput,
  MindCareEntryUpdate,
  MindCareEntryType,
  MindCareSettings,
  MindCarePrompt,
  MindCareStats,
  ComfortReminder,
} from '@/types/mind-care';
import { format, subDays, startOfWeek, startOfMonth, differenceInDays, parseISO } from 'date-fns';

// ============================================
// 나의 마음 챙기기 서비스
// ============================================

/**
 * 마음 챙기기 서비스
 * 성찰, 위로, 감사 기록 관리
 */
export class MindCareService {

  // ============================================
  // 마음 기록 CRUD
  // ============================================

  /**
   * 마음 기록 목록 조회
   */
  static async getEntries(
    userId: string,
    options?: {
      entryType?: MindCareEntryType;
      limit?: number;
      offset?: number;
    }
  ): Promise<MindCareEntry[]> {
    try {
      const filters: QueryCondition[] = [
        { column: 'user_id', operator: 'eq', value: userId },
      ];

      if (options?.entryType) {
        filters.push({ column: 'entry_type', operator: 'eq', value: options.entryType });
      }

      const data = await queryRLSTableWithJWT('mind_care_entries', filters, {
        order: 'is_pinned.desc,entry_date.desc,created_at.desc',
        limit: options?.limit,
      });

      console.log('📝 마음 기록 목록 조회:', data?.length || 0, '개');
      return data || [];
    } catch (error) {
      console.error('❌ 마음 기록 목록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 특정 날짜의 기록 조회
   */
  static async getEntriesByDate(
    userId: string,
    date: string
  ): Promise<MindCareEntry[]> {
    try {
      const data = await queryRLSTableWithJWT('mind_care_entries', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'entry_date', operator: 'eq', value: date },
      ], { order: 'created_at.desc' });

      return data || [];
    } catch (error) {
      console.error('❌ 날짜별 기록 조회 오류:', error);
      return [];
    }
  }

  /**
   * 마음 기록 추가
   */
  static async addEntry(
    userId: string,
    input: MindCareEntryInput
  ): Promise<MindCareEntry | null> {
    const entryData = {
      user_id: userId,
      entry_type: input.entry_type,
      content: input.content.trim(),
      source_text: input.source_text?.trim() || null,
      source_reference: input.source_reference?.trim() || null,
      insight: input.insight?.trim() || null,
      entry_date: input.entry_date,
      mood_rating: input.mood_rating || null,
      tags: input.tags || null,
      is_favorite: input.is_favorite || false,
      is_pinned: false,
      reminder_enabled: input.reminder_enabled || false,
      reminder_count: 0,
    };

    try {
      const data = await createWithJWT('mind_care_entries', entryData);
      console.log('➕ 마음 기록 추가:', input.entry_type);
      return data;
    } catch (error) {
      console.error('❌ 마음 기록 추가 오류:', error);
      return null;
    }
  }

  /**
   * 마음 기록 수정
   */
  static async updateEntry(
    entryId: string,
    userId: string,
    updates: MindCareEntryUpdate
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'mind_care_entries',
        [
          { column: 'id', operator: 'eq', value: entryId },
          { column: 'user_id', operator: 'eq', value: userId },
        ],
        { ...updates, updated_at: new Date().toISOString() }
      );
      console.log('✏️ 마음 기록 수정:', entryId);
      return true;
    } catch (error) {
      console.error('❌ 마음 기록 수정 오류:', error);
      return false;
    }
  }

  /**
   * 마음 기록 삭제
   */
  static async deleteEntry(entryId: string, userId: string): Promise<boolean> {
    try {
      await deleteWithJWT('mind_care_entries', [
        { column: 'id', operator: 'eq', value: entryId },
        { column: 'user_id', operator: 'eq', value: userId },
      ]);
      console.log('🗑️ 마음 기록 삭제:', entryId);
      return true;
    } catch (error) {
      console.error('❌ 마음 기록 삭제 오류:', error);
      return false;
    }
  }

  /**
   * 즐겨찾기 토글
   */
  static async toggleFavorite(
    entryId: string,
    userId: string,
    currentValue: boolean
  ): Promise<boolean> {
    return this.updateEntry(entryId, userId, { is_favorite: !currentValue });
  }

  /**
   * 상단 고정 토글
   */
  static async togglePinned(
    entryId: string,
    userId: string,
    currentValue: boolean
  ): Promise<boolean> {
    return this.updateEntry(entryId, userId, { is_pinned: !currentValue });
  }

  // ============================================
  // 성찰 질문 (Prompts)
  // ============================================

  /**
   * 랜덤 성찰 질문 가져오기 (가중치 기반)
   */
  static async getRandomPrompt(
    entryType: MindCareEntryType
  ): Promise<MindCarePrompt | null> {
    try {
      const data = await queryRLSTableWithJWT('mind_care_prompts', [
        { column: 'prompt_type', operator: 'eq', value: entryType },
        { column: 'is_active', operator: 'eq', value: true },
      ]);

      if (!data || data.length === 0) return null;

      // 가중치 기반 랜덤 선택
      const totalWeight = data.reduce((sum: number, p: MindCarePrompt) => sum + p.display_weight, 0);
      let random = Math.random() * totalWeight;

      for (const prompt of data) {
        random -= prompt.display_weight;
        if (random <= 0) return prompt;
      }

      return data[0];
    } catch (error) {
      console.error('❌ 성찰 질문 조회 오류:', error);
      return null;
    }
  }

  // ============================================
  // 위로 리마인더
  // ============================================

  /**
   * 위로 리마인더 가져오기
   * reminder_enabled가 true인 comfort 기록 중 랜덤 선택
   */
  static async getComfortReminder(userId: string): Promise<ComfortReminder | null> {
    try {
      const data = await queryRLSTableWithJWT('mind_care_entries', [
        { column: 'user_id', operator: 'eq', value: userId },
        { column: 'entry_type', operator: 'eq', value: 'comfort' },
        { column: 'reminder_enabled', operator: 'eq', value: true },
      ]);

      if (!data || data.length === 0) return null;

      // 랜덤 선택 (오래된 것일수록 가중치 높게)
      const withWeights = data.map((entry: MindCareEntry) => {
        const daysSince = differenceInDays(new Date(), parseISO(entry.created_at));
        const reminderPenalty = entry.reminder_count * 2; // 자주 보여준 건 가중치 낮게
        const weight = Math.max(1, daysSince - reminderPenalty);
        return { entry, weight };
      });

      const totalWeight = withWeights.reduce((sum: number, item: { entry: MindCareEntry; weight: number }) => sum + item.weight, 0);
      let random = Math.random() * totalWeight;

      for (const item of withWeights) {
        random -= item.weight;
        if (random <= 0) {
          return {
            entry: item.entry,
            daysSinceCreated: differenceInDays(new Date(), parseISO(item.entry.created_at)),
          };
        }
      }

      return {
        entry: data[0],
        daysSinceCreated: differenceInDays(new Date(), parseISO(data[0].created_at)),
      };
    } catch (error) {
      console.error('❌ 위로 리마인더 조회 오류:', error);
      return null;
    }
  }

  /**
   * 리마인더 조회 기록 업데이트
   */
  static async markReminderShown(entryId: string, userId: string): Promise<void> {
    try {
      // 현재 reminder_count 조회
      const entries = await queryRLSTableWithJWT('mind_care_entries', [
        { column: 'id', operator: 'eq', value: entryId },
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      if (entries && entries.length > 0) {
        await updateWithJWT(
          'mind_care_entries',
          [
            { column: 'id', operator: 'eq', value: entryId },
            { column: 'user_id', operator: 'eq', value: userId },
          ],
          {
            last_reminded_at: new Date().toISOString(),
            reminder_count: (entries[0].reminder_count || 0) + 1,
          }
        );
      }
    } catch (error) {
      console.error('❌ 리마인더 기록 업데이트 오류:', error);
    }
  }

  // ============================================
  // 통계
  // ============================================

  /**
   * 마음 돌봄 통계 조회
   */
  static async getStats(userId: string): Promise<MindCareStats> {
    try {
      const allEntries = await queryRLSTableWithJWT('mind_care_entries', [
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      if (!allEntries || allEntries.length === 0) {
        return {
          totalEntries: 0,
          reflectionCount: 0,
          comfortCount: 0,
          gratitudeCount: 0,
          currentStreak: 0,
          longestStreak: 0,
          favoriteCount: 0,
          thisWeekCount: 0,
          thisMonthCount: 0,
        };
      }

      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const monthStart = startOfMonth(today);

      // 유형별 카운트
      const reflectionCount = allEntries.filter((e: MindCareEntry) => e.entry_type === 'reflection').length;
      const comfortCount = allEntries.filter((e: MindCareEntry) => e.entry_type === 'comfort').length;
      const gratitudeCount = allEntries.filter((e: MindCareEntry) => e.entry_type === 'gratitude').length;
      const favoriteCount = allEntries.filter((e: MindCareEntry) => e.is_favorite).length;

      // 이번 주/이번 달 카운트
      const thisWeekCount = allEntries.filter((e: MindCareEntry) =>
        parseISO(e.entry_date) >= weekStart
      ).length;
      const thisMonthCount = allEntries.filter((e: MindCareEntry) =>
        parseISO(e.entry_date) >= monthStart
      ).length;

      // 연속 기록일 계산
      const { currentStreak, longestStreak } = this.calculateStreaks(allEntries);

      return {
        totalEntries: allEntries.length,
        reflectionCount,
        comfortCount,
        gratitudeCount,
        currentStreak,
        longestStreak,
        favoriteCount,
        thisWeekCount,
        thisMonthCount,
      };
    } catch (error) {
      console.error('❌ 통계 조회 오류:', error);
      return {
        totalEntries: 0,
        reflectionCount: 0,
        comfortCount: 0,
        gratitudeCount: 0,
        currentStreak: 0,
        longestStreak: 0,
        favoriteCount: 0,
        thisWeekCount: 0,
        thisMonthCount: 0,
      };
    }
  }

  /**
   * 연속 기록일 계산
   */
  private static calculateStreaks(entries: MindCareEntry[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    if (entries.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // 고유 날짜 추출 및 정렬
    const uniqueDates = [...new Set(entries.map(e => e.entry_date))].sort().reverse();

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

    // 오늘 또는 어제 기록이 있어야 현재 연속 기록 시작
    if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
      currentStreak = 1;

      for (let i = 1; i < uniqueDates.length; i++) {
        const prevDate = parseISO(uniqueDates[i - 1]);
        const currDate = parseISO(uniqueDates[i]);
        const diff = differenceInDays(prevDate, currDate);

        if (diff === 1) {
          currentStreak++;
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
          break;
        }
      }
    }

    // 전체 최장 연속 기록 계산
    tempStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = parseISO(uniqueDates[i - 1]);
      const currDate = parseISO(uniqueDates[i]);
      const diff = differenceInDays(prevDate, currDate);

      if (diff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  }

  // ============================================
  // 설정
  // ============================================

  /**
   * 설정 조회 (없으면 생성)
   */
  static async getSettings(userId: string): Promise<MindCareSettings | null> {
    try {
      const data = await queryRLSTableWithJWT('mind_care_settings', [
        { column: 'user_id', operator: 'eq', value: userId },
      ]);

      if (data && data.length > 0) {
        return data[0];
      }

      // 없으면 기본값으로 생성
      const defaultSettings = {
        user_id: userId,
        comfort_reminder_enabled: true,
        comfort_reminder_frequency: 3,
        gratitude_reminder_enabled: false,
        gratitude_reminder_time: '21:00',
        show_streak: true,
      };

      const created = await createWithJWT('mind_care_settings', defaultSettings);
      return created;
    } catch (error) {
      console.error('❌ 설정 조회 오류:', error);
      return null;
    }
  }

  /**
   * 설정 업데이트
   */
  static async updateSettings(
    userId: string,
    updates: Partial<Omit<MindCareSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ): Promise<boolean> {
    try {
      await updateWithJWT(
        'mind_care_settings',
        [{ column: 'user_id', operator: 'eq', value: userId }],
        { ...updates, updated_at: new Date().toISOString() }
      );
      return true;
    } catch (error) {
      console.error('❌ 설정 업데이트 오류:', error);
      return false;
    }
  }
}

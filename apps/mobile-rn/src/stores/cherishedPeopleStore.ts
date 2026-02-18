/**
 * Cherished People Store (Zustand + MMKV)
 * 소중한 사람 관리 + 연락 추천 + CareInteraction CRUD + 필터 조회 + 통계
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format} from 'date-fns';
import type {
  CareInteraction,
  CareInteractionInput,
  NoteWithPerson,
  DetailedStats,
  RelationshipStats,
  InteractionType,
} from '@/types/cherished-people';

export interface CherishedPerson {
  id: string;
  user_id: string;
  name: string;
  nickname?: string;
  relationships: string[];
  roles: string[];
  is_active: boolean;
  last_interaction_at?: string;
  interaction_count: number;
  created_at: string;
  updated_at: string;
}

export interface ContactRecommendation {
  person: CherishedPerson;
  daysSinceContact: number;
  priority: 'high' | 'medium' | 'normal';
}

interface CherishedPeopleState {
  people: CherishedPerson[];
  recommendations: ContactRecommendation[];
  loading: boolean;
  error: string | null;

  // 기존
  loadPeople: (userId: string) => Promise<void>;
  loadRecommendations: (userId: string, thresholdDays?: number) => Promise<void>;
  getRandomRecommendation: () => ContactRecommendation | null;
  clearError: () => void;

  // 사람 CRUD (신규)
  addPerson: (userId: string, data: {name: string; nickname?: string}) => Promise<CherishedPerson | null>;
  updatePerson: (userId: string, personId: string, data: Partial<{name: string; nickname: string}>) => Promise<boolean>;
  deactivatePerson: (personId: string, userId: string) => Promise<boolean>;

  // CareInteraction CRUD (신규)
  addInteraction: (userId: string, input: CareInteractionInput) => Promise<CareInteraction | null>;
  addInteractionWithTodo: (
    userId: string,
    input: CareInteractionInput,
    todoTitle: string,
  ) => Promise<{interactionId: string; todoId: string} | null>;
  getInteractionsByPerson: (userId: string, personId: string) => Promise<CareInteraction[]>;
  updateInteraction: (interactionId: string, userId: string, updates: Partial<CareInteractionInput>) => Promise<boolean>;
  deleteInteraction: (interactionId: string, userId: string) => Promise<boolean>;

  // 필터 조회 (신규)
  getGratitudeNotes: (userId: string, personId?: string) => Promise<NoteWithPerson[]>;
  getRecentNewsNotes: (userId: string, personId?: string) => Promise<NoteWithPerson[]>;

  // 통계 (신규)
  getDetailedStats: (userId: string) => Promise<DetailedStats>;
  getRelationshipStats: (userId: string) => Promise<RelationshipStats>;
}

/** 오늘 날짜 YYYY-MM-DD (KST) */
function getTodayDateString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export const useCherishedPeopleStore = create<CherishedPeopleState>()(
  persist(
    (set, get) => ({
      people: [],
      recommendations: [],
      loading: false,
      error: null,

      // ── 기존 ──

      loadPeople: async (userId: string) => {
        try {
          set({loading: true, error: null});

          const {data, error} = await supabase
            .from('cherished_people')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

          if (error) throw error;

          set({
            people: (data ?? []).map(p => ({
              ...p,
              relationships: p.relationships ?? [],
              roles: p.roles ?? [],
            })),
          });
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Load error:', err);
          set({error: err.message ?? 'Failed to load people'});
        } finally {
          set({loading: false});
        }
      },

      loadRecommendations: async (userId: string, thresholdDays = 7) => {
        const {people} = get();
        if (people.length === 0) {
          await get().loadPeople(userId);
        }

        const now = new Date();
        const recs: ContactRecommendation[] = [];

        for (const person of get().people) {
          const lastContact = person.last_interaction_at
            ? new Date(person.last_interaction_at)
            : null;

          if (!lastContact) {
            recs.push({person, daysSinceContact: 999, priority: 'high'});
            continue;
          }

          const daysSince = differenceInDays(now, lastContact);
          if (daysSince >= thresholdDays) {
            let priority: 'high' | 'medium' | 'normal' = 'normal';
            if (daysSince >= 30) priority = 'high';
            else if (daysSince >= 14) priority = 'medium';

            recs.push({person, daysSinceContact: daysSince, priority});
          }
        }

        recs.sort((a, b) => b.daysSinceContact - a.daysSinceContact);
        set({recommendations: recs});
      },

      getRandomRecommendation: () => {
        const {recommendations} = get();
        if (recommendations.length === 0) return null;
        const highPriority = recommendations.filter(r => r.priority === 'high');
        const source = highPriority.length > 0 ? highPriority : recommendations;
        return source[Math.floor(Math.random() * source.length)];
      },

      clearError: () => set({error: null}),

      // ── 사람 CRUD (신규) ──

      addPerson: async (userId, data) => {
        try {
          const {data: created, error} = await supabase
            .from('cherished_people')
            .insert({
              user_id: userId,
              name: data.name,
              nickname: data.nickname ?? null,
              is_active: true,
              interaction_count: 0,
              relationships: [],
              roles: [],
            })
            .select()
            .single();

          if (error) throw error;

          const person = {
            ...created,
            relationships: created.relationships ?? [],
            roles: created.roles ?? [],
          } as CherishedPerson;

          set(state => ({people: [...state.people, person]}));
          return person;
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Add person error:', err);
          set({error: err.message});
          return null;
        }
      },

      updatePerson: async (userId, personId, data) => {
        try {
          const {error} = await supabase
            .from('cherished_people')
            .update({...data, updated_at: new Date().toISOString()})
            .eq('id', personId)
            .eq('user_id', userId);

          if (error) throw error;

          set(state => ({
            people: state.people.map(p =>
              p.id === personId ? {...p, ...data} : p,
            ),
          }));
          return true;
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Update person error:', err);
          return false;
        }
      },

      deactivatePerson: async (personId, userId) => {
        try {
          const {error} = await supabase
            .from('cherished_people')
            .update({is_active: false, updated_at: new Date().toISOString()})
            .eq('id', personId)
            .eq('user_id', userId);

          if (error) throw error;

          set(state => ({
            people: state.people.filter(p => p.id !== personId),
          }));
          return true;
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Deactivate error:', err);
          return false;
        }
      },

      // ── CareInteraction CRUD (신규) ──

      addInteraction: async (userId, input) => {
        try {
          const {data, error} = await supabase
            .from('care_interactions')
            .insert({...input, user_id: userId})
            .select()
            .single();

          if (error) throw error;

          // cherished_people 업데이트: last_interaction_at + interaction_count
          await supabase
            .from('cherished_people')
            .update({
              last_interaction_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', input.person_id)
            .eq('user_id', userId);

          // 로컬 상태 반영
          set(state => ({
            people: state.people.map(p =>
              p.id === input.person_id
                ? {
                    ...p,
                    last_interaction_at: new Date().toISOString(),
                    interaction_count: p.interaction_count + 1,
                  }
                : p,
            ),
          }));

          return data as CareInteraction;
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Add interaction error:', err);
          set({error: err.message});
          return null;
        }
      },

      addInteractionWithTodo: async (userId, input, todoTitle) => {
        try {
          // 1. 할일 생성
          const {data: todoData, error: todoError} = await supabase
            .from('todos')
            .insert({
              user_id: userId,
              title: todoTitle,
              schedule_type: 'anytime',
              start_time: new Date().toISOString(),
              completed: false,
              order_index: 0,
              recurrence_pattern: 'none',
            })
            .select()
            .single();

          if (todoError) throw todoError;

          // 2. 인터랙션 생성 (todo_id 연결)
          const {data: interactionData, error: interactionError} = await supabase
            .from('care_interactions')
            .insert({...input, user_id: userId, todo_id: todoData.id})
            .select()
            .single();

          if (interactionError) throw interactionError;

          // cherished_people 업데이트
          await supabase
            .from('cherished_people')
            .update({
              last_interaction_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', input.person_id)
            .eq('user_id', userId);

          set(state => ({
            people: state.people.map(p =>
              p.id === input.person_id
                ? {
                    ...p,
                    last_interaction_at: new Date().toISOString(),
                    interaction_count: p.interaction_count + 1,
                  }
                : p,
            ),
          }));

          return {
            interactionId: interactionData.id,
            todoId: todoData.id,
          };
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Add interaction with todo error:', err);
          set({error: err.message});
          return null;
        }
      },

      getInteractionsByPerson: async (userId, personId) => {
        try {
          const {data, error} = await supabase
            .from('care_interactions')
            .select('*')
            .eq('user_id', userId)
            .eq('person_id', personId)
            .order('interaction_date', {ascending: false});

          if (error) throw error;
          return (data ?? []) as CareInteraction[];
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Get interactions error:', err);
          return [];
        }
      },

      updateInteraction: async (interactionId, userId, updates) => {
        try {
          const {error} = await supabase
            .from('care_interactions')
            .update(updates)
            .eq('id', interactionId)
            .eq('user_id', userId);

          if (error) throw error;
          return true;
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Update interaction error:', err);
          return false;
        }
      },

      deleteInteraction: async (interactionId, userId) => {
        try {
          const {error} = await supabase
            .from('care_interactions')
            .delete()
            .eq('id', interactionId)
            .eq('user_id', userId);

          if (error) throw error;
          return true;
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Delete interaction error:', err);
          return false;
        }
      },

      // ── 필터 조회 (신규) ──

      getGratitudeNotes: async (userId, personId) => {
        try {
          let query = supabase
            .from('care_interactions')
            .select('*, cherished_people!inner(name, nickname)')
            .eq('user_id', userId)
            .not('gratitude_note', 'is', null)
            .order('interaction_date', {ascending: false});

          if (personId) {
            query = query.eq('person_id', personId);
          }

          const {data, error} = await query;
          if (error) throw error;

          return (data ?? []).map((item: any) => ({
            id: item.id,
            person_id: item.person_id,
            person_name: item.cherished_people?.name ?? '',
            person_nickname: item.cherished_people?.nickname,
            interaction_type: item.interaction_type,
            interaction_date: item.interaction_date,
            gratitude_note: item.gratitude_note,
            recent_news: item.recent_news,
            description: item.description,
            created_at: item.created_at,
          })) as NoteWithPerson[];
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Get gratitude notes error:', err);
          return [];
        }
      },

      getRecentNewsNotes: async (userId, personId) => {
        try {
          let query = supabase
            .from('care_interactions')
            .select('*, cherished_people!inner(name, nickname)')
            .eq('user_id', userId)
            .not('recent_news', 'is', null)
            .order('interaction_date', {ascending: false});

          if (personId) {
            query = query.eq('person_id', personId);
          }

          const {data, error} = await query;
          if (error) throw error;

          return (data ?? []).map((item: any) => ({
            id: item.id,
            person_id: item.person_id,
            person_name: item.cherished_people?.name ?? '',
            person_nickname: item.cherished_people?.nickname,
            interaction_type: item.interaction_type,
            interaction_date: item.interaction_date,
            gratitude_note: item.gratitude_note,
            recent_news: item.recent_news,
            description: item.description,
            created_at: item.created_at,
          })) as NoteWithPerson[];
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Get news notes error:', err);
          return [];
        }
      },

      // ── 통계 (신규) ──

      getDetailedStats: async (userId) => {
        try {
          const {data: interactions, error} = await supabase
            .from('care_interactions')
            .select('id, person_id, interaction_type, interaction_date')
            .eq('user_id', userId)
            .order('interaction_date', {ascending: false});

          if (error) throw error;

          const all = interactions ?? [];
          const now = new Date();
          const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');

          // 유형별 통계
          const typeStats: Record<InteractionType, number> = {
            call: 0, message: 0, visit: 0, meal: 0, gift: 0,
            letter: 0, help: 0, prayer: 0, other: 0,
          };
          all.forEach((i: any) => {
            if (typeStats[i.interaction_type as InteractionType] !== undefined) {
              typeStats[i.interaction_type as InteractionType]++;
            }
          });

          // 이번 달
          const thisMonthCount = all.filter(
            (i: any) => i.interaction_date >= monthStart,
          ).length;

          // Top contacts
          const personCounts: Record<string, number> = {};
          all.forEach((i: any) => {
            personCounts[i.person_id] = (personCounts[i.person_id] || 0) + 1;
          });

          const {people} = get();
          const topContacts = Object.entries(personCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([personId, count]) => ({
              person_id: personId,
              name: people.find(p => p.id === personId)?.name ?? '알 수 없음',
              count,
            }));

          // 월별 트렌드 (최근 6개월)
          const monthlyTrend: Array<{month: string; count: number}> = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthKey = format(d, 'yyyy-MM');
            const count = all.filter(
              (item: any) => item.interaction_date?.startsWith(monthKey),
            ).length;
            monthlyTrend.push({month: monthKey, count});
          }

          return {
            totalInteractions: all.length,
            thisMonthCount,
            interactionTypeStats: typeStats,
            topContacts,
            monthlyTrend,
          };
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Detailed stats error:', err);
          return {
            totalInteractions: 0,
            thisMonthCount: 0,
            interactionTypeStats: {
              call: 0, message: 0, visit: 0, meal: 0, gift: 0,
              letter: 0, help: 0, prayer: 0, other: 0,
            },
            topContacts: [],
            monthlyTrend: [],
          };
        }
      },

      getRelationshipStats: async (userId) => {
        try {
          const {people} = get();
          if (people.length === 0) {
            await get().loadPeople(userId);
          }

          const now = new Date();
          const weekStart = startOfWeek(now, {weekStartsOn: 1});
          const weekEnd = endOfWeek(now, {weekStartsOn: 1});

          const {data: weekInteractions} = await supabase
            .from('care_interactions')
            .select('person_id')
            .eq('user_id', userId)
            .gte('interaction_date', format(weekStart, 'yyyy-MM-dd'))
            .lte('interaction_date', format(weekEnd, 'yyyy-MM-dd'));

          const {count: totalInteractions} = await supabase
            .from('care_interactions')
            .select('id', {count: 'exact', head: true})
            .eq('user_id', userId);

          const activePersonIds = new Set(
            (weekInteractions ?? []).map((i: any) => i.person_id),
          );

          const currentPeople = get().people;
          const needsAttention = currentPeople.filter(p => {
            if (!p.last_interaction_at) return true;
            return differenceInDays(now, new Date(p.last_interaction_at)) >= 14;
          }).length;

          return {
            totalPeople: currentPeople.length,
            activeThisWeek: activePersonIds.size,
            needsAttention,
            totalInteractions: totalInteractions ?? 0,
          };
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Relationship stats error:', err);
          return {totalPeople: 0, activeThisWeek: 0, needsAttention: 0, totalInteractions: 0};
        }
      },
    }),
    {
      name: 'cherished-people-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        people: state.people,
        recommendations: state.recommendations,
      }),
    },
  ),
);

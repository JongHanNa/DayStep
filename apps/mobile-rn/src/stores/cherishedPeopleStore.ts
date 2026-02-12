/**
 * Cherished People Store (Zustand + MMKV)
 * 소중한 사람 관리 + 연락 추천
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import {differenceInDays} from 'date-fns';

interface CherishedPerson {
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

interface ContactRecommendation {
  person: CherishedPerson;
  daysSinceContact: number;
  priority: 'high' | 'medium' | 'normal';
}

interface CherishedPeopleState {
  people: CherishedPerson[];
  recommendations: ContactRecommendation[];
  loading: boolean;
  error: string | null;

  loadPeople: (userId: string) => Promise<void>;
  loadRecommendations: (userId: string, thresholdDays?: number) => Promise<void>;
  getRandomRecommendation: () => ContactRecommendation | null;
  clearError: () => void;
}

export const useCherishedPeopleStore = create<CherishedPeopleState>()(
  persist(
    (set, get) => ({
      people: [],
      recommendations: [],
      loading: false,
      error: null,

      loadPeople: async (userId: string) => {
        try {
          set({loading: true, error: null});

          const {data, error} = await supabase
            .from('cherished_people')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true);

          if (error) throw error;

          set({people: (data ?? []).map(p => ({
            ...p,
            relationships: p.relationships ?? [],
            roles: p.roles ?? [],
          }))});
        } catch (err: any) {
          console.error('[CherishedPeopleStore] Load error:', err);
          set({error: err.message ?? 'Failed to load people'});
        } finally {
          set({loading: false});
        }
      },

      loadRecommendations: async (userId: string, thresholdDays = 7) => {
        // 먼저 people 로드
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
            recs.push({
              person,
              daysSinceContact: 999,
              priority: 'high',
            });
            continue;
          }

          const daysSince = differenceInDays(now, lastContact);
          if (daysSince >= thresholdDays) {
            let priority: 'high' | 'medium' | 'normal' = 'normal';
            if (daysSince >= 30) priority = 'high';
            else if (daysSince >= 14) priority = 'medium';

            recs.push({
              person,
              daysSinceContact: daysSince,
              priority,
            });
          }
        }

        // 경과일 내림차순 정렬
        recs.sort((a, b) => b.daysSinceContact - a.daysSinceContact);
        set({recommendations: recs});
      },

      getRandomRecommendation: () => {
        const {recommendations} = get();
        if (recommendations.length === 0) return null;
        // high priority 우선
        const highPriority = recommendations.filter(r => r.priority === 'high');
        const source = highPriority.length > 0 ? highPriority : recommendations;
        return source[Math.floor(Math.random() * source.length)];
      },

      clearError: () => set({error: null}),
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

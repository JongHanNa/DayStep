/**
 * Feedback Store (Zustand + MMKV)
 * 버그 신고 & 기능 요청 게시판 상태 관리
 *
 * - RLS: 작성자(user_id == auth.uid()) 또는 관리자(users.role='admin')만 SELECT 가능
 * - 집계 카운트: get_feedback_counts RPC로 SECURITY DEFINER 우회 조회
 * - Optimistic create/update
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {fetchWithJWT, supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';

// ============================================
// Types
// ============================================

export type FeedbackType = 'bug' | 'feature';
export type FeedbackStatus = 'review' | 'in_progress' | 'done' | 'declined';
export type FeedbackFilter = 'all' | 'bug' | 'feature';

export interface FeedbackPost {
  id: string;
  user_id: string;
  type: FeedbackType;
  title: string;
  content: string;
  status: FeedbackStatus;
  admin_reply: string | null;
  version_tag: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeedbackCounts {
  review: {mine: number; othersPrivate: number};
  in_progress: {mine: number; othersPrivate: number};
  done: {mine: number; othersPrivate: number};
  declined: {mine: number; othersPrivate: number};
}

export interface CreateFeedbackInput {
  type: FeedbackType;
  title: string;
  content: string;
}

interface FeedbackState {
  posts: FeedbackPost[];
  counts: FeedbackCounts;
  filter: FeedbackFilter;
  loading: boolean;
  error: string | null;

  // Actions
  setFilter: (filter: FeedbackFilter) => void;
  fetchMyFeedback: () => Promise<void>;
  fetchCounts: () => Promise<void>;
  createFeedback: (input: CreateFeedbackInput) => Promise<FeedbackPost | null>;
  updateFeedback: (id: string, patch: Partial<Pick<FeedbackPost, 'title' | 'content'>>) => Promise<void>;
  updateStatus: (id: string, status: FeedbackStatus, adminReply?: string, versionTag?: string) => Promise<void>;
  deleteFeedback: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const EMPTY_COUNTS: FeedbackCounts = {
  review: {mine: 0, othersPrivate: 0},
  in_progress: {mine: 0, othersPrivate: 0},
  done: {mine: 0, othersPrivate: 0},
  declined: {mine: 0, othersPrivate: 0},
};

// ============================================
// Store
// ============================================

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set, get) => ({
      posts: [],
      counts: EMPTY_COUNTS,
      filter: 'all',
      loading: false,
      error: null,

      setFilter: filter => set({filter}),

      fetchMyFeedback: async () => {
        set({loading: true, error: null});
        try {
          const query = 'feedback_posts?select=*&order=created_at.desc';
          const data = await fetchWithJWT(query);
          set({posts: data ?? [], loading: false});
        } catch (err: any) {
          console.error('[feedbackStore] fetchMyFeedback error:', err);
          set({loading: false, error: err?.message ?? 'Failed to load feedback'});
        }
      },

      fetchCounts: async () => {
        try {
          // RPC 호출 (집계용 SECURITY DEFINER 함수)
          const {data, error} = await supabase.rpc('get_feedback_counts');
          if (error) throw error;

          const next: FeedbackCounts = {...EMPTY_COUNTS};
          for (const row of data ?? []) {
            const status = row.status as FeedbackStatus;
            const total = Number(row.total_count ?? 0);
            const mine = Number(row.my_count ?? 0);
            next[status] = {
              mine,
              othersPrivate: Math.max(0, total - mine),
            };
          }
          set({counts: next});
        } catch (err: any) {
          console.error('[feedbackStore] fetchCounts error:', err);
        }
      },

      createFeedback: async input => {
        const {data: {session}} = await supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) {
          set({error: 'Not authenticated'});
          return null;
        }

        // Optimistic insert
        const tempId = `temp-${Date.now()}`;
        const now = new Date().toISOString();
        const optimistic: FeedbackPost = {
          id: tempId,
          user_id: userId,
          type: input.type,
          title: input.title,
          content: input.content,
          status: 'review',
          admin_reply: null,
          version_tag: null,
          created_at: now,
          updated_at: now,
        };
        set(state => ({posts: [optimistic, ...state.posts]}));

        try {
          const inserted = await fetchWithJWT('feedback_posts', {
            method: 'POST',
            body: JSON.stringify({
              user_id: userId,
              type: input.type,
              title: input.title,
              content: input.content,
            }),
          });
          const row = Array.isArray(inserted) ? inserted[0] : inserted;
          if (!row) throw new Error('No row returned');

          set(state => ({
            posts: state.posts.map(p => (p.id === tempId ? row : p)),
          }));
          // 카운트 갱신
          get().fetchCounts();
          return row;
        } catch (err: any) {
          // Rollback
          console.error('[feedbackStore] createFeedback error:', err);
          set(state => ({
            posts: state.posts.filter(p => p.id !== tempId),
            error: err?.message ?? 'Failed to create',
          }));
          return null;
        }
      },

      updateFeedback: async (id, patch) => {
        const prev = get().posts;
        set(state => ({
          posts: state.posts.map(p => (p.id === id ? {...p, ...patch} : p)),
        }));

        try {
          await fetchWithJWT(`feedback_posts?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
          });
        } catch (err: any) {
          console.error('[feedbackStore] updateFeedback error:', err);
          set({posts: prev, error: err?.message ?? 'Failed to update'});
        }
      },

      updateStatus: async (id, status, adminReply, versionTag) => {
        const prev = get().posts;
        const patch: Record<string, any> = {status};
        if (adminReply !== undefined) patch.admin_reply = adminReply;
        if (versionTag !== undefined) patch.version_tag = versionTag;

        set(state => ({
          posts: state.posts.map(p => (p.id === id ? {...p, ...patch} : p)),
        }));

        try {
          await fetchWithJWT(`feedback_posts?id=eq.${id}`, {
            method: 'PATCH',
            body: JSON.stringify(patch),
          });
          get().fetchCounts();
        } catch (err: any) {
          console.error('[feedbackStore] updateStatus error:', err);
          set({posts: prev, error: err?.message ?? 'Failed to update status'});
        }
      },

      deleteFeedback: async id => {
        const prev = get().posts;
        set(state => ({posts: state.posts.filter(p => p.id !== id)}));
        try {
          await fetchWithJWT(`feedback_posts?id=eq.${id}`, {method: 'DELETE'});
          get().fetchCounts();
        } catch (err: any) {
          console.error('[feedbackStore] deleteFeedback error:', err);
          set({posts: prev, error: err?.message ?? 'Failed to delete'});
        }
      },

      refresh: async () => {
        await Promise.all([get().fetchMyFeedback(), get().fetchCounts()]);
      },
    }),
    {
      name: 'feedback-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: state => ({
        posts: state.posts,
        counts: state.counts,
        filter: state.filter,
      }),
    },
  ),
);

// ============================================
// Selectors
// ============================================

/** 현재 필터가 적용된 내 게시물 */
export function selectFilteredPosts(state: FeedbackState): FeedbackPost[] {
  if (state.filter === 'all') return state.posts;
  return state.posts.filter(p => p.type === state.filter);
}

/** 상태별 내 게시물 */
export function selectPostsByStatus(
  posts: FeedbackPost[],
  status: FeedbackStatus,
): FeedbackPost[] {
  return posts.filter(p => p.status === status);
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createWithJWT,
  updateWithJWT,
  deleteWithJWT,
  queryRLSTableWithJWT,
  isCapacitorEnvironment,
  // 기존 태그 관련 함수들
  createMemoTagWithJWT,
  updateMemoTagWithJWT,
  deleteMemoTagWithJWT,
  fetchAllMemoTagsWithJWT,
  linkMemoToTagWithJWT,
  unlinkMemoFromTagWithJWT,
  fetchTagsForMemoWithJWT,
  linkMemoToMultipleTagsWithJWT,
  unlinkAllTagsFromMemoWithJWT,
  updateMemoTagsWithJWT,
  // 새로운 템플릿 관련 함수들
  fetchNoteTagTemplatesWithJWT,
  fetchNoteTagTemplatesByCategoryWithJWT,
  createTagFromTemplateWithJWT,
  createDefaultTagsForUserWithJWT,
  fetchUserTagsWithTemplatesWithJWT,
  updateMemoTagsWithTemplates,
  fetchMemoTagLinksWithJWT,
} from '@/lib/supabaseWebViewHelper';
import { supabase } from '@/lib/supabase';
import type { MemoTag, MemoTagLink, MemoTagInsert, MemoTagUpdate, MemoTagLinkInsert, NoteTagTemplate, CreateTagFromTemplateInput, TagCategoryGroup } from '@/types';
import { MEMO_TAG_CATEGORIES, RECOMMENDED_STARTER_TAGS } from '@/lib/memo-tag-constants';

/**
 * 노트 태그 스토어 상태 타입 정의
 */
interface MemoTagStoreState {
  // 데이터 상태
  tags: MemoTag[];
  templates: NoteTagTemplate[]; // 템플릿 태그들
  memoTagLinks: MemoTagLink[];

  // UI 상태
  loading: boolean;
  templatesLoading: boolean; // 템플릿 로딩 상태
  error: string | null;
  lastUpdated: string | null;

  // 로딩 상태 관리
  loadState: {
    hasInitiallyLoaded: boolean;
    templatesInitialized: boolean; // 템플릿 초기화 여부
    lastFetchTime: number;
    cacheValidityPeriod: number; // 밀리초 단위
  };

  // 필터 상태
  filters: {
    searchQuery: string;
    showInactive: boolean;
    selectedCategory: string | null; // 선택된 카테고리 필터
  };
}

/**
 * 노트 태그 스토어 액션 타입 정의
 */
interface MemoTagStoreActions {
  // 데이터 로딩
  loadAllTags: (userId: string, forceRefresh?: boolean) => Promise<void>;
  loadTagsForMemo: (memoId: string, userId: string) => Promise<MemoTag[]>;
  loadTemplates: (forceRefresh?: boolean) => Promise<void>; // 템플릿 로딩
  loadMemoTagLinks: (userId: string, forceRefresh?: boolean) => Promise<void>; // 노트 태그 링크 로딩

  // 템플릿 관련
  createTagFromTemplate: (templateData: CreateTagFromTemplateInput, userId: string) => Promise<MemoTag | null>;
  createDefaultTagsForUser: (userId: string) => Promise<number>;
  getTemplatesByCategory: (category?: string) => NoteTagTemplate[];
  getCategorizedTags: () => TagCategoryGroup[];

  // 태그 CRUD
  createTag: (tagData: Omit<MemoTagInsert, 'user_id'>, userId: string) => Promise<MemoTag | null>;
  updateTag: (tagId: string, updates: MemoTagUpdate, userId: string) => Promise<MemoTag | null>;
  deleteTag: (tagId: string, userId: string) => Promise<boolean>;

  // 태그-노트 연결 관리
  linkTagToMemo: (memoId: string, tagId: string, userId: string) => Promise<boolean>;
  unlinkTagFromMemo: (memoId: string, tagId: string, userId: string) => Promise<boolean>;
  updateMemoTags: (memoId: string, tagIds: string[], userId: string) => Promise<boolean>;
  updateMemoTagsWithTemplates: (memoId: string, userTagIds: string[], templateTagIds: string[], userId: string) => Promise<boolean>;

  // 태그 순서 관리
  reorderTags: (tagIds: string[], userId: string) => Promise<void>;

  // 필터 및 검색
  setSearchQuery: (query: string) => void;
  setShowInactive: (show: boolean) => void;
  setSelectedCategory: (category: string | null) => void; // 카테고리 필터
  getFilteredTags: () => MemoTag[];
  getFilteredTemplates: () => NoteTagTemplate[];

  // 유틸리티 함수들
  getTagById: (tagId: string) => MemoTag | undefined;
  getTagsForMemo: (memoId: string) => MemoTag[];
  getMemosForTag: (tagId: string) => string[];

  // 초기화 및 정리
  reset: () => void;
  clearError: () => void;

  // 기본 태그 생성
  createDefaultTags: (userId: string) => Promise<void>;
}

/**
 * 기본 상태 정의
 */
const initialState: MemoTagStoreState = {
  tags: [],
  templates: [],
  memoTagLinks: [],
  loading: false,
  templatesLoading: false,
  error: null,
  lastUpdated: null,
  loadState: {
    hasInitiallyLoaded: false,
    templatesInitialized: false,
    lastFetchTime: 0,
    cacheValidityPeriod: 5 * 60 * 1000, // 5분
  },
  filters: {
    searchQuery: '',
    showInactive: false,
    selectedCategory: null,
  },
};

/**
 * 노트 태그 스토어 생성
 */
export const useMemoTagStore = create<MemoTagStoreState & MemoTagStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // 데이터 로딩
      loadAllTags: async (userId: string, forceRefresh = false) => {
        const state = get();
        const now = Date.now();

        // 캐시 유효성 검사
        if (!forceRefresh &&
            state.loadState.hasInitiallyLoaded &&
            (now - state.loadState.lastFetchTime) < state.loadState.cacheValidityPeriod) {
          return;
        }

        set({ loading: true, error: null });

        try {
          const tags = await fetchAllMemoTagsWithJWT(userId);

          set((state) => ({
            ...state,
            tags: tags,
            loading: false,
            lastUpdated: new Date().toISOString(),
            loadState: {
              ...state.loadState,
              hasInitiallyLoaded: true,
              lastFetchTime: now,
            },
          }));
        } catch (error) {
          console.error('태그 로딩 실패:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : '태그 로딩에 실패했습니다.'
          });
        }
      },

      loadTagsForMemo: async (memoId: string, userId: string) => {
        try {
          const tags = await fetchTagsForMemoWithJWT(memoId, userId);

          // 메모-태그 링크 정보도 업데이트
          const links: MemoTagLink[] = tags.map(tag => ({
            id: `${memoId}-${tag.id}`,
            user_id: userId,
            memo_id: memoId,
            tag_id: tag.id,
            assigned_at: new Date().toISOString(),
            is_active: true,
          }));

          set((state) => ({
            ...state,
            memoTagLinks: [
              ...state.memoTagLinks.filter(link => link.memo_id !== memoId),
              ...links
            ]
          }));

          return tags;
        } catch (error) {
          console.error('노트 태그 로딩 실패:', error);
          return [];
        }
      },

      // 템플릿 로딩
      loadTemplates: async (forceRefresh = false) => {
        const state = get();

        console.log('🔄 loadTemplates 호출:', {
          forceRefresh,
          templatesInitialized: state.loadState.templatesInitialized,
          currentTemplatesCount: state.templates.length
        });

        // 디버깅을 위해 항상 로딩하도록 변경
        // if (!forceRefresh && state.loadState.templatesInitialized) {
        //   return;
        // }

        set({ templatesLoading: true, error: null });

        try {
          const templates = await fetchNoteTagTemplatesWithJWT();

          set({
            templates,
            templatesLoading: false,
            loadState: {
              ...state.loadState,
              templatesInitialized: true
            }
          });

          console.log('✅ 템플릿 로딩 성공:', { templateCount: templates.length });
        } catch (error) {
          console.error('❌ 템플릿 로딩 실패:', error);
          set({
            templatesLoading: false,
            error: error instanceof Error ? error.message : '템플릿 로딩에 실패했습니다.'
          });
        }
      },

      // 노트 태그 링크 로딩
      loadMemoTagLinks: async (userId: string, forceRefresh = false) => {
        const state = get();

        console.log('🔗 loadMemoTagLinks 호출:', {
          forceRefresh,
          currentLinksCount: state.memoTagLinks.length,
          userId
        });

        set({ loading: true, error: null });

        try {
          const links = await fetchMemoTagLinksWithJWT(userId);

          set({
            memoTagLinks: links,
            loading: false,
          });

          console.log('✅ 노트 태그 링크 로딩 성공:', { linkCount: links.length });
        } catch (error) {
          console.error('❌ 노트 태그 링크 로딩 실패:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : '노트 태그 링크 로딩에 실패했습니다.'
          });
        }
      },

      // 템플릿 관련 함수들
      createTagFromTemplate: async (templateData: CreateTagFromTemplateInput, userId: string) => {
        set({ loading: true, error: null });

        try {
          const result = await createTagFromTemplateWithJWT(templateData, userId);

          if (result) {
            // 새 태그를 스토어에 추가
            set((state) => ({
              ...state,
              tags: [...state.tags, result],
              loading: false,
            }));

            console.log('✅ 템플릿에서 태그 생성 성공:', result);
            return result;
          } else {
            throw new Error('템플릿에서 태그 생성에 실패했습니다.');
          }
        } catch (error) {
          console.error('❌ 템플릿에서 태그 생성 실패:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : '태그 생성에 실패했습니다.'
          });
          return null;
        }
      },

      createDefaultTagsForUser: async (userId: string) => {
        set({ loading: true, error: null });

        try {
          const createdCount = await createDefaultTagsForUserWithJWT(userId);

          // 새로 생성된 태그들 로딩
          await get().loadAllTags(userId, true);

          set({ loading: false });
          console.log('✅ 기본 태그 생성 성공:', { createdCount });
          return createdCount;
        } catch (error) {
          console.error('❌ 기본 태그 생성 실패:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : '기본 태그 생성에 실패했습니다.'
          });
          return 0;
        }
      },

      getTemplatesByCategory: (category?: string) => {
        const { templates } = get();
        if (!category) return templates;
        return templates.filter(template => template.category === category);
      },

      getCategorizedTags: () => {
        const { templates, tags } = get();
        const categoryGroups: TagCategoryGroup[] = [];

        MEMO_TAG_CATEGORIES.forEach(category => {
          const categoryTemplates = templates.filter(t => t.category === category.category);
          const categoryUserTags = tags.filter(t =>
            t.template_id &&
            templates.find(template => template.id === t.template_id)?.category === category.category
          );

          if (categoryTemplates.length > 0 || categoryUserTags.length > 0) {
            categoryGroups.push({
              category: category.category,
              templates: categoryTemplates,
              userTags: categoryUserTags
            });
          }
        });

        return categoryGroups;
      },

      // 태그 CRUD
      createTag: async (tagData, userId) => {
        set({ loading: true, error: null });

        try {
          const newTagData: MemoTagInsert = {
            ...tagData,
            user_id: userId,
            color: tagData.color || '#3B82F6',
          };

          const result = await createMemoTagWithJWT(tagData, userId);

          if (result) {
            const newTag: MemoTag = {
              ...result,
              color: result.color || '#3B82F6',
            };

            set((state) => ({
              ...state,
              tags: [...state.tags, newTag].sort((a, b) => (a.position || 0) - (b.position || 0)),
              loading: false,
              lastUpdated: new Date().toISOString(),
            }));

            return newTag;
          }

          return null;
        } catch (error) {
          console.error('태그 생성 실패:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : '태그 생성에 실패했습니다.'
          });
          return null;
        }
      },

      updateTag: async (tagId, updates, userId) => {
        set({ loading: true, error: null });

        try {
          const result = await updateMemoTagWithJWT(tagId, userId, updates);

          if (result) {
            set((state) => ({
              ...state,
              tags: state.tags.map(tag =>
                tag.id === tagId ? { ...tag, ...result } : tag
              ),
              loading: false,
              lastUpdated: new Date().toISOString(),
            }));

            return result;
          }

          return null;
        } catch (error) {
          console.error('태그 업데이트 실패:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : '태그 업데이트에 실패했습니다.'
          });
          return null;
        }
      },

      deleteTag: async (tagId, userId) => {
        set({ loading: true, error: null });

        try {
          const success = await deleteMemoTagWithJWT(tagId, userId);

          if (success) {
            set((state) => ({
              ...state,
              tags: state.tags.filter(tag => tag.id !== tagId),
              memoTagLinks: state.memoTagLinks.filter(link => link.tag_id !== tagId),
              loading: false,
              lastUpdated: new Date().toISOString(),
            }));
          }

          return success;
        } catch (error) {
          console.error('태그 삭제 실패:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : '태그 삭제에 실패했습니다.'
          });
          return false;
        }
      },

      // 태그-노트 연결 관리
      linkTagToMemo: async (memoId, tagId, userId) => {
        try {
          const result = await linkMemoToTagWithJWT(memoId, tagId, userId);

          if (result) {
            const newLink: MemoTagLink = {
              id: `${memoId}-${tagId}`,
              user_id: userId,
              memo_id: memoId,
              tag_id: tagId,
              assigned_at: new Date().toISOString(),
              is_active: true,
            };

            set((state) => ({
              ...state,
              memoTagLinks: [...state.memoTagLinks, newLink],
              lastUpdated: new Date().toISOString(),
            }));
          }

          return Boolean(result);
        } catch (error) {
          console.error('태그 연결 실패:', error);
          return false;
        }
      },

      unlinkTagFromMemo: async (memoId, tagId, userId) => {
        try {
          const success = await unlinkMemoFromTagWithJWT(memoId, tagId, userId);

          if (success) {
            set((state) => ({
              ...state,
              memoTagLinks: state.memoTagLinks.filter(
                link => !(link.memo_id === memoId && link.tag_id === tagId)
              ),
              lastUpdated: new Date().toISOString(),
            }));
          }

          return success;
        } catch (error) {
          console.error('태그 연결 해제 실패:', error);
          return false;
        }
      },

      updateMemoTags: async (memoId, tagIds, userId) => {
        try {
          const result = await updateMemoTagsWithJWT(memoId, tagIds, userId);

          if (result && result.length >= 0) {
            // 기존 링크 제거 후 새 링크 추가
            const newLinks: MemoTagLink[] = tagIds.map(tagId => ({
              id: `${memoId}-${tagId}`,
              user_id: userId,
              memo_id: memoId,
              tag_id: tagId,
              assigned_at: new Date().toISOString(),
              is_active: true,
            }));

            set((state) => ({
              ...state,
              memoTagLinks: [
                ...state.memoTagLinks.filter(link => link.memo_id !== memoId),
                ...newLinks
              ],
              lastUpdated: new Date().toISOString(),
            }));
          }

          return result && result.length >= 0;
        } catch (error) {
          console.error('노트 태그 업데이트 실패:', error);
          return false;
        }
      },

      // 사용자 태그 + 템플릿 태그 혼합 업데이트
      updateMemoTagsWithTemplates: async (memoId, userTagIds, templateTagIds, userId) => {
        try {
          await updateMemoTagsWithTemplates(memoId, userTagIds, templateTagIds, userId);

          // 새로운 링크들을 로컬 상태에 반영
          const newUserTagLinks: MemoTagLink[] = userTagIds.map(tagId => ({
            id: `${memoId}-${tagId}`,
            user_id: userId,
            memo_id: memoId,
            tag_id: tagId,
            template_id: null,
            assigned_at: new Date().toISOString(),
            is_active: true,
          }));

          // 템플릿 태그 링크도 상태에 반영 (getTagsForMemo에서 조회하기 위해)
          const newTemplateTagLinks: MemoTagLink[] = templateTagIds.map(templateId => ({
            id: `${memoId}-template-${templateId}`,
            user_id: userId,
            memo_id: memoId,
            tag_id: null,
            template_id: templateId,
            assigned_at: new Date().toISOString(),
            is_active: true,
          }));

          set((state) => ({
            ...state,
            memoTagLinks: [
              ...state.memoTagLinks.filter(link => link.memo_id !== memoId),
              ...newUserTagLinks,
              ...newTemplateTagLinks // 템플릿 링크도 포함
            ],
          }));

          return true;
        } catch (error) {
          console.error('노트 태그 (템플릿 포함) 업데이트 실패:', error);
          return false;
        }
      },

      // 태그 순서 관리
      reorderTags: async (tagIds, userId) => {
        set({ loading: true, error: null });

        try {
          // 각 태그의 position 업데이트
          const updates = await Promise.all(
            tagIds.map((tagId, index) =>
              updateMemoTagWithJWT(tagId, userId, { position: index })
            )
          );

          // 성공한 업데이트만 반영
          const successfulUpdates = updates.filter(Boolean);

          if (successfulUpdates.length > 0) {
            set((state) => ({
              ...state,
              tags: state.tags.sort((a, b) => {
                const aIndex = tagIds.indexOf(a.id);
                const bIndex = tagIds.indexOf(b.id);
                return aIndex - bIndex;
              }),
              loading: false,
              lastUpdated: new Date().toISOString(),
            }));
          }
        } catch (error) {
          console.error('태그 순서 변경 실패:', error);
          set({
            loading: false,
            error: error instanceof Error ? error.message : '태그 순서 변경에 실패했습니다.'
          });
        }
      },

      // 필터 및 검색
      setSearchQuery: (query) => {
        set((state) => ({
          ...state,
          filters: { ...state.filters, searchQuery: query },
        }));
      },

      setShowInactive: (show) => {
        set((state) => ({
          ...state,
          filters: { ...state.filters, showInactive: show },
        }));
      },

      setSelectedCategory: (category) => {
        set((state) => ({
          ...state,
          filters: { ...state.filters, selectedCategory: category },
        }));
      },

      getFilteredTags: () => {
        const state = get();
        let filtered = state.tags;

        // 활성 상태 필터
        if (!state.filters.showInactive) {
          filtered = filtered.filter(tag => tag.is_active);
        }

        // 검색 쿼리 필터
        if (state.filters.searchQuery.trim()) {
          const query = state.filters.searchQuery.toLowerCase().trim();
          filtered = filtered.filter(tag =>
            tag.name.toLowerCase().includes(query) ||
            (tag.description && tag.description.toLowerCase().includes(query))
          );
        }

        return filtered.sort((a, b) => (a.position || 0) - (b.position || 0));
      },

      getFilteredTemplates: () => {
        const state = get();
        console.log('🔍 getFilteredTemplates 호출:', {
          templatesCount: state.templates.length,
          templatesInitialized: state.loadState.templatesInitialized,
          templatesLoading: state.templatesLoading,
          templates: state.templates
        });
        let filtered = state.templates;

        // 카테고리 필터
        if (state.filters.selectedCategory) {
          filtered = filtered.filter(template => template.category === state.filters.selectedCategory);
        }

        // 검색 쿼리 필터
        if (state.filters.searchQuery.trim()) {
          const query = state.filters.searchQuery.toLowerCase().trim();
          filtered = filtered.filter(template =>
            template.name.toLowerCase().includes(query) ||
            (template.description && template.description.toLowerCase().includes(query))
          );
        }

        return filtered.sort((a, b) => a.sort_order - b.sort_order);
      },

      // 유틸리티 함수들
      getTagById: (tagId) => {
        return get().tags.find(tag => tag.id === tagId);
      },

      getTagsForMemo: (memoId) => {
        const state = get();
        const results: MemoTag[] = [];

        // note_tag_links에서 해당 메모의 모든 활성 링크 조회
        const memoLinks = state.memoTagLinks.filter(
          link => link.memo_id === memoId && link.is_active
        );

        memoLinks.forEach(link => {
          if (link.tag_id) {
            // 사용자가 만든 태그인 경우
            const userTag = state.tags.find(tag => tag.id === link.tag_id);
            if (userTag) {
              results.push(userTag);
            }
          } else if (link.template_id) {
            // 템플릿 태그인 경우 - 템플릿을 태그 형태로 변환하여 반환
            const template = state.templates.find(template => template.id === link.template_id);
            if (template) {
              // 템플릿을 MemoTag 형태로 변환
              const templateAsTag: MemoTag = {
                id: `template_${template.id}`, // 고유 ID 생성
                name: template.name,
                color: template.color || '#4a5568',
                description: template.description || null,
                user_id: '', // 템플릿은 공용이므로 빈 문자열
                created_at: template.created_at,
                updated_at: new Date().toISOString(), // 현재 시간으로 설정
                order_index: template.sort_order || 0,
                is_active: true,
                is_template: true, // 템플릿임을 표시하는 플래그 추가
                template_id: template.id // 원본 템플릿 ID 보관
              };
              results.push(templateAsTag);
            }
          }
        });

        return results;
      },

      getMemosForTag: (tagId) => {
        const state = get();
        return state.memoTagLinks
          .filter(link => link.tag_id === tagId && link.is_active)
          .map(link => link.memo_id);
      },

      // 초기화 및 정리
      reset: () => {
        set(initialState);
      },

      clearError: () => {
        set({ error: null });
      },

      // 기본 태그 생성
      createDefaultTags: async (userId) => {
        const defaultTags = [
          { name: '업무', color: '#3B82F6', description: '업무 관련 메모' },
          { name: '개인', color: '#10B981', description: '개인적인 메모' },
          { name: '중요', color: '#EF4444', description: '중요한 내용' },
          { name: '아이디어', color: '#8B5CF6', description: '창의적인 아이디어' },
        ];

        try {
          const results = await Promise.all(
            defaultTags.map((tag, index) =>
              get().createTag({
                ...tag,
                position: index,
                is_active: true,
              }, userId)
            )
          );

          console.log('기본 태그 생성 완료:', results.filter(Boolean).length);
        } catch (error) {
          console.error('기본 태그 생성 실패:', error);
        }
      },
    }),
    {
      name: 'memo-tag-store',
      partialize: (state) => ({
        tags: state.tags,
        templates: state.templates, // 템플릿도 캐시에 포함
        memoTagLinks: state.memoTagLinks,
        loadState: state.loadState,
        filters: state.filters,
      }),
    }
  )
);
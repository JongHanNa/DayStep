import { create } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import {
  MotivationMessage,
  MotivationTemplate,
  MotivationTag,
  TodoMotivation,
  MotivationDisplayOptions,
  DEFAULT_MOTIVATION_TAGS,
  DEFAULT_MOTIVATION_IMAGES
} from '@/types/motivation';
import { supabase } from '@/lib/supabase';
import {
  createUserMotivationMessageWithJWT,
  updateUserMotivationMessageWithJWT,
  deleteUserMotivationMessageWithJWT,
  fetchUserMotivationMessagesWithJWT,
  linkMotivationToTodoWithJWT,
  unlinkMotivationFromTodoWithJWT,
  unlinkAllMotivationsFromTodoWithJWT,
  fetchTodoMotivationsWithJWT,
  fetchMotivationTodosWithJWT,
  fetchTodoMotivationWithJWT,
  fetchAllTodoMotivationLinksWithJWT
} from '@/lib/supabaseWebViewHelper';
import { isCapacitorEnvironment } from '@/lib/supabase/core';

/**
 * 현재 사용자 ID 가져오기 (Capacitor 백업 포함)
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      return session.user.id;
    }
  } catch {}

  // Capacitor 백업 인증
  if (isCapacitorEnvironment()) {
    try {
      const { Preferences } = await import('@capacitor/preferences');
      const { value } = await Preferences.get({ key: 'supabase_auth_session' });
      if (value) {
        const sessionData = JSON.parse(value);
        return sessionData.user?.id || null;
      }
    } catch {}
  }

  return null;
}

// 사전 정의된 동기부여 메시지 템플릿
const DEFAULT_MOTIVATION_TEMPLATES: MotivationTemplate[] = [
  // 유혹 이겨내기
  {
    id: 'resist-1',
    content: '지금 이 순간이 중요해요\n\n지금 당신이 하는 선택이 미래를 만듭니다. 유혹을 이겨내고 목표를 향해 한 걸음 더 나아가세요!',
    tags: ['resist_temptation', 'focus_boost'],
    icon: 'lucide-Shield',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.strength,
    difficulty: 'easy'
  },
  {
    id: 'resist-2',
    content: '더 나은 나를 위한 선택\n\n잠깐의 유혹보다 더 큰 성취감을 위해 집중하세요. 당신은 할 수 있어요!',
    tags: ['resist_temptation', 'positive_affirmation'],
    icon: 'lucide-Heart',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.success,
    difficulty: 'medium'
  },
  {
    id: 'resist-3',
    content: '강한 의지의 힘\n\n유혹을 이겨낼 때마다 당신은 더 강해집니다. 오늘도 자신을 믿고 도전하세요!',
    tags: ['resist_temptation', 'personal_growth'],
    icon: 'lucide-Shield',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.strength,
    difficulty: 'hard'
  },

  // 집중력 향상
  {
    id: 'focus-1',
    content: '지금 여기에 집중하세요\n\n현재 이 순간에만 온전히 집중하면, 놀라운 결과를 만들 수 있어요!',
    tags: ['focus_boost', 'productivity'],
    icon: 'lucide-Target',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.focus,
    difficulty: 'easy'
  },
  {
    id: 'focus-2',
    content: '한 번에 하나씩\n\n여러 일을 동시에 하려 하지 마세요. 지금 이 일에만 집중하면 더 빨리, 더 잘 할 수 있어요!',
    tags: ['focus_boost', 'productivity'],
    icon: 'lucide-Target',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.focus,
    difficulty: 'medium'
  },

  // 목표 상기
  {
    id: 'goal-1',
    content: '당신의 꿈을 기억하세요\n\n왜 이 일을 시작했는지 기억하세요. 당신의 꿈과 목표가 당신을 앞으로 이끌어 줄 거예요!',
    tags: ['goal_reminder', 'positive_affirmation'],
    icon: 'lucide-Flag',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.goal,
    difficulty: 'easy'
  },
  {
    id: 'goal-2',
    content: '작은 진전도 큰 의미\n\n오늘 한 작은 노력이 내일의 큰 성취가 됩니다. 멈추지 마세요!',
    tags: ['goal_reminder', 'personal_growth'],
    icon: 'lucide-Flag',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.growth,
    difficulty: 'medium'
  },

  // 긍정적 확언
  {
    id: 'positive-1',
    content: '당신은 충분히 능력이 있어요\n\n당신 안에는 무한한 가능성이 있습니다. 자신을 믿고 도전해 보세요!',
    tags: ['positive_affirmation', 'personal_growth'],
    icon: 'lucide-Heart',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.success,
    difficulty: 'easy'
  },

  // 습관 형성
  {
    id: 'habit-1',
    content: '매일의 작은 실천\n\n좋은 습관은 하루아침에 만들어지지 않아요. 오늘도 꾸준히 실천하는 당신이 대단해요!',
    tags: ['habit_building', 'positive_affirmation'],
    icon: 'lucide-Repeat',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.growth,
    difficulty: 'medium'
  },

  // 생산성
  {
    id: 'productivity-1',
    content: '효율적인 하루 만들기\n\n계획대로 실행하는 것만으로도 이미 많은 사람들보다 앞서고 있어요. 계속 진행하세요!',
    tags: ['productivity', 'positive_affirmation'],
    icon: 'lucide-Zap',
    imageUrl: DEFAULT_MOTIVATION_IMAGES.energy,
    difficulty: 'easy'
  }
];

interface MotivationStore {
  // 상태
  templates: MotivationTemplate[];
  customMessages: MotivationMessage[];
  tags: MotivationTag[];
  todoMotivations: TodoMotivation[];
  displayOptions: MotivationDisplayOptions;
  selectedMessage: MotivationMessage | null;
  isMotivationSheetOpen: boolean;

  // 액션
  initializeStore: () => void;
  loadCustomMessagesFromDB: () => Promise<void>;
  loadTodoMotivationsFromDB: () => Promise<void>;

  // 템플릿 관리
  getTemplatesByTags: (tags: string[]) => MotivationTemplate[];
  getTemplateById: (id: string) => MotivationTemplate | undefined;

  // 커스텀 메시지 관리
  addCustomMessage: (message: Omit<MotivationMessage, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomMessage: (id: string, updates: Partial<MotivationMessage>) => void;
  deleteCustomMessage: (id: string) => void;

  // 태그 관리
  addCustomTag: (tag: Omit<MotivationTag, 'id' | 'createdAt'>) => void;
  updateCustomTag: (id: string, updates: Partial<MotivationTag>) => void;
  deleteCustomTag: (id: string) => void;
  getAllTags: () => MotivationTag[];
  getTagById: (id: string) => MotivationTag | undefined;

  // Todo와 메시지 연결 (Many-to-Many 지원)
  linkMotivationToTodo: (todoId: string, motivationId: string) => Promise<void>;
  unlinkMotivationFromTodo: (todoId: string, motivationId: string) => Promise<void>;
  unlinkAllMotivationsFromTodo: (todoId: string) => Promise<void>;
  getMotivationsForTodo: (todoId: string) => MotivationMessage[];
  getTodosForMotivation: (motivationId: string) => string[];

  // 하위 호환성을 위한 기존 함수 (첫 번째 메시지만 반환)
  getMotivationForTodo: (todoId: string) => MotivationMessage | null;

  // UI 상태 관리
  setSelectedMessage: (message: MotivationMessage | null) => void;
  setMotivationSheetOpen: (open: boolean) => void;
  updateDisplayOptions: (options: Partial<MotivationDisplayOptions>) => void;

  // 추천 시스템
  getRecommendedMessages: (todoContent: string) => MotivationMessage[];

  // 유틸리티
  getAllMessages: () => MotivationMessage[];
  searchMessages: (query: string) => MotivationMessage[];
}

export const useMotivationStore = create<MotivationStore>()(
  subscribeWithSelector(
    persist(
      (set, get) => ({
        // 초기 상태
        templates: [],
        customMessages: [],
        tags: [],
        todoMotivations: [],
        displayOptions: {
          showOnStart: true,
          showOnCard: true,
          showOnReminder: false,
          autoHide: false,
          hideDelay: 5000
        },
        selectedMessage: null,
        isMotivationSheetOpen: false,

        // 스토어 초기화
        initializeStore: () => {
          const state = get();
          if (state.templates.length === 0) {
            set({
              templates: DEFAULT_MOTIVATION_TEMPLATES,
              tags: DEFAULT_MOTIVATION_TAGS
            });
          }
          // DB에서 커스텀 메시지와 todo 연결 데이터 로드
          get().loadCustomMessagesFromDB();
          get().loadTodoMotivationsFromDB();
        },

        // DB에서 커스텀 메시지 로드
        loadCustomMessagesFromDB: async () => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              console.warn('⚠️ 사용자가 로그인되어 있지 않아 커스텀 메시지를 로드할 수 없습니다.');
              return;
            }

            console.log('🔄 DB에서 커스텀 동기부여 메시지 로드 중...');
            const dbMessages = await fetchUserMotivationMessagesWithJWT(userId);

            // DB 데이터를 클라이언트 형식으로 변환
            const customMessages: MotivationMessage[] = dbMessages.map(msg => ({
              id: msg.id,
              content: msg.content,
              tags: Array.isArray(msg.tags) ? msg.tags : (typeof msg.tags === 'string' ? JSON.parse(msg.tags) : []),
              icon: msg.icon,
              color: msg.color,
              imageUrl: msg.imageUrl,
              isDefault: false,
              createdAt: msg.createdAt || new Date().toISOString(),
              updatedAt: msg.updatedAt || new Date().toISOString(),
              userId: msg.userId || userId
            }));

            set({ customMessages });
            console.log('✅ DB에서 커스텀 동기부여 메시지 로드 완료:', { count: customMessages.length });
          } catch (error) {
            console.error('❌ DB에서 커스텀 동기부여 메시지 로드 실패:', error);
          }
        },

        // DB에서 todo 연결 데이터 로드
        loadTodoMotivationsFromDB: async () => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              console.warn('⚠️ 사용자가 로그인되어 있지 않아 todo 동기부여 연결 데이터를 로드할 수 없습니다.');
              return;
            }

            console.log('🔄 DB에서 todo 동기부여 연결 데이터 로드 중...');
            const dbTodoMotivations = await fetchAllTodoMotivationLinksWithJWT(userId);

            // DB 데이터를 클라이언트 형식으로 변환
            const todoMotivations: TodoMotivation[] = dbTodoMotivations.map(link => ({
              todoId: link.todoId,
              motivationMessageId: link.motivationId,
              assignedAt: link.assignedAt,
              isActive: true
            }));

            set({ todoMotivations });
            console.log('✅ DB에서 todo 동기부여 연결 데이터 로드 완료:', { count: todoMotivations.length });
          } catch (error) {
            console.error('❌ DB에서 todo 동기부여 연결 데이터 로드 실패:', error);
          }
        },

        // 템플릿 관리
        getTemplatesByTags: (tags: string[]) => {
          return get().templates.filter(template =>
            tags.some(tag => template.tags.includes(tag))
          );
        },

        getTemplateById: (id: string) => {
          return get().templates.find(template => template.id === id);
        },

        // 커스텀 메시지 관리
        addCustomMessage: async (messageData) => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              console.error('❌ 사용자가 로그인되어 있지 않아 메시지를 저장할 수 없습니다.');
              return;
            }

            // DB에 저장
            const dbMessage = await createUserMotivationMessageWithJWT({
              ...messageData,
              userId
            });

            if (dbMessage) {
              // DB 저장 성공 시 로컬 상태에도 추가
              const newMessage: MotivationMessage = {
                id: dbMessage.id,
                content: dbMessage.content,
                tags: Array.isArray(dbMessage.tags) ? dbMessage.tags : (typeof dbMessage.tags === 'string' ? JSON.parse(dbMessage.tags) : []),
                icon: dbMessage.icon,
                color: dbMessage.color,
                imageUrl: dbMessage.imageUrl,
                isDefault: false,
                createdAt: dbMessage.createdAt || new Date().toISOString(),
                updatedAt: dbMessage.updatedAt || new Date().toISOString(),
                userId: dbMessage.userId || userId
              };

              set(state => ({
                customMessages: [...state.customMessages, newMessage]
              }));
            } else {
              throw new Error('DB 저장 실패');
            }
          } catch (error) {
            console.error('❌ 커스텀 메시지 저장 실패:', error);

            // 에러 발생 시 로컬에만 임시 저장 (fallback)
            const fallbackMessage: MotivationMessage = {
              ...messageData,
              id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              isDefault: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            set(state => ({
              customMessages: [...state.customMessages, fallbackMessage]
            }));
          }
        },

        updateCustomMessage: async (id: string, updates) => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              console.error('❌ 사용자가 로그인되어 있지 않아 메시지를 수정할 수 없습니다.');
              return;
            }

            // DB에서 업데이트
            const dbMessage = await updateUserMotivationMessageWithJWT(id, userId, updates);

            if (dbMessage) {
              // DB 업데이트 성공 시 로컬 상태도 업데이트
              set(state => ({
                customMessages: state.customMessages.map(message =>
                  message.id === id
                    ? {
                        ...message,
                        ...updates,
                        tags: Array.isArray(updates.tags) ? updates.tags : message.tags,
                        updatedAt: new Date().toISOString()
                      }
                    : message
                )
              }));
            } else {
              throw new Error('DB 업데이트 실패');
            }
          } catch (error) {
            console.error('❌ 커스텀 메시지 업데이트 실패:', error);

            // 에러 발생 시 로컬에만 업데이트 (fallback)
            set(state => ({
              customMessages: state.customMessages.map(message =>
                message.id === id
                  ? { ...message, ...updates, updatedAt: new Date().toISOString() }
                  : message
              )
            }));
          }
        },

        deleteCustomMessage: async (id: string) => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              console.error('❌ 사용자가 로그인되어 있지 않아 메시지를 삭제할 수 없습니다.');
              return;
            }

            // DB에서 삭제
            const success = await deleteUserMotivationMessageWithJWT(id, userId);

            if (success) {
              // DB 삭제 성공 시 로컬 상태에서도 제거
              set(state => ({
                customMessages: state.customMessages.filter(message => message.id !== id),
                // 관련된 todo 연결도 해제
                todoMotivations: state.todoMotivations.filter(link => link.motivationMessageId !== id)
              }));
            } else {
              throw new Error('DB 삭제 실패');
            }
          } catch (error) {
            console.error('❌ 커스텀 메시지 삭제 실패:', error);

            // 에러 발생 시에도 로컬에서는 제거 (fallback)
            set(state => ({
              customMessages: state.customMessages.filter(message => message.id !== id),
              // 관련된 todo 연결도 해제
              todoMotivations: state.todoMotivations.filter(link => link.motivationMessageId !== id)
            }));
          }
        },

        // 태그 관리
        addCustomTag: (tagData) => {
          const newTag: MotivationTag = {
            ...tagData,
            id: `custom-tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            isDefault: false,
            createdAt: new Date().toISOString(),
          };

          set(state => ({
            tags: [...state.tags, newTag]
          }));
        },

        updateCustomTag: (id: string, updates) => {
          set(state => ({
            tags: state.tags.map(tag =>
              tag.id === id ? { ...tag, ...updates } : tag
            )
          }));
        },

        deleteCustomTag: (id: string) => {
          set(state => ({
            tags: state.tags.filter(tag => tag.id !== id)
          }));
        },

        getAllTags: () => {
          return get().tags;
        },

        getTagById: (id: string) => {
          return get().tags.find(tag => tag.id === id);
        },

        // Todo와 메시지 연결 (Many-to-Many 지원)
        linkMotivationToTodo: async (todoId: string, motivationId: string) => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              console.error('❌ 사용자가 로그인되어 있지 않아 메시지를 연결할 수 없습니다.');
              return;
            }

            const state = get();

            // 메시지 타입 결정
            const isTemplate = state.templates.some(t => t.id === motivationId);
            const motivationType = isTemplate ? 'template' : 'custom';

            // DB에 연결 저장
            const result = await linkMotivationToTodoWithJWT(userId, todoId, motivationType, motivationId);

            if (result) {
              // 로컬 상태 업데이트 (중복 체크)
              const existingLink = state.todoMotivations.find(
                link => link.todoId === todoId && link.motivationMessageId === motivationId
              );

              if (!existingLink) {
                const newLink: TodoMotivation = {
                  todoId,
                  motivationMessageId: motivationId,
                  assignedAt: result.assignedAt,
                  isActive: true
                };

                set(state => ({
                  todoMotivations: [...state.todoMotivations, newLink]
                }));
              }

              console.log('✅ 동기부여 메시지 연결 성공:', { todoId, motivationId });
            }
          } catch (error) {
            console.error('❌ 동기부여 메시지 연결 실패:', error);
          }
        },

        unlinkMotivationFromTodo: async (todoId: string, motivationId: string) => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              console.error('❌ 사용자가 로그인되어 있지 않아 메시지 연결을 해제할 수 없습니다.');
              return;
            }

            const state = get();

            // 메시지 타입 결정
            const isTemplate = state.templates.some(t => t.id === motivationId);
            const motivationType = isTemplate ? 'template' : 'custom';

            // DB에서 연결 해제
            const success = await unlinkMotivationFromTodoWithJWT(userId, todoId, motivationId, motivationType);

            if (success) {
              // 로컬 상태에서 특정 연결만 제거
              set(state => ({
                todoMotivations: state.todoMotivations.filter(
                  link => !(link.todoId === todoId && link.motivationMessageId === motivationId)
                )
              }));

              console.log('✅ 특정 동기부여 메시지 연결 해제 성공:', { todoId, motivationId });
            }
          } catch (error) {
            console.error('❌ 특정 동기부여 메시지 연결 해제 실패:', error);
          }
        },

        unlinkAllMotivationsFromTodo: async (todoId: string) => {
          try {
            const userId = await getCurrentUserId();
            if (!userId) {
              console.error('❌ 사용자가 로그인되어 있지 않아 모든 메시지 연결을 해제할 수 없습니다.');
              return;
            }

            // DB에서 모든 연결 해제
            const success = await unlinkAllMotivationsFromTodoWithJWT(userId, todoId);

            if (success) {
              // 로컬 상태에서 해당 할일의 모든 연결 제거
              set(state => ({
                todoMotivations: state.todoMotivations.filter(link => link.todoId !== todoId)
              }));

              console.log('✅ 모든 동기부여 메시지 연결 해제 성공:', { todoId });
            }
          } catch (error) {
            console.error('❌ 모든 동기부여 메시지 연결 해제 실패:', error);
          }
        },

        getMotivationsForTodo: (todoId: string) => {
          const state = get();
          const links = state.todoMotivations.filter(link => link.todoId === todoId && link.isActive);

          return links.map(link => {
            // 템플릿에서 찾기
            const template = state.templates.find(t => t.id === link.motivationMessageId);
            if (template) {
              // 첫 번째 태그의 색상 사용
              const firstTag = template.tags[0];
              const tagData = state.tags.find(t => t.id === firstTag);

              return {
                ...template,
                isDefault: true,
                color: tagData?.color
              } as MotivationMessage;
            }

            // 커스텀 메시지에서 찾기
            const customMessage = state.customMessages.find(m => m.id === link.motivationMessageId);
            return customMessage;
          }).filter((message): message is MotivationMessage => message !== undefined);
        },

        getTodosForMotivation: (motivationId: string) => {
          const state = get();
          return state.todoMotivations
            .filter(link => link.motivationMessageId === motivationId && link.isActive)
            .map(link => link.todoId);
        },

        // 하위 호환성을 위한 기존 함수 (첫 번째 메시지만 반환)
        getMotivationForTodo: (todoId: string) => {
          const motivations = get().getMotivationsForTodo(todoId);
          return motivations.length > 0 ? motivations[0] : null;
        },

        // UI 상태 관리
        setSelectedMessage: (message) => {
          set({ selectedMessage: message });
        },

        setMotivationSheetOpen: (open) => {
          set({ isMotivationSheetOpen: open });
        },

        updateDisplayOptions: (options) => {
          set(state => ({
            displayOptions: { ...state.displayOptions, ...options }
          }));
        },

        // 추천 시스템 (태그 기반 키워드 매칭)
        getRecommendedMessages: (todoContent: string) => {
          const state = get();
          const allMessages = state.getAllMessages();
          const content = todoContent.toLowerCase();

          // 키워드별 태그 가중치
          const keywordWeights: Record<string, string[]> = {
            '운동': ['habit_building', 'personal_growth'],
            '공부': ['focus_boost', 'goal_reminder'],
            '독서': ['personal_growth', 'focus_boost'],
            '일': ['productivity', 'focus_boost'],
            '휴대폰': ['resist_temptation'],
            '게임': ['resist_temptation'],
            '유튜브': ['resist_temptation'],
            '넷플릭스': ['resist_temptation'],
            '간식': ['resist_temptation'],
            '미루기': ['productivity', 'goal_reminder'],
          };

          const tagScores: Record<string, number> = {};

          // 키워드 매칭으로 태그 점수 계산
          Object.entries(keywordWeights).forEach(([keyword, tags]) => {
            if (content.includes(keyword)) {
              tags.forEach(tag => {
                tagScores[tag] = (tagScores[tag] || 0) + 1;
              });
            }
          });

          // 점수가 높은 태그의 메시지들을 우선 추천
          const recommendedMessages = allMessages
            .filter(message => message.tags.some(tag => tagScores[tag] > 0))
            .sort((a, b) => {
              const aScore = Math.max(...a.tags.map(tag => tagScores[tag] || 0));
              const bScore = Math.max(...b.tags.map(tag => tagScores[tag] || 0));
              return bScore - aScore;
            })
            .slice(0, 3);

          // 추천된 메시지가 없으면 기본 긍정 메시지들 반환
          if (recommendedMessages.length === 0) {
            return allMessages
              .filter(message => message.tags.includes('positive_affirmation'))
              .slice(0, 2);
          }

          return recommendedMessages;
        },

        // 유틸리티
        getAllMessages: () => {
          const state = get();
          const templateMessages: MotivationMessage[] = state.templates.map(template => {
            // 첫 번째 태그의 색상 사용
            const firstTag = template.tags[0];
            const tagData = state.tags.find(t => t.id === firstTag);

            return {
              ...template,
              isDefault: true,
              color: tagData?.color
            };
          });

          return [...templateMessages, ...state.customMessages];
        },

        searchMessages: (query: string) => {
          if (!query.trim()) return get().getAllMessages();

          const state = get();
          const lowerQuery = query.toLowerCase();
          return get().getAllMessages().filter(message => {
            // 메시지 내용 검색
            const contentMatch = message.content.toLowerCase().includes(lowerQuery);

            // 태그명 검색
            const tagMatch = message.tags.some(tagId => {
              const tag = state.tags.find(t => t.id === tagId);
              return tag && tag.name.toLowerCase().includes(lowerQuery);
            });

            return contentMatch || tagMatch;
          });
        }
      }),
      {
        name: 'motivation-store',
        partialize: (state) => ({
          customMessages: state.customMessages,
          tags: state.tags.filter(tag => !tag.isDefault), // 기본 태그는 저장하지 않음
          todoMotivations: state.todoMotivations,
          displayOptions: state.displayOptions,
        }),
      }
    )
  )
);
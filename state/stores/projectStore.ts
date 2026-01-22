/**
 * Project Store - AI 플래닝용 프로젝트 상태 관리
 *
 * ADHD 친화적 AI 플래닝 기능을 위한 프로젝트 관리 스토어
 */

import type { Project, ProjectInsert, ProjectUpdate, ProjectProgress, ProjectStatus, Todo } from '@/types';
import { supabase } from '@/lib/supabase';
import {
  createStore,
  loadingHelpers,
  logStoreAction,
} from '../utils/storeUtils';
import type { BaseStoreState } from '../types';

/**
 * 프로젝트 스토어 상태 타입 정의
 */
interface ProjectStoreState extends BaseStoreState {
  // 데이터 상태
  projects: Project[];
  currentProject: Project | null;
  projectProgress: Map<string, ProjectProgress>;
  projectTodos: Map<string, Todo[]>; // 프로젝트별 연결된 할일 목록

  // UI 상태
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // 필터 상태
  statusFilter: ProjectStatus | 'all';

  // 액션들
  fetchProjects: (userId: string, status?: ProjectStatus) => Promise<void>;
  fetchProjectById: (userId: string, projectId: string) => Promise<Project | null>;
  fetchProjectProgress: (userId: string, projectId: string) => Promise<ProjectProgress | null>;
  fetchProjectTodos: (userId: string, projectId: string) => Promise<Todo[]>; // 연결된 할일 조회
  createProject: (userId: string, data: Omit<ProjectInsert, 'user_id'>) => Promise<Project | null>;
  updateProject: (userId: string, data: ProjectUpdate) => Promise<Project | null>;
  deleteProject: (userId: string, projectId: string) => Promise<boolean>;
  deleteProjectWithTodos: (userId: string, projectId: string) => Promise<boolean>; // 연결된 할일도 함께 삭제
  completeProject: (userId: string, projectId: string) => Promise<boolean>;
  holdProject: (userId: string, projectId: string) => Promise<boolean>; // 중단
  startProject: (userId: string, projectId: string) => Promise<boolean>; // 시작 (not_started → in_progress)
  unstartProject: (userId: string, projectId: string) => Promise<boolean>; // 시작안함으로 되돌리기 (in_progress → not_started)
  resumeProject: (userId: string, projectId: string) => Promise<boolean>; // 재개 (on_hold → in_progress)
  unlinkTodoFromProject: (userId: string, todoId: string) => Promise<boolean>; // 할일 연결 해제

  // 필터 액션
  setStatusFilter: (status: ProjectStatus | 'all') => void;

  // 헬퍼 메서드
  setCurrentProject: (project: Project | null) => void;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;

  // 스토어 초기화
  reset: () => void;
}

/**
 * 프로젝트 스토어 생성
 */
export const useProjectStore = createStore<ProjectStoreState>(
  (set, get) => ({
    // 초기 상태
    initialized: false,
    version: 1,
    projects: [],
    currentProject: null,
    projectProgress: new Map(),
    projectTodos: new Map(),
    loading: false,
    error: null,
    lastUpdated: null,
    statusFilter: 'all',

    /**
     * 프로젝트 목록 조회
     */
    fetchProjects: async (userId: string, status?: ProjectStatus) => {
      logStoreAction('ProjectStore', 'fetchProjects', { userId, status });

      set((state: ProjectStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        let query = supabase
          .from('projects')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });

        if (status) {
          query = query.eq('status', status);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        set((state: ProjectStoreState) => {
          state.projects = data || [];
          loadingHelpers.setSuccess(state);
          state.initialized = true;
        });
      } catch (error) {
        console.error('프로젝트 목록 조회 오류:', error);
        set((state: ProjectStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '프로젝트 목록을 불러오는데 실패했습니다.'
          );
        });
      }
    },

    /**
     * 프로젝트 상세 조회
     */
    fetchProjectById: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'fetchProjectById', { userId, projectId });

      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .eq('user_id', userId)
          .single();

        if (error) {
          throw error;
        }

        set((state: ProjectStoreState) => {
          state.currentProject = data;
        });

        return data;
      } catch (error) {
        console.error('프로젝트 상세 조회 오류:', error);
        set((state: ProjectStoreState) => {
          state.error = error instanceof Error ? error.message : '프로젝트를 찾을 수 없습니다.';
        });
        return null;
      }
    },

    /**
     * 프로젝트 진행률 조회
     */
    fetchProjectProgress: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'fetchProjectProgress', { userId, projectId });

      try {
        // 프로젝트에 연결된 할일 통계 조회
        const { data: todos, error } = await supabase
          .from('todos')
          .select('id, completed')
          .eq('project_id', projectId)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        const total = todos?.length || 0;
        const completed = todos?.filter((t) => t.completed).length || 0;
        const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

        const progressData: ProjectProgress = {
          project_id: projectId,
          total,
          completed,
          progress,
        };

        set((state: ProjectStoreState) => {
          state.projectProgress.set(projectId, progressData);
        });

        return progressData;
      } catch (error) {
        console.error('프로젝트 진행률 조회 오류:', error);
        return null;
      }
    },

    /**
     * 프로젝트 생성
     */
    createProject: async (userId: string, data: Omit<ProjectInsert, 'user_id'>) => {
      logStoreAction('ProjectStore', 'createProject', { userId, data });

      set((state: ProjectStoreState) => {
        loadingHelpers.setLoading(state);
      });

      try {
        const { data: newProject, error } = await supabase
          .from('projects')
          .insert({
            user_id: userId,
            title: data.title,
            description: data.description || null,
            status: data.status || 'in_progress',
            icon: data.icon || null,
            color: data.color || '#A8DADC',
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        set((state: ProjectStoreState) => {
          state.projects.unshift(newProject);
          loadingHelpers.setSuccess(state);
        });

        return newProject;
      } catch (error) {
        console.error('프로젝트 생성 오류:', error);
        set((state: ProjectStoreState) => {
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '프로젝트 생성에 실패했습니다.'
          );
        });
        return null;
      }
    },

    /**
     * 프로젝트 수정
     */
    updateProject: async (userId: string, data: ProjectUpdate) => {
      logStoreAction('ProjectStore', 'updateProject', { userId, data });

      const { id, ...updates } = data;

      // Optimistic update
      const originalProjects = [...get().projects];

      set((state: ProjectStoreState) => {
        const index = state.projects.findIndex((p) => p.id === id);
        if (index !== -1) {
          state.projects[index] = { ...state.projects[index], ...updates };
        }
        if (state.currentProject?.id === id) {
          state.currentProject = { ...state.currentProject, ...updates };
        }
      });

      try {
        const { data: updatedProject, error } = await supabase
          .from('projects')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        set((state: ProjectStoreState) => {
          const index = state.projects.findIndex((p) => p.id === id);
          if (index !== -1) {
            state.projects[index] = updatedProject;
          }
          if (state.currentProject?.id === id) {
            state.currentProject = updatedProject;
          }
          loadingHelpers.setSuccess(state);
        });

        return updatedProject;
      } catch (error) {
        console.error('프로젝트 수정 오류:', error);
        // Rollback
        set((state: ProjectStoreState) => {
          state.projects = originalProjects;
          loadingHelpers.setError(
            state,
            error instanceof Error ? error.message : '프로젝트 수정에 실패했습니다.'
          );
        });
        return null;
      }
    },

    /**
     * 프로젝트 삭제
     */
    deleteProject: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'deleteProject', { userId, projectId });

      // Optimistic delete
      const originalProjects = [...get().projects];

      set((state: ProjectStoreState) => {
        state.projects = state.projects.filter((p) => p.id !== projectId);
        if (state.currentProject?.id === projectId) {
          state.currentProject = null;
        }
      });

      try {
        // 연결된 할일의 project_id를 null로 설정
        await supabase
          .from('todos')
          .update({ project_id: null })
          .eq('project_id', projectId);

        // 프로젝트 삭제
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        set((state: ProjectStoreState) => {
          state.projectProgress.delete(projectId);
        });

        return true;
      } catch (error) {
        console.error('프로젝트 삭제 오류:', error);
        // Rollback
        set((state: ProjectStoreState) => {
          state.projects = originalProjects;
          state.error = error instanceof Error ? error.message : '프로젝트 삭제에 실패했습니다.';
        });
        return false;
      }
    },

    /**
     * 프로젝트와 연결된 할일 모두 삭제
     */
    deleteProjectWithTodos: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'deleteProjectWithTodos', { userId, projectId });

      // Optimistic delete
      const originalProjects = [...get().projects];

      set((state: ProjectStoreState) => {
        state.projects = state.projects.filter((p) => p.id !== projectId);
        if (state.currentProject?.id === projectId) {
          state.currentProject = null;
        }
      });

      try {
        // 연결된 할일 삭제
        const { error: todosError } = await supabase
          .from('todos')
          .delete()
          .eq('project_id', projectId)
          .eq('user_id', userId);

        if (todosError) {
          throw todosError;
        }

        // 프로젝트 삭제
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        set((state: ProjectStoreState) => {
          state.projectProgress.delete(projectId);
          state.projectTodos.delete(projectId);
        });

        return true;
      } catch (error) {
        console.error('프로젝트 및 할일 삭제 오류:', error);
        // Rollback
        set((state: ProjectStoreState) => {
          state.projects = originalProjects;
          state.error = error instanceof Error ? error.message : '프로젝트 삭제에 실패했습니다.';
        });
        return false;
      }
    },

    /**
     * 프로젝트 완료
     */
    completeProject: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'completeProject', { userId, projectId });

      const result = await get().updateProject(userId, {
        id: projectId,
        status: 'completed',
      });

      if (result) {
        // completed_at 업데이트
        await supabase
          .from('projects')
          .update({ completed_at: new Date().toISOString() })
          .eq('id', projectId)
          .eq('user_id', userId);
      }

      return !!result;
    },

    /**
     * 프로젝트 중단 (on_hold)
     */
    holdProject: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'holdProject', { userId, projectId });

      const result = await get().updateProject(userId, {
        id: projectId,
        status: 'on_hold',
      });

      return !!result;
    },

    /**
     * 프로젝트 시작 (not_started → in_progress)
     */
    startProject: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'startProject', { userId, projectId });

      const result = await get().updateProject(userId, {
        id: projectId,
        status: 'in_progress',
      });

      return !!result;
    },

    /**
     * 프로젝트 시작안함으로 되돌리기 (in_progress → not_started)
     */
    unstartProject: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'unstartProject', { userId, projectId });

      const result = await get().updateProject(userId, {
        id: projectId,
        status: 'not_started',
      });

      return !!result;
    },

    /**
     * 프로젝트 재개 (on_hold → in_progress)
     */
    resumeProject: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'resumeProject', { userId, projectId });

      const result = await get().updateProject(userId, {
        id: projectId,
        status: 'in_progress',
      });

      return !!result;
    },

    /**
     * 프로젝트에 연결된 할일 조회
     */
    fetchProjectTodos: async (userId: string, projectId: string) => {
      logStoreAction('ProjectStore', 'fetchProjectTodos', { userId, projectId });

      try {
        const { data, error } = await supabase
          .from('todos')
          .select('*')
          .eq('project_id', projectId)
          .eq('user_id', userId)
          .is('parent_todo_id', null)  // 부모 할일만 조회 (서브태스크 제외)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        const todos = data || [];

        set((state: ProjectStoreState) => {
          state.projectTodos.set(projectId, todos);
        });

        return todos;
      } catch (error) {
        console.error('프로젝트 할일 조회 오류:', error);
        return [];
      }
    },

    /**
     * 할일에서 프로젝트 연결 해제
     */
    unlinkTodoFromProject: async (userId: string, todoId: string) => {
      logStoreAction('ProjectStore', 'unlinkTodoFromProject', { userId, todoId });

      try {
        const { error } = await supabase
          .from('todos')
          .update({ project_id: null })
          .eq('id', todoId)
          .eq('user_id', userId);

        if (error) {
          throw error;
        }

        // projectTodos 캐시에서 제거
        set((state: ProjectStoreState) => {
          state.projectTodos.forEach((todos, projectId) => {
            const filtered = todos.filter((t) => t.id !== todoId);
            if (filtered.length !== todos.length) {
              state.projectTodos.set(projectId, filtered);
            }
          });
        });

        return true;
      } catch (error) {
        console.error('할일 연결 해제 오류:', error);
        return false;
      }
    },

    /**
     * 상태 필터 설정
     */
    setStatusFilter: (status: ProjectStatus | 'all') => {
      set((state: ProjectStoreState) => {
        state.statusFilter = status;
      });
    },

    /**
     * 현재 프로젝트 설정
     */
    setCurrentProject: (project: Project | null) => {
      set((state: ProjectStoreState) => {
        state.currentProject = project;
      });
    },

    /**
     * 에러 상태 설정
     */
    setError: (error: string | null) => {
      set((state: ProjectStoreState) => {
        state.error = error;
      });
    },

    /**
     * 로딩 상태 설정
     */
    setLoading: (loading: boolean) => {
      set((state: ProjectStoreState) => {
        state.loading = loading;
      });
    },

    /**
     * 스토어 초기화
     */
    reset: () => {
      set((state: ProjectStoreState) => {
        state.projects = [];
        state.currentProject = null;
        state.projectProgress = new Map();
        state.projectTodos = new Map();
        state.loading = false;
        state.error = null;
        state.lastUpdated = null;
        state.statusFilter = 'all';
        state.initialized = false;
      });
    },
  }),
  {
    name: 'project-store',
    devtools: true,
  }
);

/**
 * 필터링된 프로젝트 목록을 가져오는 셀렉터
 */
export const useFilteredProjects = () => {
  const { projects, statusFilter } = useProjectStore();

  if (statusFilter === 'all') {
    return projects;
  }

  return projects.filter((project) => project.status === statusFilter);
};

/**
 * 진행중 프로젝트만 가져오는 셀렉터
 */
export const useInProgressProjects = () => {
  const { projects } = useProjectStore();
  return projects.filter((project) => project.status === 'in_progress');
};

/**
 * 활성 프로젝트만 가져오는 셀렉터 (하위 호환성)
 * @deprecated useInProgressProjects 사용 권장
 */
export const useActiveProjects = () => {
  return useInProgressProjects();
};

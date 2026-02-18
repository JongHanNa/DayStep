/**
 * Project Store (Zustand + MMKV)
 * 프로젝트 CRUD + 상태 전환 + 진행률
 * 웹 projectStore 패턴의 RN 포팅
 */
import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {supabase} from '@/lib/supabase';
import {zustandMMKVStorage} from '@/lib/mmkv';
import type {
  Project,
  ProjectStatus,
  ProjectInsert,
  ProjectUpdate,
  ProjectProgress,
} from '@/types/project';
import type {Todo} from '@daystep/shared-core';

interface ProjectStoreState {
  projects: Project[];
  projectProgress: Record<string, ProjectProgress>;
  projectTodos: Record<string, Todo[]>;
  loading: boolean;
  error: string | null;
  statusFilter: ProjectStatus | 'all';

  fetchProjects: (userId: string, status?: ProjectStatus) => Promise<void>;
  fetchProjectProgress: (
    userId: string,
    projectId: string,
  ) => Promise<ProjectProgress | null>;
  fetchProjectTodos: (userId: string, projectId: string) => Promise<Todo[]>;
  createProject: (
    userId: string,
    data: Omit<ProjectInsert, 'user_id'>,
  ) => Promise<Project | null>;
  updateProject: (
    userId: string,
    data: ProjectUpdate,
  ) => Promise<Project | null>;
  deleteProject: (userId: string, projectId: string) => Promise<boolean>;
  startProject: (userId: string, projectId: string) => Promise<boolean>;
  holdProject: (userId: string, projectId: string) => Promise<boolean>;
  completeProject: (userId: string, projectId: string) => Promise<boolean>;
  resumeProject: (userId: string, projectId: string) => Promise<boolean>;
  unstartProject: (userId: string, projectId: string) => Promise<boolean>;
  unlinkTodoFromProject: (
    userId: string,
    todoId: string,
  ) => Promise<boolean>;
  setStatusFilter: (status: ProjectStatus | 'all') => void;
  clearError: () => void;
}

export const useProjectStore = create<ProjectStoreState>()(
  persist(
    (set, get) => ({
      projects: [],
      projectProgress: {},
      projectTodos: {},
      loading: false,
      error: null,
      statusFilter: 'all',

      fetchProjects: async (userId, status) => {
        try {
          set({loading: true, error: null});

          let query = supabase
            .from('projects')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', {ascending: false});

          if (status) {
            query = query.eq('status', status);
          }

          const {data, error} = await query;
          if (error) throw error;

          set({projects: (data ?? []) as Project[]});
        } catch (err: any) {
          console.error('[ProjectStore] Fetch error:', err);
          set({error: err.message ?? 'Failed to fetch projects'});
        } finally {
          set({loading: false});
        }
      },

      fetchProjectProgress: async (userId, projectId) => {
        try {
          const {data: todos, error} = await supabase
            .from('todos')
            .select('id, completed')
            .eq('user_id', userId)
            .contains('project_ids', [projectId]);

          if (error) throw error;

          const total = todos?.length ?? 0;
          const completed = todos?.filter((t: any) => t.completed).length ?? 0;
          const progress: ProjectProgress = {
            project_id: projectId,
            total,
            completed,
            progress: total > 0 ? Math.round((completed / total) * 100) : 0,
          };

          set(state => ({
            projectProgress: {
              ...state.projectProgress,
              [projectId]: progress,
            },
          }));

          return progress;
        } catch (err: any) {
          console.error('[ProjectStore] Progress error:', err);
          return null;
        }
      },

      fetchProjectTodos: async (userId, projectId) => {
        try {
          const {data, error} = await supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)
            .contains('project_ids', [projectId])
            .order('order_index', {ascending: true});

          if (error) throw error;

          const todos = (data ?? []) as Todo[];
          set(state => ({
            projectTodos: {...state.projectTodos, [projectId]: todos},
          }));

          return todos;
        } catch (err: any) {
          console.error('[ProjectStore] Fetch todos error:', err);
          return [];
        }
      },

      createProject: async (userId, data) => {
        try {
          set({loading: true, error: null});

          const {data: created, error} = await supabase
            .from('projects')
            .insert({
              ...data,
              user_id: userId,
              status: data.status ?? 'not_started',
              color: data.color ?? '#A8DADC',
              source: data.source ?? 'manual',
            })
            .select()
            .single();

          if (error) throw error;

          set(state => ({
            projects: [created as Project, ...state.projects],
          }));

          return created as Project;
        } catch (err: any) {
          console.error('[ProjectStore] Create error:', err);
          set({error: err.message ?? 'Failed to create project'});
          return null;
        } finally {
          set({loading: false});
        }
      },

      updateProject: async (userId, data) => {
        const originalProjects = get().projects;
        try {
          const {id, ...updates} = data;

          // Optimistic update
          set(state => ({
            projects: state.projects.map(p =>
              p.id === id
                ? {...p, ...updates, updated_at: new Date().toISOString()}
                : p,
            ),
          }));

          const {data: updated, error} = await supabase
            .from('projects')
            .update({...updates, updated_at: new Date().toISOString()})
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

          if (error) throw error;

          set(state => ({
            projects: state.projects.map(p =>
              p.id === id ? (updated as Project) : p,
            ),
          }));

          return updated as Project;
        } catch (err: any) {
          set({projects: originalProjects});
          console.error('[ProjectStore] Update error:', err);
          set({error: err.message ?? 'Failed to update project'});
          return null;
        }
      },

      deleteProject: async (userId, projectId) => {
        const originalProjects = get().projects;
        try {
          set(state => ({
            projects: state.projects.filter(p => p.id !== projectId),
          }));

          const {error} = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)
            .eq('user_id', userId);

          if (error) throw error;
          return true;
        } catch (err: any) {
          set({projects: originalProjects});
          console.error('[ProjectStore] Delete error:', err);
          set({error: err.message ?? 'Failed to delete project'});
          return false;
        }
      },

      startProject: async (userId, projectId) => {
        return !!(await get().updateProject(userId, {
          id: projectId,
          status: 'in_progress',
        }));
      },

      holdProject: async (userId, projectId) => {
        return !!(await get().updateProject(userId, {
          id: projectId,
          status: 'on_hold',
        }));
      },

      completeProject: async (userId, projectId) => {
        const originalProjects = get().projects;
        try {
          set(state => ({
            projects: state.projects.map(p =>
              p.id === projectId
                ? {
                    ...p,
                    status: 'completed' as ProjectStatus,
                    completed_at: new Date().toISOString(),
                  }
                : p,
            ),
          }));

          const {error} = await supabase
            .from('projects')
            .update({
              status: 'completed',
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)
            .eq('user_id', userId);

          if (error) throw error;
          return true;
        } catch (err: any) {
          set({projects: originalProjects});
          console.error('[ProjectStore] Complete error:', err);
          return false;
        }
      },

      resumeProject: async (userId, projectId) => {
        return !!(await get().updateProject(userId, {
          id: projectId,
          status: 'in_progress',
        }));
      },

      unstartProject: async (userId, projectId) => {
        return !!(await get().updateProject(userId, {
          id: projectId,
          status: 'not_started',
        }));
      },

      unlinkTodoFromProject: async (userId, todoId) => {
        try {
          const {error} = await supabase
            .from('todos')
            .update({project_ids: null, updated_at: new Date().toISOString()})
            .eq('id', todoId)
            .eq('user_id', userId);

          if (error) throw error;
          return true;
        } catch (err: any) {
          console.error('[ProjectStore] Unlink error:', err);
          return false;
        }
      },

      setStatusFilter: (status) => set({statusFilter: status}),
      clearError: () => set({error: null}),
    }),
    {
      name: 'project-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
      partialize: (state) => ({
        projects: state.projects,
        statusFilter: state.statusFilter,
      }),
    },
  ),
);

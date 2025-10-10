/**
 * Project Store - 프로젝트(할일 묶음) 관리
 * PARA 시스템의 P (Projects)
 */

import { createStore } from '@/state/utils/storeUtils';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types/second-brain';
import { mockProjects, saveMockDataToLocalStorage } from '@/lib/mockData/secondBrain';

interface ProjectStoreState {
  projects: Project[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchProjects: () => Promise<void>;
  createProject: (data: CreateProjectInput) => Promise<Project>;
  updateProject: (id: string, data: UpdateProjectInput) => Promise<Project>;
  deleteProject: (id: string) => Promise<boolean>;
  completeProject: (id: string) => Promise<Project>;
  archiveProject: (id: string) => Promise<Project>;
  unarchiveProject: (id: string) => Promise<Project>;
  updateProjectProgress: (id: string, totalTodos: number, completedTodos: number) => Promise<Project>;
  reorderProjects: (projectIds: string[]) => Promise<void>;
}

export const useProjectStore = createStore<ProjectStoreState>(
  (set, get) => ({
    projects: [],
    loading: false,
    error: null,

    fetchProjects: async () => {
      try {
        set({ loading: true, error: null });
        // Mock 데이터 로드 (archived 제외)
        const projects = mockProjects.filter((p) => p.status !== 'archived');
        set({ projects, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트를 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    createProject: async (data: CreateProjectInput) => {
      try {
        set({ loading: true, error: null });

        const newProject: Project = {
          id: `project-${Date.now()}`,
          user_id: 'mock-user-123',
          ...data,
          total_todos: 0,
          completed_todos: 0,
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const updatedProjects = [...get().projects, newProject];
        set({ projects: updatedProjects, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        return newProject;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 생성에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    updateProject: async (id: string, data: UpdateProjectInput) => {
      try {
        set({ loading: true, error: null });

        const updatedProjects = get().projects.map((project) =>
          project.id === id
            ? {
                ...project,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : project
        );

        set({ projects: updatedProjects, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const updatedProject = updatedProjects.find((p) => p.id === id);
        if (!updatedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return updatedProject;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 수정에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    deleteProject: async (id: string) => {
      try {
        set({ loading: true, error: null });

        const updatedProjects = get().projects.filter((project) => project.id !== id);
        set({ projects: updatedProjects, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        return true;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 삭제에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    completeProject: async (id: string) => {
      try {
        set({ loading: true, error: null });

        const updatedProjects = get().projects.map((project) =>
          project.id === id
            ? {
                ...project,
                status: 'completed' as const,
                progress: 100,
                completed_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : project
        );

        set({ projects: updatedProjects, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const completedProject = updatedProjects.find((p) => p.id === id);
        if (!completedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return completedProject;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 완료 처리에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    archiveProject: async (id: string) => {
      try {
        set({ loading: true, error: null });

        const updatedProjects = get().projects.map((project) =>
          project.id === id
            ? {
                ...project,
                status: 'archived' as const,
                updated_at: new Date().toISOString(),
              }
            : project
        );

        set({ projects: updatedProjects.filter((p) => p.status !== 'archived'), loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const archivedProject = updatedProjects.find((p) => p.id === id);
        if (!archivedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return archivedProject;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 아카이브에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    unarchiveProject: async (id: string) => {
      try {
        set({ loading: true, error: null });

        // 아카이브된 프로젝트 포함하여 로드
        const allProjects = mockProjects;
        const updatedProjects = allProjects.map((project) =>
          project.id === id
            ? {
                ...project,
                status: 'active' as const,
                updated_at: new Date().toISOString(),
              }
            : project
        );

        set({ projects: updatedProjects.filter((p) => p.status !== 'archived'), loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const unarchivedProject = updatedProjects.find((p) => p.id === id);
        if (!unarchivedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return unarchivedProject;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 복원에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    updateProjectProgress: async (id: string, totalTodos: number, completedTodos: number) => {
      try {
        set({ loading: true, error: null });

        const progress = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

        const updatedProjects = get().projects.map((project) =>
          project.id === id
            ? {
                ...project,
                total_todos: totalTodos,
                completed_todos: completedTodos,
                progress,
                updated_at: new Date().toISOString(),
              }
            : project
        );

        set({ projects: updatedProjects, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();

        const updatedProject = updatedProjects.find((p) => p.id === id);
        if (!updatedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return updatedProject;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 진행도 업데이트에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },

    reorderProjects: async (projectIds: string[]) => {
      try {
        set({ loading: true, error: null });

        const updatedProjects = get().projects.map((project) => {
          const newIndex = projectIds.indexOf(project.id);
          return {
            ...project,
            order_index: newIndex >= 0 ? newIndex : project.order_index,
            updated_at: new Date().toISOString(),
          };
        });

        // order_index로 정렬
        updatedProjects.sort((a, b) => a.order_index - b.order_index);

        set({ projects: updatedProjects, loading: false });

        // LocalStorage 저장
        saveMockDataToLocalStorage();
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 순서 변경에 실패했습니다.',
          loading: false,
        });
        throw error;
      }
    },
  }),
  {
    name: 'project-store',
    persist: {
      name: 'daystep-projects',
      version: 1,
    },
  }
);

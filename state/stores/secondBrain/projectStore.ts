/**
 * Project Store - 프로젝트(할일 묶음) 관리
 * PARA 시스템의 P (Projects)
 */

import { createStore } from '@/state/utils/storeUtils';
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/types/second-brain';
import {
  fetchProjectsWithJWT,
  createProjectWithJWT,
  updateProjectWithJWT,
  deleteProjectWithJWT,
} from '@/lib/supabase/projects';

interface ProjectStoreState {
  projects: Project[];
  loading: boolean;
  error: string | null;

  // Actions - userId 파라미터 추가 (goalStore 패턴)
  fetchProjects: (userId: string) => Promise<void>;
  createProject: (userId: string, data: CreateProjectInput) => Promise<Project>;
  updateProject: (userId: string, id: string, data: UpdateProjectInput) => Promise<Project>;
  deleteProject: (userId: string, id: string) => Promise<boolean>;
  completeProject: (userId: string, id: string) => Promise<Project>;
  archiveProject: (userId: string, id: string) => Promise<Project>;
  unarchiveProject: (userId: string, id: string) => Promise<Project>;
  updateProjectProgress: (id: string, totalTodos: number, completedTodos: number) => Promise<Project>;
  reorderProjects: (projectIds: string[]) => Promise<void>;
}

export const useProjectStore = createStore<ProjectStoreState>(
  (set, get) => ({
    projects: [],
    loading: false,
    error: null,

    fetchProjects: async (userId: string) => {
      try {
        set({ loading: true, error: null });

        const projects = await fetchProjectsWithJWT(userId);

        // 진행도 필드 추가 (프론트엔드에서만 계산, DB에 저장 안 함)
        const projectsWithProgress = projects.map((p) => ({
          ...p,
          total_todos: 0,
          completed_todos: 0,
          progress: 0,
        }));

        set({ projects: projectsWithProgress, loading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트를 불러오는데 실패했습니다.',
          loading: false,
        });
      }
    },

    createProject: async (userId: string, data: CreateProjectInput) => {
      try {
        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const optimisticProject: Project = {
          id: tempId,
          user_id: userId,
          ...data,
          total_todos: 0,
          completed_todos: 0,
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set({ projects: [...get().projects, optimisticProject] });

        // 실제 API 호출
        const newProject = await createProjectWithJWT({
          ...data,
          user_id: userId,
        });

        // 진행도 필드 추가
        const projectWithProgress = {
          ...newProject,
          total_todos: 0,
          completed_todos: 0,
          progress: 0,
        };

        // 실제 데이터로 교체
        set({
          projects: get().projects.map((project: Project) =>
            project.id === tempId ? projectWithProgress : project
          ),
        });

        return projectWithProgress;
      } catch (error) {
        // Rollback optimistic update
        set({ projects: get().projects.filter((project: Project) => !project.id.startsWith('temp-')) });
        set({
          error: error instanceof Error ? error.message : '프로젝트 생성에 실패했습니다.',
        });
        throw error;
      }
    },

    updateProject: async (userId: string, id: string, data: UpdateProjectInput) => {
      try {
        // Optimistic update
        const previousProjects = get().projects;
        const updatedProjects = get().projects.map((project: Project) =>
          project.id === id
            ? {
                ...project,
                ...data,
                updated_at: new Date().toISOString(),
              }
            : project
        );

        set({ projects: updatedProjects });

        // 실제 API 호출
        const updatedProject = await updateProjectWithJWT(id, userId, data);
        if (!updatedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        // 진행도 필드 추가
        const projectWithProgress = {
          ...updatedProject,
          total_todos: previousProjects.find((p: Project) => p.id === id)?.total_todos || 0,
          completed_todos: previousProjects.find((p: Project) => p.id === id)?.completed_todos || 0,
          progress: previousProjects.find((p: Project) => p.id === id)?.progress || 0,
        };

        // 실제 데이터로 교체
        set({
          projects: get().projects.map((project: Project) =>
            project.id === id ? projectWithProgress : project
          ),
        });

        return projectWithProgress;
      } catch (error) {
        // Rollback optimistic update
        set({ projects: get().projects });
        set({
          error: error instanceof Error ? error.message : '프로젝트 수정에 실패했습니다.',
        });
        throw error;
      }
    },

    deleteProject: async (userId: string, id: string) => {
      try {
        // Optimistic update
        const previousProjects = get().projects;
        set({ projects: get().projects.filter((project: Project) => project.id !== id) });

        // 실제 API 호출
        const success = await deleteProjectWithJWT(id, userId);
        if (!success) throw new Error('프로젝트 삭제에 실패했습니다.');

        return true;
      } catch (error) {
        // Rollback optimistic update
        set({ projects: get().projects });
        set({
          error: error instanceof Error ? error.message : '프로젝트 삭제에 실패했습니다.',
        });
        throw error;
      }
    },

    completeProject: async (userId: string, id: string) => {
      try {
        // Optimistic update
        const updatedProjects = get().projects.map((project: Project) =>
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

        set({ projects: updatedProjects });

        // 실제 API 호출
        await updateProjectWithJWT(id, userId, {
          status: 'completed',
          completed_at: new Date().toISOString(),
        });

        const completedProject = updatedProjects.find((p: Project) => p.id === id);
        if (!completedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return completedProject;
      } catch (error) {
        // Rollback
        set({ projects: get().projects });
        set({
          error: error instanceof Error ? error.message : '프로젝트 완료 처리에 실패했습니다.',
        });
        throw error;
      }
    },

    archiveProject: async (userId: string, id: string) => {
      try {
        // Optimistic update - archived 대신 completed 사용
        const updatedProjects = get().projects.map((project: Project) =>
          project.id === id
            ? {
                ...project,
                status: 'completed' as const,
                updated_at: new Date().toISOString(),
              }
            : project
        );

        set({ projects: updatedProjects });

        // 실제 API 호출
        await updateProjectWithJWT(id, userId, { status: 'completed' });

        const archivedProject = updatedProjects.find((p: Project) => p.id === id);
        if (!archivedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return archivedProject;
      } catch (error) {
        // Rollback
        set({ projects: get().projects });
        set({
          error: error instanceof Error ? error.message : '프로젝트 아카이브에 실패했습니다.',
        });
        throw error;
      }
    },

    unarchiveProject: async (userId: string, id: string) => {
      try {
        // 아카이브된 프로젝트 다시 가져오기
        await get().fetchProjects(userId);

        // Optimistic update - active 대신 in_progress 사용
        const updatedProjects = get().projects.map((project: Project) =>
          project.id === id
            ? {
                ...project,
                status: 'in_progress' as const,
                updated_at: new Date().toISOString(),
              }
            : project
        );

        set({ projects: updatedProjects });

        // 실제 API 호출
        await updateProjectWithJWT(id, userId, { status: 'in_progress' });

        const unarchivedProject = updatedProjects.find((p: Project) => p.id === id);
        if (!unarchivedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return unarchivedProject;
      } catch (error) {
        // Rollback
        set({ projects: get().projects });
        set({
          error: error instanceof Error ? error.message : '프로젝트 복원에 실패했습니다.',
        });
        throw error;
      }
    },

    updateProjectProgress: async (id: string, totalTodos: number, completedTodos: number) => {
      try {
        const progress = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

        // 로컬 상태만 업데이트 (DB에 저장하지 않음)
        const updatedProjects = get().projects.map((project: Project) =>
          project.id === id
            ? {
                ...project,
                total_todos: totalTodos,
                completed_todos: completedTodos,
                progress,
              }
            : project
        );

        set({ projects: updatedProjects });

        const updatedProject = updatedProjects.find((p: Project) => p.id === id);
        if (!updatedProject) throw new Error('프로젝트를 찾을 수 없습니다.');

        return updatedProject;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 진행도 업데이트에 실패했습니다.',
        });
        throw error;
      }
    },

    reorderProjects: async (projectIds: string[]) => {
      try {
        const updatedProjects = get().projects.map((project: Project) => {
          const newIndex = projectIds.indexOf(project.id);
          return {
            ...project,
            order_index: newIndex >= 0 ? newIndex : project.order_index,
          };
        });

        // order_index로 정렬
        updatedProjects.sort((a: Project, b: Project) => a.order_index - b.order_index);

        set({ projects: updatedProjects });

        // TODO: 각 프로젝트의 order_index를 DB에 업데이트해야 함
        // 일괄 업데이트 API가 필요한 경우 별도 구현
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '프로젝트 순서 변경에 실패했습니다.',
        });
        throw error;
      }
    },
  }),
  {
    name: 'project-store',
  }
);

/**
 * Project Types — 웹 types/index.ts 프로젝트 관련 타입 포팅
 * DB 테이블: projects
 */

export type ProjectStatus = 'not_started' | 'in_progress' | 'on_hold' | 'completed';
export type ProjectSource = 'manual' | 'mcp';

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: ProjectStatus;
  icon: string | null;
  color: string | null;
  source: ProjectSource | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectInsert {
  user_id: string;
  title: string;
  description?: string | null;
  status?: ProjectStatus;
  icon?: string | null;
  color?: string | null;
  source?: ProjectSource;
}

export interface ProjectUpdate {
  id: string;
  title?: string;
  description?: string | null;
  status?: ProjectStatus;
  icon?: string | null;
  color?: string | null;
  source?: ProjectSource;
}

export interface ProjectProgress {
  project_id: string;
  total: number;
  completed: number;
  progress: number; // 0-100
}

/** 프로젝트 기본 색상 팔레트 (10개) */
export const PROJECT_COLORS = [
  '#A8DADC', '#FFB4A2', '#B5838D', '#6D6875',
  '#CDB4DB', '#FFC8DD', '#BDE0FE', '#A2D2FF',
  '#D4E09B', '#F6BD60',
] as const;

/** 프로젝트 아이콘 (16개 이모지) */
export const PROJECT_ICONS = [
  '📋', '🎯', '💡', '🚀',
  '📚', '🏗️', '🎨', '💼',
  '🏃', '🌱', '⭐', '🔥',
  '🎓', '🎵', '🏠', '❤️',
] as const;

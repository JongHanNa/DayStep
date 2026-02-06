// ============================================
// Role Types (역할 엔티티)
// ============================================

export interface Role {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
  color: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RoleInput {
  name: string;
  icon?: string | null;
  color?: string;
  order_index?: number;
}

export interface PersonRole {
  id: string;
  user_id: string;
  person_id: string;
  role_id: string;
  created_at: string;
  // Joined data
  role?: Role;
}

// ============================================
// Constants
// ============================================

export const DEFAULT_ROLE_COLOR = '#10B981';

export const ROLE_PRESET_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

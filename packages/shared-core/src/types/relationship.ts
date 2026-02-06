// ============================================
// Relationship Types (관계 엔티티)
// ============================================

export interface Relationship {
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

export interface RelationshipInput {
  name: string;
  icon?: string | null;
  color?: string;
  order_index?: number;
}

export interface PersonRelationship {
  id: string;
  user_id: string;
  person_id: string;
  relationship_id: string;
  created_at: string;
  // Joined data
  relationship?: Relationship;
}

// ============================================
// Constants
// ============================================

export const DEFAULT_RELATIONSHIP_COLOR = '#3B82F6';

export const RELATIONSHIP_PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
];

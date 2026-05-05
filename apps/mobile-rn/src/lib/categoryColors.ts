import type {CategoryKind} from '@/stores/cherishedPeopleStore';

export const CATEGORY_COLOR_PRESETS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#6366F1',
  '#F97316',
  '#6B7280',
] as const;

export const DEFAULT_COLOR_BY_KIND: Record<CategoryKind, string> = {
  relationship: '#3B82F6',
  role: '#10B981',
  department: '#6366F1',
};

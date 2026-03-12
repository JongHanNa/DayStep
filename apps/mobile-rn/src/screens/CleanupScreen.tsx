/**
 * CleanupScreen — 데이터 정리
 * 보라 그라디언트 헤더 + 도넛 차트 + 6개 데이터 타입 카드 + 바텀시트 삭제
 *
 * 정리 대상:
 * [할일] 종료일 지난 미완료 / 완료된 할일
 * [습관] 반복 종료된 할일
 * [프로젝트] 완료·보류 중 프로젝트
 * [원동력] 전체 원동력 노트 (선택 삭제)
 * [관심기록] 90일 이상 지난 기록
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {ScreenContainer} from '@/components/core';
import {useTodoStore} from '@/stores/todoStore';
import {useProjectStore} from '@/stores/projectStore';
import {useNoteStore} from '@/stores/noteStore';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {supabase} from '@/lib/supabase';
import {useTheme} from '@/theme';

// ────────────────────────────────────────────────
// Generic Item (모든 카테고리 공통 표시용)
// ────────────────────────────────────────────────

interface GenericItem {
  id: string;
  title: string;
  subtitle?: string;
}

// ────────────────────────────────────────────────
// Category 정의
// ────────────────────────────────────────────────

type CategoryKey =
  | 'pastDue'
  | 'completed'
  | 'pastRecurring'
  | 'completedProjects'
  | 'onHoldProjects'
  | 'allNotes'
  | 'oldInteractions';

interface CategoryDef {
  key: CategoryKey;
  icon: string;
  title: string;
  description: string;
  color: string;
  bgColor: string;
}

interface CategoryGroup {
  groupTitle: string;
  categories: CategoryDef[];
}

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    groupTitle: '📋 할일',
    categories: [
      {
        key: 'pastDue',
        icon: '⏰',
        title: '종료일 지난 미완료 할일',
        description: '기한이 지나도 완료되지 않은 할일이에요.',
        color: '#DC2626',
        bgColor: '#FEE2E2',
      },
      {
        key: 'completed',
        icon: '✅',
        title: '완료된 할일',
        description: '이미 완료된 할일이에요. 기록이 필요 없다면 삭제해도 괜찮아요.',
        color: '#16A34A',
        bgColor: '#DCFCE7',
      },
    ],
  },
  {
    groupTitle: '🔁 습관',
    categories: [
      {
        key: 'pastRecurring',
        icon: '🔁',
        title: '반복 종료된 할일',
        description: '반복 종료일이 지난 반복 할일이에요. 이제 울리지 않는 루틴이에요.',
        color: '#2563EB',
        bgColor: '#DBEAFE',
      },
    ],
  },
  {
    groupTitle: '📁 프로젝트',
    categories: [
      {
        key: 'completedProjects',
        icon: '🎉',
        title: '완료된 프로젝트',
        description: '완료 상태의 프로젝트예요. 더 이상 필요 없다면 정리할 수 있어요.',
        color: '#059669',
        bgColor: '#D1FAE5',
      },
      {
        key: 'onHoldProjects',
        icon: '⏸️',
        title: '보류 중 프로젝트',
        description: '보류 상태로 멈춰있는 프로젝트예요. 재개하거나 삭제하세요.',
        color: '#D97706',
        bgColor: '#FEF3C7',
      },
    ],
  },
  {
    groupTitle: '💡 원동력',
    categories: [
      {
        key: 'allNotes',
        icon: '💡',
        title: '원동력 노트',
        description: '기록된 원동력 노트 전체 목록이에요. 정리할 항목을 선택하세요.',
        color: '#7C3AED',
        bgColor: '#EDE9FE',
      },
    ],
  },
  {
    groupTitle: '📅 관심기록',
    categories: [
      {
        key: 'oldInteractions',
        icon: '🗓️',
        title: '90일 이상 지난 기록',
        description: '3개월 이상 된 관심 기록이에요. 오래된 기록을 정리할 수 있어요.',
        color: '#9333EA',
        bgColor: '#F3E8FF',
      },
    ],
  },
];

// 평탄화된 카테고리 배열 (key → CategoryDef 매핑용)
const ALL_CATEGORIES: CategoryDef[] = CATEGORY_GROUPS.flatMap(g => g.categories);
const CATEGORY_MAP = Object.fromEntries(ALL_CATEGORIES.map(c => [c.key, c])) as Record<CategoryKey, CategoryDef>;

// ────────────────────────────────────────────────
// Donut Chart
// ────────────────────────────────────────────────

function DonutChart({usedCount, maxCount}: {usedCount: number; maxCount: number}) {
  const pct = Math.min(100, Math.round((usedCount / maxCount) * 100));
  const size = 110;
  const stroke = 14;

  return (
    <View style={{width: size, height: size, alignItems: 'center', justifyContent: 'center'}}>
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: 'rgba(255,255,255,0.2)',
        }}
      />
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: 'transparent',
          borderTopColor: 'white',
          borderRightColor: pct > 25 ? 'white' : 'transparent',
          borderBottomColor: pct > 50 ? 'white' : 'transparent',
          borderLeftColor: pct > 75 ? 'white' : 'transparent',
          transform: [{rotate: '-90deg'}],
        }}
      />
      <View style={{alignItems: 'center'}}>
        <Text style={{fontSize: 24, fontWeight: '800', color: 'white', lineHeight: 28}}>
          {pct}%
        </Text>
        <Text style={{fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 1}}>
          사용 중
        </Text>
      </View>
    </View>
  );
}

// ────────────────────────────────────────────────
// Bottom Sheet Modal (범용)
// ────────────────────────────────────────────────

interface SheetProps {
  visible: boolean;
  category: CategoryDef | null;
  items: GenericItem[];
  onClose: () => void;
  onDelete: (ids: string[]) => Promise<void>;
  onDeleted: (ids: string[], categoryKey: CategoryKey) => void;
  itemLabel?: string; // e.g. '할일', '프로젝트', '기록'
}

function CleanupSheet({
  visible,
  category,
  items,
  onClose,
  onDelete,
  onDeleted,
  itemLabel = '항목',
}: SheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelected(new Set(items.map(t => t.id)));
    }
  }, [visible, items]);

  const allSelected = selected.size === items.length && items.length > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(t => t.id)));
    }
  };

  const toggleItem = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleDelete = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    Alert.alert(
      `${category?.title ?? ''} 삭제`,
      `선택된 ${ids.length}개의 ${itemLabel}을(를) 삭제할까요?\n삭제 후 복구가 어렵습니다.`,
      [
        {text: '취소', style: 'cancel'},
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await onDelete(ids);
              onDeleted(ids, category!.key);
            } catch {
              Alert.alert('오류', '일부 삭제에 실패했습니다.');
            } finally {
              setDeleting(false);
              onClose();
            }
          },
        },
      ],
    );
  };

  if (!category) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <TouchableOpacity
        style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end'}}
        activeOpacity={1}
        onPress={onClose}>
        <TouchableOpacity
          activeOpacity={1}
          style={{
            backgroundColor: 'white',
            borderRadius: 24,
            borderBottomLeftRadius: 0,
            borderBottomRightRadius: 0,
            padding: 24,
            maxHeight: '75%',
          }}>
          {/* Handle */}
          <View
            style={{
              width: 40,
              height: 4,
              backgroundColor: '#E2E8F0',
              borderRadius: 99,
              alignSelf: 'center',
              marginBottom: 20,
            }}
          />

          {/* Title */}
          <Text style={{fontSize: 18, fontWeight: '700', color: '#0F172A', marginBottom: 4}}>
            {category.icon} {category.title}
          </Text>
          <Text style={{fontSize: 13, color: '#64748B', marginBottom: 16}}>
            {items.length}개 · 전체 선택 후 삭제 가능
          </Text>

          {/* Select All Row */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: '#F1F5F9',
              marginBottom: 8,
            }}>
            <TouchableOpacity
              onPress={toggleAll}
              style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 5,
                  backgroundColor: allSelected ? category.color : 'transparent',
                  borderWidth: 2,
                  borderColor: allSelected ? category.color : '#CBD5E1',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {allSelected && (
                  <Text style={{color: 'white', fontSize: 11, fontWeight: '700'}}>✓</Text>
                )}
              </View>
              <Text style={{fontSize: 13, fontWeight: '600', color: '#475569'}}>
                전체 선택 ({items.length}개)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleAll}>
              <Text style={{fontSize: 13, color: '#94A3B8'}}>
                {allSelected ? '선택 해제' : '모두 선택'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* List */}
          <ScrollView style={{maxHeight: 280}} showsVerticalScrollIndicator={false}>
            {items.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => toggleItem(item.id)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingVertical: 12,
                  borderBottomWidth: 1,
                  borderBottomColor: '#F8FAFC',
                  gap: 12,
                }}>
                <View
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 5,
                    backgroundColor: selected.has(item.id) ? category.color : 'transparent',
                    borderWidth: 2,
                    borderColor: selected.has(item.id) ? category.color : '#CBD5E1',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                  {selected.has(item.id) && (
                    <Text style={{color: 'white', fontSize: 11, fontWeight: '700'}}>✓</Text>
                  )}
                </View>
                <Text
                  style={{flex: 1, fontSize: 14, color: '#0F172A'}}
                  numberOfLines={1}>
                  {item.title}
                </Text>
                {item.subtitle ? (
                  <Text style={{fontSize: 12, color: '#94A3B8', flexShrink: 0}}>
                    {item.subtitle}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Delete Button */}
          <TouchableOpacity
            onPress={handleDelete}
            disabled={selected.size === 0 || deleting}
            style={{
              marginTop: 16,
              paddingVertical: 15,
              borderRadius: 14,
              backgroundColor: selected.size === 0 ? '#E2E8F0' : category.color,
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'row',
              gap: 8,
            }}>
            {deleting ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: selected.size === 0 ? '#94A3B8' : 'white',
                }}>
                🗑️ 선택된 {selected.size}개 삭제하기
              </Text>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ────────────────────────────────────────────────
// Category Card
// ────────────────────────────────────────────────

interface CardProps {
  category: CategoryDef;
  count: number;
  onPress: () => void;
  enterDelay: number;
  unit?: string;
}

function CategoryCard({category, count, onPress, enterDelay, unit = '개'}: CardProps) {
  return (
    <Animated.View entering={FadeInDown.delay(enterDelay).duration(400)}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={{
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 20,
          marginBottom: 12,
          shadowColor: '#000',
          shadowOffset: {width: 0, height: 4},
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 3,
        }}>
        <View style={{flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between'}}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              backgroundColor: category.bgColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <Text style={{fontSize: 22}}>{category.icon}</Text>
          </View>
          <View style={{alignItems: 'flex-end'}}>
            <Text
              style={{
                fontSize: 36,
                fontWeight: '800',
                color: category.color,
                lineHeight: 40,
              }}>
              {count}
            </Text>
            <Text style={{fontSize: 12, color: '#94A3B8', fontWeight: '500'}}>{unit}</Text>
          </View>
        </View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: '#0F172A',
            marginTop: 14,
            marginBottom: 4,
          }}>
          {category.title}
        </Text>
        <Text style={{fontSize: 13, color: '#64748B', lineHeight: 20}}>
          {category.description}
        </Text>
        <View
          style={{
            marginTop: 16,
            paddingVertical: 10,
            borderRadius: 10,
            backgroundColor: category.color,
            alignItems: 'center',
          }}>
          <Text style={{fontSize: 14, fontWeight: '600', color: 'white'}}>
            정리하기 →
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────
// Group Header
// ────────────────────────────────────────────────

function GroupHeader({title, enterDelay}: {title: string; enterDelay: number}) {
  const {primaryColor} = useTheme();
  return (
    <Animated.Text
      entering={FadeInDown.delay(enterDelay).duration(400)}
      style={{
        fontSize: 13,
        fontWeight: '700',
        color: primaryColor,
        marginBottom: 10,
        marginTop: 8,
        marginLeft: 4,
      }}>
      {title}
    </Animated.Text>
  );
}

// ────────────────────────────────────────────────
// 카테고리별 아이템 레이블
// ────────────────────────────────────────────────

const ITEM_LABEL: Record<CategoryKey, string> = {
  pastDue: '할일',
  completed: '할일',
  pastRecurring: '할일',
  completedProjects: '프로젝트',
  onHoldProjects: '프로젝트',
  allNotes: '원동력',
  oldInteractions: '기록',
};

// ────────────────────────────────────────────────
// Main Screen
// ────────────────────────────────────────────────

type CategorizedData = Record<CategoryKey, GenericItem[]>;

const EMPTY_DATA: CategorizedData = {
  pastDue: [],
  completed: [],
  pastRecurring: [],
  completedProjects: [],
  onHoldProjects: [],
  allNotes: [],
  oldInteractions: [],
};

export default function CleanupScreen() {
  const user = useAuthStore(s => s.user);
  const {primaryColor} = useTheme();
  const resolvedCategoryGroups = useMemo(() =>
    CATEGORY_GROUPS.map(group => ({
      ...group,
      categories: group.categories.map(cat =>
        cat.key === 'allNotes' || cat.key === 'oldInteractions'
          ? {...cat, color: primaryColor, bgColor: primaryColor + '15'}
          : cat,
      ),
    })),
    [primaryColor],
  );
  const {deleteTodo} = useTodoStore();
  const {deleteProject} = useProjectStore();
  const {deleteNote} = useNoteStore();
  const {deleteInteraction} = useCherishedPeopleStore();

  const [loading, setLoading] = useState(true);
  const [categorized, setCategorized] = useState<CategorizedData>(EMPTY_DATA);
  const [activeCategory, setActiveCategory] = useState<CategoryDef | null>(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  // ── 데이터 로드 ──────────────────────────────
  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const now = new Date().toISOString();
      const today = new Date().toISOString().slice(0, 10);
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const [
        pastDueRes,
        completedRes,
        pastRecurringRes,
        completedProjectsRes,
        onHoldProjectsRes,
        notesRes,
        oldInteractionsRes,
      ] = await Promise.all([
        // 종료일 지난 미완료 일반 할일
        supabase
          .from('todos')
          .select('id, title, end_time')
          .eq('user_id', user.id)
          .eq('recurrence_pattern', 'none')
          .eq('completed', false)
          .not('end_time', 'is', null)
          .lt('end_time', now)
          .order('end_time', {ascending: true}),

        // 완료된 일반 할일
        supabase
          .from('todos')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .eq('recurrence_pattern', 'none')
          .eq('completed', true)
          .order('updated_at', {ascending: false}),

        // 반복 종료일 지난 반복 할일
        supabase
          .from('todos')
          .select('id, title, recurrence_end_date')
          .eq('user_id', user.id)
          .neq('recurrence_pattern', 'none')
          .not('recurrence_end_date', 'is', null)
          .lt('recurrence_end_date', today)
          .order('recurrence_end_date', {ascending: true}),

        // 완료된 프로젝트
        supabase
          .from('projects')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('updated_at', {ascending: false}),

        // 보류 중 프로젝트
        supabase
          .from('projects')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .eq('status', 'on_hold')
          .order('updated_at', {ascending: false}),

        // 원동력 노트 전체
        supabase
          .from('notes')
          .select('id, title, content, created_at')
          .eq('user_id', user.id)
          .eq('note_category', 'fuel')
          .order('created_at', {ascending: false}),

        // 90일 이상 지난 관심기록
        supabase
          .from('care_interactions')
          .select('id, interaction_type, interaction_date, person_id')
          .eq('user_id', user.id)
          .lt('interaction_date', ninetyDaysAgo)
          .order('interaction_date', {ascending: true}),
      ]);

      const fmtDate = (iso: string | null | undefined, suffix: string) =>
        iso
          ? new Date(iso).toLocaleDateString('ko-KR', {month: 'numeric', day: 'numeric'}) + suffix
          : '';

      const interactionTypeLabel: Record<string, string> = {
        call: '전화',
        message: '메시지',
        visit: '방문',
        meal: '식사',
        gift: '선물',
        letter: '편지',
        help: '도움',
        prayer: '기도',
        other: '기타',
      };

      setCategorized({
        pastDue: (pastDueRes.data ?? []).map((t: any) => ({
          id: t.id,
          title: t.title,
          subtitle: fmtDate(t.end_time, ' 종료'),
        })),
        completed: (completedRes.data ?? []).map((t: any) => ({
          id: t.id,
          title: t.title,
          subtitle: fmtDate(t.updated_at, ' 완료'),
        })),
        pastRecurring: (pastRecurringRes.data ?? []).map((t: any) => ({
          id: t.id,
          title: t.title,
          subtitle: fmtDate(t.recurrence_end_date, ' 종료'),
        })),
        completedProjects: (completedProjectsRes.data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          subtitle: fmtDate(p.updated_at, ' 완료'),
        })),
        onHoldProjects: (onHoldProjectsRes.data ?? []).map((p: any) => ({
          id: p.id,
          title: p.title,
          subtitle: fmtDate(p.updated_at, ' 보류'),
        })),
        allNotes: (notesRes.data ?? []).map((n: any) => ({
          id: n.id,
          title: n.title ?? n.content?.slice(0, 40) ?? '(내용 없음)',
          subtitle: fmtDate(n.created_at, ''),
        })),
        oldInteractions: (oldInteractionsRes.data ?? []).map((i: any) => ({
          id: i.id,
          title: `${interactionTypeLabel[i.interaction_type] ?? i.interaction_type}`,
          subtitle: i.interaction_date,
        })),
      });
    } catch (err) {
      console.error('[CleanupScreen] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── 총 정리 가능 수 ─────────────────────────
  const totalCleanable = useMemo(
    () => Object.values(categorized).reduce((sum, arr) => sum + arr.length, 0),
    [categorized],
  );

  // ── 타입별 집계 ───────────────────────────────
  const typeSummary = useMemo(
    () => [
      {icon: '⏰', label: '할일', count: categorized.pastDue.length + categorized.completed.length},
      {icon: '🔁', label: '습관', count: categorized.pastRecurring.length},
      {icon: '📁', label: '프로젝트', count: categorized.completedProjects.length + categorized.onHoldProjects.length},
      {icon: '💡', label: '원동력', count: categorized.allNotes.length},
      {icon: '📅', label: '관심기록', count: categorized.oldInteractions.length},
    ],
    [categorized],
  );

  // ── 시트 열기 ─────────────────────────────────
  const openSheet = (cat: CategoryDef) => {
    setActiveCategory(cat);
    setSheetVisible(true);
  };

  // ── 카테고리별 삭제 핸들러 ────────────────────
  const buildDeleteHandler = useCallback(
    (key: CategoryKey) => async (ids: string[]) => {
      if (!user?.id) return;

      switch (key) {
        case 'pastDue':
        case 'completed':
        case 'pastRecurring': {
          await Promise.allSettled(ids.map(id => deleteTodo(id)));
          break;
        }
        case 'completedProjects':
        case 'onHoldProjects': {
          await Promise.allSettled(ids.map(id => deleteProject(user.id!, id)));
          break;
        }
        case 'allNotes': {
          await Promise.allSettled(ids.map(id => deleteNote(id)));
          break;
        }
        case 'oldInteractions': {
          await Promise.allSettled(ids.map(id => deleteInteraction(id, user.id!)));
          break;
        }
      }
    },
    [user?.id, deleteTodo, deleteProject, deleteNote, deleteInteraction],
  );

  // ── 삭제 후 상태 업데이트 ────────────────────
  const handleDeleted = useCallback(
    (deletedIds: string[], categoryKey: CategoryKey) => {
      const idSet = new Set(deletedIds);
      setCategorized(prev => ({
        ...prev,
        [categoryKey]: prev[categoryKey].filter(item => !idSet.has(item.id)),
      }));
    },
    [],
  );

  // ─────────────────────────────────────────────
  let cardDelay = 0;

  return (
    <ScreenContainer gradient="warmBackground">
      {/* ── 보라 그라디언트 헤더 ── */}
      <View
        style={{
          backgroundColor: primaryColor,
          paddingTop: 52,
          paddingHorizontal: 20,
          paddingBottom: 28,
          borderBottomLeftRadius: 32,
          borderBottomRightRadius: 32,
        }}>
        <Text style={{fontSize: 22, fontWeight: '700', color: 'white', marginBottom: 20}}>
          데이터 정리 💎
        </Text>

        <View style={{flexDirection: 'row', alignItems: 'center', gap: 16}}>
          {/* 왼쪽: 큰 숫자 */}
          <View style={{alignItems: 'center', minWidth: 72}}>
            <Text style={{fontSize: 52, fontWeight: '800', color: 'white', lineHeight: 60}}>
              {totalCleanable}
            </Text>
            <Text style={{fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2}}>
              개 정리 가능
            </Text>
          </View>

          {/* 구분선 */}
          <View
            style={{
              width: 1,
              height: 80,
              backgroundColor: 'rgba(255,255,255,0.25)',
            }}
          />

          {/* 오른쪽: 타입별 칩 */}
          <View style={{flex: 1}}>
            {totalCleanable > 0 ? (
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 6}}>
                {typeSummary
                  .filter(item => item.count > 0)
                  .map(item => (
                    <View
                      key={item.label}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(255,255,255,0.18)',
                        borderRadius: 20,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                        gap: 4,
                      }}>
                      <Text style={{fontSize: 12}}>{item.icon}</Text>
                      <Text style={{fontSize: 12, color: 'white', fontWeight: '600'}}>
                        {item.label} {item.count}
                      </Text>
                    </View>
                  ))}
              </View>
            ) : (
              <Text style={{fontSize: 14, color: 'rgba(255,255,255,0.9)', lineHeight: 22}}>
                깔끔하게{'\n'}관리되고 있어요 ✨
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* ── 카드 목록 ── */}
      <ScrollView
        contentContainerStyle={{padding: 16, paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{alignItems: 'center', paddingTop: 60}}>
            <ActivityIndicator color={primaryColor} />
            <Text style={{marginTop: 12, color: '#64748B', fontSize: 14}}>
              데이터를 불러오는 중...
            </Text>
          </View>
        ) : (
          resolvedCategoryGroups.map(group => {
            const groupDelay = cardDelay;
            cardDelay += group.categories.length * 80;
            return (
              <View key={group.groupTitle}>
                <GroupHeader title={group.groupTitle} enterDelay={groupDelay} />
                {group.categories.map((cat, i) => (
                  <CategoryCard
                    key={cat.key}
                    category={cat}
                    count={categorized[cat.key].length}
                    onPress={() => openSheet(cat)}
                    enterDelay={groupDelay + i * 80}
                    unit="개"
                  />
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── 바텀 시트 ── */}
      <CleanupSheet
        visible={sheetVisible}
        category={activeCategory}
        items={activeCategory ? categorized[activeCategory.key] : []}
        onClose={() => setSheetVisible(false)}
        onDelete={activeCategory ? buildDeleteHandler(activeCategory.key) : async () => {}}
        onDeleted={handleDeleted}
        itemLabel={activeCategory ? ITEM_LABEL[activeCategory.key] : '항목'}
      />
    </ScreenContainer>
  );
}

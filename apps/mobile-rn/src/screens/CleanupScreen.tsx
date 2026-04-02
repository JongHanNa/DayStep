/**
 * CleanupScreen — 데이터 정리 (C안: 진행률 요약)
 * 프로그레스 바 + 아코디언 UI
 *
 * 정리 대상:
 * [할일] 종료일 지난 미완료 / 완료된 할일
 * [습관] 반복 종료된 할일
 * [프로젝트] 완료·보류 중 프로젝트
 * [원동력] 전체 원동력 노트 (선택 삭제)
 * [관심기록] 90일 이상 지난 기록
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import BottomSheet, {BottomSheetBackdrop, BottomSheetScrollView} from '@gorhom/bottom-sheet';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {
  Clock,
  CheckCircle2,
  Repeat,
  FolderCheck,
  PauseCircle,
  Lightbulb,
  Calendar,
  Trash2,
  type LucideIcon,
} from 'lucide-react-native';
import {Platform} from 'react-native';
import {ScreenContainer} from '@/components/core';
import {NativeCleanupAccordionNative} from '@/components/native';
import {useTodoStore} from '@/stores/todoStore';
import {useProjectStore} from '@/stores/projectStore';
import {useMotivationStore} from '@/stores/motivationStore';
import {useCherishedPeopleStore} from '@/stores/cherishedPeopleStore';
import {useAuthStore} from '@/stores/authStore';
import {supabase} from '@/lib/supabase';
import {useTheme} from '@/theme';
import {springs} from '@/theme/animations';
import {hexWithOpacity} from '@/lib/todoUtils';

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
  title: string;
  description: string;
}

interface CategoryGroup {
  groupTitle: string;
  categories: CategoryDef[];
}

// 아이콘 매핑
const CATEGORY_ICON: Record<CategoryKey, LucideIcon> = {
  pastDue: Clock,
  completed: CheckCircle2,
  pastRecurring: Repeat,
  completedProjects: FolderCheck,
  onHoldProjects: PauseCircle,
  allNotes: Lightbulb,
  oldInteractions: Calendar,
};

// 그룹별 명도 (진한것 → 연한것)
const GROUP_SHADES = [1.0, 0.75, 0.55, 0.40, 0.25];

const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    groupTitle: '할일',
    categories: [
      {
        key: 'pastDue',
        title: '종료일 지난 미완료 할일',
        description: '기한이 지나도 완료되지 않은 할일이에요.',
      },
      {
        key: 'completed',
        title: '완료된 할일',
        description: '이미 완료된 할일이에요. 기록이 필요 없다면 삭제해도 괜찮아요.',
      },
    ],
  },
  {
    groupTitle: '습관',
    categories: [
      {
        key: 'pastRecurring',
        title: '반복 종료된 할일',
        description: '반복 종료일이 지난 반복 할일이에요. 이제 울리지 않는 루틴이에요.',
      },
    ],
  },
  {
    groupTitle: '프로젝트',
    categories: [
      {
        key: 'completedProjects',
        title: '완료된 프로젝트',
        description: '완료 상태의 프로젝트예요. 더 이상 필요 없다면 정리할 수 있어요.',
      },
      {
        key: 'onHoldProjects',
        title: '보류 중 프로젝트',
        description: '보류 상태로 멈춰있는 프로젝트예요. 재개하거나 삭제하세요.',
      },
    ],
  },
  {
    groupTitle: '원동력',
    categories: [
      {
        key: 'allNotes',
        title: '원동력 노트',
        description: '기록된 원동력 노트 전체 목록이에요. 정리할 항목을 선택하세요.',
      },
    ],
  },
  {
    groupTitle: '관심기록',
    categories: [
      {
        key: 'oldInteractions',
        title: '90일 이상 지난 기록',
        description: '3개월 이상 된 관심 기록이에요. 오래된 기록을 정리할 수 있어요.',
      },
    ],
  },
];

// 평탄화된 카테고리 배열 (key → CategoryDef 매핑용)
const ALL_CATEGORIES: CategoryDef[] = CATEGORY_GROUPS.flatMap(g => g.categories);
const CATEGORY_MAP = Object.fromEntries(ALL_CATEGORIES.map(c => [c.key, c])) as Record<CategoryKey, CategoryDef>;

// ────────────────────────────────────────────────
// ProgressHeader — 세그먼트 프로그레스 바 + 범례
// ────────────────────────────────────────────────

function ProgressHeader({
  totalCleanable,
  groupCounts,
  groupLabels,
  primaryColor,
}: {
  totalCleanable: number;
  groupCounts: number[];
  groupLabels: string[];
  primaryColor: string;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={{paddingHorizontal: 4, marginBottom: 20}}>
      <Text style={{fontSize: 20, fontWeight: '700', color: '#0F172A', marginBottom: 4}}>
        데이터 정리
      </Text>
      <Text style={{fontSize: 13, color: '#64748B', marginBottom: 16}}>
        {totalCleanable}개 항목을 깔끔하게 정리해보세요
      </Text>

      {/* 세그먼트 프로그레스 바 */}
      <View
        style={{
          flexDirection: 'row',
          height: 8,
          borderRadius: 4,
          backgroundColor: '#F1F5F9',
          overflow: 'hidden',
          marginBottom: 12,
        }}>
        {groupCounts.map((count, i) =>
          count > 0 ? (
            <View
              key={i}
              style={{
                flex: count,
                backgroundColor: hexWithOpacity(primaryColor, GROUP_SHADES[i]),
                marginRight: i < groupCounts.length - 1 ? 1 : 0,
              }}
            />
          ) : null,
        )}
      </View>

      {/* 범례 */}
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
        {groupCounts.map((count, i) =>
          count > 0 ? (
            <View key={i} style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: hexWithOpacity(primaryColor, GROUP_SHADES[i]),
                }}
              />
              <Text style={{fontSize: 12, color: '#64748B'}}>
                {groupLabels[i]} {count}
              </Text>
            </View>
          ) : null,
        )}
      </View>
    </Animated.View>
  );
}

// ────────────────────────────────────────────────
// Bottom Sheet Modal (범용)
// ────────────────────────────────────────────────

interface SheetProps {
  sheetRef: React.RefObject<BottomSheet | null>;
  category: CategoryDef | null;
  items: GenericItem[];
  onClose: () => void;
  onDelete: (ids: string[]) => Promise<void>;
  onDeleted: (ids: string[], categoryKey: CategoryKey) => void;
  itemLabel?: string;
  primaryColor: string;
}

function CleanupSheet({
  sheetRef,
  category,
  items,
  onClose,
  onDelete,
  onDeleted,
  itemLabel = '항목',
  primaryColor,
}: SheetProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const snapPoints = useMemo(() => ['75%'], []);

  // 시트가 열릴 때 전체 선택으로 초기화
  const handleSheetChange = useCallback(
    (index: number) => {
      if (index >= 0 && items.length > 0) {
        setSelected(new Set(items.map(t => t.id)));
      }
    },
    [items],
  );

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

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0} />
    ),
    [],
  );

  if (!category) return null;

  const Icon = CATEGORY_ICON[category.key];

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{backgroundColor: '#D1D5DB'}}
      onChange={handleSheetChange}
      onClose={onClose}
      backgroundStyle={{
        backgroundColor: 'white',
        borderRadius: 24,
      }}>
      <BottomSheetScrollView
        contentContainerStyle={{padding: 24, paddingTop: 8}}
        showsVerticalScrollIndicator={false}>
        {/* Title */}
        <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8}}>
          <Icon size={20} color={primaryColor} />
          <Text style={{fontSize: 18, fontWeight: '700', color: '#0F172A'}}>
            {category.title}
          </Text>
        </View>
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
                backgroundColor: allSelected ? primaryColor : 'transparent',
                borderWidth: 2,
                borderColor: allSelected ? primaryColor : '#CBD5E1',
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
                backgroundColor: selected.has(item.id) ? primaryColor : 'transparent',
                borderWidth: 2,
                borderColor: selected.has(item.id) ? primaryColor : '#CBD5E1',
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

        {/* Delete Button */}
        <TouchableOpacity
          onPress={handleDelete}
          disabled={selected.size === 0 || deleting}
          style={{
            marginTop: 16,
            paddingVertical: 15,
            borderRadius: 14,
            backgroundColor: selected.size === 0 ? '#E2E8F0' : primaryColor,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 8,
          }}>
          {deleting ? (
            <ActivityIndicator color="white" />
          ) : (
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Trash2 size={16} color={selected.size === 0 ? '#94A3B8' : 'white'} />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '700',
                  color: selected.size === 0 ? '#94A3B8' : 'white',
                }}>
                선택된 {selected.size}개 삭제하기
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </BottomSheetScrollView>
    </BottomSheet>
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
  const {deleteTodo} = useTodoStore();
  const {deleteProject} = useProjectStore();
  const {deleteNote} = useMotivationStore();
  const {deleteInteraction} = useCherishedPeopleStore();

  const [loading, setLoading] = useState(true);
  const [categorized, setCategorized] = useState<CategorizedData>(EMPTY_DATA);
  const [activeCategory, setActiveCategory] = useState<CategoryDef | null>(null);
  const sheetRef = useRef<BottomSheet>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set([0]));

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
        supabase
          .from('todos')
          .select('id, title, end_time')
          .eq('user_id', user.id)
          .eq('recurrence_pattern', 'none')
          .eq('completed', false)
          .not('end_time', 'is', null)
          .lt('end_time', now)
          .order('end_time', {ascending: true}),

        supabase
          .from('todos')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .eq('recurrence_pattern', 'none')
          .eq('completed', true)
          .order('updated_at', {ascending: false}),

        supabase
          .from('todos')
          .select('id, title, recurrence_end_date')
          .eq('user_id', user.id)
          .neq('recurrence_pattern', 'none')
          .not('recurrence_end_date', 'is', null)
          .lt('recurrence_end_date', today)
          .order('recurrence_end_date', {ascending: true}),

        supabase
          .from('projects')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('updated_at', {ascending: false}),

        supabase
          .from('projects')
          .select('id, title, updated_at')
          .eq('user_id', user.id)
          .eq('status', 'on_hold')
          .order('updated_at', {ascending: false}),

        supabase
          .from('motivations')
          .select('id, title, content, created_at')
          .eq('user_id', user.id)
          .eq('category', 'motivation')
          .order('created_at', {ascending: false}),

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

  // ── 그룹별 카운트 + 레이블 ──────────────────
  const groupCounts = useMemo(
    () =>
      CATEGORY_GROUPS.map(g =>
        g.categories.reduce((sum, cat) => sum + categorized[cat.key].length, 0),
      ),
    [categorized],
  );

  const groupLabels = useMemo(
    () => CATEGORY_GROUPS.map(g => g.groupTitle),
    [],
  );

  // ── 시트 열기 ─────────────────────────────────
  const openSheet = (cat: CategoryDef) => {
    setActiveCategory(cat);
    sheetRef.current?.expand();
  };

  // ── 네이티브 아코디언 높이 애니메이션 ──────────
  const animatedHeight = useSharedValue(0);
  const heightStyle = useAnimatedStyle(() => ({
    height: animatedHeight.value > 0 ? animatedHeight.value : undefined,
    overflow: 'hidden' as const,
  }));

  const accordionDataJSON = useMemo(() => {
    return JSON.stringify(
      CATEGORY_GROUPS.map((group, i) => ({
        groupTitle: group.groupTitle,
        shade: GROUP_SHADES[i] ?? GROUP_SHADES[GROUP_SHADES.length - 1],
        categories: group.categories.map(cat => ({
          key: cat.key,
          title: cat.title,
          count: categorized[cat.key].length,
        })),
      })),
    );
  }, [categorized]);

  // ── 아코디언 토글 ─────────────────────────────
  const toggleGroup = useCallback((index: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

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
  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{padding: 16, paddingTop: 60, paddingBottom: 100}}
        showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={{alignItems: 'center', paddingTop: 60}}>
            <ActivityIndicator color={primaryColor} />
            <Text style={{marginTop: 12, color: '#64748B', fontSize: 14}}>
              데이터를 불러오는 중...
            </Text>
          </View>
        ) : totalCleanable === 0 ? (
          <View style={{alignItems: 'center', paddingTop: 100}}>
            <CheckCircle2 size={48} color={primaryColor} />
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: '#64748B',
                marginTop: 16,
              }}>
              깔끔하게 관리되고 있어요
            </Text>
          </View>
        ) : (
          <>
            <ProgressHeader
              totalCleanable={totalCleanable}
              groupCounts={groupCounts}
              groupLabels={groupLabels}
              primaryColor={primaryColor}
            />
            {Platform.OS === 'ios' ? (
              <Animated.View style={heightStyle}>
                <NativeCleanupAccordionNative
                  accordionData={accordionDataJSON}
                  primaryColor={primaryColor}
                  expandedGroups={Array.from(expandedGroups)}
                  onCategoryPress={e => {
                    const cat = CATEGORY_MAP[e.nativeEvent.categoryKey as CategoryKey];
                    if (cat) openSheet(cat);
                  }}
                  onGroupToggle={e => toggleGroup(e.nativeEvent.groupIndex)}
                  onHeightChange={e => {
                    animatedHeight.value = withSpring(e.nativeEvent.height, springs.nativeGlass);
                  }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
            ) : (
              <NativeCleanupAccordionNative
                accordionData={accordionDataJSON}
                primaryColor={primaryColor}
                expandedGroups={Array.from(expandedGroups)}
                onCategoryPress={e => {
                  const cat = CATEGORY_MAP[e.nativeEvent.categoryKey as CategoryKey];
                  if (cat) openSheet(cat);
                }}
                onGroupToggle={e => toggleGroup(e.nativeEvent.groupIndex)}
                onHeightChange={() => {}}
                style={{alignSelf: 'stretch'}}
              />
            )}
          </>
        )}
      </ScrollView>

      {/* ── 바텀 시트 ── */}
      <CleanupSheet
        sheetRef={sheetRef}
        category={activeCategory}
        items={activeCategory ? categorized[activeCategory.key] : []}
        onClose={() => sheetRef.current?.close()}
        onDelete={activeCategory ? buildDeleteHandler(activeCategory.key) : async () => {}}
        onDeleted={handleDeleted}
        itemLabel={activeCategory ? ITEM_LABEL[activeCategory.key] : '항목'}
        primaryColor={primaryColor}
      />
    </ScreenContainer>
  );
}

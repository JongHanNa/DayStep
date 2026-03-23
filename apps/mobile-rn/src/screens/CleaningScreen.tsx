/**
 * CleaningScreen — 청소/정리 메인 화면
 * 에너지 적응형 마이크로태스크 + 요일별 구역 순환
 * 2계층: 매일 할 일 (daily) + 오늘의 구역 (zone-specific)
 */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {View, Text, ScrollView, Modal} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {List, X, Minus, Plus, MoreHorizontal} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {LiquidGlassButton} from '@/components/native';
import {LiquidGlassMenu} from '@/components/native/LiquidGlassMenu';
import {EnergySelector} from '@/components/cleaning/EnergySelector';
import {FocusCard} from '@/components/cleaning/FocusCard';
import {TaskQueue} from '@/components/cleaning/TaskQueue';
import type {TaskQueueSection} from '@/components/cleaning/TaskQueue';
import {StreakBar} from '@/components/cleaning/StreakBar';
import {CategoryAccordion} from '@/components/cleaning/CategoryAccordion';
import {CleaningGardenView} from '@/components/cleaning/CleaningGardenView';
import {ScreenTimeToggle} from '@/components/cleaning/ScreenTimeToggle';
import {useCleaningStore} from '@/stores/cleaningStore';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {ENERGY_CONFIG} from '@/constants/cleaning-data';
import type {CleaningTab, EnergyLevel} from '@/constants/cleaning-data';

const TABS: {key: CleaningTab; label: string}[] = [
  {key: 'space', label: '공간 청소'},
  {key: 'digital', label: '디지털 정리'},
  {key: 'belongings', label: '물건 관리'},
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const CLEANING_MENU_ITEMS = [
  {title: '청소/정리와 ADHD', key: 'cleaningADHDInfo'},
  {title: '청소 설정', key: 'settings'},
];

export default function CleaningScreen() {
  const navigation = useNavigation();
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const [taskListModalVisible, setTaskListModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const {
    energyLevel,
    activeTab,
    focusTaskId,
    setEnergyLevel,
    setActiveTab,
    setFocusTask,
    isTaskCompleted,
    startTimer,
    resetTimer,
    zones,
    categorySchedules,
    updateZoneDayOfWeek,
    updateCategoryScheduleDayOfWeek,
    getTodayZone,
    getAllTasks,
    getFilteredTasks,
    getOrderedTasks,
    getStreak,
    getCategoryCompletionCount,
    toggleTaskCompletion,
    customMaxTasks,
    setCustomMaxTasks,
    gardenViewMode,
    startCleaningSession,
    completeCleaningSession,
    checkOrphanedSession,
  } = useCleaningStore();

  // 정원 뷰 모드 추적 (일 뷰일 때만 태스크 UI 표시)
  const [currentViewMode, setCurrentViewMode] = useState<'day' | 'week' | 'month' | 'year'>(gardenViewMode);
  const isDayView = currentViewMode === 'day';

  // 앱 재시작 시 orphaned session 복구
  useEffect(() => {
    checkOrphanedSession();
  }, []);

  const todayZone = getTodayZone();
  const allTasks = getAllTasks();
  const filteredTasks = getFilteredTasks();
  const {dailyRoutine, zoneFocus, digitalTasks, belongingsTasks} = getOrderedTasks();
  const streak = getStreak();

  // 에너지 기반 표시 제한 (customMaxTasks 우선, daily/today 분리)
  const config = ENERGY_CONFIG[energyLevel];
  const customSetting = customMaxTasks[energyLevel];
  const {dailyMax, todayMax} = useMemo(() => {
    if (typeof customSetting === 'object' && customSetting !== null) {
      return {dailyMax: customSetting.daily, todayMax: customSetting.today};
    }
    const defaultSetting = config.maxTasks;
    if (typeof customSetting === 'number') {
      return {dailyMax: customSetting, todayMax: customSetting};
    }
    // 기본값 (객체)
    if (typeof defaultSetting === 'object') {
      return {dailyMax: defaultSetting.daily, todayMax: defaultSetting.today};
    }
    return {dailyMax: defaultSetting, todayMax: defaultSetting};
  }, [customSetting, config.maxTasks]);

  // 전체 탭 통합: 카테고리별 개별 slice 후 합치기 (오늘 먼저)
  const activeTasks = useMemo(() => {
    const dailyUncompleted = dailyRoutine.filter(t => !isTaskCompleted(t.id)).slice(0, dailyMax);
    const todayUncompleted = [...zoneFocus, ...digitalTasks, ...belongingsTasks]
      .filter(t => !isTaskCompleted(t.id)).slice(0, todayMax);
    return [...todayUncompleted, ...dailyUncompleted];
  }, [dailyRoutine, zoneFocus, digitalTasks, belongingsTasks, dailyMax, todayMax, isTaskCompleted]);

  // 포커스 태스크
  const focusTask = useMemo(() => {
    if (focusTaskId) {
      return [...dailyRoutine, ...zoneFocus, ...digitalTasks, ...belongingsTasks].find(t => t.id === focusTaskId);
    }
    return activeTasks[0] ?? null;
  }, [focusTaskId, dailyRoutine, zoneFocus, digitalTasks, belongingsTasks, activeTasks]);

  // 통합 라벨: "오늘(수요일): 침실, 파일, 수납"
  const todaySectionLabel = useMemo(() => {
    const categories: string[] = [];

    if (zoneFocus.length > 0 && todayZone) {
      categories.push(todayZone.name);
    }
    if (digitalTasks.length > 0) {
      const cats = [...new Set(digitalTasks.map(t => t.category))];
      categories.push(...cats);
    }
    if (belongingsTasks.length > 0) {
      const cats = [...new Set(belongingsTasks.map(t => t.category))];
      categories.push(...cats);
    }

    if (categories.length === 0) return null;
    const dayName = DAY_LABELS[new Date().getDay()];
    return `오늘(${dayName}요일): ${categories.join(', ')}`;
  }, [zoneFocus, digitalTasks, belongingsTasks, todayZone]);

  // 큐 태스크 (포커스 제외), 섹션 분리 — 전체 탭 통합
  const queueSections = useMemo((): TaskQueueSection[] => {
    if (!focusTask) return [];
    const remaining = activeTasks.filter(t => t.id !== focusTask.id);

    const dailyQueue = remaining.filter(t => dailyRoutine.some(d => d.id === t.id));
    const zoneQueue = remaining.filter(t => zoneFocus.some(z => z.id === t.id));
    const digitalQueue = remaining.filter(t => digitalTasks.some(d => d.id === t.id));
    const belongingsQueue = remaining.filter(t => belongingsTasks.some(b => b.id === t.id));

    const sections: TaskQueueSection[] = [];

    const todayQueue = [...zoneQueue, ...digitalQueue, ...belongingsQueue];
    if (todayQueue.length > 0 && todaySectionLabel) {
      sections.push({title: todaySectionLabel, tasks: todayQueue});
    }
    if (dailyQueue.length > 0) sections.push({title: '매일 할 일', tasks: dailyQueue});
    return sections;
  }, [focusTask, activeTasks, dailyRoutine, zoneFocus, digitalTasks, belongingsTasks, todaySectionLabel]);

  // 카테고리 그룹핑 (모달용 — space 탭은 2그룹으로 분리)
  const categories = useMemo(() => {
    const tabTasks = allTasks.filter(t => t.tab === activeTab);
    const catSet = new Set(tabTasks.map(t => t.category));
    return Array.from(catSet);
  }, [allTasks, activeTab]);

  const handleComplete = useCallback((taskId: string) => {
    const isFocusedTask = taskId === focusTask?.id;
    if (isFocusedTask) resetTimer();
    toggleTaskCompletion(taskId);
    haptic.success();
    // 세션 완료 → DB 기록 + 정원 업데이트
    if (isFocusedTask) {
      completeCleaningSession();
      const nextUncompleted = activeTasks.find(
        t => t.id !== taskId && !isTaskCompleted(t.id),
      );
      setFocusTask(nextUncompleted?.id ?? null);
    }
  }, [focusTask, activeTasks, isTaskCompleted, resetTimer, toggleTaskCompletion, setFocusTask, haptic, completeCleaningSession]);

  // 세션 시작 핸들러 (타이머 시작 + 세션 시작 + 전체화면 진입)
  const handleSessionStart = useCallback(() => {
    if (!focusTask) return;
    setFocusTask(focusTask.id);
    startTimer(focusTask.estimatedMinutes * 60);
    startCleaningSession(focusTask.id);
    haptic.light();
    navigation.navigate('CleaningSession' as never);
  }, [focusTask, setFocusTask, startTimer, startCleaningSession, haptic, navigation]);

  const handleMenuSelect = useCallback((key: string) => {
    if (key === 'cleaningADHDInfo') {
      navigation.navigate('CleaningADHDInfo' as never);
    } else if (key === 'settings') {
      setSettingsModalVisible(true);
    }
  }, [navigation]);

  const handleGardenViewModeChange = useCallback((mode: 'day' | 'week' | 'month' | 'year') => {
    setCurrentViewMode(mode);
  }, []);

  return (
    <ScreenContainer gradient="warmBackground">
      <ScrollView
        contentContainerStyle={{paddingBottom: 120}}
        showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: 12,
          }}>
          <LiquidGlassButton
            systemIconName="list.bullet"
            fallbackIcon={<List size={16} color="#6B7280" />}
            iconColor="#6B7280"
            size={40}
            iconSize={16}
            onPress={() => setTaskListModalVisible(true)}
          />

          <View style={{flex: 1}} />

          <LiquidGlassMenu
            systemIconName="ellipsis.circle"
            iconColor="#9CA3AF"
            size={40}
            menuItems={CLEANING_MENU_ITEMS}
            onSelect={handleMenuSelect}
            fallbackIcon={<MoreHorizontal size={18} color="#9CA3AF" />}
          />
        </Animated.View>

        {/* 청소 정원 */}
        <Animated.View
          entering={FadeInDown.delay(50).duration(400)}
          style={{marginBottom: 12}}>
          <CleaningGardenView onViewModeChange={handleGardenViewModeChange} />
        </Animated.View>

        {/* 일 뷰일 때만 태스크 UI 표시 */}
        {isDayView && (
          <>
            {/* 에너지 선택기 */}
            <Animated.View
              entering={FadeInDown.delay(100).duration(400)}
              style={{paddingHorizontal: 16, marginBottom: 16}}>
              <EnergySelector value={energyLevel} onChange={setEnergyLevel} />
            </Animated.View>

            {/* 포커스 카드 */}
            {focusTask && (
              <View style={{paddingHorizontal: 16, marginBottom: 8}}>
                <FocusCard
                  task={focusTask}
                  onStart={handleSessionStart}
                  onComplete={() => handleComplete(focusTask.id)}
                />
              </View>
            )}

            {/* 다음 큐 */}
            {queueSections.length > 0 && (
              <View style={{paddingHorizontal: 20, marginBottom: 8}}>
                <TaskQueue sections={queueSections} onSelectTask={setFocusTask} onCompleteTask={handleComplete} />
              </View>
            )}

            {/* 스트릭 */}
            <StreakBar streak={streak} />
          </>
        )}

      </ScrollView>

      {/* 전체 태스크 목록 모달 */}
      <Modal
        visible={taskListModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setTaskListModalVisible(false)}>
        <View style={{flex: 1, backgroundColor: '#FFFFFF', paddingTop: 60}}>
          {/* 모달 헤더 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
            }}>
            <Text style={{fontSize: 17, fontWeight: '700', color: '#1F2937'}}>
              전체 태스크 목록
            </Text>
            <AnimatedPressable
              hapticType="light"
              onPress={() => setTaskListModalVisible(false)}
              style={{width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center'}}>
              <X size={20} color="#374151" />
            </AnimatedPressable>
          </View>

          {/* 탭 선택 */}
          <View
            style={{
              flexDirection: 'row',
              paddingHorizontal: 16,
              marginTop: 12,
              marginBottom: 8,
              gap: 6,
            }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.key;
              return (
                <AnimatedPressable
                  key={tab.key}
                  hapticType="selection"
                  onPress={() => setActiveTab(tab.key)}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 10,
                    alignItems: 'center',
                    backgroundColor: isActive ? primaryColor + '15' : '#F3F4F6',
                    borderWidth: isActive ? 1.5 : 0,
                    borderColor: isActive ? primaryColor : 'transparent',
                  }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: isActive ? '700' : '400',
                      color: isActive ? primaryColor : '#6B7280',
                    }}>
                    {tab.label}
                  </Text>
                </AnimatedPressable>
              );
            })}
          </View>

          {/* 카테고리 아코디언 */}
          <ScrollView
            contentContainerStyle={{paddingBottom: 40}}
            showsVerticalScrollIndicator={false}>
            <View style={{paddingHorizontal: 12}}>
              {categories.map((category, index) => {
                const catTasks = allTasks.filter(
                  t => t.tab === activeTab && t.category === category,
                );
                const {completed, total} = getCategoryCompletionCount(category);
                return (
                  <CategoryAccordion
                    key={category}
                    category={category}
                    tasks={catTasks}
                    completedCount={completed}
                    totalCount={total}
                    defaultOpen={index === 0}
                    enterDelay={index * 50}
                  />
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* 구역 설정 모달 */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSettingsModalVisible(false)}>
        <View style={{flex: 1, backgroundColor: '#FFFFFF', paddingTop: 60}}>
          {/* 모달 헤더 */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingBottom: 12,
              borderBottomWidth: 1,
              borderBottomColor: '#F3F4F6',
            }}>
            <Text style={{fontSize: 17, fontWeight: '700', color: '#1F2937'}}>
              청소 설정
            </Text>
            <AnimatedPressable
              hapticType="light"
              onPress={() => setSettingsModalVisible(false)}
              style={{width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center'}}>
              <X size={20} color="#374151" />
            </AnimatedPressable>
          </View>

          <ScrollView
            contentContainerStyle={{padding: 20, paddingBottom: 40}}
            showsVerticalScrollIndicator={false}>
            {/* 스크린타임 차단 */}
            <ScreenTimeToggle />
            <View style={{height: 1, backgroundColor: '#E5E7EB', marginVertical: 12}} />

            {/* 에너지별 최대 태스크 수 */}
            <Text style={{fontSize: 15, fontWeight: '700', color: '#1F2937', marginBottom: 12}}>
              에너지별 최대 태스크 수
            </Text>
            <Text style={{fontSize: 12, color: '#9CA3AF', marginBottom: 14}}>
              에너지 레벨별로 한 번에 보여줄 태스크 수를 조절하세요
            </Text>
            {(['good', 'moderate', 'low'] as EnergyLevel[]).map(level => {
              const defaultMax = ENERGY_CONFIG[level].maxTasks;
              const custom = customMaxTasks[level];
              // daily/today 값 resolve
              const resolvedDaily = typeof custom === 'object' && custom !== null
                ? custom.daily
                : typeof custom === 'number' ? custom : defaultMax.daily;
              const resolvedToday = typeof custom === 'object' && custom !== null
                ? custom.today
                : typeof custom === 'number' ? custom : defaultMax.today;

              const renderRow = (label: string, value: number, key: 'daily' | 'today') => {
                const displayText = value >= 99 ? '무제한' : String(value);
                const otherKey = key === 'daily' ? 'today' : 'daily';
                const otherValue = key === 'daily' ? resolvedToday : resolvedDaily;
                return (
                  <View
                    key={`${level}-${key}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                      paddingHorizontal: 4,
                      paddingLeft: 20,
                    }}>
                    <Text style={{fontSize: 13, color: '#6B7280', flex: 1}}>
                      {label}
                    </Text>
                    <View style={{flexDirection: 'row', alignItems: 'center', gap: 12}}>
                      <AnimatedPressable
                        hapticType="light"
                        onPress={() => {
                          haptic.light();
                          const next = Math.max(1, value - 1);
                          setCustomMaxTasks(level, {[key]: next, [otherKey]: otherValue} as {daily: number; today: number});
                        }}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          backgroundColor: value <= 1 ? '#F3F4F6' : primaryColor + '15',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                        <Minus size={16} color={value <= 1 ? '#D1D5DB' : primaryColor} />
                      </AnimatedPressable>
                      <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937', minWidth: 40, textAlign: 'center'}}>
                        {displayText}
                      </Text>
                      <AnimatedPressable
                        hapticType="light"
                        onPress={() => {
                          haptic.light();
                          const next = Math.min(99, value + 1);
                          setCustomMaxTasks(level, {[key]: next, [otherKey]: otherValue} as {daily: number; today: number});
                        }}
                        style={{
                          width: 32, height: 32, borderRadius: 8,
                          backgroundColor: value >= 99 ? '#F3F4F6' : primaryColor + '15',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                        <Plus size={16} color={value >= 99 ? '#D1D5DB' : primaryColor} />
                      </AnimatedPressable>
                    </View>
                  </View>
                );
              };

              return (
                <View key={level} style={{marginBottom: 14}}>
                  <Text style={{fontSize: 14, fontWeight: '500', color: '#374151', marginBottom: 6, paddingHorizontal: 4}}>
                    {ENERGY_CONFIG[level].label}
                  </Text>
                  {renderRow('매일 할 일', resolvedDaily, 'daily')}
                  {renderRow('요일 할 일', resolvedToday, 'today')}
                </View>
              );
            })}

            <View style={{height: 1, backgroundColor: '#E5E7EB', marginVertical: 8}} />

            <Text style={{fontSize: 13, color: '#9CA3AF', marginBottom: 20, marginTop: 12}}>
              각 항목이 어떤 요일에 표시될지 설정하세요
            </Text>

            {/* 공간 청소 섹션 */}
            <Text style={{fontSize: 15, fontWeight: '700', color: '#059669', marginBottom: 12}}>
              공간 청소
            </Text>
            {zones.map(zone => (
              <View key={zone.id} style={{marginBottom: 20}}>
                <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8}}>
                  {zone.name}
                </Text>
                <View style={{flexDirection: 'row', gap: 6}}>
                  {DAY_LABELS.map((label, index) => {
                    const isActive = zone.dayOfWeek === index;
                    return (
                      <AnimatedPressable
                        key={index}
                        hapticType="selection"
                        onPress={() => {
                          haptic.selection();
                          updateZoneDayOfWeek(zone.id, index);
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 8,
                          borderRadius: 8,
                          alignItems: 'center',
                          backgroundColor: isActive ? primaryColor + '15' : '#F3F4F6',
                          borderWidth: isActive ? 1.5 : 0,
                          borderColor: isActive ? primaryColor : 'transparent',
                        }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? '700' : '400',
                            color: isActive ? primaryColor : '#6B7280',
                          }}>
                          {label}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>
              </View>
            ))}

            {/* 디지털 정리 섹션 */}
            <View style={{height: 1, backgroundColor: '#E5E7EB', marginVertical: 8}} />
            <Text style={{fontSize: 15, fontWeight: '700', color: '#0EA5E9', marginBottom: 12, marginTop: 8}}>
              디지털 정리
            </Text>
            {categorySchedules
              .filter(cs => cs.tab === 'digital')
              .map(cs => (
                <View key={cs.id} style={{marginBottom: 20}}>
                  <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8}}>
                    {cs.name}
                  </Text>
                  <View style={{flexDirection: 'row', gap: 6}}>
                    {DAY_LABELS.map((label, index) => {
                      const isActive = cs.dayOfWeek === index;
                      return (
                        <AnimatedPressable
                          key={index}
                          hapticType="selection"
                          onPress={() => {
                            haptic.selection();
                            updateCategoryScheduleDayOfWeek(cs.id, index);
                          }}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 8,
                            alignItems: 'center',
                            backgroundColor: isActive ? '#0EA5E9' + '15' : '#F3F4F6',
                            borderWidth: isActive ? 1.5 : 0,
                            borderColor: isActive ? '#0EA5E9' : 'transparent',
                          }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isActive ? '700' : '400',
                              color: isActive ? '#0EA5E9' : '#6B7280',
                            }}>
                            {label}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              ))}

            {/* 물건 관리 섹션 */}
            <View style={{height: 1, backgroundColor: '#E5E7EB', marginVertical: 8}} />
            <Text style={{fontSize: 15, fontWeight: '700', color: '#8B5CF6', marginBottom: 12, marginTop: 8}}>
              물건 관리
            </Text>
            {categorySchedules
              .filter(cs => cs.tab === 'belongings')
              .map(cs => (
                <View key={cs.id} style={{marginBottom: 20}}>
                  <Text style={{fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8}}>
                    {cs.name}
                  </Text>
                  <View style={{flexDirection: 'row', gap: 6}}>
                    {DAY_LABELS.map((label, index) => {
                      const isActive = cs.dayOfWeek === index;
                      return (
                        <AnimatedPressable
                          key={index}
                          hapticType="selection"
                          onPress={() => {
                            haptic.selection();
                            updateCategoryScheduleDayOfWeek(cs.id, index);
                          }}
                          style={{
                            flex: 1,
                            paddingVertical: 8,
                            borderRadius: 8,
                            alignItems: 'center',
                            backgroundColor: isActive ? '#8B5CF6' + '15' : '#F3F4F6',
                            borderWidth: isActive ? 1.5 : 0,
                            borderColor: isActive ? '#8B5CF6' : 'transparent',
                          }}>
                          <Text
                            style={{
                              fontSize: 12,
                              fontWeight: isActive ? '700' : '400',
                              color: isActive ? '#8B5CF6' : '#6B7280',
                            }}>
                            {label}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </View>
                </View>
              ))}
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

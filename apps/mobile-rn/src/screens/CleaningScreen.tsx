/**
 * CleaningScreen — 청소/정리 메인 화면
 * 에너지 적응형 마이크로태스크 + 요일별 구역 순환
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {View, Text, ScrollView, Modal} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {Settings, List, SprayCan, X} from 'lucide-react-native';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {EnergySelector} from '@/components/cleaning/EnergySelector';
import {FocusCard} from '@/components/cleaning/FocusCard';
import {TaskQueue} from '@/components/cleaning/TaskQueue';
import {StreakBar} from '@/components/cleaning/StreakBar';
import {CategoryAccordion} from '@/components/cleaning/CategoryAccordion';
import {useCleaningStore} from '@/stores/cleaningStore';
import {useTheme} from '@/theme';
import {useHaptic} from '@/hooks/useHaptic';
import {ENERGY_CONFIG} from '@/constants/cleaning-data';
import type {CleaningTab} from '@/constants/cleaning-data';

const TABS: {key: CleaningTab; label: string}[] = [
  {key: 'space', label: '공간 청소'},
  {key: 'digital', label: '디지털 정리'},
  {key: 'belongings', label: '물건 관리'},
];

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CleaningScreen() {
  const navigation = useNavigation();
  const {primaryColor} = useTheme();
  const haptic = useHaptic();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [taskListModalVisible, setTaskListModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);

  const {
    energyLevel,
    activeTab,
    focusTaskId,
    timerSeconds,
    timerTotalSeconds,
    isTimerRunning,
    setEnergyLevel,
    setActiveTab,
    setFocusTask,
    isTaskCompleted,
    startTimer,
    tickTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    zones,
    updateZoneDayOfWeek,
    getTodayZone,
    getAllTasks,
    getFilteredTasks,
    getStreak,
    getCategoryCompletionCount,
  } = useCleaningStore();

  // 타이머 interval
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => tickTimer(), 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, tickTimer]);

  const todayZone = getTodayZone();
  const allTasks = getAllTasks();
  const filteredTasks = getFilteredTasks();
  const streak = getStreak();

  // 에너지 기반 표시 제한
  const config = ENERGY_CONFIG[energyLevel];
  const visibleTasks = useMemo(() => {
    const uncompleted = filteredTasks.filter(t => !isTaskCompleted(t.id));
    return uncompleted.slice(0, config.maxTasks);
  }, [filteredTasks, config.maxTasks, isTaskCompleted]);

  // 포커스 태스크
  const focusTask = useMemo(() => {
    if (focusTaskId) {
      return filteredTasks.find(t => t.id === focusTaskId);
    }
    // 미완료 태스크 중 첫 번째
    return visibleTasks[0] ?? null;
  }, [focusTaskId, filteredTasks, visibleTasks]);

  // 큐 태스크 (포커스 제외)
  const queueTasks = useMemo(() => {
    if (!focusTask) return [];
    return visibleTasks.filter(t => t.id !== focusTask.id);
  }, [focusTask, visibleTasks]);

  // 카테고리 그룹핑 (에너지 필터 없이 전체 기준)
  const categories = useMemo(() => {
    const tabTasks = allTasks.filter(t => t.tab === activeTab);
    const catSet = new Set(tabTasks.map(t => t.category));
    return Array.from(catSet);
  }, [allTasks, activeTab]);

  const handleStartTimer = useCallback(() => {
    if (!focusTask) return;
    startTimer(focusTask.estimatedMinutes * 60);
    haptic.light();
  }, [focusTask, startTimer, haptic]);

  const handleSkip = useCallback(() => {
    resetTimer();
    if (focusTask) {
      // 다음 미완료 태스크로 이동
      const nextUncompleted = visibleTasks.find(
        t => t.id !== focusTask.id && !isTaskCompleted(t.id),
      );
      setFocusTask(nextUncompleted?.id ?? null);
    }
    haptic.selection();
  }, [focusTask, visibleTasks, isTaskCompleted, resetTimer, setFocusTask, haptic]);

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
          <AnimatedPressable
            hapticType="light"
            onPress={() => setTaskListModalVisible(true)}
            style={{width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center'}}>
            <List size={20} color="#374151" />
          </AnimatedPressable>

          <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
            <SprayCan size={18} color={primaryColor} />
            <Text style={{fontSize: 15, fontWeight: '600', color: '#1F2937'}}>
              {todayZone
                ? `오늘의 구역: ${todayZone.name} (${DAY_LABELS[todayZone.dayOfWeek]}요일)`
                : '청소/정리'}
            </Text>
          </View>

          <AnimatedPressable
            hapticType="light"
            onPress={() => setSettingsModalVisible(true)}
            style={{width: 36, height: 36, borderRadius: 10, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center'}}>
            <Settings size={18} color="#6B7280" />
          </AnimatedPressable>
        </Animated.View>

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
              timerSeconds={timerSeconds}
              timerTotalSeconds={timerTotalSeconds}
              isRunning={isTimerRunning}
              onStart={handleStartTimer}
              onPause={pauseTimer}
              onResume={resumeTimer}
              onSkip={handleSkip}
              onReset={resetTimer}
            />
          </View>
        )}

        {/* 다음 큐 */}
        {queueTasks.length > 0 && (
          <View style={{paddingHorizontal: 20, marginBottom: 8}}>
            <TaskQueue tasks={queueTasks} onSelectTask={setFocusTask} />
          </View>
        )}

        {/* 스트릭 */}
        <StreakBar streak={streak} />

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

          {/* 카테고리 아코디언 (읽기 전용) */}
          <ScrollView
            contentContainerStyle={{paddingBottom: 40}}
            showsVerticalScrollIndicator={false}>
            <View style={{paddingHorizontal: 12}}>
              {categories.map((category, index) => {
                const catTasks = allTasks.filter(t => t.tab === activeTab && t.category === category);
                const {completed, total} = getCategoryCompletionCount(category);
                return (
                  <CategoryAccordion
                    key={category}
                    category={category}
                    tasks={catTasks}
                    completedCount={completed}
                    totalCount={total}
                    isTaskCompleted={isTaskCompleted}
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
              구역 설정
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
            <Text style={{fontSize: 13, color: '#9CA3AF', marginBottom: 20}}>
              각 구역이 어떤 요일에 표시될지 설정하세요
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
          </ScrollView>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

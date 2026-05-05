/**
 * QAChecklistScreen — QA 테스트 체크리스트 (관리자 전용)
 * 릴리즈 전 수동 검증용 체크리스트 화면
 */
import React, {useCallback, useMemo, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {ArrowLeft, RotateCcw, Zap, ChevronDown} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {QA_SECTIONS} from '@/data/qaChecklist';
import {
  useQAChecklistStore,
  getProgress,
  getSectionProgress,
  type TestPlatform,
} from '@/stores/qaChecklistStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';

interface Props {
  onBack: () => void;
}

export function QAChecklistScreen({onBack}: Props) {
  const {primaryColor} = useTheme();
  const {
    checkedItems,
    platform,
    smokeOnly,
    toggleItem,
    setPlatform,
    setSmokeOnly,
    resetPlatform,
  } = useQAChecklistStore();

  const progress = useMemo(
    () => getProgress(checkedItems, platform, smokeOnly),
    [checkedItems, platform, smokeOnly],
  );

  const handleReset = useCallback(() => {
    Alert.alert(
      '초기화',
      `${platform.toUpperCase()} 체크리스트를 모두 초기화할까요?`,
      [
        {text: '취소', style: 'cancel'},
        {
          text: '초기화',
          style: 'destructive',
          onPress: resetPlatform,
        },
      ],
    );
  }, [platform, resetPlatform]);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" style={styles.backBtn}>
          <ArrowLeft size={20} color="#374151" />
        </AnimatedPressable>
        <Text style={styles.headerTitle}>QA 체크리스트</Text>
        <AnimatedPressable onPress={handleReset} hapticType="light" style={styles.resetBtn}>
          <RotateCcw size={18} color="#9CA3AF" />
        </AnimatedPressable>
      </View>

      {/* 플랫폼 탭 */}
      <View style={styles.platformTabs}>
        {(['ios', 'android'] as TestPlatform[]).map(p => (
          <AnimatedPressable
            key={p}
            onPress={() => setPlatform(p)}
            hapticType="light"
            style={[
              styles.platformTab,
              platform === p && {backgroundColor: primaryColor},
            ]}>
            <Text
              style={[
                styles.platformTabText,
                platform === p && styles.platformTabTextActive,
              ]}>
              {p === 'ios' ? 'iOS' : 'Android'}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {/* 진행률 바 */}
      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            {progress.checked} / {progress.total}
          </Text>
          <Text style={[styles.progressPercent, {color: primaryColor}]}>
            {progress.percent}%
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress.percent}%`,
                backgroundColor: progress.percent === 100 ? '#10B981' : primaryColor,
              },
            ]}
          />
        </View>
      </View>

      {/* 스모크 필터 */}
      <View style={styles.filterRow}>
        <Zap size={14} color="#F59E0B" fill="#F59E0B" />
        <Text style={styles.filterLabel}>스모크 테스트만</Text>
        <Switch
          value={smokeOnly}
          onValueChange={setSmokeOnly}
          trackColor={{false: '#E5E7EB', true: primaryColor + '80'}}
          thumbColor={smokeOnly ? primaryColor : '#F3F4F6'}
        />
      </View>

      {/* 섹션 목록 */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {QA_SECTIONS.map(section => {
          const items = smokeOnly
            ? section.items.filter(i => i.isSmoke)
            : section.items;
          if (items.length === 0) return null;

          return (
            <SectionAccordion
              key={section.id}
              sectionId={section.id}
              title={section.title}
              checkedItems={checkedItems}
              platform={platform}
              smokeOnly={smokeOnly}
              primaryColor={primaryColor}
              onToggleItem={toggleItem}>
              {items.map(item => {
                const isChecked =
                  checkedItems[`${platform}:${item.id}`] ?? false;
                return (
                  <AnimatedPressable
                    key={item.id}
                    onPress={() => toggleItem(item.id)}
                    hapticType="light"
                    style={styles.checkItem}>
                    <View
                      style={[
                        styles.checkbox,
                        isChecked && {
                          backgroundColor: primaryColor,
                          borderColor: primaryColor,
                        },
                      ]}>
                      {isChecked && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.checkLabel,
                        isChecked && styles.checkLabelDone,
                      ]}>
                      {item.label}
                    </Text>
                    {item.isSmoke && (
                      <View style={styles.smokeBadge}>
                        <Zap size={10} color="#F59E0B" fill="#F59E0B" />
                      </View>
                    )}
                  </AnimatedPressable>
                );
              })}
            </SectionAccordion>
          );
        })}
        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─── 섹션 아코디언 ─── */

interface SectionAccordionProps {
  sectionId: string;
  title: string;
  checkedItems: Record<string, boolean>;
  platform: TestPlatform;
  smokeOnly: boolean;
  primaryColor: string;
  onToggleItem: (id: string) => void;
  children: React.ReactNode;
}

function SectionAccordion({
  sectionId,
  title,
  checkedItems,
  platform,
  smokeOnly,
  primaryColor,
  children,
}: SectionAccordionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rotation = useSharedValue(0);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{rotate: `${rotation.value}deg`}],
  }));

  const toggle = useCallback(() => {
    const next = !isOpen;
    setIsOpen(next);
    rotation.value = withTiming(next ? 180 : 0, {duration: 200});
  }, [isOpen, rotation]);

  const sp = useMemo(
    () => getSectionProgress(sectionId, checkedItems, platform, smokeOnly),
    [sectionId, checkedItems, platform, smokeOnly],
  );

  const allDone = sp.total > 0 && sp.checked === sp.total;

  return (
    <View style={styles.sectionCard}>
      <AnimatedPressable
        onPress={toggle}
        hapticType="light"
        style={styles.sectionHeader}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={[styles.sectionTitle, allDone && {color: '#10B981'}]}>
            {title}
          </Text>
        </View>
        <Text
          style={[
            styles.sectionCount,
            allDone && {color: '#10B981'},
          ]}>
          {sp.checked}/{sp.total}
        </Text>
        <Animated.View style={chevronStyle}>
          <ChevronDown size={16} color="#9CA3AF" />
        </Animated.View>
      </AnimatedPressable>

      {/* 섹션 진행 바 */}
      <View style={styles.sectionProgressBg}>
        <View
          style={[
            styles.sectionProgressFill,
            {
              width: sp.total > 0 ? `${(sp.checked / sp.total) * 100}%` : '0%',
              backgroundColor: allDone ? '#10B981' : primaryColor,
            },
          ]}
        />
      </View>

      {isOpen && <View style={styles.sectionBody}>{children}</View>}
    </View>
  );
}

/* ─── 스타일 ─── */

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  resetBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 플랫폼 탭
  platformTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    padding: 3,
  },
  platformTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  platformTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  platformTabTextActive: {
    color: '#FFFFFF',
  },

  // 진행률
  progressSection: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  progressPercent: {
    fontSize: 15,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },

  // 스모크 필터
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    gap: 6,
  },
  filterLabel: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },

  // 섹션
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  sectionHeaderLeft: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginRight: 8,
  },
  sectionProgressBg: {
    height: 2,
    backgroundColor: '#F3F4F6',
  },
  sectionProgressFill: {
    height: 2,
  },
  sectionBody: {
    paddingBottom: 6,
  },

  // 체크 아이템
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: -1,
  },
  checkLabel: {
    flex: 1,
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  checkLabelDone: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  smokeBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

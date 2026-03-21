/**
 * CardReaderView — Design B: 카드 리더
 * 챕터별 순차 탐색 + 프로그레스 닷 + Prev/Next 버튼
 */
import React, {useState, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {Clock, ChevronLeft, ChevronRight} from 'lucide-react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AnimatedPressable, AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {springs} from '@/theme/animations';
import {hexWithOpacity} from '@/lib/todoUtils';
import {ADHD_TOPICS, READING_TIMES} from '@/constants/adhd-understanding-data';

const TAB_BAR_HEIGHT = 56;

function ProgressDots({
  current,
  total,
  primaryColor,
}: {
  current: number;
  total: number;
  primaryColor: string;
}) {
  return (
    <View style={styles.dotsContainer}>
      {Array.from({length: total}).map((_, i) => {
        const isActive = i === current;
        const isRead = i < current;
        return (
          <View
            key={i}
            style={[
              styles.dot,
              isActive && {
                width: 24,
                backgroundColor: primaryColor,
              },
              isRead && {
                backgroundColor: hexWithOpacity(primaryColor, 0.4),
              },
            ]}
          />
        );
      })}
    </View>
  );
}

export function CardReaderView() {
  const {primaryColor} = useTheme();
  const insets = useSafeAreaInsets();
  const [currentChapter, setCurrentChapter] = useState(0);

  const topic = ADHD_TOPICS[currentChapter];
  const isFirst = currentChapter === 0;
  const isLast = currentChapter === ADHD_TOPICS.length - 1;

  const goPrev = useCallback(() => {
    if (!isFirst) setCurrentChapter(prev => prev - 1);
  }, [isFirst]);

  const goNext = useCallback(() => {
    if (!isLast) setCurrentChapter(prev => prev + 1);
  }, [isLast]);

  return (
    <View style={styles.container}>
      {/* 챕터 인디케이터 */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.chapterIndicator}>
        <Text style={[styles.chapterNum, {color: hexWithOpacity(primaryColor, 0.2)}]}>
          {String(currentChapter + 1).padStart(2, '0')}
        </Text>
        <View>
          <Text style={styles.chapterLabel}>Chapter</Text>
          <Text style={styles.chapterTitle} numberOfLines={1}>
            {topic.title}
          </Text>
        </View>
      </Animated.View>

      {/* 읽기 시간 */}
      <View style={styles.readingTime}>
        <Clock size={14} color="#9CA3AF" />
        <Text style={styles.readingTimeText}>
          읽기 {READING_TIMES[currentChapter]}
        </Text>
      </View>

      {/* 프로그레스 닷 */}
      <ProgressDots
        current={currentChapter}
        total={ADHD_TOPICS.length}
        primaryColor={primaryColor}
      />

      {/* 카드 영역 */}
      <ScrollView
        style={styles.cardScroll}
        contentContainerStyle={styles.cardScrollContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View key={currentChapter} entering={FadeIn.duration(300)}>
          <AnimatedCard style={styles.card}>
            {topic.sections.map((section, idx) => (
              <View key={idx} style={styles.cardSection}>
                <View style={styles.cardSectionHeader}>
                  <View
                    style={[
                      styles.cardSectionDot,
                      {backgroundColor: primaryColor},
                    ]}
                  />
                  <Text style={styles.cardSectionTitle}>{section.title}</Text>
                </View>
                <Text style={styles.cardSectionText}>{section.text}</Text>
              </View>
            ))}
          </AnimatedCard>
        </Animated.View>
      </ScrollView>

      {/* 하단 네비게이션 */}
      <View style={[styles.bottomNav, {paddingBottom: 16 + TAB_BAR_HEIGHT + insets.bottom}]}>
        <AnimatedPressable
          onPress={goPrev}
          hapticType="light"
          disabled={isFirst}
          style={[styles.navBtn, isFirst && styles.navBtnDisabled]}>
          <ChevronLeft size={18} color={isFirst ? '#D1D5DB' : '#6B7280'} />
          <Text
            style={[
              styles.navBtnText,
              isFirst && styles.navBtnTextDisabled,
            ]}>
            이전
          </Text>
        </AnimatedPressable>

        <AnimatedPressable
          onPress={goNext}
          hapticType="light"
          disabled={isLast}
          style={[
            styles.navBtn,
            styles.navBtnNext,
            {backgroundColor: isLast ? '#E5E7EB' : primaryColor},
          ]}>
          <Text
            style={[
              styles.navBtnText,
              {color: isLast ? '#9CA3AF' : 'white'},
            ]}>
            {isLast ? '완료' : '다음 챕터'}
          </Text>
          {!isLast && <ChevronRight size={18} color="white" />}
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // 챕터 인디케이터
  chapterIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  chapterNum: {
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  chapterLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chapterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  // 읽기 시간
  readingTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  readingTimeText: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  // 프로그레스 닷
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  // 카드
  cardScroll: {
    flex: 1,
  },
  cardScrollContent: {
    paddingBottom: 20,
  },
  card: {
    minHeight: 400,
    padding: 20,
  },
  cardSection: {
    marginBottom: 18,
  },
  cardSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardSectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  cardSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  cardSectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
    paddingLeft: 14,
  },
  // 하단 네비게이션
  bottomNav: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 16,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: '#F1F3F5',
  },
  navBtnDisabled: {
    opacity: 0.5,
  },
  navBtnNext: {
    flex: 1,
  },
  navBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  navBtnTextDisabled: {
    color: '#D1D5DB',
  },
});

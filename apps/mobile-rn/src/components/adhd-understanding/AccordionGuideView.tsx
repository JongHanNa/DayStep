/**
 * AccordionGuideView — Design A: 아코디언 가이드
 * ScrollView + 히어로 + 프로그레스 + 5개 아코디언
 */
import React, {useState, useCallback} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import {ChevronDown} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {useTheme} from '@/theme';
import {springs, stagger} from '@/theme/animations';
import {hexWithOpacity} from '@/lib/todoUtils';
import {ADHD_TOPICS, ADHD_UNDERSTANDING_SOURCES, ADHD_UNDERSTANDING_DISCLAIMER} from '@/constants/adhd-understanding-data';
import {SourcesCitation} from '@/components/common/SourcesCitation';

function AccordionItem({
  topic,
  index,
  isOpen,
  isRead,
  onToggle,
  primaryColor,
}: {
  topic: (typeof ADHD_TOPICS)[number];
  index: number;
  isOpen: boolean;
  isRead: boolean;
  onToggle: () => void;
  primaryColor: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(stagger.normal * index)
        .duration(400)
        .springify()
        .damping(25)
        .stiffness(300)}>
      <AnimatedPressable
        onPress={onToggle}
        hapticType="light"
        style={[
          styles.accordionItem,
          isRead && styles.accordionItemRead,
        ]}>
        {/* 헤더 */}
        <View style={styles.accordionHeader}>
          <View
            style={[
              styles.accordionNum,
              {
                backgroundColor: isRead
                  ? hexWithOpacity(primaryColor, 0.15)
                  : '#F1F3F5',
              },
            ]}>
            <Text
              style={[
                styles.accordionNumText,
                isRead && {color: primaryColor},
              ]}>
              {index + 1}
            </Text>
          </View>
          <Text style={styles.accordionTitle} numberOfLines={1}>
            {topic.title}
          </Text>
          <Animated.View
            style={{
              transform: [{rotate: isOpen ? '180deg' : '0deg'}],
            }}>
            <ChevronDown size={20} color="#9CA3AF" />
          </Animated.View>
        </View>

        {/* 본문 (접힘/펼침) */}
        {isOpen && (
          <View style={styles.accordionBody}>
            {topic.sections.map((section, sIdx) => (
              <View key={sIdx} style={styles.accordionSection}>
                <Text style={styles.accordionSectionTitle}>
                  {section.title}
                </Text>
                <Text style={styles.accordionSectionText}>
                  {section.text}
                </Text>
              </View>
            ))}
          </View>
        )}
      </AnimatedPressable>
    </Animated.View>
  );
}

export function AccordionGuideView() {
  const {primaryColor} = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [readSet, setReadSet] = useState<Set<number>>(new Set());

  // 프로그레스 애니메이션
  const progressWidth = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const handleToggle = useCallback(
    (index: number) => {
      const topic = ADHD_TOPICS[index];
      if (openIndex === index) {
        setOpenIndex(null);
      } else {
        setOpenIndex(index);
        // 읽음 처리
        setReadSet(prev => {
          const next = new Set(prev);
          next.add(topic.id);
          const pct = (next.size / ADHD_TOPICS.length) * 100;
          progressWidth.value = withSpring(pct, springs.smooth);
          return next;
        });
      }
    },
    [openIndex, progressWidth],
  );

  const readCount = readSet.size;
  const progressPct = Math.round((readCount / ADHD_TOPICS.length) * 100);

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}>
      {/* 히어로 */}
      <Animated.View entering={FadeInDown.duration(400)} style={styles.hero}>
        <View
          style={[
            styles.heroBadge,
            {backgroundColor: hexWithOpacity(primaryColor, 0.1)},
          ]}>
          <Text style={[styles.heroBadgeText, {color: primaryColor}]}>
            ADHD 이해하기
          </Text>
        </View>
        <Text style={styles.heroTitle}>내 뇌를 알아가는 시간</Text>
        <Text style={styles.heroSubtitle}>
          왜 그런지 이해하면,{'\n'}자신을 탓하는 대신 방법을 찾을 수 있어요
        </Text>
      </Animated.View>

      {/* 프로그레스 */}
      <Animated.View
        entering={FadeInDown.duration(400).delay(100)}
        style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View
            style={[
              styles.progressFill,
              {backgroundColor: primaryColor},
              progressStyle,
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressText}>
            {readCount}/{ADHD_TOPICS.length} 읽음
          </Text>
          <Text style={styles.progressText}>{progressPct}%</Text>
        </View>
      </Animated.View>

      {/* 아코디언 목록 */}
      {ADHD_TOPICS.map((topic, idx) => (
        <AccordionItem
          key={topic.id}
          topic={topic}
          index={idx}
          isOpen={openIndex === idx}
          isRead={readSet.has(topic.id)}
          onToggle={() => handleToggle(idx)}
          primaryColor={primaryColor}
        />
      ))}
      <SourcesCitation sources={ADHD_UNDERSTANDING_SOURCES} disclaimer={ADHD_UNDERSTANDING_DISCLAIMER} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  // 히어로
  hero: {
    marginBottom: 20,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 12,
  },
  heroBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A1A2E',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    lineHeight: 22,
  },
  // 프로그레스
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F1F3F5',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  // 아코디언
  accordionItem: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  accordionItemRead: {
    borderLeftWidth: 3,
    borderLeftColor: '#22C55E',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accordionNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accordionNumText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  accordionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  // 본문
  accordionBody: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  accordionSection: {
    marginBottom: 12,
  },
  accordionSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  accordionSectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
});

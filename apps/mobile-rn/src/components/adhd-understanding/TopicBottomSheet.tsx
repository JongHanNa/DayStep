/**
 * TopicBottomSheet — Design C 바텀시트 (토픽 콘텐츠 표시)
 */
import React, {useCallback, useMemo, useRef, useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import BottomSheet, {BottomSheetScrollView} from '@gorhom/bottom-sheet';
import Animated, {FadeIn} from 'react-native-reanimated';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {ADHD_TOPICS, ADHD_UNDERSTANDING_SOURCES, ADHD_UNDERSTANDING_DISCLAIMER, type ADHDTopic} from '@/constants/adhd-understanding-data';
import {SourcesCitation} from '@/components/common/SourcesCitation';

interface TopicBottomSheetProps {
  selectedTopicId: number | null;
}

function HighlightedText({
  text,
  highlights,
  primaryColor,
}: {
  text: string;
  highlights: string[];
  primaryColor: string;
}) {
  if (!highlights.length) {
    return <Text style={styles.sectionText}>{text}</Text>;
  }

  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    let earliestIndex = remaining.length;
    let matchedHighlight = '';

    for (const h of highlights) {
      const idx = remaining.indexOf(h);
      if (idx !== -1 && idx < earliestIndex) {
        earliestIndex = idx;
        matchedHighlight = h;
      }
    }

    if (!matchedHighlight) {
      parts.push(remaining);
      break;
    }

    if (earliestIndex > 0) {
      parts.push(remaining.slice(0, earliestIndex));
    }

    parts.push(
      <Text
        key={keyIdx++}
        style={{color: primaryColor, fontWeight: '600'}}>
        {matchedHighlight}
      </Text>,
    );

    remaining = remaining.slice(earliestIndex + matchedHighlight.length);
  }

  return <Text style={styles.sectionText}>{parts}</Text>;
}

export function TopicBottomSheet({selectedTopicId}: TopicBottomSheetProps) {
  const {primaryColor} = useTheme();
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%', '75%'], []);

  const topic = useMemo(
    () => ADHD_TOPICS.find(t => t.id === selectedTopicId) ?? ADHD_TOPICS[0],
    [selectedTopicId],
  );

  useEffect(() => {
    // 토픽 변경 시 시트를 첫 번째 스냅포인트로 리셋
    sheetRef.current?.snapToIndex(0);
  }, [selectedTopicId]);

  return (
    <BottomSheet
      ref={sheetRef}
      index={0}
      snapPoints={snapPoints}
      handleIndicatorStyle={{backgroundColor: '#D1D5DB'}}
      backgroundStyle={styles.sheetBackground}
      enablePanDownToClose={false}>
      <BottomSheetScrollView
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}>
        <Animated.View key={topic.id} entering={FadeIn.duration(300)}>
          {/* 타이틀 */}
          <Text style={styles.sheetTitle}>{topic.title}</Text>
          <Text style={styles.sheetSubtitle}>{topic.subtitle}</Text>

          {/* 섹션들 */}
          {topic.sections.map((section, idx) => (
            <View key={idx} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View
                  style={[
                    styles.sectionDot,
                    {backgroundColor: primaryColor},
                  ]}
                />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.sectionBody}>
                <HighlightedText
                  text={section.text}
                  highlights={section.highlights}
                  primaryColor={primaryColor}
                />
              </View>
            </View>
          ))}
        </Animated.View>
        <View style={{paddingHorizontal: 20, paddingBottom: 40}}>
          <SourcesCitation sources={ADHD_UNDERSTANDING_SOURCES} disclaimer={ADHD_UNDERSTANDING_DISCLAIMER} />
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderRadius: 24,
    backgroundColor: 'white',
  },
  sheetContent: {
    padding: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
    letterSpacing: -0.38,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginBottom: 16,
  },
  section: {
    marginBottom: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  sectionBody: {
    paddingLeft: 14,
  },
  sectionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
});

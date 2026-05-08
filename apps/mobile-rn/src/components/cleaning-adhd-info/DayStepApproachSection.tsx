/**
 * IlsangtodoApproachSection — 일상투두 접근법 + 마무리 강조 메시지
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {useTheme} from '@/theme';
import {hexWithOpacity} from '@/lib/todoUtils';
import {DAYSTEP_APPROACH_DATA} from '@/constants/cleaning-adhd-info-data';
import {sectionStyles} from '@/components/sleep-adhd-info/sectionStyles';

export function IlsangtodoApproachSection() {
  const {primaryColor} = useTheme();

  // 마지막 문단을 강조 박스로 표시
  const lastParagraph =
    DAYSTEP_APPROACH_DATA.paragraphs[
      DAYSTEP_APPROACH_DATA.paragraphs.length - 1
    ];
  const bodyParagraphs = DAYSTEP_APPROACH_DATA.paragraphs.slice(0, -1);

  return (
    <AnimatedCard enterDelay={600} style={sectionStyles.card}>
      <Text style={[sectionStyles.sectionTitle, {color: primaryColor}]}>
        {DAYSTEP_APPROACH_DATA.title}
      </Text>
      {bodyParagraphs.map((p, i) => (
        <Text key={i} style={sectionStyles.paragraph}>
          {p}
        </Text>
      ))}

      {/* 핵심 메시지 강조 */}
      <View
        style={[
          styles.emphasisBox,
          {backgroundColor: hexWithOpacity(primaryColor, 0.06)},
        ]}>
        <Text style={[styles.emphasisText, {color: primaryColor}]}>
          {lastParagraph}
        </Text>
      </View>
    </AnimatedCard>
  );
}

const styles = StyleSheet.create({
  emphasisBox: {
    borderRadius: 12,
    padding: 16,
    marginTop: 4,
  },
  emphasisText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
});

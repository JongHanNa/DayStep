/**
 * CoachmarkBubble — 말풍선 콘텐츠 카드 (컨트롤 없음)
 *
 * 컨트롤은 CoachmarkOverlay가 화면 외곽(상단 헤더 + 하단 CTA)에 배치.
 * Bubble은 title / body / rationale + 작은 step indicator만 담는다.
 */
import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useTheme, radius, shadows, spacing} from '@/theme';

interface CoachmarkBubbleProps {
  i18nKey: string;
  currentIndex: number;
  totalSteps: number;
}

export function CoachmarkBubble({
  i18nKey,
  currentIndex,
  totalSteps,
}: CoachmarkBubbleProps) {
  const {t} = useTranslation();
  const {colors, primaryColor} = useTheme();

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: colors.surface},
        shadows.lg,
      ]}>
      <View style={styles.header}>
        <Text style={[styles.title, {color: colors.text}]}>
          {t(`${i18nKey}.title`)}
        </Text>
        <Text style={[styles.indicator, {color: colors.textTertiary}]}>
          {t('onboarding.stepIndicator', {
            current: currentIndex + 1,
            total: totalSteps,
          })}
        </Text>
      </View>
      <Text style={[styles.body, {color: colors.textSecondary}]}>
        {t(`${i18nKey}.body`)}
      </Text>
      <Text style={[styles.rationale, {color: primaryColor}]}>
        {t(`${i18nKey}.rationale`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  indicator: {
    fontSize: 12,
    fontWeight: '600',
    paddingTop: 4,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
  rationale: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
});

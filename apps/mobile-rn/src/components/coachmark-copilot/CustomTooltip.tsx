/**
 * react-native-copilot용 커스텀 툴팁 컴포넌트
 *
 * PoC A와 동일한 디자인 토큰/i18n 키를 사용해 시각 비교가 공정하도록 함.
 */
import React from 'react';
import {View, Text, Pressable, StyleSheet} from 'react-native';
import {useTranslation} from 'react-i18next';
import {useCopilot} from 'react-native-copilot';
import {useTheme, radius, shadows, spacing, hitSlop} from '@/theme';

// react-native-copilot가 step.text에 i18n key를 그대로 넣는 경우 처리
function parseI18nKey(text: string): string {
  return text;
}

export function CustomTooltip() {
  const {t} = useTranslation();
  const {colors, primaryColor} = useTheme();
  const {currentStep, totalStepsNumber, goToNext, goToPrev, stop} = useCopilot();

  if (!currentStep) return null;

  const i18nKey = parseI18nKey(currentStep.text);
  const isFirst = currentStep.order === 1;
  const isLast = currentStep.order === totalStepsNumber;

  return (
    <View
      style={[
        styles.container,
        {backgroundColor: colors.surface},
        shadows.lg,
      ]}>
      <Text style={[styles.title, {color: colors.text}]}>
        {t(`${i18nKey}.title`)}
      </Text>
      <Text style={[styles.body, {color: colors.textSecondary}]}>
        {t(`${i18nKey}.body`)}
      </Text>
      <Text style={[styles.rationale, {color: primaryColor}]}>
        {t(`${i18nKey}.rationale`)}
      </Text>

      <View style={styles.controls}>
        <Pressable
          onPress={() => stop()}
          hitSlop={hitSlop.md}
          style={({pressed}) => [styles.skipBtn, {opacity: pressed ? 0.5 : 1}]}>
          <Text style={[styles.skipText, {color: colors.textTertiary}]}>
            {t('onboarding.skip')}
          </Text>
        </Pressable>

        <Text style={[styles.indicator, {color: colors.textTertiary}]}>
          {t('onboarding.stepIndicator', {
            current: currentStep.order,
            total: totalStepsNumber,
          })}
        </Text>

        <View style={styles.rightControls}>
          {!isFirst && (
            <Pressable
              onPress={() => goToPrev()}
              hitSlop={hitSlop.md}
              style={({pressed}) => [
                styles.prevBtn,
                {borderColor: colors.border, opacity: pressed ? 0.6 : 1},
              ]}>
              <Text style={[styles.prevText, {color: colors.text}]}>
                {t('onboarding.previous')}
              </Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => (isLast ? stop() : goToNext())}
            hitSlop={hitSlop.md}
            style={({pressed}) => [
              styles.nextBtn,
              {backgroundColor: primaryColor, opacity: pressed ? 0.85 : 1},
            ]}>
            <Text style={styles.nextText}>
              {isLast ? t('onboarding.done') : t('onboarding.next')}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: {fontSize: 18, fontWeight: '700', lineHeight: 24},
  body: {fontSize: 15, lineHeight: 22},
  rationale: {fontSize: 13, lineHeight: 20, fontWeight: '500', marginTop: spacing.xs},
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
  },
  skipBtn: {paddingVertical: spacing.xs, paddingRight: spacing.sm},
  skipText: {fontSize: 13, fontWeight: '500'},
  indicator: {fontSize: 12, fontWeight: '600'},
  rightControls: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  prevBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
    borderWidth: 1,
  },
  prevText: {fontSize: 13, fontWeight: '500'},
  nextBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.button,
  },
  nextText: {color: '#FFFFFF', fontSize: 14, fontWeight: '600'},
});

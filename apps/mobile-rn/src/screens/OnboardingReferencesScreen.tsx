/**
 * OnboardingReferencesScreen — 참고 문헌 + 교육용 디스클레이머
 *
 * 진입 경로:
 *  1) 코치마크 마지막 step "더 알아보기" 버튼
 *  2) 설정 → 도움말 → 참고 문헌 / 디스클레이머
 */
import React from 'react';
import {View, Text, ScrollView, Pressable, StyleSheet} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {ChevronLeft, BookOpen, Info} from 'lucide-react-native';
import {ScreenContainer} from '@/components/core';
import {useTheme, radius, shadows, spacing, hitSlop} from '@/theme';

const DISCLAIMER_BG = '#FEF3C7';
const DISCLAIMER_BORDER = '#F59E0B';
const DISCLAIMER_TITLE = '#B45309';
const DISCLAIMER_BODY = '#92400E';

export default function OnboardingReferencesScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<any>();
  const {colors, primaryColor} = useTheme();

  const items = (t('onboarding.references.items', {returnObjects: true}) as string[]) ?? [];

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={hitSlop.lg}
          style={({pressed}) => [
            styles.backBtn,
            {backgroundColor: colors.backgroundSecondary, opacity: pressed ? 0.6 : 1},
          ]}>
          <ChevronLeft size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, {color: colors.text}]}>
          {t('onboarding.references.title')}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}>
        {/* 디스클레이머 박스 */}
        <View style={styles.disclaimerBox}>
          <View style={styles.disclaimerHeader}>
            <Info size={18} color={DISCLAIMER_TITLE} />
            <Text style={styles.disclaimerTitle}>
              {t('onboarding.disclaimer.title')}
            </Text>
          </View>
          <Text style={styles.disclaimerBody}>
            {t('onboarding.disclaimer.body')}
          </Text>
        </View>

        {/* 참고 문헌 */}
        <View
          style={[
            styles.refsBox,
            {backgroundColor: colors.surface, borderColor: colors.border},
            shadows.sm,
          ]}>
          <View style={styles.refsHeader}>
            <BookOpen size={18} color={primaryColor} />
            <Text style={[styles.refsTitle, {color: colors.text}]}>
              {t('onboarding.references.title')}
            </Text>
          </View>
          <Text style={[styles.refsIntro, {color: colors.textSecondary}]}>
            {t('onboarding.references.intro')}
          </Text>
          <View style={styles.refList}>
            {items.map((item, idx) => (
              <Text
                key={idx}
                style={[styles.refItem, {color: colors.textSecondary}]}>
                {item}
              </Text>
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 36,
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing['4xl'],
    gap: spacing.lg,
  },
  disclaimerBox: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: DISCLAIMER_BG,
    borderColor: DISCLAIMER_BORDER,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DISCLAIMER_TITLE,
  },
  disclaimerBody: {
    fontSize: 13,
    lineHeight: 20,
    color: DISCLAIMER_BODY,
  },
  refsBox: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  refsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  refsIntro: {
    fontSize: 13,
    lineHeight: 20,
  },
  refList: {
    gap: spacing.md,
  },
  refItem: {
    fontSize: 12,
    lineHeight: 18,
  },
});

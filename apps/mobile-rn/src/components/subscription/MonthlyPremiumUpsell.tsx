/**
 * MonthlyPremiumUpsell — 월간 캘린더 프리미엄 업셀 화면
 * 무료 사용자가 "월" 뷰 선택 시 표시
 * 폰 목업 + 미니 캘린더 + CTA 버튼
 */
import React from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import Animated, {FadeInDown} from 'react-native-reanimated';
import {Crown, Sparkles, ChevronRight} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {LiquidGlassMenu} from '@/components/native';
import {PhoneMockup} from './PhoneMockup';
import {MiniCalendarPreview} from './MiniCalendarPreview';
import {useTheme} from '@/theme';
import {fixedColors} from '@/theme/colors';
import {Calendar} from 'lucide-react-native';

interface MonthlyPremiumUpsellProps {
  onUpgrade: () => void;
  menuItems: {title: string; key: string}[];
  onMenuSelect: (key: string) => void;
}

export function MonthlyPremiumUpsell({
  onUpgrade,
  menuItems,
  onMenuSelect,
}: MonthlyPremiumUpsellProps) {
  const {primaryColor} = useTheme();

  const ctaText = 'Pro 구독하기';

  return (
    <View style={styles.root}>
      {/* 상단 메뉴 (기존 LiquidGlassMenu 유지) */}
      <View style={styles.menuBar}>
        <LiquidGlassMenu
          systemIconName="calendar"
          iconColor="#1F2937"
          size={36}
          menuItems={menuItems}
          onSelect={onMenuSelect}
          fallbackIcon={<Calendar size={18} color="#1F2937" />}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Pro 배지 */}
        <Animated.View
          entering={FadeInDown.delay(0).duration(500)}
          style={styles.badgeContainer}>
          <View style={styles.badge}>
            <Crown size={14} color={fixedColors.premiumGold} />
            <Text style={styles.badgeText}>Pro 기능</Text>
          </View>
        </Animated.View>

        {/* 폰 목업 + 미니 캘린더 */}
        <Animated.View
          entering={FadeInDown.delay(100).duration(500)}
          style={styles.mockupContainer}>
          <PhoneMockup>
            <MiniCalendarPreview primaryColor={primaryColor} />
          </PhoneMockup>
        </Animated.View>

        {/* 타이틀 */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={styles.title}>월간 캘린더 보기</Text>
          <Text style={styles.description}>
            한 달의 일정을 한눈에 확인하고{'\n'}
            체계적으로 계획을 세워보세요
          </Text>
        </Animated.View>

        {/* 기능 하이라이트 */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          style={styles.features}>
          <FeatureItem text="월간 일정 한눈에 보기" />
          <FeatureItem text="날짜별 할일·일정 통합 뷰" />
          <FeatureItem text="드래그로 일정 이동" />
        </Animated.View>

        {/* CTA 버튼 */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          style={styles.ctaContainer}>
          <AnimatedPressable onPress={onUpgrade} style={styles.ctaButton}>
            <Sparkles size={18} color="#FFFFFF" />
            <Text style={styles.ctaText}>{ctaText}</Text>
            <ChevronRight size={16} color="#FFFFFF" />
          </AnimatedPressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function FeatureItem({text}: {text: string}) {
  return (
    <View style={styles.featureRow}>
      <View style={styles.featureCheck}>
        <Text style={styles.featureCheckText}>✓</Text>
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  menuBar: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    zIndex: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  badgeContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: fixedColors.premiumGold,
  },
  mockupContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  features: {
    alignSelf: 'stretch',
    gap: 10,
    marginBottom: 28,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCheckText: {
    fontSize: 12,
    fontWeight: '700',
    color: fixedColors.premiumGold,
  },
  featureText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  ctaContainer: {
    alignSelf: 'stretch',
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: fixedColors.premiumGold,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: fixedColors.premiumGold,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

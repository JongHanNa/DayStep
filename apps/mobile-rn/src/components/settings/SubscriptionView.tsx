/**
 * SubscriptionView — 시안 C: Premium Paywall (Free) + 기존 관리 화면 (Pro)
 */
import React, {useCallback, useEffect, useState} from 'react';
import {
  View,
  Text,
  Linking,
  Alert,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  StatusBar,
} from 'react-native';
import Purchases, {type PurchasesPackage} from 'react-native-purchases';
import Config from 'react-native-config';
import LinearGradient from 'react-native-linear-gradient';
import {useSafeAreaInsets, SafeAreaView} from 'react-native-safe-area-context';
import {AnimatedPressable, AnimatedCard} from '@/components/core';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import type {Platform as SubPlatform} from '@/stores/subscriptionStore';
import {useAuthStore} from '@/stores/authStore';
import {useTheme} from '@/theme';
import {useUsageStats} from '@/hooks/useUsageStats';
import type {UserUsageStats} from '@/hooks/useUsageStats';
import {
  ENTITY_LIMIT_MAP,
  type UsageEntityType,
} from '@/lib/featureFlags';
import {PAYWALL_COMPARISON_FEATURES} from '@daystep/shared-core/constants';
import {
  purchaseSelectedPackage,
  restorePurchases,
  showManageSubscriptions,
} from '@/lib/revenueCat';
import {ArrowLeft, Crown, Check, X} from 'lucide-react-native';

interface SubscriptionViewProps {
  onBack: () => void;
}

// ─── 사용량 비교 테이블 데이터 (단일 소스: @daystep/shared-core) ──────

// entity !== null 인 항목만 usage table에 사용 (통계&인사이트는 불리언 행으로 별도 처리)
const USAGE_FEATURES = PAYWALL_COMPARISON_FEATURES.filter(
  f => f.entity !== null,
).map(f => ({...f, entity: f.entity as UsageEntityType}));

const entityToField: Record<UsageEntityType, keyof UserUsageStats> = {
  todo: 'todoCount',
  habit: 'habitCount',
  project: 'projectCount',
  note: 'noteCount',
  contact: 'contactCount',
  cherished_people: 'cherishedPeopleCount',
  care_interaction: 'careInteractionCount',
};

// ─── 헬퍼 함수 (Pro 뷰용) ────────────────────────────

function getPlatformLabel(platform: SubPlatform | undefined) {
  switch (platform) {
    case 'web':
      return {label: '웹 결제 (Paddle)', icon: '🌐', bg: '#DBEAFE', color: '#1D4ED8'};
    case 'ios':
      return {label: 'App Store', icon: '🍎', bg: '#F3F4F6', color: '#374151'};
    case 'android':
      return {label: 'Play Store', icon: '🤖', bg: '#DCFCE7', color: '#15803D'};
    default:
      return null;
  }
}

function getPlanInfo(productId: string | undefined) {
  switch (productId) {
    case 'pro_yearly':
      return {name: '연간 플랜', price: '₩44,000/년', sub: '월 ₩3,667'};
    case 'pro_monthly':
      return {name: '월간 플랜', price: '₩5,500/월', sub: null};
    default:
      return {name: 'Pro', price: '', sub: null};
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'active':
      return '활성';
    case 'trial':
      return '트라이얼';
    case 'cancelled':
      return '취소 예약';
    case 'expired':
      return '만료';
    case 'paused':
      return '일시 중지';
    default:
      return 'Free';
  }
}

async function handleManageSubscription(platform: SubPlatform | undefined) {
  if (platform === 'ios') {
    await showManageSubscriptions();
    return;
  }
  const webBase = Config.WEB_BASE_URL ?? 'https://daystep.app';
  let url: string;
  switch (platform) {
    case 'android':
      url = 'https://play.google.com/store/account/subscriptions';
      break;
    default:
      url = `${webBase}/adhd/settings/subscription`;
  }
  Linking.openURL(url);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ─── 메인 컴포넌트 ───────────────────────────────────

export function SubscriptionView({onBack}: SubscriptionViewProps) {
  const {primaryColor} = useTheme();
  const {user} = useAuthStore();
  const {
    subscriptionInfo,
    hasActiveSubscription,
    isInTrial,
    daysRemainingInTrial,
    loading,
    error,
    fetchSubscription,
    applyRevenueCatPurchase,
    clearError,
  } = useSubscriptionStore();

  const insets = useSafeAreaInsets();
  const {stats, isLoading: usageLoading} = useUsageStats();

  const [selectedPlan, setSelectedPlan] = useState<'yearly' | 'monthly'>(
    'yearly',
  );
  const [showComparison, setShowComparison] = useState(false);
  const [monthlyPkg, setMonthlyPkg] = useState<PurchasesPackage | null>(null);
  const [annualPkg, setAnnualPkg] = useState<PurchasesPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [offeringsLoading, setOfferingsLoading] = useState(true);
  const [offeringsError, setOfferingsError] = useState<string | null>(null);


  useEffect(() => {
    if (user?.id) fetchSubscription(user.id);
  }, [user?.id, fetchSubscription]);

  // RevenueCat offerings 로딩 (재시도 가능)
  const loadOfferings = useCallback(async () => {
    setOfferingsLoading(true);
    setOfferingsError(null);
    try {
      const offerings = await Purchases.getOfferings();
      setMonthlyPkg(offerings.current?.monthly ?? null);
      setAnnualPkg(offerings.current?.annual ?? null);
      if (!offerings.current) {
        setOfferingsError('구독 상품을 불러올 수 없습니다');
        console.warn('[RevenueCat] No current offering found. Keys:', JSON.stringify(Object.keys(offerings)));
      }
    } catch (e: any) {
      setOfferingsError(e?.message ?? String(e));
      console.warn('[RevenueCat] getOfferings error:', e);
    } finally {
      setOfferingsLoading(false);
    }
  }, []);

  useEffect(() => { loadOfferings(); }, [loadOfferings]);

  const status = subscriptionInfo?.status ?? 'free';
  const subPlatform = subscriptionInfo?.platform;
  const platformLabel = getPlatformLabel(subPlatform);
  const planInfo = getPlanInfo(subscriptionInfo?.productId);

  // ── 공통 렌더 헬퍼 (Free Paywall A/B/C 테스트용) ──

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'yearly' ? annualPkg : monthlyPkg;
    if (!pkg) return;
    setPurchasing(true);
    const result = await purchaseSelectedPackage(pkg);
    setPurchasing(false);
    if (result.success) {
      const active = result.customerInfo.entitlements.active;
      if (active && Object.keys(active).length > 0) {
        applyRevenueCatPurchase(active);
      }
      if (user?.id) {
        setTimeout(() => fetchSubscription(user.id), 5000);
      }
    } else if (!result.cancelled) {
      Alert.alert('구매 실패', '결제 중 문제가 발생했습니다. 다시 시도해 주세요.');
    }
  };

  const handleRestore = async () => {
    const info = await restorePurchases();
    if (info) {
      const active = info.entitlements.active;
      if (active && Object.keys(active).length > 0) {
        applyRevenueCatPurchase(active);
      }
      if (user?.id) {
        setTimeout(() => fetchSubscription(user.id), 5000);
      }
    }
  };


  const renderPaywallHero = () => (
    <View style={styles.heroSection}>
      <View style={styles.crownCircle}>
        <Crown size={32} color="#F59E0B" strokeWidth={2.5} />
      </View>
      <Text style={styles.heroTitle}>DayStep Pro</Text>
      <Text style={styles.heroSubtitle}>하루 관리의 모든 것, 제한 없이</Text>
    </View>
  );

  const renderPaywallTable = () => (
    <View style={styles.usageTable}>
      <View style={styles.usageHeaderRow}>
        <Text style={[styles.usageCell, styles.usageCellFirst, styles.usageHeaderText]}>기능</Text>
        <Text style={[styles.usageCell, styles.usageHeaderText]}>Free</Text>
        <Text style={[styles.usageCell, styles.usageHeaderText, {color: '#F59E0B'}]}>♛ Pro</Text>
      </View>
      {USAGE_FEATURES.map((feat, i) => {
        const current = stats[entityToField[feat.entity]] ?? 0;
        const limit = ENTITY_LIMIT_MAP[feat.entity];
        const isOver = current > limit;
        return (
          <View key={feat.entity} style={[styles.usageRow, i % 2 === 0 && {backgroundColor: 'rgba(255,255,255,0.03)'}]}>
            <Text style={[styles.usageCell, styles.usageCellFirst, styles.usageCellName]}>{feat.name}</Text>
            <Text style={[styles.usageCell, styles.usageCellValue, isOver && {color: '#F87171'}]}>{current}/{limit}{feat.unit}</Text>
            <Text style={[styles.usageCell, styles.usageCellPro]}>무제한</Text>
          </View>
        );
      })}
      <View style={[styles.usageRow, USAGE_FEATURES.length % 2 === 0 && {backgroundColor: 'rgba(255,255,255,0.03)'}]}>
        <Text style={[styles.usageCell, styles.usageCellFirst, styles.usageCellName]}>통계&인사이트</Text>
        <View style={styles.usageCell}><X size={14} color="#64748B" strokeWidth={2.5} /></View>
        <View style={styles.usageCell}><Check size={14} color="#60A5FA" strokeWidth={2.5} /></View>
      </View>
    </View>
  );

  const renderPaywallPlans = () => {
    if (offeringsLoading) {
      return (
        <View style={styles.offeringsStatusBox}>
          <ActivityIndicator size="small" color="#60A5FA" />
          <Text style={styles.offeringsStatusText}>구독 상품 불러오는 중...</Text>
        </View>
      );
    }
    if (offeringsError && !monthlyPkg && !annualPkg) {
      return (
        <View style={styles.offeringsStatusBox}>
          <Text style={styles.offeringsErrorText}>{offeringsError}</Text>
          <AnimatedPressable onPress={loadOfferings} hapticType="light" scaleValue={0.95}>
            <View style={styles.offeringsRetryBtn}>
              <Text style={styles.offeringsRetryText}>다시 시도</Text>
            </View>
          </AnimatedPressable>
        </View>
      );
    }
    return (
    <View style={styles.planSelector}>
      <AnimatedPressable onPress={() => setSelectedPlan('monthly')} hapticType="light" scaleValue={0.97}
        style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}>
        <View style={styles.planRadio}>
          {selectedPlan === 'monthly' && <View style={styles.planRadioInner} />}
        </View>
        <View style={{flex: 1}}>
          <Text style={styles.planName}>월간</Text>
          <Text style={styles.planPrice}>{monthlyPkg?.product.priceString ?? '₩5,500'}/월</Text>
        </View>
      </AnimatedPressable>
      <AnimatedPressable onPress={() => setSelectedPlan('yearly')} hapticType="light" scaleValue={0.97}
        style={[styles.planCard, selectedPlan === 'yearly' && styles.planCardSelected]}>
        <View style={styles.planRadio}>
          {selectedPlan === 'yearly' && <View style={styles.planRadioInner} />}
        </View>
        <View style={{flex: 1}}>
          <View style={styles.planNameRow}>
            <Text style={styles.planName}>연간</Text>
            <View style={styles.popularBadge}><Text style={styles.popularBadgeText}>인기</Text></View>
          </View>
          <Text style={styles.planPrice}>{annualPkg?.product.priceString ?? '₩44,000'}/년</Text>
          <Text style={styles.planSub}>월 ₩3,667 · 33% 할인</Text>
        </View>
      </AnimatedPressable>
    </View>
    );
  };

  const renderPaywallCta = () => {
    const ctaDisabled = purchasing || offeringsLoading || (!monthlyPkg && !annualPkg);
    return (
    <AnimatedPressable onPress={handlePurchase} hapticType="medium" scaleValue={0.96} disabled={ctaDisabled}>
      <View style={[styles.ctaBtn, ctaDisabled && {backgroundColor: '#94A3B8'}]}>
        {purchasing ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Crown size={18} color="#FFFFFF" strokeWidth={2} />
        )}
        <Text style={styles.ctaBtnText}>
          {purchasing ? '처리 중...' : offeringsLoading ? '불러오는 중...' : (!monthlyPkg && !annualPkg) ? '구독 상품 로딩 실패' : '구독하기'}
        </Text>
      </View>
    </AnimatedPressable>
    );
  };

  const renderPaywallFooter = () => (
    <View style={styles.footerLinks}>
      <AnimatedPressable onPress={handleRestore} hapticType="light" scaleValue={0.95}>
        <Text style={styles.footerLink}>구독 복원</Text>
      </AnimatedPressable>
      <Text style={styles.footerDot}>·</Text>
      <AnimatedPressable onPress={() => Linking.openURL('https://daystep.app/terms')} hapticType="light" scaleValue={0.95}>
        <Text style={styles.footerLink}>이용약관</Text>
      </AnimatedPressable>
      <Text style={styles.footerDot}>·</Text>
      <AnimatedPressable onPress={() => Linking.openURL('https://daystep.app/privacy')} hapticType="light" scaleValue={0.95}>
        <Text style={styles.footerLink}>개인정보처리방침</Text>
      </AnimatedPressable>
    </View>
  );

  // ── 로딩 상태 ──
  if (loading && !subscriptionInfo) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, {backgroundColor: '#FFFFFF'}]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
            <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
          </AnimatedPressable>
          <Text style={styles.title}>구독 관리</Text>
          <View style={{width: 24}} />
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>구독 정보를 불러오는 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── 에러 상태 ──
  if (error && !subscriptionInfo) {
    return (
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, {backgroundColor: '#FFFFFF'}]}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
            <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
          </AnimatedPressable>
          <Text style={styles.title}>구독 관리</Text>
          <View style={{width: 24}} />
        </View>
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>구독 정보를 불러올 수 없습니다</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <AnimatedPressable
            onPress={() => {
              clearError();
              if (user?.id) fetchSubscription(user.id);
            }}
            hapticType="light"
            scaleValue={0.95}
            style={[styles.retryBtn, {borderColor: primaryColor}]}>
            <Text style={[styles.retryBtnText, {color: primaryColor}]}>
              다시 시도
            </Text>
          </AnimatedPressable>
        </View>
      </SafeAreaView>
    );
  }

  // ══════════════════════════════════════════════════
  // Free 사용자 → 시안 C (Premium Paywall)
  // ══════════════════════════════════════════════════
  if (!hasActiveSubscription) {
    return (
      <View style={{flex: 1, backgroundColor: '#0F172A'}}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={['#1E293B', '#0F172A']}
          start={{x: 0, y: 0}}
          end={{x: 0, y: 1}}
          style={StyleSheet.absoluteFillObject}
        />
        {/* 닫기 버튼 */}
        <AnimatedPressable
          onPress={onBack}
          hapticType="light"
          scaleValue={0.9}
          style={[styles.closeBtn, {top: insets.top + 16}]}>
          <X size={20} color="#94A3B8" strokeWidth={2} />
        </AnimatedPressable>

        <SafeAreaView style={{flex: 1}} edges={['top', 'bottom']}>
        <View style={{flex: 1, paddingTop: 40}}>
        <ScrollView
          style={{flex: 1}}
          contentContainerStyle={[styles.paywallScroll, {paddingBottom: 16}]}
          showsVerticalScrollIndicator={false}>
          {/* ── 히어로 ── */}
          <View style={styles.heroSection}>
            {/* 골드 왕관 원형 */}
            <View style={styles.crownCircle}>
              <Crown size={32} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <Text style={styles.heroTitle}>DayStep Pro</Text>
            <Text style={styles.heroSubtitle}>
              하루 관리의 모든 것, 제한 없이
            </Text>
          </View>

          {/* ── 사용량 비교 테이블 ── */}
          <View style={styles.usageTable}>
            {/* 헤더 */}
            <View style={styles.usageHeaderRow}>
              <Text style={[styles.usageCell, styles.usageCellFirst, styles.usageHeaderText]}>
                기능
              </Text>
              <Text style={[styles.usageCell, styles.usageHeaderText]}>
                Free
              </Text>
              <Text style={[styles.usageCell, styles.usageHeaderText, {color: '#F59E0B'}]}>
                ♛ Pro
              </Text>
            </View>

            {/* 사용량 행 */}
            {USAGE_FEATURES.map((feat, i) => {
              const current = stats[entityToField[feat.entity]] ?? 0;
              const limit = ENTITY_LIMIT_MAP[feat.entity];
              const isOver = current > limit;

              return (
                <View
                  key={feat.entity}
                  style={[
                    styles.usageRow,
                    i % 2 === 0 && {backgroundColor: 'rgba(255,255,255,0.03)'},
                  ]}>
                  <Text style={[styles.usageCell, styles.usageCellFirst, styles.usageCellName]}>
                    {feat.name}
                  </Text>
                  <Text
                    style={[
                      styles.usageCell,
                      styles.usageCellValue,
                      isOver && {color: '#F87171'},
                    ]}>
                    {current}/{limit}
                    {feat.unit}
                  </Text>
                  <Text style={[styles.usageCell, styles.usageCellPro]}>
                    무제한
                  </Text>
                </View>
              );
            })}

            {/* 통계&인사이트 행 */}
            <View
              style={[
                styles.usageRow,
                USAGE_FEATURES.length % 2 === 0 && {
                  backgroundColor: 'rgba(255,255,255,0.03)',
                },
              ]}>
              <Text style={[styles.usageCell, styles.usageCellFirst, styles.usageCellName]}>
                통계&인사이트
              </Text>
              <View style={styles.usageCell}>
                <X size={14} color="#64748B" strokeWidth={2.5} />
              </View>
              <View style={styles.usageCell}>
                <Check size={14} color="#60A5FA" strokeWidth={2.5} />
              </View>
            </View>
          </View>

          {/* ── 플랜 셀렉터 ── */}
          {offeringsLoading ? (
            <View style={styles.offeringsStatusBox}>
              <ActivityIndicator size="small" color="#60A5FA" />
              <Text style={styles.offeringsStatusText}>구독 상품 불러오는 중...</Text>
            </View>
          ) : offeringsError && !monthlyPkg && !annualPkg ? (
            <View style={styles.offeringsStatusBox}>
              <Text style={styles.offeringsErrorText}>{offeringsError}</Text>
              <AnimatedPressable onPress={loadOfferings} hapticType="light" scaleValue={0.95}>
                <View style={styles.offeringsRetryBtn}>
                  <Text style={styles.offeringsRetryText}>다시 시도</Text>
                </View>
              </AnimatedPressable>
            </View>
          ) : (
          <View style={styles.planSelector}>
            {/* 월간 */}
            <AnimatedPressable
              onPress={() => setSelectedPlan('monthly')}
              hapticType="light"
              scaleValue={0.97}
              style={[
                styles.planCard,
                selectedPlan === 'monthly' && styles.planCardSelected,
              ]}>
              <View style={styles.planRadio}>
                {selectedPlan === 'monthly' && (
                  <View style={styles.planRadioInner} />
                )}
              </View>
              <View style={{flex: 1}}>
                <Text style={styles.planName}>월간</Text>
                <Text style={styles.planPrice}>
                  {monthlyPkg?.product.priceString ?? '₩5,500'}/월
                </Text>
              </View>
            </AnimatedPressable>

            {/* 연간 */}
            <AnimatedPressable
              onPress={() => setSelectedPlan('yearly')}
              hapticType="light"
              scaleValue={0.97}
              style={[
                styles.planCard,
                selectedPlan === 'yearly' && styles.planCardSelected,
              ]}>
              <View style={styles.planRadio}>
                {selectedPlan === 'yearly' && (
                  <View style={styles.planRadioInner} />
                )}
              </View>
              <View style={{flex: 1}}>
                <View style={styles.planNameRow}>
                  <Text style={styles.planName}>연간</Text>
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularBadgeText}>인기</Text>
                  </View>
                </View>
                <Text style={styles.planPrice}>
                  {annualPkg?.product.priceString ?? '₩44,000'}/년
                </Text>
                <Text style={styles.planSub}>월 ₩3,667 · 33% 할인</Text>
              </View>
            </AnimatedPressable>
          </View>
          )}


        </ScrollView>

        {/* ── CTA + Footer ── */}
        <View style={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: 16,
          backgroundColor: '#0F172A',
        }}>
          {/* ── CTA 버튼 ── */}
          <AnimatedPressable
            onPress={handlePurchase}
            hapticType="medium"
            scaleValue={0.96}
            disabled={purchasing || offeringsLoading || (!monthlyPkg && !annualPkg)}>
            <View style={[styles.ctaBtn, (purchasing || offeringsLoading || (!monthlyPkg && !annualPkg)) && {backgroundColor: '#94A3B8'}]}>
              {purchasing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Crown size={18} color="#FFFFFF" strokeWidth={2} />
              )}
              <Text style={styles.ctaBtnText}>
                {purchasing ? '처리 중...' : offeringsLoading ? '불러오는 중...' : (!monthlyPkg && !annualPkg) ? '구독 상품 로딩 실패' : '구독하기'}
              </Text>
            </View>
          </AnimatedPressable>

          {/* ── 하단 링크 ── */}
          <View style={styles.footerLinks}>
            <AnimatedPressable
              onPress={async () => {
                const info = await restorePurchases();
                if (info) {
                  const active = info.entitlements.active;
                  if (active && Object.keys(active).length > 0) {
                    applyRevenueCatPurchase(active);
                  }
                  if (user?.id) {
                    setTimeout(() => fetchSubscription(user.id), 5000);
                  }
                }
              }}
              hapticType="light"
              scaleValue={0.95}>
              <Text style={styles.footerLink}>구독 복원</Text>
            </AnimatedPressable>
            <Text style={styles.footerDot}>·</Text>
            <AnimatedPressable
              onPress={() =>
                Linking.openURL('https://daystep.app/terms')
              }
              hapticType="light"
              scaleValue={0.95}>
              <Text style={styles.footerLink}>이용약관</Text>
            </AnimatedPressable>
            <Text style={styles.footerDot}>·</Text>
            <AnimatedPressable
              onPress={() =>
                Linking.openURL('https://daystep.app/privacy')
              }
              hapticType="light"
              scaleValue={0.95}>
              <Text style={styles.footerLink}>개인정보처리방침</Text>
            </AnimatedPressable>
          </View>
          </View>
        </View>
      </SafeAreaView>
      </View>
    );
  }

  // ══════════════════════════════════════════════════
  // Pro 사용자 → 기존 관리 화면
  // ══════════════════════════════════════════════════
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.container, {backgroundColor: '#FFFFFF'}]}>
      <StatusBar barStyle="dark-content" />
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
          <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
        </AnimatedPressable>
        <Text style={styles.title}>구독 관리</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView
        contentContainerStyle={{paddingBottom: insets.bottom + 24}}
        showsVerticalScrollIndicator={false}>
        {/* ── 상태 카드 ── */}
        <AnimatedCard enterDelay={0} style={styles.statusCard}>
          {platformLabel && (
            <View
              style={[styles.platformBadge, {backgroundColor: platformLabel.bg}]}>
              <Text style={[styles.platformBadgeText, {color: platformLabel.color}]}>
                {platformLabel.icon} {platformLabel.label}
              </Text>
            </View>
          )}

          <Crown size={28} color="#F59E0B" strokeWidth={2} />
          <Text style={styles.statusTitle}>DayStep Pro</Text>

          {planInfo.price ? (
            <Text style={styles.planInfoText}>
              {planInfo.name} · {planInfo.price}
            </Text>
          ) : null}
          {planInfo.sub && (
            <Text style={styles.planSubText}>{planInfo.sub}</Text>
          )}

          {isInTrial && daysRemainingInTrial != null && (
            <View
              style={[styles.trialBadge, {backgroundColor: primaryColor + '20'}]}>
              <Text style={[styles.trialText, {color: primaryColor}]}>
                트라이얼 · {daysRemainingInTrial}일 남음
              </Text>
            </View>
          )}

          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>상태</Text>
              <Text
                style={[
                  styles.infoValue,
                  status === 'cancelled' && {color: '#D97706'},
                  (status === 'active' || status === 'trial') && {
                    color: '#059669',
                  },
                ]}>
                {getStatusLabel(status)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>다음 결제일</Text>
              <Text style={styles.infoValue}>
                {formatDate(subscriptionInfo?.subscriptionEndDate)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>시작일</Text>
              <Text style={styles.infoValue}>
                {formatDate(subscriptionInfo?.subscriptionStartDate)}
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>자동 갱신</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color: subscriptionInfo?.autoRenewEnabled
                      ? '#059669'
                      : '#D97706',
                  },
                ]}>
                {subscriptionInfo?.autoRenewEnabled ? '활성' : '비활성'}
              </Text>
            </View>
          </View>
        </AnimatedCard>

        {/* ── 알림 배너 ── */}
        {subPlatform === 'web' &&
          hasActiveSubscription &&
          status !== 'cancelled' && (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                ℹ️ 이 구독은 웹(daystep.app)에서 결제되었습니다
              </Text>
            </View>
          )}

        {status === 'cancelled' && subscriptionInfo?.subscriptionEndDate && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningBannerText}>
              ⚠️ 구독이 취소 예약되었습니다.{' '}
              {formatDate(subscriptionInfo.subscriptionEndDate)}까지 Pro를 이용할
              수 있습니다.
            </Text>
          </View>
        )}

        {/* ── 관리 버튼 ── */}
        <View style={styles.actionSection}>
          {subPlatform === 'web' ? (
            <>
              <AnimatedPressable
                onPress={() => handleManageSubscription('web')}
                hapticType="light"
                scaleValue={0.95}
                style={[styles.primaryActionBtn, {backgroundColor: primaryColor}]}>
                <Text style={styles.primaryActionBtnText}>
                  🌐 daystep.app에서 관리
                </Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={() => Linking.openURL('mailto:skwhdgks@gmail.com')}
                hapticType="light"
                scaleValue={0.95}
                style={styles.secondaryActionBtn}>
                <Text
                  style={[styles.secondaryActionBtnText, {color: primaryColor}]}>
                  📧 이메일 문의
                </Text>
              </AnimatedPressable>
              {status === 'cancelled' && (
                <AnimatedPressable
                  onPress={() => handleManageSubscription('web')}
                  hapticType="light"
                  scaleValue={0.95}
                  style={[styles.secondaryActionBtn, {borderColor: primaryColor}]}>
                  <Text
                    style={[
                      styles.secondaryActionBtnText,
                      {color: primaryColor},
                    ]}>
                    🔄 구독 재활성화
                  </Text>
                </AnimatedPressable>
              )}
            </>
          ) : subPlatform === 'ios' ? (
            <AnimatedPressable
              onPress={() => handleManageSubscription('ios')}
              hapticType="light"
              scaleValue={0.95}
              style={[styles.primaryActionBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.primaryActionBtnText}>
                🍎 App Store에서 관리
              </Text>
            </AnimatedPressable>
          ) : subPlatform === 'android' ? (
            <AnimatedPressable
              onPress={() => handleManageSubscription('android')}
              hapticType="light"
              scaleValue={0.95}
              style={[styles.primaryActionBtn, {backgroundColor: primaryColor}]}>
              <Text style={styles.primaryActionBtnText}>
                🤖 Play Store에서 관리
              </Text>
            </AnimatedPressable>
          ) : null}
        </View>

        {/* ── 플랜 비교 (접기/펼치기) ── */}
        <AnimatedPressable
          onPress={() => setShowComparison(prev => !prev)}
          hapticType="light"
          scaleValue={0.98}
          style={styles.comparisonToggle}>
          <Text style={styles.comparisonToggleText}>
            플랜 비교 보기 {showComparison ? '▲' : '▼'}
          </Text>
        </AnimatedPressable>

        {showComparison && (
          <View style={styles.comparisonTable}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableCell, styles.tableCellFirst]}>
                기능
              </Text>
              <Text style={[styles.tableCell, styles.tableHeaderText]}>
                Free
              </Text>
              <Text
                style={[
                  styles.tableCell,
                  styles.tableHeaderText,
                  {color: primaryColor},
                ]}>
                Pro
              </Text>
            </View>
            {USAGE_FEATURES.map((feat, i) => (
              <View
                key={feat.entity}
                style={[
                  styles.tableRow,
                  i % 2 === 0 && {backgroundColor: '#F9FAFB'},
                ]}>
                <Text style={[styles.tableCell, styles.tableCellFirst]}>
                  {feat.name}
                </Text>
                <Text style={[styles.tableCell, styles.tableCellText]}>
                  {ENTITY_LIMIT_MAP[feat.entity]}
                  {feat.unit}
                </Text>
                <Text
                  style={[
                    styles.tableCell,
                    styles.tableCellText,
                    {color: primaryColor, fontWeight: '600'},
                  ]}>
                  무제한
                </Text>
              </View>
            ))}
            <View
              style={[
                styles.tableRow,
                USAGE_FEATURES.length % 2 === 0 && {backgroundColor: '#F9FAFB'},
              ]}>
              <Text style={[styles.tableCell, styles.tableCellFirst]}>
                통계/인사이트
              </Text>
              <View style={styles.tableCell}>
                <X size={16} color="#D1D5DB" strokeWidth={2.5} />
              </View>
              <View style={styles.tableCell}>
                <Check size={16} color="#22C55E" strokeWidth={2.5} />
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── 스타일 ─────────────────────────────────────────

const styles = StyleSheet.create({
  // ── 공통 ──
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#6B7280',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  errorDetail: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  retryBtn: {
    marginTop: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  retryBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ══════════════════════════════════════════════
  // Free — 시안 C Paywall
  // ══════════════════════════════════════════════
  paywallContainer: {
    flex: 1,
  },
  closeBtn: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallScroll: {
    paddingHorizontal: 20,
  },

  // 히어로
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  crownCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(245,158,11,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    // 글로우 효과 (iOS shadow)
    shadowColor: '#F59E0B',
    shadowOffset: {width: 0, height: 0},
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '500',
  },

  // 사용량 비교 테이블
  usageTable: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: 24,
  },
  usageHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  usageRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  usageCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usageCellFirst: {
    flex: 1.5,
    paddingLeft: 14,
    alignItems: 'flex-start',
  },
  usageHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  usageCellName: {
    fontSize: 13,
    color: '#CBD5E1',
    fontWeight: '500',
  },
  usageCellValue: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  usageCellPro: {
    fontSize: 13,
    color: '#60A5FA',
    fontWeight: '600',
  },

  // Offerings 로딩/에러 상태
  offeringsStatusBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 28,
    gap: 12,
    marginBottom: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  offeringsStatusText: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '500',
  },
  offeringsErrorText: {
    fontSize: 13,
    color: '#F87171',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  offeringsRetryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  offeringsRetryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#60A5FA',
  },

  // 플랜 셀렉터
  planSelector: {
    gap: 10,
    marginBottom: 16,
  },
  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  planCardSelected: {
    borderColor: '#3B82F6',
    backgroundColor: 'rgba(59,130,246,0.08)',
  },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#E2E8F0',
  },
  planPrice: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 2,
  },
  planSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  popularBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F59E0B',
  },
  popularBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E293B',
  },

  // CTA
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#3B82F6',
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // 하단 링크
  footerLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  footerLink: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  footerDot: {
    fontSize: 12,
    color: '#334155',
  },


  // ══════════════════════════════════════════════
  // Pro — 기존 관리 화면
  // ══════════════════════════════════════════════
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
    paddingVertical: 20,
  },
  platformBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12,
  },
  platformBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
  },
  planInfoText: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 4,
  },
  planSubText: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  trialBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  trialText: {
    fontSize: 13,
    fontWeight: '600',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'stretch',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  infoItem: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  infoBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
  },
  infoBannerText: {
    fontSize: 13,
    color: '#2563EB',
    lineHeight: 18,
  },
  warningBanner: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
  },
  warningBannerText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 18,
  },
  actionSection: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  primaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryActionBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secondaryActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  secondaryActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  comparisonToggle: {
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  comparisonToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  comparisonTable: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  tableCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tableCellFirst: {
    flex: 1.5,
    paddingLeft: 14,
    alignItems: 'flex-start',
  },
  tableHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  tableCellText: {
    fontSize: 13,
    color: '#4B5563',
  },
});

/**
 * SubscriptionView — 구독 상태 표시, Free vs Pro 비교, 플랫폼 인식 관리 링크
 */
import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  Linking,
  Platform,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import {AnimatedPressable, AnimatedCard} from '@/components/core';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import type {Platform as SubPlatform} from '@/stores/subscriptionStore';
import {useAuthStore} from '@/stores/authStore';
import {useTheme} from '@/theme';
import {ArrowLeft, Crown, Check, X} from 'lucide-react-native';

interface SubscriptionViewProps {
  onBack: () => void;
}

const FEATURES = [
  {name: '할일', free: '60개', pro: '무제한'},
  {name: '습관', free: '5개', pro: '무제한'},
  {name: '프로젝트', free: '15개', pro: '무제한'},
  {name: '노트', free: '40개', pro: '무제한'},
  {name: '연락처', free: '10개', pro: '무제한'},
  {name: '소중한 사람', free: '10명', pro: '무제한'},
  {name: '통계/인사이트', free: false, pro: true},
];

// ─── 헬퍼 함수 ──────────────────────────────────────

/** 플랫폼 → 한글 라벨 + 아이콘 + 배지 색상 */
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

/** productId → 플랜 이름, 가격 */
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

/** 구독 상태 → 한글 */
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

/** 플랫폼별 관리 URL 분기 (핵심 버그 수정) */
function handleManageSubscription(platform: SubPlatform | undefined) {
  let url: string;
  switch (platform) {
    case 'web':
      url = 'https://daystep.app/adhd/settings/subscription';
      break;
    case 'ios':
      url = 'https://apps.apple.com/account/subscriptions';
      break;
    case 'android':
      url = 'https://play.google.com/store/account/subscriptions';
      break;
    default:
      url = 'https://daystep.app/adhd/settings/subscription';
  }
  Linking.openURL(url);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

// ─── 컴포넌트 ───────────────────────────────────────

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
    clearError,
  } = useSubscriptionStore();

  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    if (user?.id) fetchSubscription(user.id);
  }, [user?.id, fetchSubscription]);

  const status = subscriptionInfo?.status ?? 'free';
  const subPlatform = subscriptionInfo?.platform;
  const platformLabel = getPlatformLabel(subPlatform);
  const planInfo = getPlanInfo(subscriptionInfo?.productId);

  // ── 로딩 상태 ──
  if (loading && !subscriptionInfo) {
    return (
      <View style={styles.container}>
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
      </View>
    );
  }

  // ── 에러 상태 ──
  if (error && !subscriptionInfo) {
    return (
      <View style={styles.container}>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
          <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
        </AnimatedPressable>
        <Text style={styles.title}>구독 관리</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView
        contentContainerStyle={{paddingBottom: 120}}
        showsVerticalScrollIndicator={false}>
        {/* ── 상태 카드 ── */}
        <AnimatedCard enterDelay={0} style={styles.statusCard}>
          {/* 플랫폼 배지 */}
          {platformLabel && (
            <View
              style={[
                styles.platformBadge,
                {backgroundColor: platformLabel.bg},
              ]}>
              <Text
                style={[styles.platformBadgeText, {color: platformLabel.color}]}>
                {platformLabel.icon} {platformLabel.label}
              </Text>
            </View>
          )}

          {/* Crown + 타이틀 */}
          <Crown
            size={28}
            color={hasActiveSubscription ? '#F59E0B' : '#9CA3AF'}
            strokeWidth={2}
          />
          <Text style={styles.statusTitle}>
            {hasActiveSubscription ? 'DayStep Pro' : 'DayStep Free'}
          </Text>

          {/* 플랜 이름 + 가격 */}
          {hasActiveSubscription && planInfo.price ? (
            <Text style={styles.planInfoText}>
              {planInfo.name} · {planInfo.price}
            </Text>
          ) : null}
          {planInfo.sub && (
            <Text style={styles.planSubText}>{planInfo.sub}</Text>
          )}

          {/* 트라이얼 배지 */}
          {isInTrial && daysRemainingInTrial != null && (
            <View
              style={[styles.trialBadge, {backgroundColor: primaryColor + '20'}]}>
              <Text style={[styles.trialText, {color: primaryColor}]}>
                트라이얼 · {daysRemainingInTrial}일 남음
              </Text>
            </View>
          )}

          {/* 정보 그리드 2×2 */}
          {hasActiveSubscription && (
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
          )}
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

        {/* ── 관리 버튼 (플랫폼별 분기) ── */}
        {hasActiveSubscription && (
          <View style={styles.actionSection}>
            {subPlatform === 'web' ? (
              <>
                <AnimatedPressable
                  onPress={() => handleManageSubscription('web')}
                  hapticType="light"
                  scaleValue={0.95}
                  style={[
                    styles.primaryActionBtn,
                    {backgroundColor: primaryColor},
                  ]}>
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
                    style={[
                      styles.secondaryActionBtnText,
                      {color: primaryColor},
                    ]}>
                    📧 이메일 문의
                  </Text>
                </AnimatedPressable>
                {status === 'cancelled' && (
                  <AnimatedPressable
                    onPress={() => handleManageSubscription('web')}
                    hapticType="light"
                    scaleValue={0.95}
                    style={[
                      styles.secondaryActionBtn,
                      {borderColor: primaryColor},
                    ]}>
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
                style={[
                  styles.primaryActionBtn,
                  {backgroundColor: primaryColor},
                ]}>
                <Text style={styles.primaryActionBtnText}>
                  🍎 App Store에서 관리
                </Text>
              </AnimatedPressable>
            ) : subPlatform === 'android' ? (
              <AnimatedPressable
                onPress={() => handleManageSubscription('android')}
                hapticType="light"
                scaleValue={0.95}
                style={[
                  styles.primaryActionBtn,
                  {backgroundColor: primaryColor},
                ]}>
                <Text style={styles.primaryActionBtnText}>
                  🤖 Play Store에서 관리
                </Text>
              </AnimatedPressable>
            ) : null}
          </View>
        )}

        {/* ── 플랜 비교 (Pro: 접기/펼치기, Free: 항상 표시) ── */}
        {hasActiveSubscription ? (
          <AnimatedPressable
            onPress={() => setShowComparison(prev => !prev)}
            hapticType="light"
            scaleValue={0.98}
            style={styles.comparisonToggle}>
            <Text style={styles.comparisonToggleText}>
              플랜 비교 보기 {showComparison ? '▲' : '▼'}
            </Text>
          </AnimatedPressable>
        ) : (
          <Text style={styles.sectionTitle}>플랜 비교</Text>
        )}

        {(!hasActiveSubscription || showComparison) && (
          <View style={styles.comparisonTable}>
            {/* 헤더 행 */}
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

            {/* 데이터 행 */}
            {FEATURES.map((feat, i) => (
              <View
                key={feat.name}
                style={[
                  styles.tableRow,
                  i % 2 === 0 && {backgroundColor: '#F9FAFB'},
                ]}>
                <Text style={[styles.tableCell, styles.tableCellFirst]}>
                  {feat.name}
                </Text>
                <View style={styles.tableCell}>
                  {typeof feat.free === 'boolean' ? (
                    feat.free ? (
                      <Check size={16} color="#22C55E" strokeWidth={2.5} />
                    ) : (
                      <X size={16} color="#D1D5DB" strokeWidth={2.5} />
                    )
                  ) : (
                    <Text style={styles.tableCellText}>{feat.free}</Text>
                  )}
                </View>
                <View style={styles.tableCell}>
                  {typeof feat.pro === 'boolean' ? (
                    feat.pro ? (
                      <Check size={16} color="#22C55E" strokeWidth={2.5} />
                    ) : (
                      <X size={16} color="#D1D5DB" strokeWidth={2.5} />
                    )
                  ) : (
                    <Text
                      style={[
                        styles.tableCellText,
                        {color: primaryColor, fontWeight: '600'},
                      ]}>
                      {feat.pro}
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── 업그레이드 CTA (Free 사용자) ── */}
        {!hasActiveSubscription && (
          <>
            <AnimatedPressable
              onPress={() => {
                const url =
                  Platform.OS === 'ios'
                    ? 'https://apps.apple.com/account/subscriptions'
                    : 'https://play.google.com/store/account/subscriptions';
                Linking.openURL(url);
              }}
              haptic={false}
              scaleValue={0.95}
              style={[styles.upgradeBtn, {backgroundColor: primaryColor}]}>
              <Crown size={18} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.upgradeBtnText}>Pro로 업그레이드</Text>
            </AnimatedPressable>

            <View style={styles.restoreSection}>
              <Text style={styles.restoreHint}>
                이미 다른 기기에서 구독하셨나요?
              </Text>
              <AnimatedPressable
                onPress={() => {
                  if (user?.id) fetchSubscription(user.id);
                }}
                hapticType="light"
                scaleValue={0.95}>
                <Text style={[styles.restoreLink, {color: primaryColor}]}>
                  구독 복원
                </Text>
              </AnimatedPressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── 스타일 ─────────────────────────────────────────

const styles = StyleSheet.create({
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

  // 로딩 / 에러
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

  // 상태 카드
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

  // 정보 그리드
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

  // 알림 배너
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

  // 관리 버튼
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

  // 비교표 토글
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 20,
    marginBottom: 8,
  },

  // 비교표
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

  // 업그레이드 CTA
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
  },
  upgradeBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // 구독 복원
  restoreSection: {
    alignItems: 'center',
    marginTop: 16,
    gap: 4,
  },
  restoreHint: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  restoreLink: {
    fontSize: 13,
    fontWeight: '600',
  },
});

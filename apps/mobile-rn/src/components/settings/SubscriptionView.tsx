/**
 * SubscriptionView — 구독 상태 표시, Free vs Pro 비교, 관리 링크
 */
import React, {useEffect} from 'react';
import {View, Text, Linking, Platform, StyleSheet} from 'react-native';
import {AnimatedPressable, AnimatedCard} from '@/components/core';
import {useSubscriptionStore} from '@/stores/subscriptionStore';
import {useAuthStore} from '@/stores/authStore';
import {useTheme} from '@/theme';
import {ArrowLeft, Crown, Check, X, ExternalLink} from 'lucide-react-native';

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

function openSubscriptionManagement() {
  const url =
    Platform.OS === 'ios'
      ? 'https://apps.apple.com/account/subscriptions'
      : 'https://play.google.com/store/account/subscriptions';
  Linking.openURL(url);
}

export function SubscriptionView({onBack}: SubscriptionViewProps) {
  const {primaryColor} = useTheme();
  const {user} = useAuthStore();
  const {
    subscriptionInfo,
    hasActiveSubscription,
    isInTrial,
    daysRemainingInTrial,
    loading,
    fetchSubscription,
  } = useSubscriptionStore();

  useEffect(() => {
    if (user?.id) fetchSubscription(user.id);
  }, [user?.id, fetchSubscription]);

  const status = subscriptionInfo?.status ?? 'free';

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

      {/* 현재 상태 카드 */}
      <AnimatedCard enterDelay={0} style={styles.statusCard}>
        <Crown
          size={28}
          color={hasActiveSubscription ? '#F59E0B' : '#9CA3AF'}
          strokeWidth={2}
        />
        <Text style={styles.statusTitle}>
          {hasActiveSubscription ? 'DayStep Pro' : 'DayStep Free'}
        </Text>

        {isInTrial && daysRemainingInTrial != null && (
          <View style={[styles.trialBadge, {backgroundColor: primaryColor + '20'}]}>
            <Text style={[styles.trialText, {color: primaryColor}]}>
              트라이얼 · {daysRemainingInTrial}일 남음
            </Text>
          </View>
        )}

        {status === 'active' && subscriptionInfo?.subscriptionEndDate && (
          <Text style={styles.statusDetail}>
            다음 결제일: {new Date(subscriptionInfo.subscriptionEndDate).toLocaleDateString('ko-KR')}
            {'\n'}
            자동 갱신: {subscriptionInfo.autoRenewEnabled ? '활성' : '비활성'}
          </Text>
        )}

        {status === 'cancelled' && subscriptionInfo?.subscriptionEndDate && (
          <Text style={styles.statusDetail}>
            만료일: {new Date(subscriptionInfo.subscriptionEndDate).toLocaleDateString('ko-KR')}
            {'\n'}만료 후 Free 플랜으로 전환됩니다
          </Text>
        )}

        {hasActiveSubscription && (
          <AnimatedPressable
            onPress={openSubscriptionManagement}
            hapticType="light"
            scaleValue={0.95}
            style={styles.manageBtn}>
            <ExternalLink size={16} color={primaryColor} strokeWidth={2} />
            <Text style={[styles.manageBtnText, {color: primaryColor}]}>
              구독 관리
            </Text>
          </AnimatedPressable>
        )}
      </AnimatedCard>

      {/* Free vs Pro 비교 */}
      <Text style={styles.sectionTitle}>플랜 비교</Text>
      <View style={styles.comparisonTable}>
        {/* 헤더 행 */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCell, styles.tableCellFirst]}>기능</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText]}>Free</Text>
          <Text style={[styles.tableCell, styles.tableHeaderText, {color: primaryColor}]}>
            Pro
          </Text>
        </View>

        {/* 데이터 행 */}
        {FEATURES.map((feat, i) => (
          <View
            key={feat.name}
            style={[styles.tableRow, i % 2 === 0 && {backgroundColor: '#F9FAFB'}]}>
            <Text style={[styles.tableCell, styles.tableCellFirst]}>{feat.name}</Text>
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
                <Text style={[styles.tableCellText, {color: primaryColor, fontWeight: '600'}]}>
                  {feat.pro}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* 업그레이드 CTA (Free 사용자만) */}
      {!hasActiveSubscription && (
        <AnimatedPressable
          onPress={openSubscriptionManagement}
          haptic={false}
          scaleValue={0.95}
          style={[styles.upgradeBtn, {backgroundColor: primaryColor}]}>
          <Crown size={18} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.upgradeBtnText}>Pro로 업그레이드</Text>
        </AnimatedPressable>
      )}
    </View>
  );
}

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
  statusCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
    paddingVertical: 20,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 8,
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
  statusDetail: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
  },
  manageBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 20,
    marginBottom: 8,
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
});

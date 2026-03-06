/**
 * TrialOfferModal — 7일 무료 체험 제안 (RN)
 * 다크 배경 + 그라디언트 CTA, fullscreen Modal
 */
import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  StatusBar,
  Switch,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import {Crown, X, Sparkles} from 'lucide-react-native';
import {AnimatedPressable} from '@/components/core';
import {requestNotificationPermission} from '@/lib/notifications';
import Config from 'react-native-config';

const TRIAL_DAYS = parseInt(Config.TRIAL_DAYS || '7', 10);
const PRO_MONTHLY_PRICE = Config.PRO_MONTHLY_PRICE || '₩5,500';
const PRO_YEARLY_PRICE = Config.PRO_YEARLY_PRICE || '₩44,000';
const PRO_YEARLY_DISCOUNT = Config.PRO_YEARLY_DISCOUNT || '33';

interface TrialOfferModalProps {
  visible: boolean;
  onClose: () => void;
  onStartTrial: (plan: 'monthly' | 'yearly', reminderEnabled: boolean) => void;
  onShowDetails: () => void;
}

export function TrialOfferModal({
  visible,
  onClose,
  onStartTrial,
  onShowDetails,
}: TrialOfferModalProps) {
  const insets = useSafeAreaInsets();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [reminderEnabled, setReminderEnabled] = useState(false);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" />
        <View style={[styles.container, {paddingTop: insets.top + 16}]}>
          <LinearGradient
            colors={['#1E293B', '#0F172A']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* 닫기 버튼 */}
          <AnimatedPressable
            onPress={onClose}
            hapticType="light"
            scaleValue={0.9}
            style={[styles.closeBtn, {top: insets.top + 16}]}>
            <X size={20} color="#94A3B8" strokeWidth={2} />
          </AnimatedPressable>

          {/* 상단 그라디언트 영역 */}
          <View style={styles.heroSection}>
            <View style={styles.crownCircle}>
              <Crown size={32} color="#F59E0B" strokeWidth={2.5} />
            </View>
            <Text style={styles.heroTitle}>DayStep Pro</Text>
            <Text style={styles.trialBadgeText}>
              {TRIAL_DAYS}일 무료 체험
            </Text>
            <Text style={styles.heroSubtitle}>
              모든 Pro 기능을 무료로 체험해보세요
            </Text>
          </View>

          {/* 가격 정보 — 플랜 선택 */}
          <View style={styles.priceBox}>
            <AnimatedPressable
              onPress={() => setSelectedPlan('monthly')}
              hapticType="light"
              scaleValue={0.98}
              style={[
                styles.priceRow,
                selectedPlan === 'monthly' && styles.priceRowSelected,
              ]}>
              <View style={styles.radioRow}>
                <View style={[styles.radio, selectedPlan === 'monthly' && styles.radioActive]}>
                  {selectedPlan === 'monthly' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.priceLabel}>월간 플랜</Text>
              </View>
              <Text style={styles.priceValue}>{PRO_MONTHLY_PRICE}/월</Text>
            </AnimatedPressable>

            <AnimatedPressable
              onPress={() => setSelectedPlan('yearly')}
              hapticType="light"
              scaleValue={0.98}
              style={[
                styles.priceRow,
                selectedPlan === 'yearly' && styles.priceRowSelected,
              ]}>
              <View style={styles.radioRow}>
                <View style={[styles.radio, selectedPlan === 'yearly' && styles.radioActive]}>
                  {selectedPlan === 'yearly' && <View style={styles.radioDot} />}
                </View>
                <Text style={styles.priceLabel}>연간 플랜</Text>
              </View>
              <View style={styles.priceRight}>
                <Text style={styles.priceValue}>{PRO_YEARLY_PRICE}/년</Text>
                <View style={styles.discountBadge}>
                  <Text style={styles.discountText}>{PRO_YEARLY_DISCOUNT}% 할인</Text>
                </View>
              </View>
            </AnimatedPressable>
          </View>

          {/* 더보기 링크 */}
          <AnimatedPressable
            onPress={onShowDetails}
            hapticType="light"
            scaleValue={0.95}
            style={styles.detailsLink}>
            <Text style={styles.detailsLinkText}>
              기능 비교 및 플랜 선택 &gt;
            </Text>
          </AnimatedPressable>

          {/* 알림 토글 */}
          <View style={styles.reminderRow}>
            <Text style={styles.reminderText}>무료 체험이 끝나기 전에 알림</Text>
            <Switch
              value={reminderEnabled}
              onValueChange={async (value) => {
                if (value) {
                  const granted = await requestNotificationPermission();
                  setReminderEnabled(granted);
                } else {
                  setReminderEnabled(false);
                }
              }}
              trackColor={{false: '#334155', true: '#F59E0B'}}
              thumbColor="#FFFFFF"
            />
          </View>

          {/* CTA 버튼 */}
          <View style={styles.ctaContainer}>
            <AnimatedPressable
              onPress={() => onStartTrial(selectedPlan, reminderEnabled)}
              hapticType="medium"
              scaleValue={0.96}>
              <View style={styles.ctaBtn}>
                <Sparkles size={18} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.ctaBtnText}>무료로 시도해보세요</Text>
              </View>
            </AnimatedPressable>
          </View>

          {/* 면책 조항 */}
          <Text style={[styles.disclaimer, {paddingBottom: insets.bottom + 16}]}>
            {TRIAL_DAYS}일 무료 체험 후 자동으로 구독이 시작됩니다. 체험 기간 중
            언제든지 설정에서 취소할 수 있으며, 취소 시 요금이 청구되지 않습니다.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  crownCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#F59E0B',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  trialBadgeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#94A3B8',
  },
  priceBox: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  priceRowSelected: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245,158,11,0.08)',
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: {
    borderColor: '#F59E0B',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F59E0B',
  },
  priceLabel: {
    fontSize: 14,
    color: '#CBD5E1',
  },
  priceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  priceRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  discountBadge: {
    backgroundColor: 'rgba(245,158,11,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F59E0B',
  },
  detailsLink: {
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 8,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  reminderText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  detailsLinkText: {
    fontSize: 14,
    color: '#F59E0B',
  },
  ctaContainer: {
    marginBottom: 16,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F59E0B',
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#F97316',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  ctaBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  disclaimer: {
    fontSize: 11,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 8,
  },
});

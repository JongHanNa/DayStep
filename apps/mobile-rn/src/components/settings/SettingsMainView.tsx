/**
 * SettingsMainView — 메인 설정 목록 (섹션별 그룹핑)
 */
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, Alert, StyleSheet, Image, Switch} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {SettingsRow} from './SettingsRow';
import {useSettingsStore} from '@/stores/settingsStore';
import {useAuthStore} from '@/stores/authStore';
import {useTheme} from '@/theme';
import {supabase} from '@/lib/supabase';
import {
  User,
  Palette,
  Bell,
  LogOut,
  ShieldCheck,
  Calendar,
  ChevronRight,
  Crown,
  ClipboardCheck,
} from 'lucide-react-native';
import {useCalendarStore} from '@/stores/calendarStore';
import {useSubscriptionStore, type SubscriptionStatus, type Platform} from '@/stores/subscriptionStore';

interface SettingsMainViewProps {
  onNavigate: (view: string) => void;
}

export function SettingsMainView({onNavigate}: SettingsMainViewProps) {
  const {primaryColor, colors} = useTheme();
  const {user, signOut} = useAuthStore();
  const settings = useSettingsStore();
  const {isConnected, connectGoogleCalendar, disconnectGoogleCalendar} =
    useCalendarStore();
  const hasActiveSubscription = useSubscriptionStore(s => s.hasActiveSubscription);
  const isInGracePeriod = useSubscriptionStore(s => s.isInGracePeriod);
  const gracePeriodDaysRemaining = useSubscriptionStore(s => s.gracePeriodDaysRemaining);
  const userCreatedAt = useSubscriptionStore(s => s.userCreatedAt);
  const graceChecked = useSubscriptionStore(s => s.graceChecked);
  // 설정 화면 진입 시 grace period 재계산
  useEffect(() => {
    useSubscriptionStore.getState().updateComputedStates();
  }, []);

  const [isAdmin, setIsAdmin] = useState(false);
  const isGoogleUser = user?.app_metadata?.providers?.includes('google') ?? false;
  const avatarUrl = user?.user_metadata?.avatar_url;

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
      .then(({data}) => {
        setIsAdmin(data?.role === 'admin');
      });
  }, [user?.id]);

  const [calendarLoading, setCalendarLoading] = useState(false);

  const handleCalendarToggle = useCallback(() => {
    if (isConnected) {
      Alert.alert('Google 캘린더 연결 해제', '캘린더 이벤트가 더 이상 표시되지 않습니다.', [
        {text: '취소', style: 'cancel'},
        {
          text: '해제',
          style: 'destructive',
          onPress: () => disconnectGoogleCalendar(),
        },
      ]);
    } else {
      setCalendarLoading(true);
      connectGoogleCalendar()
        .catch((error: any) => {
          // 사용자가 취소한 경우는 무시
          const isCancelled =
            error?.code === 'SIGN_IN_CANCELLED' ||
            error?.code === '-5' ||
            error?.message?.includes('cancel');
          if (!isCancelled) {
            Alert.alert(
              'Google 캘린더 연결 실패',
              error?.message || '다시 시도해 주세요.',
            );
          }
        })
        .finally(() => setCalendarLoading(false));
    }
  }, [isConnected, connectGoogleCalendar, disconnectGoogleCalendar]);

  const handleSignOut = useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠어요?', [
      {text: '취소', style: 'cancel'},
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => signOut(),
      },
    ]);
  }, [signOut]);

  const displayName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '사용자';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* 계정 정보 카드 */}
      <AnimatedCard enterDelay={0} style={styles.accountCard} onPress={() => onNavigate('account')}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{uri: avatarUrl}} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarCircle, {backgroundColor: primaryColor + '20'}]}>
              <User size={24} color={primaryColor} strokeWidth={1.5} />
            </View>
          )}
          <View style={[
            styles.crownBadge,
            !hasActiveSubscription && styles.crownBadgeInactive,
          ]}>
            <Crown
              size={10}
              color={hasActiveSubscription ? '#92400E' : '#FFFFFF'}
              strokeWidth={2.5}
              fill={hasActiveSubscription ? '#FCD34D' : 'none'}
            />
          </View>
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{displayName}</Text>
          <Text style={styles.accountEmail}>{user?.email ?? ''}</Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" />
      </AnimatedCard>

      {/* Grace Period 진행 중 배너 */}
      {graceChecked && isInGracePeriod && !hasActiveSubscription && gracePeriodDaysRemaining > 0 && (
        <AnimatedCard enterDelay={100} style={styles.graceBanner}>
          <View style={[styles.graceDot, {backgroundColor: primaryColor}]} />
          <View style={styles.graceBannerContent}>
            <Text style={styles.graceBannerTitle}>Pro 체험 중</Text>
            <Text style={styles.graceBannerSub}>
              {gracePeriodDaysRemaining}일 남음
            </Text>
          </View>
        </AnimatedCard>
      )}

      {/* Grace Period 만료 배너 */}
      {graceChecked && !isInGracePeriod && !hasActiveSubscription && (
        <AnimatedCard
          enterDelay={100}
          style={styles.graceExpiredBanner}
          onPress={() => onNavigate('subscription')}>
          <View style={styles.graceExpiredContent}>
            <Text style={styles.graceExpiredTitle}>Pro 체험이 종료되었어요</Text>
            <Text style={styles.graceExpiredSub}>
              구독하고 모든 기능을 이용해보세요
            </Text>
          </View>
          <Text style={styles.graceExpiredArrow}>›</Text>
        </AnimatedCard>
      )}

      {/* 앱 설정 */}
      <Text style={styles.sectionTitle}>앱 설정</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={Palette}
          iconColor={primaryColor}
          title="테마/색상"
          showChevron
          onPress={() => onNavigate('theme')}
          primaryColor={primaryColor}
        />
      </View>

      {/* 연동 서비스 (Google 로그인 사용자만) */}
      {isGoogleUser && (
        <>
          <Text style={styles.sectionTitle}>연동 서비스</Text>
          <View style={styles.section}>
            <SettingsRow
              icon={Calendar}
              iconColor="#4285F4"
              title="Google 캘린더"
              subtitle={isConnected ? '연결됨' : '월간 계획에 일정을 표시합니다'}
              value={isConnected ? '연결됨 ✓' : calendarLoading ? '연결 중...' : '연결하기'}
              onPress={handleCalendarToggle}
            />
          </View>
        </>
      )}

      {/* 관리자 섹션 (admin 역할만) */}
      {isAdmin && (
        <>
          <Text style={styles.sectionTitle}>관리자</Text>
          <View style={[styles.section, {marginBottom: 16}]}>
            <SettingsRow
              icon={ShieldCheck}
              iconColor={primaryColor}
              title="플랜 한도 관리"
              subtitle="Free/Pro 엔티티 한도 설정"
              showChevron
              onPress={() => onNavigate('adminPlanLimits')}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon={ClipboardCheck}
              iconColor="#10B981"
              title="QA 체크리스트"
              subtitle="릴리즈 전 수동 검증 체크리스트"
              showChevron
              onPress={() => onNavigate('qaChecklist')}
            />
            <View style={styles.divider} />
            <View style={styles.adminSubRow}>
              <View style={{flex: 1}}>
                <Text style={styles.adminSubTitle}>구독 상태 전환</Text>
                <Text style={styles.adminSubDesc}>
                  {hasActiveSubscription ? 'Pro 구독 중' : 'Free'}
                </Text>
              </View>
              <Switch
                value={hasActiveSubscription}
                onValueChange={async (value) => {
                  if (!user?.id) return;
                  try {
                    const {error} = await supabase.from('users').update({
                      has_active_subscription: value,
                      subscription_type: value ? 'pro_monthly' : 'free',
                    }).eq('id', user.id);
                    if (error) throw error;
                    // Store 즉시 갱신 (subscriptionInfo도 함께 업데이트해야 updateComputedStates 재계산 시 유지됨)
                    useSubscriptionStore.setState({
                      hasActiveSubscription: value,
                      subscriptionInfo: value
                        ? {
                            id: 'admin-override',
                            userId: user.id,
                            status: 'active' as SubscriptionStatus,
                            platform: 'ios' as Platform,
                            productId: 'admin_override',
                            subscriptionStartDate: new Date().toISOString(),
                            subscriptionEndDate: null,
                            trialStartDate: null,
                            trialEndDate: null,
                            isLegacyUser: false,
                            legacyGracePeriodEnd: null,
                            promoCode: null,
                            autoRenewEnabled: false,
                            cancelledAt: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                          }
                        : null,
                    });
                  } catch (err) {
                    console.error('[Admin] subscription toggle error:', err);
                    Alert.alert('오류', '구독 상태 변경에 실패했습니다.');
                  }
                }}
                trackColor={{false: '#D1D5DB', true: primaryColor}}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>
        </>
      )}

      {/* 로그아웃 */}
      <View style={[styles.section, {marginTop: 16, marginBottom: __DEV__ ? 16 : 40}]}>
        <SettingsRow
          icon={LogOut}
          iconColor={colors.error}
          title="로그아웃"
          onPress={handleSignOut}
        />
      </View>

      {/* 개발자 도구 (DEV 빌드 전용) */}
      {__DEV__ && (
        <>
          <Text style={styles.sectionTitle}>개발자 도구</Text>
          <View style={[styles.section, {marginBottom: 40}]}>
            <SettingsRow
              icon={Bell}
              iconColor="#F59E0B"
              title="알림 스케줄"
              subtitle="스케줄된 알림 목록 확인"
              onPress={() => onNavigate('devNotifications')}
              showChevron
            />
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 4,
    paddingBottom: 120,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crownBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FCD34D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  crownBadgeInactive: {
    backgroundColor: '#D1D5DB',
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  accountEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 20,
    marginTop: 16,
    marginBottom: 6,
  },
  section: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 60,
  },
  graceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  graceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  graceBannerContent: {
    flex: 1,
  },
  graceBannerTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  graceBannerSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  graceExpiredBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  graceExpiredContent: {
    flex: 1,
  },
  graceExpiredTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  graceExpiredSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  graceExpiredArrow: {
    fontSize: 20,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  adminSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  adminSubTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1F2937',
  },
  adminSubDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

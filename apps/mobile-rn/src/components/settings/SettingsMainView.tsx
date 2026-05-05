/**
 * SettingsMainView — 메인 설정 목록 (섹션별 그룹핑)
 */
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, Alert, StyleSheet, Image, Switch, Platform as RNPlatform, Modal, Pressable} from 'react-native';
import DateTimePicker, {DateTimePickerAndroid} from '@react-native-community/datetimepicker';
import {useNavigation} from '@react-navigation/native';
import {AnimatedCard} from '@/components/core';
import {SettingsRow} from './SettingsRow';
import {useSettingsStore} from '@/stores/settingsStore';
import {useAuthStore} from '@/stores/authStore';
import {useTheme} from '@/theme';
import {supabase} from '@/lib/supabase';
import {storage as mmkvStorage} from '@/lib/mmkv';
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
  Megaphone,
  MessageSquare,
  Languages,
  HelpCircle,
  BookOpen,
  RotateCcw,
} from 'lucide-react-native';
import {useCalendarStore} from '@/stores/calendarStore';
import {useSubscriptionStore, type SubscriptionStatus, type Platform} from '@/stores/subscriptionStore';
import {useDailyCheckInStore} from '@/stores/dailyCheckInStore';

interface SettingsMainViewProps {
  onNavigate: (view: string) => void;
}

export function SettingsMainView({onNavigate}: SettingsMainViewProps) {
  const {primaryColor, colors} = useTheme();
  const {user, signOut} = useAuthStore();
  const settings = useSettingsStore();
  const navigation = useNavigation<any>();
  const {isConnected, connectGoogleCalendar, disconnectGoogleCalendar} =
    useCalendarStore();
  const hasActiveSubscription = useSubscriptionStore(s => s.hasActiveSubscription);
  const isInGracePeriod = useSubscriptionStore(s => s.isInGracePeriod);
  const gracePeriodDaysRemaining = useSubscriptionStore(s => s.gracePeriodDaysRemaining);
  const userCreatedAt = useSubscriptionStore(s => s.userCreatedAt);
  const graceChecked = useSubscriptionStore(s => s.graceChecked);
  const freeProUntil = useSubscriptionStore(s => s.freeProUntil);
  const isFreeProActive = useSubscriptionStore(s => s.isFreeProActive);
  const adminOverride = useSubscriptionStore(s => s.adminOverride);
  // 설정 화면 진입 시 grace period 재계산 + app_config 최신화
  useEffect(() => {
    useSubscriptionStore.getState().updateComputedStates();
    useSubscriptionStore.getState().fetchAppConfig();
  }, []);

  const [showFreeProDatePicker, setShowFreeProDatePicker] = useState(false);

  const formatFreeProDate = useCallback((iso: string | null) => {
    if (!iso) return '비활성';
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} 23:59까지`;
  }, []);

  const handleFreeProDateChange = useCallback(async (newDate: Date | null) => {
    try {
      let iso: string | null = null;
      if (newDate) {
        // 선택한 날의 23:59:59 (로컬)을 ISO로 저장
        const end = new Date(newDate);
        end.setHours(23, 59, 59, 0);
        iso = end.toISOString();
      }
      await useSubscriptionStore.getState().updateFreeProUntil(iso);
    } catch (err: any) {
      console.error('[Admin] freeProUntil update error:', err);
      Alert.alert('오류', '무료 Pro 종료일 변경에 실패했습니다.');
    }
  }, []);

  const openFreeProDatePicker = useCallback(() => {
    const initial = freeProUntil ? new Date(freeProUntil) : new Date();
    if (RNPlatform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        // 과거 날짜도 허용 — 관리자가 무료 Pro 기간을 즉시 종료하고 싶을 때 사용
        onChange: (event, selectedDate) => {
          if (event.type === 'set' && selectedDate) {
            handleFreeProDateChange(selectedDate);
          }
        },
      });
    } else {
      setShowFreeProDatePicker(true);
    }
  }, [freeProUntil, handleFreeProDateChange]);

  const [isAdmin, setIsAdmin] = useState(false);
  const isDemoAccount = user?.email === 'demo@daystep.app';
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

  const handleResetCheckIn = useCallback(() => {
    Alert.alert(
      '화면 체크인 초기화',
      '오늘 확인한 홈 화면 카드들을 모두 미확인으로 되돌립니다.',
      [
        {text: '취소', style: 'cancel'},
        {
          text: '초기화',
          style: 'destructive',
          onPress: () => useDailyCheckInStore.getState().resetAll(),
        },
      ],
    );
  }, []);

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
        <View style={styles.divider} />
        <SettingsRow
          icon={Languages}
          iconColor="#0EA5E9"
          title="언어"
          showChevron
          onPress={() => onNavigate('language')}
        />
      </View>

      {/* 도움말 */}
      <Text style={styles.sectionTitle}>도움말</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={HelpCircle}
          iconColor={primaryColor}
          title="튜토리얼 다시 보기"
          subtitle="홈 화면 안내를 처음부터 다시 봅니다"
          showChevron
          onPress={() => {
            settings.setHasSeenHomeOnboarding(false);
            navigation.navigate('Home', {screen: 'HomeMain'});
          }}
          primaryColor={primaryColor}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={RotateCcw}
          iconColor="#EF4444"
          title="화면 체크인 초기화"
          subtitle="오늘 확인한 홈 카드를 다시 미확인으로 되돌립니다"
          showChevron
          onPress={handleResetCheckIn}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={BookOpen}
          iconColor="#0EA5E9"
          title="참고 문헌 / 디스클레이머"
          subtitle="ADHD 관련 콘텐츠의 학술적 근거"
          showChevron
          onPress={() => navigation.navigate('OnboardingReferences')}
        />
      </View>

      {/* 지원 & 피드백 */}
      <Text style={styles.sectionTitle}>지원 & 피드백</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={MessageSquare}
          iconColor={primaryColor}
          title="버그 신고 & 기능 요청"
          subtitle="개발팀에 직접 전달됩니다"
          showChevron
          onPress={() => navigation.navigate('FeedbackBoard')}
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
            <SettingsRow
              icon={Megaphone}
              iconColor={primaryColor}
              title="마케팅 자료"
              subtitle="가성비·소개 스크립트·핵심 메시지"
              showChevron
              onPress={() => onNavigate('marketingToolkit')}
            />
            <View style={styles.divider} />
            <View style={styles.adminSubRow}>
              <View style={{flex: 1}}>
                <Text style={styles.adminSubTitle}>구독 상태 전환 (관리자 강제)</Text>
                <Text style={styles.adminSubDesc}>
                  {adminOverride
                    ? 'ON — 관리자 강제 Pro'
                    : isFreeProActive
                      ? `OFF — 단, 무료 Pro 기간 활성으로 자동 Pro`
                      : hasActiveSubscription
                        ? 'OFF — 실제 구독으로 Pro'
                        : 'OFF — Free'}
                </Text>
              </View>
              <Switch
                value={adminOverride}
                onValueChange={async (value) => {
                  if (!user?.id) return;
                  try {
                    // 1. subscriptions 테이블 동기화 — fetchSubscription이 보는 본진
                    //    RLS가 INSERT를 차단할 수 있으므로 row 존재 여부 확인 후 update/insert 분기
                    const {data: existingSub} = await supabase
                      .from('subscriptions')
                      .select('id')
                      .eq('user_id', user.id)
                      .maybeSingle();

                    if (value) {
                      if (existingSub) {
                        const {error: subErr} = await supabase
                          .from('subscriptions')
                          .update({
                            status: 'active' as const,
                            platform: 'ios' as const,
                            product_id: 'admin_override',
                            subscription_start_date: new Date().toISOString(),
                            subscription_end_date: null,
                            auto_renew_enabled: false,
                            updated_at: new Date().toISOString(),
                          })
                          .eq('user_id', user.id);
                        if (subErr) throw subErr;
                      } else {
                        const {error: subErr} = await supabase
                          .from('subscriptions')
                          .insert({
                            user_id: user.id,
                            status: 'active' as const,
                            platform: 'ios' as const,
                            product_id: 'admin_override',
                            subscription_start_date: new Date().toISOString(),
                            subscription_end_date: null,
                            auto_renew_enabled: false,
                            updated_at: new Date().toISOString(),
                          });
                        if (subErr) throw subErr;
                      }
                    } else if (existingSub) {
                      // OFF: row가 있을 때만 status='expired'로 update
                      const {error: subErr} = await supabase
                        .from('subscriptions')
                        .update({
                          status: 'expired' as const,
                          subscription_end_date: new Date().toISOString(),
                          updated_at: new Date().toISOString(),
                        })
                        .eq('user_id', user.id);
                      if (subErr) throw subErr;
                    }
                    // OFF + row 없음 → 이미 free 상태이므로 no-op

                    // 2. users 테이블도 함께 (다른 곳에서 has_active_subscription 사용하는 경우 일관성)
                    const {error} = await supabase.from('users').update({
                      has_active_subscription: value,
                      subscription_type: value ? 'pro_monthly' : 'free',
                    }).eq('id', user.id);
                    if (error) throw error;
                    // 3. MMKV에 직접 저장 — zustand persist hydration timing과 무관하게
                    //    다음 reload의 첫 렌더에서도 sync 읽기로 즉시 반영됨
                    mmkvStorage.set('admin_subscription_override', value);
                    // Store 즉시 갱신 — adminOverride/subscriptionInfo만 직접 set,
                    // hasActiveSubscription은 updateComputedStates()가 freeProUntil(전체 무료 Pro)
                    // + grace period까지 고려해서 정확히 계산하도록 위임
                    useSubscriptionStore.setState({
                      adminOverride: value,
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
                    useSubscriptionStore.getState().updateComputedStates();
                  } catch (err) {
                    console.error('[Admin] subscription toggle error:', err);
                    Alert.alert('오류', '구독 상태 변경에 실패했습니다.');
                  }
                }}
                trackColor={{false: '#D1D5DB', true: primaryColor}}
                thumbColor="#FFFFFF"
              />
            </View>
            <View style={styles.divider} />
            {/* 전체 사용자 무료 Pro 기간 종료일 (출시 초기 프로모션) */}
            <Pressable onPress={openFreeProDatePicker} style={styles.adminSubRow}>
              <View style={{flex: 1}}>
                <Text style={styles.adminSubTitle}>무료 Pro 기간 종료일</Text>
                <Text style={styles.adminSubDesc}>
                  {isFreeProActive
                    ? `전체 사용자 Pro 활성 — ${formatFreeProDate(freeProUntil)}`
                    : freeProUntil
                      ? `만료됨 (${formatFreeProDate(freeProUntil)})`
                      : '비활성 — 정상 구독 게이트 적용 중'}
                </Text>
              </View>
              <ChevronRight size={18} color="#9CA3AF" />
            </Pressable>
            {freeProUntil && (
              <>
                <View style={styles.divider} />
                <Pressable
                  onPress={() => {
                    Alert.alert(
                      '무료 Pro 기간 비활성화',
                      '비활성화하면 즉시 일반 구독 게이트가 적용됩니다.',
                      [
                        {text: '취소', style: 'cancel'},
                        {
                          text: '비활성화',
                          style: 'destructive',
                          onPress: () => handleFreeProDateChange(null),
                        },
                      ],
                    );
                  }}
                  style={styles.adminSubRow}
                >
                  <View style={{flex: 1}}>
                    <Text style={[styles.adminSubTitle, {color: '#EF4444'}]}>
                      무료 Pro 기간 비활성화
                    </Text>
                    <Text style={styles.adminSubDesc}>
                      free_pro_until을 NULL로 설정 (즉시 일반 게이트)
                    </Text>
                  </View>
                </Pressable>
              </>
            )}
          </View>
        </>
      )}

      {/* iOS: 무료 Pro 종료일 DateTimePicker 모달 */}
      {RNPlatform.OS === 'ios' && (
        <Modal
          visible={showFreeProDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowFreeProDatePicker(false)}
        >
          <Pressable
            style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end'}}
            onPress={() => setShowFreeProDatePicker(false)}
          >
            <Pressable
              onPress={(e) => e.stopPropagation()}
              style={{
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingTop: 12,
                paddingBottom: 32,
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: '#E5E7EB',
                }}
              >
                <Pressable onPress={() => setShowFreeProDatePicker(false)}>
                  <Text style={{fontSize: 16, color: '#6B7280'}}>취소</Text>
                </Pressable>
                <Text style={{fontSize: 16, fontWeight: '600', color: '#1F2937'}}>
                  무료 Pro 종료일
                </Text>
                <Pressable onPress={() => setShowFreeProDatePicker(false)}>
                  <Text style={{fontSize: 16, color: primaryColor, fontWeight: '600'}}>
                    완료
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={freeProUntil ? new Date(freeProUntil) : new Date()}
                mode="date"
                display="spinner"
                // 과거 날짜도 허용 — 관리자가 무료 Pro 기간을 즉시 종료하고 싶을 때 사용
                onChange={(event, selectedDate) => {
                  if (event.type === 'set' && selectedDate) {
                    handleFreeProDateChange(selectedDate);
                  }
                }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* 데모 계정용 구독 상태 전환 (관리자 메뉴 없이 토글만) */}
      {isDemoAccount && !isAdmin && (
        <>
          <Text style={styles.sectionTitle}>심사용 도구</Text>
          <View style={[styles.section, {marginBottom: 16}]}>
            <View style={styles.adminSubRow}>
              <View style={{flex: 1}}>
                <Text style={styles.adminSubTitle}>구독 상태 전환</Text>
                <Text style={styles.adminSubDesc}>
                  {hasActiveSubscription ? 'Pro 구독 중' : 'Free (만료됨)'}
                </Text>
              </View>
              <Switch
                value={hasActiveSubscription}
                onValueChange={async (value) => {
                  if (!user?.id) return;
                  try {
                    const newStatus = value ? 'active' : 'expired';
                    const {error} = await supabase
                      .from('subscriptions')
                      .update({
                        status: newStatus,
                        updated_at: new Date().toISOString(),
                      })
                      .eq('user_id', user.id);
                    if (error) throw error;
                    useSubscriptionStore.setState({
                      subscriptionInfo: value
                        ? {
                            id: 'demo-override',
                            userId: user.id,
                            status: 'active' as SubscriptionStatus,
                            platform: 'ios' as Platform,
                            productId: 'pro_monthly',
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
                    // hasActiveSubscription은 freeProUntil/grace까지 고려해서 계산
                    useSubscriptionStore.getState().updateComputedStates();
                  } catch (err) {
                    console.error('[Demo] subscription toggle error:', err);
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

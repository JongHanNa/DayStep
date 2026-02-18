/**
 * SettingsMainView — 메인 설정 목록 (섹션별 그룹핑)
 */
import React, {useCallback} from 'react';
import {View, Text, ScrollView, Alert, StyleSheet} from 'react-native';
import {AnimatedCard} from '@/components/core';
import {SettingsRow} from './SettingsRow';
import {useSettingsStore} from '@/stores/settingsStore';
import {useAuthStore} from '@/stores/authStore';
import {useTheme} from '@/theme';
import {
  User,
  Type,
  Palette,
  Clock,
  Vibrate,
  Sparkles,
  Bell,
  Timer,
  PartyPopper,
  CreditCard,
  LogOut,
} from 'lucide-react-native';

type SettingsSubView = 'font' | 'theme' | 'subscription' | 'account';

interface SettingsMainViewProps {
  onNavigate: (view: SettingsSubView) => void;
}

export function SettingsMainView({onNavigate}: SettingsMainViewProps) {
  const {primaryColor} = useTheme();
  const {user, signOut} = useAuthStore();
  const settings = useSettingsStore();

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
      <AnimatedCard enterDelay={0} style={styles.accountCard}>
        <View style={[styles.avatarCircle, {backgroundColor: primaryColor + '20'}]}>
          <User size={24} color={primaryColor} strokeWidth={1.5} />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{displayName}</Text>
          <Text style={styles.accountEmail}>{user?.email ?? ''}</Text>
        </View>
      </AnimatedCard>

      {/* 앱 설정 */}
      <Text style={styles.sectionTitle}>📱 앱 설정</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={Type}
          iconColor="#3B82F6"
          title="폰트 설정"
          value={settings.fontFamily === 'system' ? '시스템 기본' : 'OpenDyslexic'}
          showChevron
          onPress={() => onNavigate('font')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={Palette}
          iconColor="#9333EA"
          title="테마/색상"
          showChevron
          onPress={() => onNavigate('theme')}
          primaryColor={primaryColor}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={Clock}
          iconColor="#F59E0B"
          title="시간 형식"
          isToggle
          toggleValue={settings.timeFormat === '12h'}
          onToggle={v => settings.setTimeFormat(v ? '12h' : '24h')}
          subtitle={settings.timeFormat === '12h' ? '12시간제 (AM/PM)' : '24시간제'}
          primaryColor={primaryColor}
        />
      </View>

      {/* ADHD 설정 */}
      <Text style={styles.sectionTitle}>🧠 ADHD 설정</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={Vibrate}
          iconColor="#EC4899"
          title="햅틱 피드백"
          isToggle
          toggleValue={settings.hapticEnabled}
          onToggle={settings.setHapticEnabled}
          primaryColor={primaryColor}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={Sparkles}
          iconColor="#8B5CF6"
          title="애니메이션"
          isToggle
          toggleValue={settings.animationsEnabled}
          onToggle={settings.setAnimationsEnabled}
          primaryColor={primaryColor}
        />
      </View>

      {/* 알림 */}
      <Text style={styles.sectionTitle}>🔔 알림</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={Bell}
          iconColor="#22C55E"
          title="알림 활성화"
          isToggle
          toggleValue={settings.notificationsEnabled}
          onToggle={settings.setNotificationsEnabled}
          primaryColor={primaryColor}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon={Timer}
          iconColor="#F97316"
          title="포모도로 알림"
          isToggle
          toggleValue={settings.pomodoroReminders}
          onToggle={v =>
            useSettingsStore.setState({pomodoroReminders: v})
          }
          primaryColor={primaryColor}
        />
      </View>

      {/* 할일 */}
      <Text style={styles.sectionTitle}>✅ 할일</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={PartyPopper}
          iconColor="#F59E0B"
          title="완료 축하 효과"
          isToggle
          toggleValue={settings.celebrationEffects}
          onToggle={settings.setCelebrationEffects}
          primaryColor={primaryColor}
        />
      </View>

      {/* 구독 관리 */}
      <View style={[styles.section, {marginTop: 16}]}>
        <SettingsRow
          icon={CreditCard}
          iconColor="#6366F1"
          title="구독 관리"
          showChevron
          onPress={() => onNavigate('subscription')}
        />
      </View>

      {/* 로그아웃 */}
      <View style={[styles.section, {marginTop: 16, marginBottom: 40}]}>
        <SettingsRow
          icon={LogOut}
          iconColor="#EF4444"
          title="로그아웃"
          onPress={handleSignOut}
        />
      </View>
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
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
});

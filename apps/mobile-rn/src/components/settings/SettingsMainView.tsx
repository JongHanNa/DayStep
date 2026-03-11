/**
 * SettingsMainView — 메인 설정 목록 (섹션별 그룹핑)
 */
import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, ScrollView, Alert, StyleSheet} from 'react-native';
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
  CreditCard,
  LogOut,
  ShieldCheck,
  Calendar,
} from 'lucide-react-native';
import {useCalendarStore} from '@/stores/calendarStore';

interface SettingsMainViewProps {
  onNavigate: (view: string) => void;
}

export function SettingsMainView({onNavigate}: SettingsMainViewProps) {
  const {primaryColor} = useTheme();
  const {user, signOut} = useAuthStore();
  const settings = useSettingsStore();
  const {isConnected, connectGoogleCalendar, disconnectGoogleCalendar} =
    useCalendarStore();
  const [isAdmin, setIsAdmin] = useState(false);
  const isGoogleUser = user?.app_metadata?.provider === 'google';

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
      connectGoogleCalendar();
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
      <AnimatedCard enterDelay={0} style={styles.accountCard}>
        <View style={[styles.avatarCircle, {backgroundColor: primaryColor + '20'}]}>
          <User size={24} color={primaryColor} strokeWidth={1.5} />
        </View>
        <View style={styles.accountInfo}>
          <Text style={styles.accountName}>{displayName}</Text>
          <Text style={styles.accountEmail}>{user?.email ?? ''}</Text>
        </View>
      </AnimatedCard>

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

      {/* 앱 설정 */}
      <Text style={styles.sectionTitle}>앱 설정</Text>
      <View style={styles.section}>
        <SettingsRow
          icon={Palette}
          iconColor="#9333EA"
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
              value={isConnected ? '연결됨 ✓' : '연결하기'}
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
              iconColor="#6366F1"
              title="플랜 한도 관리"
              subtitle="Free/Pro 엔티티 한도 설정"
              showChevron
              onPress={() => onNavigate('adminPlanLimits')}
            />
          </View>
        </>
      )}

      {/* 로그아웃 */}
      <View style={[styles.section, {marginTop: 16, marginBottom: __DEV__ ? 16 : 40}]}>
        <SettingsRow
          icon={LogOut}
          iconColor="#EF4444"
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

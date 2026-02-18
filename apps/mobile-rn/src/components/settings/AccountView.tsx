/**
 * AccountView — 프로필 정보, 로그아웃
 */
import React, {useCallback} from 'react';
import {View, Text, Alert, StyleSheet} from 'react-native';
import {AnimatedPressable, AnimatedCard} from '@/components/core';
import {useAuthStore} from '@/stores/authStore';
import {useTheme} from '@/theme';
import {ArrowLeft, User, LogOut} from 'lucide-react-native';

interface AccountViewProps {
  onBack: () => void;
}

export function AccountView({onBack}: AccountViewProps) {
  const {primaryColor} = useTheme();
  const {user, signOut} = useAuthStore();

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

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <AnimatedPressable onPress={onBack} hapticType="light" scaleValue={0.9}>
          <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
        </AnimatedPressable>
        <Text style={styles.title}>계정</Text>
        <View style={{width: 24}} />
      </View>

      {/* 프로필 카드 */}
      <AnimatedCard enterDelay={0} style={styles.profileCard}>
        <View style={[styles.avatar, {backgroundColor: primaryColor + '20'}]}>
          <User size={32} color={primaryColor} strokeWidth={1.5} />
        </View>
        <Text style={styles.name}>
          {user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '사용자'}
        </Text>
        <Text style={styles.email}>{user?.email ?? ''}</Text>
        <Text style={styles.provider}>
          {user?.app_metadata?.provider === 'google'
            ? '🔑 Google 계정으로 로그인'
            : user?.app_metadata?.provider === 'apple'
            ? '🔑 Apple 계정으로 로그인'
            : '🔑 로그인됨'}
        </Text>
      </AnimatedCard>

      {/* 로그아웃 버튼 */}
      <AnimatedPressable
        onPress={handleSignOut}
        hapticType="medium"
        scaleValue={0.95}
        style={styles.logoutBtn}>
        <LogOut size={18} color="#EF4444" strokeWidth={2} />
        <Text style={styles.logoutText}>로그아웃</Text>
      </AnimatedPressable>
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
  profileCard: {
    marginHorizontal: 16,
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  email: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  provider: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
});

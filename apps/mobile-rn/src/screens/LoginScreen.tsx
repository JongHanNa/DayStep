/**
 * 프리미엄 로그인 화면
 * Calm Luxe 그라디언트 + 입장 애니메이션 + 네이티브 OAuth
 */
import React, {useState, useRef, useCallback} from 'react';
import {Text, View, TextInput, ActivityIndicator, Platform, Alert, Pressable} from 'react-native';
import Animated, {FadeInDown, FadeIn} from 'react-native-reanimated';
import {ScreenContainer, AnimatedPressable} from '@/components/core';
import {GradientBackground} from '@/components/core';
import {useAuthStore} from '@/stores/authStore';
import {supabase} from '@/lib/supabase';
import {
  signInWithGoogle,
  signInWithApple,
  extractEmailFromIdToken,
  checkExistingAccount,
} from '@/lib/auth';
import {LinkAccountModal} from '@/components/auth/LinkAccountModal';

export default function LoginScreen() {
  const {signInWithIdToken, loading, error, clearError} = useAuthStore();
  const [authProvider, setAuthProvider] = useState<string | null>(null);

  // 심사용 이메일 로그인 (로고 5번 탭으로 활성화)
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoTap = useCallback(() => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setShowEmailLogin(prev => !prev);
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 2000);
    }
  }, []);

  const handleEmailSignIn = async () => {
    if (!email || !password) return;
    setAuthProvider('email');
    clearError();
    try {
      const {data, error: authError} = await supabase.auth.signInWithPassword({email, password});
      if (authError) throw authError;
      if (data.session) {
        useAuthStore.setState({
          user: data.session.user,
          session: data.session,
          isAuthenticated: true,
        });
      }
    } catch (err: any) {
      Alert.alert('로그인 실패', err.message ?? '이메일 로그인 중 오류가 발생했습니다');
    } finally {
      setAuthProvider(null);
    }
  };

  // 계정 연결 모달 state
  const [linkModalVisible, setLinkModalVisible] = useState(false);
  const [linkModalData, setLinkModalData] = useState<{
    existingProvider: string | null;
    newProvider: 'google' | 'apple';
    idToken: string;
    nonce?: string;
  } | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  /**
   * OAuth 공통 플로우: idToken → 기존 계정 확인 → 모달 or 바로 로그인
   */
  const processOAuthSignIn = async (
    provider: 'google' | 'apple',
    idToken: string,
    nonce?: string,
  ) => {
    const email = extractEmailFromIdToken(idToken);

    if (email) {
      const existing = await checkExistingAccount(email);
      if (existing.exists && existing.provider && existing.provider !== provider) {
        // 다른 프로바이더로 이미 가입됨 → 모달 표시
        setLinkModalData({
          existingProvider: existing.provider,
          newProvider: provider,
          idToken,
          nonce,
        });
        setLinkModalVisible(true);
        return;
      }
    }

    // 새 계정이거나 같은 프로바이더 → 바로 로그인
    await signInWithIdToken(provider, idToken, nonce);
  };

  const handleGoogleSignIn = async () => {
    setAuthProvider('google');
    clearError();
    try {
      const result = await signInWithGoogle();
      if (result) {
        await processOAuthSignIn('google', result.idToken);
      }
    } catch (err: any) {
      Alert.alert('로그인 실패', err.message ?? 'Google 로그인 중 오류가 발생했습니다');
    } finally {
      setAuthProvider(null);
    }
  };

  const handleAppleSignIn = async () => {
    setAuthProvider('apple');
    clearError();
    try {
      const result = await signInWithApple();
      if (result) {
        await processOAuthSignIn('apple', result.idToken, result.nonce);
      }
    } catch (err: any) {
      Alert.alert('로그인 실패', err.message ?? 'Apple 로그인 중 오류가 발생했습니다');
    } finally {
      setAuthProvider(null);
    }
  };

  const handleLinkConfirm = async () => {
    if (!linkModalData) return;
    setLinkLoading(true);
    try {
      await signInWithIdToken(
        linkModalData.newProvider,
        linkModalData.idToken,
        linkModalData.nonce,
      );
      setLinkModalVisible(false);
      setLinkModalData(null);
    } catch (err: any) {
      Alert.alert('연결 실패', err.message ?? '계정 연결 중 오류가 발생했습니다');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleLinkCancel = () => {
    setLinkModalVisible(false);
    setLinkModalData(null);
  };

  // DEV: 개발용 스킵
  const handleDevSkip = async () => {
    // Dev 모드에서는 직접 Main으로 이동하지 않고,
    // 실제 인증 없이도 앱을 볼 수 있도록 placeholder
    useAuthStore.setState({
      isAuthenticated: true,
      initializing: false,
    });
  };

  const isLoading = loading || !!authProvider;

  return (
    <ScreenContainer edges={['top', 'bottom', 'left', 'right']}>
      <GradientBackground
        colors={['#F0F4FF', '#E8ECFF', '#FFFFFF']}
        start={{x: 0.2, y: 0}}
        end={{x: 0.8, y: 1}}
        style={{flex: 1}}>
        <View className="flex-1 justify-center items-center px-8">
          {/* 로고 + 인사 */}
          <Pressable onPress={handleLogoTap}>
            <Animated.Text
              entering={FadeIn.duration(800)}
              className="text-5xl font-bold text-gray-900 mb-2">
              DayStep
            </Animated.Text>
          </Pressable>
          <Animated.Text
            entering={FadeInDown.delay(200).duration(500)}
            className="text-base text-gray-500 mb-3 text-center">
            ADHD 친화적 일상 케어 시스템
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.delay(400).duration(500)}
            className="text-sm text-gray-400 mb-12 text-center">
            오늘 하루를 차분하게 시작하세요
          </Animated.Text>

          {/* 에러 메시지 */}
          {error && (
            <Animated.View
              entering={FadeInDown.duration(300)}
              className="bg-red-50 px-4 py-3 rounded-xl mb-4 w-full">
              <Text className="text-red-600 text-sm text-center">{error}</Text>
            </Animated.View>
          )}

          {/* OAuth 버튼들 */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(500)}
            className="w-full gap-3">
            {/* Google Sign-In */}
            <AnimatedPressable
              onPress={handleGoogleSignIn}
              disabled={isLoading}
              hapticType="medium"
              className="bg-white border border-gray-200 px-6 py-4 rounded-2xl flex-row items-center justify-center"
              style={{opacity: isLoading && authProvider !== 'google' ? 0.5 : 1}}>
              {authProvider === 'google' ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <>
                  <Text className="text-lg mr-3">G</Text>
                  <Text className="text-base font-semibold text-gray-700">
                    Google로 계속하기
                  </Text>
                </>
              )}
            </AnimatedPressable>

            {/* Apple Sign-In (iOS only) */}
            {Platform.OS === 'ios' && (
              <AnimatedPressable
                onPress={handleAppleSignIn}
                disabled={isLoading}
                hapticType="medium"
                className="bg-black px-6 py-4 rounded-2xl flex-row items-center justify-center"
                style={{opacity: isLoading && authProvider !== 'apple' ? 0.5 : 1}}>
                {authProvider === 'apple' ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text className="text-lg mr-3 text-white"></Text>
                    <Text className="text-base font-semibold text-white">
                      Apple로 계속하기
                    </Text>
                  </>
                )}
              </AnimatedPressable>
            )}

            {/* 심사용 이메일 로그인 (로고 5번 탭 시 표시) */}
            {showEmailLogin && (
              <Animated.View entering={FadeInDown.duration(300)} className="mt-4 gap-2">
                <View className="border border-gray-200 rounded-xl bg-white px-4 py-3">
                  <TextInput
                    placeholder="이메일"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    className="text-base text-gray-700"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <View className="border border-gray-200 rounded-xl bg-white px-4 py-3">
                  <TextInput
                    placeholder="비밀번호"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className="text-base text-gray-700"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <AnimatedPressable
                  onPress={handleEmailSignIn}
                  disabled={isLoading}
                  hapticType="medium"
                  className="bg-indigo-500 px-6 py-4 rounded-2xl items-center">
                  {authProvider === 'email' ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      이메일로 로그인
                    </Text>
                  )}
                </AnimatedPressable>
              </Animated.View>
            )}

            {/* DEV: 개발용 스킵 */}
            {__DEV__ && (
              <AnimatedPressable
                onPress={handleDevSkip}
                hapticType="light"
                className="mt-4 px-6 py-3 rounded-xl items-center">
                <Text className="text-sm text-gray-400">
                  개발용 스킵 →
                </Text>
              </AnimatedPressable>
            )}
          </Animated.View>
        </View>

        {/* 하단 약관 */}
        <Animated.View
          entering={FadeInDown.delay(800).duration(500)}
          className="pb-8 px-8">
          <Text className="text-xs text-gray-400 text-center leading-5">
            계속 진행하면 이용약관 및 개인정보처리방침에 동의하는 것입니다
          </Text>
        </Animated.View>
      </GradientBackground>

      {/* 계정 연결 확인 모달 */}
      <LinkAccountModal
        visible={linkModalVisible}
        existingProvider={linkModalData?.existingProvider ?? null}
        newProvider={linkModalData?.newProvider ?? 'google'}
        loading={linkLoading}
        onConfirm={handleLinkConfirm}
        onCancel={handleLinkCancel}
      />
    </ScreenContainer>
  );
}

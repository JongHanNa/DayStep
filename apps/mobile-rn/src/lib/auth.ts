/**
 * Native OAuth providers
 * Google Sign-In + Apple Sign-In → Supabase signInWithIdToken
 */
import {GoogleSignin} from '@react-native-google-signin/google-signin';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import {Platform} from 'react-native';
import Config from 'react-native-config';

// Google Sign-In 설정
GoogleSignin.configure({
  iosClientId: Config.GOOGLE_IOS_CLIENT_ID,
  webClientId: Config.GOOGLE_WEB_CLIENT_ID,
});

/**
 * Google 네이티브 로그인 → idToken 반환
 */
export async function signInWithGoogle(): Promise<{idToken: string} | null> {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if ('data' in response && response.data?.idToken) {
      return {idToken: response.data.idToken};
    }

    console.warn('[Auth] Google sign-in: no idToken in response');
    return null;
  } catch (error: any) {
    if (error.code === 'SIGN_IN_CANCELLED') {
      return null; // 사용자가 취소
    }
    throw error;
  }
}

/**
 * Apple 네이티브 로그인 → idToken + nonce 반환 (iOS only)
 */
export async function signInWithApple(): Promise<{
  idToken: string;
  nonce: string;
} | null> {
  if (Platform.OS !== 'ios') {
    console.warn('[Auth] Apple Sign-In is only available on iOS');
    return null;
  }

  try {
    const appleAuthResponse = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
    });

    const credentialState = await appleAuth.getCredentialStateForUser(
      appleAuthResponse.user,
    );

    if (credentialState !== appleAuth.State.AUTHORIZED) {
      return null;
    }

    if (!appleAuthResponse.identityToken) {
      console.warn('[Auth] Apple sign-in: no identityToken');
      return null;
    }

    return {
      idToken: appleAuthResponse.identityToken,
      nonce: appleAuthResponse.nonce,
    };
  } catch (error: any) {
    if (error.code === appleAuth.Error.CANCELED) {
      return null; // 사용자가 취소
    }
    throw error;
  }
}

/**
 * idToken(JWT)에서 이메일 추출 (base64url 디코드)
 */
export function extractEmailFromIdToken(idToken: string): string | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;

    // base64url → base64 변환
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';

    const decoded = JSON.parse(atob(payload));
    return decoded.email ?? null;
  } catch {
    console.warn('[Auth] Failed to extract email from idToken');
    return null;
  }
}

/**
 * Edge Function으로 기존 계정 존재 여부 확인
 */
export async function checkExistingAccount(
  email: string,
): Promise<{exists: boolean; provider: string | null}> {
  try {
    const response = await fetch(
      `${Config.SUPABASE_URL}/functions/v1/check-existing-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: Config.SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({email}),
      },
    );

    if (!response.ok) {
      return {exists: false, provider: null};
    }

    return await response.json();
  } catch {
    console.warn('[Auth] Failed to check existing account');
    return {exists: false, provider: null};
  }
}

/**
 * Google 로그아웃
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // 무시 — Supabase 로그아웃이 메인
  }
}

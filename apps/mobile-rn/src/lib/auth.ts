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
 * Google 로그아웃
 */
export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch {
    // 무시 — Supabase 로그아웃이 메인
  }
}

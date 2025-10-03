import { supabase } from './supabase';
import type { AuthUser } from '@/types';

// Sign in with OAuth provider
export async function signInWithOAuth(provider: 'google' | 'kakao') {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error(`${provider} OAuth signin error:`, error);
    throw error;
  }

  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

// Get current user
export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Get user error:', error);
    return null;
  }

  return user as AuthUser;
}

// Get current session
export async function getCurrentSession() {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    console.error('Get session error:', error);
    return null;
  }

  return session;
}

// Listen to auth state changes
export function onAuthStateChange(callback: (user: AuthUser | null) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(session?.user as AuthUser || null);
  });
}
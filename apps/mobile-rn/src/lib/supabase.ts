/**
 * Supabase Client for React Native
 * MMKV 기반 세션 스토리지 + 자동 토큰 리프레시
 */
import {createClient} from '@supabase/supabase-js';
import Config from 'react-native-config';
import {supabaseMMKVStorage} from './mmkv';

const supabaseUrl = Config.SUPABASE_URL ?? '';
const supabaseAnonKey = Config.SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: supabaseMMKVStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * JWT 토큰으로 Supabase REST API 직접 호출
 * 웹앱 fetchWithJWT 패턴의 RN 버전
 */
export async function fetchWithJWT(
  path: string,
  options: RequestInit = {},
  timeout = 15000,
): Promise<any> {
  const {data: {session}} = await supabase.auth.getSession();
  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error('No authentication token available');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Supabase API error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * RLS 테이블 쿼리 헬퍼
 */
export async function queryTable<T = any>(
  table: string,
  params: {
    select?: string;
    filters?: string;
    order?: string;
    limit?: number;
  } = {},
): Promise<T[]> {
  const queryParts: string[] = [];
  if (params.select) queryParts.push(`select=${params.select}`);
  if (params.order) queryParts.push(`order=${params.order}`);
  if (params.limit) queryParts.push(`limit=${params.limit}`);

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
  const filterString = params.filters ? `&${params.filters}` : '';

  return fetchWithJWT(`${table}${queryString}${filterString}`);
}

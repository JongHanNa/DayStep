/**
 * RevenueCat SDK 래퍼 — PAYMENTS_ENABLED = false 동안 no-op 스텁
 *
 * ── 구독제 재전환 시 복구 방법 ─────────────────────────────────────────────
 *  1. 이 파일 하단 주석 블록(ORIGINAL_REVENUECAT_START ~ END)으로 전체 교체
 *  2. react-native.config.js 에서 react-native-purchases 항목 삭제
 *  3. cd ios && pod install
 *  4. featureFlags.ts 에서 PAYMENTS_ENABLED: true 로 변경
 *  5. SubscriptionView.tsx 원본 코드 주석 해제
 * ─────────────────────────────────────────────────────────────────────────────
 */

// CustomerInfo 타입만 최소 정의 (RootNavigator 등 호출부 타입 호환 유지)
export type CustomerInfo = {
  entitlements: {active: Record<string, unknown>};
};

export type PurchasesPackage = unknown;

export function initRevenueCat(): void {
  // no-op
}

export async function loginRevenueCat(_userId: string): Promise<CustomerInfo | null> {
  return null;
}

export async function logoutRevenueCat(): Promise<void> {
  // no-op
}

type PurchaseResult =
  | {success: true; customerInfo: CustomerInfo}
  | {success: false; cancelled: true}
  | {success: false; cancelled?: false; error: unknown};

export async function purchaseSelectedPackage(
  _pkg: PurchasesPackage,
): Promise<PurchaseResult> {
  return {success: false, cancelled: true};
}

export async function showManageSubscriptions(): Promise<void> {
  // no-op
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  return null;
}

/*
// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL_REVENUECAT_START
// ═══════════════════════════════════════════════════════════════════════════
/**
 * RevenueCat SDK 래퍼
 * 초기화, 로그인/로그아웃, 구매, 복원 유틸
 *\/
import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import Config from 'react-native-config';
import {Platform} from 'react-native';

export function initRevenueCat() {
  const apiKey =
    Platform.OS === 'ios'
      ? Config.REVENUECAT_IOS_API_KEY
      : Config.REVENUECAT_ANDROID_API_KEY;

  if (!apiKey) {
    console.warn('[RevenueCat] API key not set for platform:', Platform.OS, '— in-app purchases disabled');
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({apiKey});
  console.log('[RevenueCat] configure done, key:', apiKey.substring(0, 10) + '...');
}

export async function loginRevenueCat(userId: string) {
  try {
    const {customerInfo} = await Purchases.logIn(userId);
    console.log('[RevenueCat] logIn:', userId);
    return customerInfo;
  } catch (e) {
    console.warn('[RevenueCat] logIn error:', e);
    return null;
  }
}

export async function logoutRevenueCat() {
  try {
    await Purchases.logOut();
    console.log('[RevenueCat] logOut');
  } catch (e) {
    console.warn('[RevenueCat] logOut error:', e);
  }
}

type PurchaseResult =
  | {success: true; customerInfo: CustomerInfo}
  | {success: false; cancelled: true}
  | {success: false; cancelled?: false; error: unknown};

export async function purchaseSelectedPackage(pkg: PurchasesPackage): Promise<PurchaseResult> {
  try {
    const {customerInfo} = await Purchases.purchasePackage(pkg);
    return {success: true, customerInfo};
  } catch (e: any) {
    if (e.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
      return {success: false, cancelled: true};
    }
    return {success: false, error: e};
  }
}

export async function showManageSubscriptions(): Promise<void> {
  try {
    await Purchases.showManageSubscriptions();
  } catch (e) {
    console.warn('[RevenueCat] showManageSubscriptions error:', e);
  }
}

export async function restorePurchases(): Promise<CustomerInfo | null> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    console.log('[RevenueCat] restorePurchases done');
    return customerInfo;
  } catch (e) {
    console.warn('[RevenueCat] restorePurchases error:', e);
    return null;
  }
}
// ═══════════════════════════════════════════════════════════════════════════
// ORIGINAL_REVENUECAT_END
// ═══════════════════════════════════════════════════════════════════════════
*/

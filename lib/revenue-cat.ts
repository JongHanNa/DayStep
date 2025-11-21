/**
 * Revenue Cat TypeScript Wrapper
 *
 * Capacitor Purchases 플러그인을 래핑하여 사용하기 쉽게 만든 유틸리티
 */

import { Purchases, LOG_LEVEL, PurchasesOfferings, CustomerInfo } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';
import { FEATURE_FLAGS } from './featureFlags';

/**
 * 환경별 Product ID 매핑
 */
const PRODUCT_IDS = {
  development: {
    monthly: 'pro_monthly_dev',
    yearly: 'pro_yearly_dev',
  },
  production: {
    monthly: 'pro_monthly',
    yearly: 'pro_yearly',
  },
} as const;

/**
 * 현재 환경에 맞는 Product ID 가져오기
 */
function getProductId(plan: 'monthly' | 'yearly'): string {
  const isDevelopment =
    process.env.NEXT_PUBLIC_CAPACITOR_ENV === 'development' ||
    process.env.CAPACITOR_ENV === 'development' ||
    process.env.NODE_ENV === 'development';

  const productId = isDevelopment
    ? PRODUCT_IDS.development[plan]
    : PRODUCT_IDS.production[plan];

  console.log(`[RevenueCat] Environment: ${isDevelopment ? 'Development' : 'Production'}, Plan: ${plan}, Product ID: ${productId}`);

  return productId;
}

/**
 * Revenue Cat 초기화
 *
 * 앱 시작 시 호출 필요 (App.tsx 또는 _app.tsx)
 */
export async function initializeRevenueCat(): Promise<void> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    console.log('[RevenueCat] Payments disabled, skipping initialization');
    return;
  }

  try {
    const platform = Capacitor.getPlatform();

    // iOS/Android에서만 초기화
    if (platform !== 'ios' && platform !== 'android') {
      console.log('[RevenueCat] Not running on mobile, skipping initialization');
      return;
    }

    // 환경 판단 (NEXT_PUBLIC_CAPACITOR_ENV 우선, 런타임 접근 가능)
    const isDevelopment =
      process.env.NEXT_PUBLIC_CAPACITOR_ENV === 'development' ||
      process.env.CAPACITOR_ENV === 'development' ||
      process.env.NODE_ENV === 'development';

    // API Key 선택
    const apiKey =
      platform === 'ios'
        ? FEATURE_FLAGS.REVENUE_CAT_IOS_KEY
        : FEATURE_FLAGS.REVENUE_CAT_ANDROID_KEY;

    if (!apiKey || apiKey.includes('YOUR_') || apiKey.includes('_HERE')) {
      console.error('[RevenueCat] Invalid API key, skipping initialization');
      return;
    }

    // 환경 정보 로깅 (디버깅용)
    console.log(`[RevenueCat] Environment: ${isDevelopment ? 'Development' : 'Production'}`);
    console.log(`[RevenueCat] Platform: ${platform}`);
    console.log(`[RevenueCat] API Key: ${apiKey.slice(0, 10)}...`);

    // Debug 모드 설정 (개발 환경에서만)
    await Purchases.setLogLevel({ level: isDevelopment ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO });

    // Revenue Cat 초기화
    await Purchases.configure({
      apiKey,
    });

    console.log('[RevenueCat] Initialized successfully');
  } catch (error) {
    console.error('[RevenueCat] Initialization failed:', error);
    // 초기화 실패해도 앱 크래시는 방지
  }
}

/**
 * 사용자 ID 설정
 *
 * Supabase 사용자 ID를 Revenue Cat에 연결
 */
export async function setRevenueCatUserId(userId: string): Promise<void> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return;
  }

  try {
    await Purchases.logIn({ appUserID: userId });
    console.log('[RevenueCat] User logged in:', userId);
  } catch (error) {
    console.error('[RevenueCat] Failed to log in user:', error);
  }
}

/**
 * 사용자 로그아웃
 */
export async function logoutRevenueCatUser(): Promise<void> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return;
  }

  try {
    await Purchases.logOut();
    console.log('[RevenueCat] User logged out');
  } catch (error) {
    console.error('[RevenueCat] Failed to log out user:', error);
  }
}

/**
 * 사용 가능한 구독 상품 조회
 */
export async function getAvailableOfferings(): Promise<PurchasesOfferings | null> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return null;
  }

  try {
    const offerings = await Purchases.getOfferings();
    console.log('[RevenueCat] Offerings fetched:', offerings);
    return offerings;
  } catch (error) {
    console.error('[RevenueCat] Failed to fetch offerings:', error);
    return null;
  }
}

/**
 * 구독 구매
 *
 * @param plan - 'monthly' | 'yearly'
 */
export async function purchaseSubscription(
  plan: 'monthly' | 'yearly'
): Promise<{ customerInfo: CustomerInfo | null; error: Error | null }> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return { customerInfo: null, error: new Error('Payments are disabled') };
  }

  try {
    // 환경에 맞는 Product ID 가져오기
    const packageIdentifier = getProductId(plan);

    const offerings = await getAvailableOfferings();
    if (!offerings || !offerings.current) {
      throw new Error('No offerings available');
    }

    const packageToPurchase = offerings.current.availablePackages.find(
      (pkg) => pkg.identifier === packageIdentifier
    );

    if (!packageToPurchase) {
      console.error('[RevenueCat] Package not found. Available packages:',
        offerings.current.availablePackages.map(p => p.identifier));
      throw new Error(`Package not found: ${packageIdentifier}`);
    }

    const { customerInfo } = await Purchases.purchasePackage({
      aPackage: packageToPurchase,
    });

    console.log('[RevenueCat] Purchase successful:', customerInfo);
    return { customerInfo, error: null };
  } catch (error: any) {
    console.error('[RevenueCat] Purchase failed:', error);

    // 사용자 취소는 에러로 처리하지 않음
    if (error.code === '1' || error.message?.includes('user cancelled')) {
      return { customerInfo: null, error: null };
    }

    return { customerInfo: null, error };
  }
}

/**
 * 구독 복원
 *
 * 앱 재설치 또는 기기 변경 시 사용
 */
export async function restorePurchases(): Promise<{
  customerInfo: CustomerInfo | null;
  error: Error | null;
}> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return { customerInfo: null, error: new Error('Payments are disabled') };
  }

  try {
    const { customerInfo } = await Purchases.restorePurchases();
    console.log('[RevenueCat] Purchases restored:', customerInfo);
    return { customerInfo, error: null };
  } catch (error: any) {
    console.error('[RevenueCat] Restore failed:', error);
    return { customerInfo: null, error };
  }
}

/**
 * 현재 사용자 구독 정보 조회
 */
export async function getCustomerInfo(): Promise<CustomerInfo | null> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return null;
  }

  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    console.log('[RevenueCat] Customer info fetched:', customerInfo);
    return customerInfo;
  } catch (error) {
    console.error('[RevenueCat] Failed to fetch customer info:', error);
    return null;
  }
}

/**
 * Pro 구독 활성화 여부 확인
 */
export async function hasActiveSubscription(): Promise<boolean> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return true; // 결제 비활성화 시 모든 기능 허용
  }

  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) {
      return false;
    }

    // 'pro' entitlement가 활성화되어 있는지 확인
    const proEntitlement = customerInfo.entitlements.active['pro'];
    return proEntitlement !== undefined;
  } catch (error) {
    console.error('[RevenueCat] Failed to check subscription status:', error);
    return false;
  }
}

/**
 * 구독 만료일 조회
 */
export async function getSubscriptionExpirationDate(): Promise<Date | null> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return null;
  }

  try {
    const customerInfo = await getCustomerInfo();
    if (!customerInfo) {
      return null;
    }

    const proEntitlement = customerInfo.entitlements.active['pro'];
    if (!proEntitlement || !proEntitlement.expirationDate) {
      return null;
    }

    return new Date(proEntitlement.expirationDate);
  } catch (error) {
    console.error('[RevenueCat] Failed to get expiration date:', error);
    return null;
  }
}

/**
 * 프로모션 코드 적용 (iOS만 지원)
 */
export async function presentCodeRedemptionSheet(): Promise<void> {
  if (!FEATURE_FLAGS.PAYMENTS_ENABLED) {
    return;
  }

  const platform = Capacitor.getPlatform();
  if (platform !== 'ios') {
    console.warn('[RevenueCat] Code redemption is only available on iOS');
    return;
  }

  try {
    await Purchases.presentCodeRedemptionSheet();
    console.log('[RevenueCat] Code redemption sheet presented');
  } catch (error) {
    console.error('[RevenueCat] Failed to present code redemption sheet:', error);
  }
}

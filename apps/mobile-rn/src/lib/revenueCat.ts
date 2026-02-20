/**
 * RevenueCat SDK 래퍼
 * 초기화, 로그인/로그아웃, 구매, 복원 유틸
 */
import Purchases, {
  LOG_LEVEL,
  type PurchasesPackage,
  type CustomerInfo,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import Config from 'react-native-config';

/** 앱 시작 시 1회 호출 */
export function initRevenueCat() {
  const apiKey = Config.REVENUECAT_IOS_API_KEY;
  if (!apiKey) {
    console.warn('[RevenueCat] REVENUECAT_IOS_API_KEY is not set');
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({apiKey});
  console.log('[RevenueCat] configure done');
}

/** 인증 후 호출 — RevenueCat에 사용자 식별 */
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

/** 로그아웃 시 호출 — 익명 사용자로 전환 */
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

/** 패키지 구매 */
export async function purchaseSelectedPackage(
  pkg: PurchasesPackage,
): Promise<PurchaseResult> {
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

/** 네이티브 구독 관리 시트 표시 (iOS 13+) */
export async function showManageSubscriptions(): Promise<void> {
  try {
    await Purchases.showManageSubscriptions();
  } catch (e) {
    console.warn('[RevenueCat] showManageSubscriptions error:', e);
  }
}

/** 구독 복원 */
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

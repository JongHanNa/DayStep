/**
 * Electron 구독 결제 브릿지
 *
 * 구독 UI는 앱 내에 표시 (기존 컴포넌트 재사용)
 * "결제하기" 버튼 → shell.openExternal(webPaymentURL) → 웹 결제 페이지
 * 결제 완료 → 앱 복귀 → 세션 리프레시로 구독 상태 확인
 */

export async function openSubscriptionPayment(paymentUrl: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const electronAPI = (window as any).electronAPI;
  if (!electronAPI) return false;

  try {
    const result = await electronAPI.subscription.openSubscriptionPage(paymentUrl);
    return result.success;
  } catch (error) {
    console.error('[ElectronSubscription] 결제 페이지 열기 실패:', error);
    return false;
  }
}

export function isElectronDesktop(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window as any).electronAPI;
}

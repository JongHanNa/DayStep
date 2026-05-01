// Electron 정적 export에서는 동적 라우트의 generateStaticParams가 필수.
// 관리자 페이지는 데스크톱 앱에서 사용하지 않으므로 빈 배열 반환 → 빌드에서 제외.
export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default function AdminSubscriptionDetailElectron() {
  return null;
}

// Server component shell — Electron 정적 export 호환을 위해 generateStaticParams 노출.
// 빈 배열 반환: Electron 빌드는 이 페이지를 생성하지 않고, 웹 빌드는 런타임 SSR로 처리.
import SubscriptionDetailClient from './SubscriptionDetailClient';

export function generateStaticParams() {
  // Electron 정적 export 호환용 placeholder.
  // 실제 admin 라우팅은 웹(Vercel) 환경에서만 의미 있음 — 빈 배열은 Next 15 export에서 거부됨.
  return [{ userId: '_placeholder' }];
}

export default function Page() {
  return <SubscriptionDetailClient />;
}

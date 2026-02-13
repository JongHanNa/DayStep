'use client';

import { BannerView } from './components/BannerView';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';

interface BannerScreenProps {
  userId: string;
}

/**
 * 마음 깨우기 화면
 * screens/ 아키텍처에서 사용하는 독립적인 화면 컴포넌트
 *
 * BannerView를 직접 사용
 */
export function BannerScreen({ userId }: BannerScreenProps) {
  const { goRelationshipInsights, goFuel } = useADHDNavigation();

  return (
    <BannerView
      userId={userId}
      onRelationshipInsights={() => goRelationshipInsights()}
      onFuel={() => goFuel('execute')}
    />
  );
}

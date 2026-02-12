'use client';

import { useEffect } from 'react';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';

/**
 * /adhd/execute - 실행 모드 페이지
 *
 * @deprecated 포커스 기능이 타임라인/플래너에 인라인으로 통합되었습니다.
 * 기존 URL 접근 시 타임라인으로 리다이렉트합니다.
 */
export default function ExecutePage() {
  const { goScreen } = useADHDNavigation();

  useEffect(() => {
    goScreen('timeline');
  }, [goScreen]);

  return (
    <div className="flex items-center justify-center h-screen">
      <span className="loading loading-spinner loading-md" />
    </div>
  );
}

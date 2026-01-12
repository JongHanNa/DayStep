'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { ActiveTodoBanner } from '@/components/shared/ActiveTodoBanner';

/**
 * 진행 중인 할일 배너를 앱 전체에 표시하는 Provider
 * 로그인/랜딩 페이지에서는 표시하지 않음
 */
export function ActiveTodoBannerProvider() {
  const pathname = usePathname();

  // 로그인, 랜딩, 설정 페이지에서는 배너 표시하지 않음
  const hideBannerPaths = ['/', '/login', '/settings'];
  const shouldHideBanner = hideBannerPaths.some(
    path => pathname === path || pathname?.startsWith('/login') || pathname?.startsWith('/settings')
  );

  if (shouldHideBanner) {
    return null;
  }

  return <ActiveTodoBanner />;
}

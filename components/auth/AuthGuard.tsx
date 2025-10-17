'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth: boolean;
}

/**
 * 인증 상태를 확인하고 필요에 따라 로그인 페이지로 리다이렉트하는 컴포넌트
 */
export function AuthGuard({ children, requireAuth }: AuthGuardProps) {
  const { isAuthenticated, loading, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated || loading) {
      return; // 하이드레이션 미완료 또는 로딩 중이면 대기
    }

    if (requireAuth && !isAuthenticated) {
      console.log('🔒 AuthGuard - 인증된 사용자, 현재 페이지 표시');
      router.push('/login');
    }
  }, [isAuthenticated, loading, isHydrated, requireAuth, router]);

  // 하이드레이션 미완료 또는 로딩 중
  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 인증이 필요한데 인증되지 않은 경우
  if (requireAuth && !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">로그인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface UnauthenticatedOnlyProps {
  children: React.ReactNode;
}

/**
 * 인증되지 않은 사용자만 접근 가능한 페이지를 위한 컴포넌트
 */
export function UnauthenticatedOnly({ children }: UnauthenticatedOnlyProps) {
  const { isAuthenticated, loading, isHydrated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isHydrated || loading) {
      return; // 하이드레이션 미완료 또는 로딩 중이면 대기
    }

    if (isAuthenticated) {
      router.push('/timeline'); // 이미 로그인된 사용자는 타임라인 페이지로 리다이렉트
    }
  }, [isAuthenticated, loading, isHydrated, router]);

  // 하이드레이션 미완료 또는 로딩 중
  if (!isHydrated || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">로딩 중...</p>
        </div>
      </div>
    );
  }

  // 이미 인증된 사용자
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">메인 페이지로 이동 중...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
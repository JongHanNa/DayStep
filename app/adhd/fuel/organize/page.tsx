'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { OrganizeView } from '@/components/adhd/fuel';

/**
 * /adhd/fuel/organize - 정리 서브탭 페이지
 */
export default function OrganizePage() {
  const { user } = useAuth();

  // Store 동기화
  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterFuelMode(user.id, undefined, 'organize');
    }
  }, [user?.id]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-base-content/60">
        로그인이 필요합니다
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      <OrganizeView userId={user.id} />
    </div>
  );
}

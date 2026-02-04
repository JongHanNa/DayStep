'use client';

import { useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import FuelMode from '@/components/adhd/FuelMode';

/**
 * /adhd/fuel/motivation - 원동력 탭 전용 페이지
 * HomeTableOfContents에서 "원동력" 메뉴 클릭 시 진입
 */
export default function MotivationPage() {
  const { user } = useAuth();
  const { goHome } = useADHDNavigation();

  useEffect(() => {
    if (user?.id) {
      useADHDModeStore.getState().enterFuelMode(user.id, undefined, 'motivation');
    }
  }, [user?.id]);

  return <FuelMode onExit={goHome} />;
}

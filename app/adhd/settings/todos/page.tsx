'use client';

import { useEffect } from 'react';
import { useADHDModeStore } from '@/state/stores/adhdModeStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import TodosContent from '@/components/adhd/settings/TodosContent';

/**
 * /adhd/settings/todos - 할일 완료 설정 페이지
 */
export default function TodosPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDModeStore.getState().enterSettingsMode('todos');
  }, []);

  return <TodosContent onBack={() => goSettings()} />;
}

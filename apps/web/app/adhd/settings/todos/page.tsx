'use client';

import { useEffect } from 'react';
import { useADHDStore } from '@/state/stores/adhdStore';
import { useADHDNavigation } from '@/lib/navigation/adhdNavigation';
import TodosView from '@/components/adhd/settings/TodosView';

/**
 * /adhd/settings/todos - 할일 완료 설정 페이지
 */
export default function TodosPage() {
  const { goSettings } = useADHDNavigation();

  // Store 동기화
  useEffect(() => {
    useADHDStore.getState().enterSettingsMode('todos');
  }, []);

  return <TodosView onBack={() => goSettings()} />;
}

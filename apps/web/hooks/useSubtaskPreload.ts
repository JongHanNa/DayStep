import { useEffect, useRef } from 'react';
import { useTodoStore } from '@/state/stores/todoStore';

export function useSubtaskPreload(todoIds: string[]) {
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newIds = todoIds.filter(id =>
      !fetchedRef.current.has(id) && !id.includes('-recurrence-')
    );
    if (newIds.length === 0) return;
    const { fetchSubtasks } = useTodoStore.getState();
    newIds.forEach(id => {
      fetchedRef.current.add(id);
      fetchSubtasks(id);
    });
  }, [todoIds.join(',')]);
}

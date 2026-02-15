import { useEffect, useRef } from 'react';
import { useTodoStore } from '@/state/stores/todoStore';

export function useSubtaskPreload(todoIds: string[]) {
  const fetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const newIds = todoIds.filter(id =>
      !fetchedRef.current.has(id) && !id.includes('-recurrence-')
    );
    if (newIds.length === 0) return;

    newIds.forEach(id => fetchedRef.current.add(id));

    // 순차 처리: 동시 set() 호출에 의한 Maximum update depth 방지
    let cancelled = false;
    (async () => {
      const { fetchSubtasks } = useTodoStore.getState();
      for (const id of newIds) {
        if (cancelled) break;
        await fetchSubtasks(id);
      }
    })();

    return () => { cancelled = true; };
  }, [todoIds.join(',')]);
}

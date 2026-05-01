'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isElectronEnvironment } from '@/lib/utils';
import { useAuthStore } from '@/state/stores/authStore';
import { useTodoStore } from '@/state/stores/todoStore';

const PENDING_STORE_KEY = 'pendingQuickAdds';

interface PendingTodo {
  text: string;
  receivedAt: number;
}

export function QuickAddBridge() {
  const lastReceivedRef = useRef(0);

  useEffect(() => {
    if (!isElectronEnvironment()) return;
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.quickAdd?.onPendingTodo) return;

    const handle = async (data: PendingTodo) => {
      // 중복 트리거 방지 (같은 receivedAt가 두 번 들어오면 무시)
      if (data.receivedAt === lastReceivedRef.current) return;
      lastReceivedRef.current = data.receivedAt;

      const user = useAuthStore.getState().user;
      if (!user) {
        await enqueuePending(electronAPI, data);
        toast.info('로그인 후 자동으로 추가됩니다.', {
          description: data.text.slice(0, 60),
        });
        return;
      }

      await createQuickTodo(user.id, data.text);
    };

    const cleanup = electronAPI.quickAdd.onPendingTodo(handle);
    return cleanup;
  }, []);

  // 로그인 상태가 되면 큐잉된 항목 flush
  useEffect(() => {
    if (!isElectronEnvironment()) return;
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.store) return;

    const unsubscribe = useAuthStore.subscribe(async (state, prev) => {
      if (state.user && !prev.user) {
        await flushPending(electronAPI, state.user.id);
      }
    });
    return unsubscribe;
  }, []);

  return null;
}

async function createQuickTodo(userId: string, text: string): Promise<void> {
  try {
    const startTime = todayStartIsoKst();
    await useTodoStore.getState().createTodo({
      user_id: userId,
      title: text,
      start_time: startTime,
      schedule_type: 'anytime',
    });
    toast.success('할일에 추가됨', { description: text.slice(0, 60) });
  } catch (error) {
    console.error('[QuickAdd] createTodo 실패:', error);
    toast.error('할일 추가 실패', { description: text.slice(0, 60) });
  }
}

async function enqueuePending(electronAPI: any, data: PendingTodo): Promise<void> {
  try {
    const queue: PendingTodo[] = (await electronAPI.store.get(PENDING_STORE_KEY)) || [];
    queue.push(data);
    await electronAPI.store.set(PENDING_STORE_KEY, queue);
  } catch (error) {
    console.error('[QuickAdd] enqueue 실패:', error);
  }
}

async function flushPending(electronAPI: any, userId: string): Promise<void> {
  try {
    const queue: PendingTodo[] = (await electronAPI.store.get(PENDING_STORE_KEY)) || [];
    if (queue.length === 0) return;
    await electronAPI.store.set(PENDING_STORE_KEY, []);
    for (const item of queue) {
      await createQuickTodo(userId, item.text);
    }
  } catch (error) {
    console.error('[QuickAdd] flush 실패:', error);
  }
}

function todayStartIsoKst(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return new Date(`${yyyy}-${mm}-${dd}T00:00:00+09:00`).toISOString();
}

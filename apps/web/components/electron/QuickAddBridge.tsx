'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isElectronEnvironment } from '@/lib/utils';
import { useAuthStore } from '@/state/stores/authStore';
import { useTodoStore } from '@/state/stores/todoStore';

const PENDING_STORE_KEY = 'pendingQuickAdds';
const SESSION_STORE_KEY = 'supabase_auth_session';

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
      if (data.receivedAt === lastReceivedRef.current) return;
      lastReceivedRef.current = data.receivedAt;

      const userId = await resolveUserId(electronAPI);
      if (!userId) {
        await enqueuePending(electronAPI, data);
        toast.info('로그인 후 자동으로 추가됩니다.', {
          description: data.text.slice(0, 60),
        });
        return;
      }

      await createQuickTodo(userId, data.text);
    };

    const cleanup = electronAPI.quickAdd.onPendingTodo(handle);
    return cleanup;
  }, []);

  // 큐잉된 항목 flush — 마운트 후 user 잡힐 때까지 폴링 (최대 30초)
  useEffect(() => {
    if (!isElectronEnvironment()) return;
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI?.store) return;

    let cancelled = false;
    let attempts = 0;
    const MAX_ATTEMPTS = 60;

    const tryFlush = async () => {
      if (cancelled) return;
      const userId = await resolveUserId(electronAPI);
      if (userId) {
        await flushPending(electronAPI, userId);
        return;
      }
      if (++attempts < MAX_ATTEMPTS) {
        setTimeout(tryFlush, 500);
      }
    };
    tryFlush();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}

// useAuthStore.user를 우선 시도, 없으면 electron-store의 supabase 세션에서 user.id 추출
async function resolveUserId(electronAPI: any): Promise<string | null> {
  const u = useAuthStore.getState().user;
  if (u?.id) return u.id;
  try {
    const raw = await electronAPI.store.get(SESSION_STORE_KEY);
    if (!raw) return null;
    const sess = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return sess?.user?.id || null;
  } catch {
    return null;
  }
}

async function createQuickTodo(userId: string, text: string): Promise<void> {
  try {
    await useTodoStore.getState().createTodo({
      user_id: userId,
      title: text,
      start_time: todayStartIsoKst(),
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

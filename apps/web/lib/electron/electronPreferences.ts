/**
 * Electron 세션 저장소
 * electron-store 래핑
 */

function getElectronAPI() {
  if (typeof window === 'undefined') return null;
  return (window as any).electronAPI;
}

export const ElectronPreferences = {
  async get(opts: { key: string }): Promise<{ value: string | null }> {
    const api = getElectronAPI();
    if (!api) return { value: null };
    try {
      const value = await api.store.get(opts.key);
      return { value: value != null ? (typeof value === 'string' ? value : JSON.stringify(value)) : null };
    } catch {
      return { value: null };
    }
  },

  async set(opts: { key: string; value: string }): Promise<void> {
    const api = getElectronAPI();
    if (!api) return;
    await api.store.set(opts.key, opts.value);
  },

  async remove(opts: { key: string }): Promise<void> {
    const api = getElectronAPI();
    if (!api) return;
    await api.store.remove(opts.key);
  },

  async clear(): Promise<void> {
    // electron-store는 전체 삭제가 아닌 키별 삭제
    const keysToRemove = [
      'supabase_auth_session',
      'supabase.auth.session',
      'supabase.auth.token',
    ];
    const api = getElectronAPI();
    if (!api) return;
    for (const key of keysToRemove) {
      await api.store.remove(key);
    }
  },

  async keys(): Promise<{ keys: string[] }> {
    return { keys: [] };
  },
};

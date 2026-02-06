import Store from 'electron-store';

interface StoreSchema {
  supabase_auth_session: string | null;
  window_state: {
    width: number;
    height: number;
    x?: number;
    y?: number;
    isMaximized: boolean;
  };
  app_preferences: Record<string, any>;
}

let store: Store<StoreSchema> | null = null;

export function createStore(): Store<StoreSchema> {
  if (!store) {
    store = new Store<StoreSchema>({
      name: 'daystep-config',
      defaults: {
        supabase_auth_session: null,
        window_state: {
          width: 1200,
          height: 800,
          isMaximized: false,
        },
        app_preferences: {},
      },
    });
  }
  return store;
}

export function getStore(): Store<StoreSchema> {
  if (!store) return createStore();
  return store;
}

export function getWindowState() {
  return getStore().get('window_state');
}

export function setWindowState(state: StoreSchema['window_state']) {
  getStore().set('window_state', state);
}

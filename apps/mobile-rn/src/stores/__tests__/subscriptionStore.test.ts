// supabase mock
const mockFrom = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

jest.mock('@/lib/mmkv', () => ({
  zustandMMKVStorage: {
    getItem: jest.fn(() => null),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const {useSubscriptionStore} = require('../subscriptionStore');

function resetStore() {
  useSubscriptionStore.getState().reset();
}

beforeEach(() => {
  jest.clearAllMocks();
  resetStore();
});

function mockSupabaseChain(resolvedData: any, resolvedError: any = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({data: resolvedData, error: resolvedError}),
  };
  mockFrom.mockReturnValue(chain);
  return chain;
}

describe('subscriptionStore', () => {
  describe('fetchSubscription', () => {
    test('active 구독 → hasActiveSubscription true', async () => {
      mockSupabaseChain({
        id: 'sub-1',
        user_id: 'user-1',
        status: 'active',
        platform: 'ios',
        product_id: 'monthly',
        trial_start_date: null,
        trial_end_date: null,
        subscription_start_date: '2026-03-01T00:00:00Z',
        subscription_end_date: '2026-04-01T00:00:00Z',
        is_legacy_user: false,
        legacy_grace_period_end: null,
        promo_code: null,
        auto_renew_enabled: true,
        cancelled_at: null,
        created_at: '2026-03-01T00:00:00Z',
        updated_at: '2026-03-01T00:00:00Z',
      });

      await useSubscriptionStore.getState().fetchSubscription('user-1');

      const state = useSubscriptionStore.getState();
      expect(state.subscriptionInfo).not.toBeNull();
      expect(state.hasActiveSubscription).toBe(true);
      expect(state.loading).toBe(false);
    });

    test('구독 없음 → hasActiveSubscription false', async () => {
      mockSupabaseChain(null);

      await useSubscriptionStore.getState().fetchSubscription('user-1');

      const state = useSubscriptionStore.getState();
      expect(state.subscriptionInfo).toBeNull();
      expect(state.hasActiveSubscription).toBe(false);
    });

    test('expired 구독 → hasActiveSubscription false', async () => {
      mockSupabaseChain({
        id: 'sub-1',
        user_id: 'user-1',
        status: 'expired',
        platform: 'ios',
        product_id: 'monthly',
        trial_start_date: null,
        trial_end_date: null,
        subscription_start_date: '2026-01-01T00:00:00Z',
        subscription_end_date: '2026-02-01T00:00:00Z',
        is_legacy_user: false,
        legacy_grace_period_end: null,
        promo_code: null,
        auto_renew_enabled: false,
        cancelled_at: '2026-02-01T00:00:00Z',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-02-01T00:00:00Z',
      });

      await useSubscriptionStore.getState().fetchSubscription('user-1');

      const state = useSubscriptionStore.getState();
      expect(state.hasActiveSubscription).toBe(false);
    });

    test('에러 발생 → error 설정', async () => {
      mockSupabaseChain(null, {message: 'DB error'});

      await useSubscriptionStore.getState().fetchSubscription('user-1');

      expect(useSubscriptionStore.getState().error).toBe('DB error');
    });
  });

  describe('updateComputedStates', () => {
    test('subscriptionInfo null → 기본값', () => {
      useSubscriptionStore.setState({subscriptionInfo: null});
      useSubscriptionStore.getState().updateComputedStates();

      const state = useSubscriptionStore.getState();
      expect(state.hasActiveSubscription).toBe(false);
      expect(state.isInTrial).toBe(false);
      expect(state.daysRemainingInTrial).toBeNull();
      expect(state.isTrialEligible).toBe(true);
    });
  });

  describe('reset', () => {
    test('상태 초기화', () => {
      useSubscriptionStore.setState({
        hasActiveSubscription: true,
        isInTrial: true,
        error: 'some error',
      });

      useSubscriptionStore.getState().reset();

      const state = useSubscriptionStore.getState();
      expect(state.subscriptionInfo).toBeNull();
      expect(state.hasActiveSubscription).toBe(false);
      expect(state.isInTrial).toBe(false);
      expect(state.error).toBeNull();
      expect(state.hasSeenTrialOffer).toBe(false);
    });
  });
});

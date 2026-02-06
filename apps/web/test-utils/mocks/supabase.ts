// Mock Supabase client
export const mockSupabaseClient = {
  auth: {
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'mock-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    }),
    signInWithOAuth: jest.fn().mockResolvedValue({
      data: { url: 'https://mock-oauth-url.com' },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
  },
  from: jest.fn((table: string) => {
    const mockData = getMockDataForTable(table)
    return {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockData[0], error: null }),
      then: jest.fn((callback) => callback({ data: mockData, error: null })),
    }
  }),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
  })),
  removeChannel: jest.fn(),
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
}

// Helper function to get mock data based on table name
function getMockDataForTable(table: string) {
  switch (table) {
    case 'todos':
      return [
        {
          id: '1',
          user_id: 'mock-user-id',
          content: 'Test todo 1',
          completed: false,
          order_index: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: 'mock-user-id',
          content: 'Test todo 2',
          completed: true,
          order_index: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    case 'repository_items':
      return [
        {
          id: '1',
          user_id: 'mock-user-id',
          type: 'todo',
          title: 'Archived Todo',
          content: 'Archived todo content',
          category: 'work',
          source_id: 'todo-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]
    default:
      return []
  }
}

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient,
}))

jest.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: jest.fn().mockResolvedValue(mockSupabaseClient),
}))
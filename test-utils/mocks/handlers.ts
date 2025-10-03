import { http, HttpResponse } from 'msw'

// Define base URL
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'

// Mock handlers for Supabase API
export const handlers = [
  // Auth endpoints
  http.post(`${SUPABASE_URL}/auth/v1/token`, () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        created_at: new Date().toISOString(),
      },
    })
  }),

  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'mock-user-id',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    })
  }),

  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return HttpResponse.json({ success: true })
  }),

  // Todos endpoints
  http.get(`${SUPABASE_URL}/rest/v1/todos`, () => {
    return HttpResponse.json([
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
    ])
  }),

  http.post(`${SUPABASE_URL}/rest/v1/todos`, async ({ request }) => {
    const body = await request.json() as Record<string, any>
    return HttpResponse.json({
      id: 'new-todo-id',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }),

  http.patch(`${SUPABASE_URL}/rest/v1/todos`, async ({ request }) => {
    const body = await request.json() as Record<string, any>
    return HttpResponse.json({
      ...body,
      updated_at: new Date().toISOString(),
    })
  }),

  http.delete(`${SUPABASE_URL}/rest/v1/todos`, () => {
    return HttpResponse.json({ success: true })
  }),


  // Repository items endpoints
  http.get(`${SUPABASE_URL}/rest/v1/repository_items`, () => {
    return HttpResponse.json([
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
    ])
  }),

  http.post(`${SUPABASE_URL}/rest/v1/repository_items`, async ({ request }) => {
    const body = await request.json() as Record<string, any>
    return HttpResponse.json({
      id: 'new-repo-item-id',
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }),

  // RPC endpoints
  http.post(`${SUPABASE_URL}/rest/v1/rpc/bulk_update_todo_order`, () => {
    return HttpResponse.json({ success: true })
  }),
]
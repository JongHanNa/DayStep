// Mock Supabase before any imports
jest.mock('@/lib/supabase', () => ({
  supabase: {
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
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      then: jest.fn((callback) => callback({ data: [], error: null })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
}))

import { act, renderHook } from '@testing-library/react'
import { useTodoStore } from '@/state/stores/todoStore'
import { createMockTodo } from '@/test-utils/helpers/testData'
import { supabase } from '@/lib/supabase'

const mockSupabaseClient = supabase as jest.Mocked<typeof supabase>

describe('TodoStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useTodoStore())
    act(() => {
      result.current.reset()
    })
    
    // Clear all mocks
    jest.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useTodoStore())

      expect(result.current.todos).toEqual([])
      expect(result.current.selectedTodo).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.filters.searchQuery).toBe('')
      expect(result.current.filters.sortBy).toBe('order_index')
      expect(result.current.filters.completed).toBe('all')
      expect(result.current.stats.totalCount).toBe(0)
    })
  })

  describe('fetchTodosForCurrentView', () => {
    it('should fetch todos successfully', async () => {
      const mockTodos = [
        createMockTodo({ id: '1', content: 'Todo 1' }),
        createMockTodo({ id: '2', content: 'Todo 2', completed: true }),
      ]

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => {
          callback({ 
            data: mockTodos.map(t => t.toDatabase()), 
            error: null 
          });
          return Promise.resolve();
        }),
      })

      const { result } = renderHook(() => useTodoStore())

      await act(async () => {
        await result.current.fetchTodosForCurrentView()
      })

      expect(result.current.todos).toHaveLength(2)
      expect(result.current.todos[0].content).toBe('Todo 1')
      expect(result.current.todos[1].content).toBe('Todo 2')
      expect(result.current.stats.totalCount).toBe(2)
      expect(result.current.stats.completedCount).toBe(1)
      expect(result.current.stats.pendingCount).toBe(1)
    })

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch')

      mockSupabaseClient.from.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => {
          callback({ 
            data: null, 
            error: mockError 
          });
          return Promise.resolve();
        }),
      })

      const { result } = renderHook(() => useTodoStore())

      await act(async () => {
        try {
          await result.current.fetchTodosForCurrentView()
        } catch (error) {
          // Error is expected
        }
      })

      expect(result.current.todos).toHaveLength(0)
    })
  })

  describe('createTodo', () => {
    it('should create a new todo', async () => {
      const newTodoData = {
        user_id: 'user-123',
        content: 'New todo',
      }

      const createdTodo = createMockTodo({
        id: 'new-id',
        content: 'New todo',
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: createdTodo.toDatabase(), 
          error: null 
        }),
      })

      const { result } = renderHook(() => useTodoStore())

      await act(async () => {
        const todo = await result.current.createTodo(newTodoData)
        expect(todo).toBeTruthy()
        expect(todo?.content).toBe('New todo')
      })

      expect(result.current.todos).toHaveLength(1)
      expect(result.current.stats.totalCount).toBe(1)
    })

    it('should handle create error', async () => {
      const mockError = new Error('Failed to create')

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: null, 
          error: mockError 
        }),
      })

      const { result } = renderHook(() => useTodoStore())

      await act(async () => {
        try {
          await result.current.createTodo({
            user_id: 'user-123',
            content: 'New todo',
          })
        } catch (error) {
          expect(error).toBe(mockError)
        }
      })

      expect(result.current.todos).toHaveLength(0)
    })
  })

  describe('updateTodo', () => {
    it('should update an existing todo', async () => {
      const existingTodo = createMockTodo({ id: '1', content: 'Original' })
      
      // Set initial state with a todo
      const { result } = renderHook(() => useTodoStore())
      act(() => {
        result.current.todos = [existingTodo]
        result.current.refreshStats()
      })

      const updatedData = { content: 'Updated content' }
      const updatedTodo = createMockTodo({ 
        id: '1', 
        content: 'Updated content' 
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: updatedTodo.toDatabase(), 
          error: null 
        }),
      })

      await act(async () => {
        const todo = await result.current.updateTodo('1', updatedData)
        expect(todo).toBeTruthy()
        expect(todo?.content).toBe('Updated content')
      })

      expect(result.current.todos[0].content).toBe('Updated content')
    })
  })

  describe('deleteTodo', () => {
    it('should delete a todo', async () => {
      const todo = createMockTodo({ id: '1', content: 'To be deleted' })
      
      // Set initial state with a todo
      const { result } = renderHook(() => useTodoStore())
      act(() => {
        result.current.todos = [todo]
        result.current.refreshStats()
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => callback({ 
          data: null, 
          error: null 
        })),
      })

      await act(async () => {
        const success = await result.current.deleteTodo('1')
        expect(success).toBe(true)
      })

      expect(result.current.todos).toHaveLength(0)
      expect(result.current.stats.totalCount).toBe(0)
    })
  })

  describe('toggleTodo', () => {
    it('should toggle todo completion status', async () => {
      const todo = createMockTodo({ id: '1', completed: false })
      
      // Set initial state with a todo
      const { result } = renderHook(() => useTodoStore())
      act(() => {
        result.current.todos = [todo]
        result.current.refreshStats()
      })

      const toggledTodo = todo.toggle()

      mockSupabaseClient.from.mockReturnValueOnce({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: toggledTodo.toDatabase(), 
          error: null 
        }),
      })

      await act(async () => {
        const success = await result.current.toggleTodo('1')
        expect(success).toBe(true)
      })

      expect(result.current.todos[0].completed).toBe(true)
      expect(result.current.stats.completedCount).toBe(1)
      expect(result.current.stats.pendingCount).toBe(0)
    })
  })

  describe('Filtering and Sorting', () => {
    it('should filter todos by search query', () => {
      const todos = [
        createMockTodo({ id: '1', content: 'Buy groceries' }),
        createMockTodo({ id: '2', content: 'Walk the dog' }),
        createMockTodo({ id: '3', content: 'Buy books' }),
      ]

      const { result } = renderHook(() => useTodoStore())
      act(() => {
        result.current.todos = todos
        result.current.setSearchQuery('buy')
      })

      const filtered = result.current.getFilteredTodos()
      expect(filtered).toHaveLength(2)
      expect(filtered[0].content).toBe('Buy groceries')
      expect(filtered[1].content).toBe('Buy books')
    })

    it('should filter todos by completion status', () => {
      const todos = [
        createMockTodo({ id: '1', completed: false }),
        createMockTodo({ id: '2', completed: true }),
        createMockTodo({ id: '3', completed: false }),
      ]

      const { result } = renderHook(() => useTodoStore())
      act(() => {
        result.current.todos = todos
        result.current.setCompletedFilter('pending')
      })

      const filtered = result.current.getFilteredTodos()
      expect(filtered).toHaveLength(2)
      expect(filtered.every(t => !t.completed)).toBe(true)
    })

    it('should hide completed todos when showCompleted is false', () => {
      const todos = [
        createMockTodo({ id: '1', completed: false }),
        createMockTodo({ id: '2', completed: true }),
        createMockTodo({ id: '3', completed: false }),
      ]

      const { result } = renderHook(() => useTodoStore())
      act(() => {
        result.current.todos = todos
        result.current.setShowCompleted(false)
      })

      const filtered = result.current.getFilteredTodos()
      expect(filtered).toHaveLength(2)
      expect(filtered.every(t => !t.completed)).toBe(true)
    })
  })

  describe('Drag and Drop', () => {
    it('should manage drag state', () => {
      const todo = createMockTodo({ id: '1' })
      
      const { result } = renderHook(() => useTodoStore())

      act(() => {
        result.current.startDrag(todo)
      })

      expect(result.current.dragState.isDragging).toBe(true)
      expect(result.current.dragState.draggedTodo).toBe(todo)

      act(() => {
        result.current.setDropTarget('2')
      })

      expect(result.current.dragState.dropTarget).toBe('2')

      act(() => {
        result.current.endDrag()
      })

      expect(result.current.dragState.isDragging).toBe(false)
      expect(result.current.dragState.draggedTodo).toBeNull()
      expect(result.current.dragState.dropTarget).toBeNull()
    })
  })

  describe('Statistics', () => {
    it('should calculate statistics correctly', () => {
      const todos = [
        createMockTodo({ id: '1', completed: false }),
        createMockTodo({ id: '2', completed: true }),
        createMockTodo({ id: '3', completed: false }),
        createMockTodo({ id: '4', completed: true }),
      ]

      const { result } = renderHook(() => useTodoStore())
      act(() => {
        result.current.todos = todos
        result.current.refreshStats()
      })

      expect(result.current.stats.totalCount).toBe(4)
      expect(result.current.stats.completedCount).toBe(2)
      expect(result.current.stats.pendingCount).toBe(2)
      expect(result.current.stats.completionRate).toBe(50)
    })
  })

  describe('Archive and Repository', () => {
    it('should archive a todo', async () => {
      const todo = createMockTodo({ id: '1', userId: 'user-123' })
      
      const { result } = renderHook(() => useTodoStore())
      act(() => {
        result.current.todos = [todo]
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        then: jest.fn((callback) => callback({ 
          data: null, 
          error: null 
        })),
      })

      await act(async () => {
        const success = await result.current.archiveTodo('1', 'work')
        expect(success).toBe(true)
      })

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('repository_items')
    })
  })
})
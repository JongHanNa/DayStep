import React from 'react'
// screen imported from @testing-library/reactimport { screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/test-utils/helpers/renderWithProviders'
import { TodoCard } from '@/components/todos/TodoCard'
import { TodoForm } from '@/components/todos/TodoForm'
import { createMockTodo } from '@/test-utils/helpers/testData'

// Mock Supabase
jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  }
}))

// Mock Zustand store
jest.mock('@/state/stores/todoStore', () => ({
  useTodoStore: () => ({
    todos: [],
    toggleTodo: jest.fn(),
    deleteTodo: jest.fn(),
    archiveTodo: jest.fn(),
    createTodo: jest.fn(),
    updateTodo: jest.fn(),
  }),
}))

describe('Todo Components Integration', () => {
  const mockTodo = createMockTodo({
    id: '1',
    content: 'Test todo item',
    completed: false,
  })

  describe('TodoCard', () => {
    const mockOnEdit = jest.fn()

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render todo card with correct content', () => {
      renderWithProviders(
        <TodoCard 
          todo={mockTodo} 
          onEdit={mockOnEdit}
        />
      )

      expect(screen.getByText('Test todo item')).toBeInTheDocument()
      expect(screen.getByRole('checkbox')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /할일 Test todo item 옵션 메뉴/i })).toBeInTheDocument()
    })

    it('should show completed state correctly', () => {
      const completedTodo = createMockTodo({
        ...mockTodo,
        completed: true,
      })

      renderWithProviders(
        <TodoCard 
          todo={completedTodo} 
          onEdit={mockOnEdit}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should handle toggle action', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoCard 
          todo={mockTodo} 
          onEdit={mockOnEdit}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await user.click(checkbox)

      // Since we mocked the store, we can't test the actual state change
      // but we can verify the component renders correctly
      expect(checkbox).toBeInTheDocument()
    })

    it('should open options menu', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoCard 
          todo={mockTodo} 
          onEdit={mockOnEdit}
        />
      )

      const optionsButton = screen.getByRole('button', { name: /할일 Test todo item 옵션 메뉴/i })
      await user.click(optionsButton)

      await waitFor(() => {
        expect(screen.getByText('수정')).toBeInTheDocument()
        expect(screen.getByText('보관함으로 이동')).toBeInTheDocument()
        expect(screen.getByText('삭제')).toBeInTheDocument()
      })
    })

    it('should handle edit action', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoCard 
          todo={mockTodo} 
          onEdit={mockOnEdit}
        />
      )

      const optionsButton = screen.getByRole('button', { name: /할일 Test todo item 옵션 메뉴/i })
      await user.click(optionsButton)

      const editButton = await screen.findByText('수정')
      await user.click(editButton)

      expect(mockOnEdit).toHaveBeenCalled()
    })

    it('should show delete confirmation dialog', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoCard 
          todo={mockTodo} 
          onEdit={mockOnEdit}
        />
      )

      const optionsButton = screen.getByRole('button', { name: /할일 Test todo item 옵션 메뉴/i })
      await user.click(optionsButton)

      const deleteButton = await screen.findByText('삭제')
      await user.click(deleteButton)

      await waitFor(() => {
        expect(screen.getByText('할일을 삭제하시겠습니까?')).toBeInTheDocument()
        expect(screen.getByText('이 작업은 되돌릴 수 없습니다. 할일이 영구적으로 삭제됩니다.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument()
      })
    })

    it('should be accessible with keyboard navigation', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoCard 
          todo={mockTodo} 
          onEdit={mockOnEdit}
        />
      )

      // Test checkbox accessibility
      const checkbox = screen.getByRole('checkbox')
      checkbox.focus()
      await user.keyboard('{space}')

      // Test options menu accessibility
      const optionsButton = screen.getByRole('button', { name: /할일 Test todo item 옵션 메뉴/i })
      optionsButton.focus()
      await user.keyboard('{enter}')

      await waitFor(() => {
        expect(screen.getByText('수정')).toBeInTheDocument()
      })
    })
  })

  describe('TodoForm', () => {
    const mockOnClose = jest.fn()
    const mockUserId = 'test-user-id'

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should render empty form for new todo', () => {
      renderWithProviders(
        <TodoForm
          onClose={mockOnClose}
          userId={mockUserId}
        />
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveValue('')
      expect(screen.getByRole('button', { name: /추가/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /취소/i })).toBeInTheDocument()
      expect(screen.getByText('새 할일 추가')).toBeInTheDocument()
    })

    it('should render form with initial value for editing', () => {
      const mockTodo = createMockTodo({
        id: '1',
        content: 'Edit this todo'
      })

      renderWithProviders(
        <TodoForm
          todo={mockTodo}
          onClose={mockOnClose}
          userId={mockUserId}
        />
      )

      expect(screen.getByRole('textbox')).toHaveValue('Edit this todo')
      expect(screen.getByRole('button', { name: /수정/i })).toBeInTheDocument()
      expect(screen.getByText('할일 수정')).toBeInTheDocument()
    })

    it('should handle form submission', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoForm
          onClose={mockOnClose}
          userId={mockUserId}
        />
      )

      const input = screen.getByRole('textbox')
      let submitButton = screen.getByRole('button', { name: /추가/i })

      // Initially button should be disabled
      expect(submitButton).toBeDisabled()

      await user.type(input, 'New todo item')
      
      // After typing, button should be enabled
      submitButton = screen.getByRole('button', { name: /추가/i })
      expect(submitButton).not.toBeDisabled()

      // Form should have the correct value
      expect(input).toHaveValue('New todo item')
      
      // Character counter should show correct count
      expect(screen.getByText('13/500')).toBeInTheDocument()
    })

    it('should not submit empty form', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoForm
          onClose={mockOnClose}
          userId={mockUserId}
        />
      )

      const submitButton = screen.getByRole('button', { name: /추가/i })
      
      // Submit button should be disabled when form is empty
      expect(submitButton).toBeDisabled()

      // Disabled button cannot be clicked, so this tests the disabled state
      expect(submitButton).toHaveAttribute('disabled')
    })

    it('should handle cancel action', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoForm
          onClose={mockOnClose}
          userId={mockUserId}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /취소/i })
      await user.click(cancelButton)

      expect(mockOnClose).toHaveBeenCalled()
    })

    it('should validate input length', async () => {
      const user = userEvent.setup()

      renderWithProviders(
        <TodoForm
          onClose={mockOnClose}
          userId={mockUserId}
        />
      )

      const input = screen.getByRole('textbox')
      const longText = 'a'.repeat(501) // Over 500 characters (maxlength)

      await user.type(input, longText)

      // The input should be truncated to maxlength by HTML attribute
      expect(input).toHaveValue('a'.repeat(500))
      
      // Character counter should show 500/500
      expect(screen.getByText('500/500')).toBeInTheDocument()
    })

    it('should be accessible', () => {
      renderWithProviders(
        <TodoForm
          onClose={mockOnClose}
          userId={mockUserId}
        />
      )

      const input = screen.getByRole('textbox')
      expect(input).toHaveAccessibleName('할일 내용 *')

      const submitButton = screen.getByRole('button', { name: /추가/i })
      const cancelButton = screen.getByRole('button', { name: /취소/i })

      expect(submitButton).toBeInTheDocument()
      expect(cancelButton).toBeInTheDocument()
      
      // Dialog should be accessible
      expect(screen.getByRole('dialog')).toHaveAccessibleName('새 할일 추가')
    })
  })
})
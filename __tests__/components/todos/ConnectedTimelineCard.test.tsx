/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
// screen imported from @testing-library/react
import '@testing-library/jest-dom';
import { ConnectedTimelineCard } from '@/components/todos/ConnectedTimelineCard';
import { useTodoStore } from '@/state/stores/todoStore';
import { Todo } from '@/entities/todo/Todo';

// Mock Zustand store
jest.mock('@/state/stores/todoStore', () => ({
  useTodoStore: jest.fn(),
}));

// Mock window.confirm
const mockConfirm = jest.fn();
Object.defineProperty(window, 'confirm', {
  value: mockConfirm,
  writable: true,
});

// Mock time-utils
jest.mock('@/lib/time-utils', () => ({
  formatDateTime: jest.fn(() => '2024년 1월 15일 오전 10:30'),
  formatRelativeTime: jest.fn(() => '2시간 전'),
  calculateProgress: jest.fn(() => 65),
  getTimeRemaining: jest.fn(() => '1일 남음'),
  isDeadlineApproaching: jest.fn(() => false),
  isOverdue: jest.fn(() => false),
}));

describe('ConnectedTimelineCard', () => {
  // Mock store actions
  const mockToggleTodo = jest.fn();
  const mockUpdateTodo = jest.fn();
  const mockDeleteTodo = jest.fn();
  const mockArchiveTodo = jest.fn();

  // Sample todo data
  const mockTodo = Todo.fromDatabase({
    id: '1',
    user_id: 'test-user',
    content: '테스트 할일',
    completed: false,
    order_index: 1,
    created_at: '2024-01-15T08:30:00Z',
    updated_at: '2024-01-15T09:00:00Z',
  } as any);

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfirm.mockReturnValue(true);
    
    (useTodoStore as jest.Mock).mockReturnValue({
      toggleTodo: mockToggleTodo,
      updateTodo: mockUpdateTodo,
      deleteTodo: mockDeleteTodo,
      archiveTodo: mockArchiveTodo,
    });
  });

  describe('렌더링', () => {
    it('should render todo card with store actions', () => {
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      expect(screen.getByText('테스트 할일')).toBeInTheDocument();
      expect(screen.getByLabelText('할일: 테스트 할일')).toBeInTheDocument();
    });

    it('should show action buttons on hover', () => {
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      const archiveButton = screen.getByLabelText('보관함으로 이동');
      const deleteButton = screen.getByLabelText('삭제');
      
      expect(completeButton).toBeInTheDocument();
      expect(archiveButton).toBeInTheDocument();
      expect(deleteButton).toBeInTheDocument();
    });

    it('should hide complete button for completed todos', () => {
      const completedTodo = Todo.fromDatabase({
        ...mockTodo.toDatabase(),
        completed: true,
      } as any);

      render(<ConnectedTimelineCard todo={completedTodo} />);
      
      expect(screen.queryByLabelText('완료 처리')).not.toBeInTheDocument();
      expect(screen.getByLabelText('보관함으로 이동')).toBeInTheDocument();
      expect(screen.getByLabelText('삭제')).toBeInTheDocument();
    });
  });

  describe('할일 완료 토글', () => {
    it('should call toggleTodo when complete button is clicked', async () => {
      mockToggleTodo.mockResolvedValue(true);
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      fireEvent.click(completeButton);
      
      expect(mockToggleTodo).toHaveBeenCalledWith('1');
      
      await waitFor(() => {
        expect(mockToggleTodo).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle toggle error', async () => {
      mockToggleTodo.mockRejectedValue(new Error('네트워크 오류'));
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
      });
    });

    it('should show loading state during toggle', async () => {
      let resolveToggle: (value: boolean) => void;
      mockToggleTodo.mockReturnValue(new Promise(resolve => {
        resolveToggle = resolve;
      }));
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      fireEvent.click(completeButton);
      
      // Loading indicator should appear
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
      
      // Resolve the promise
      resolveToggle!(true);
      await waitFor(() => {
        expect(document.querySelector('.animate-spin')).not.toBeInTheDocument();
      });
    });
  });

  describe('할일 삭제', () => {
    it('should call deleteTodo when delete button is clicked after confirmation', async () => {
      mockDeleteTodo.mockResolvedValue(true);
      mockConfirm.mockReturnValue(true);
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const deleteButton = screen.getByLabelText('삭제');
      fireEvent.click(deleteButton);
      
      expect(mockConfirm).toHaveBeenCalledWith('정말로 이 할일을 삭제하시겠습니까?');
      expect(mockDeleteTodo).toHaveBeenCalledWith('1');
    });

    it('should not delete if user cancels confirmation', async () => {
      mockConfirm.mockReturnValue(false);
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const deleteButton = screen.getByLabelText('삭제');
      fireEvent.click(deleteButton);
      
      expect(mockConfirm).toHaveBeenCalled();
      expect(mockDeleteTodo).not.toHaveBeenCalled();
    });

    it('should handle delete error', async () => {
      mockDeleteTodo.mockRejectedValue(new Error('삭제 실패'));
      mockConfirm.mockReturnValue(true);
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const deleteButton = screen.getByLabelText('삭제');
      fireEvent.click(deleteButton);
      
      await waitFor(() => {
        expect(screen.getByText('삭제 실패')).toBeInTheDocument();
      });
    });
  });

  describe('할일 보관', () => {
    it('should call archiveTodo when archive button is clicked', async () => {
      mockArchiveTodo.mockResolvedValue(true);
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const archiveButton = screen.getByLabelText('보관함으로 이동');
      fireEvent.click(archiveButton);
      
      expect(mockArchiveTodo).toHaveBeenCalledWith('1', undefined);
    });

    it('should handle archive error', async () => {
      mockArchiveTodo.mockRejectedValue(new Error('보관 실패'));
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const archiveButton = screen.getByLabelText('보관함으로 이동');
      fireEvent.click(archiveButton);
      
      await waitFor(() => {
        expect(screen.getByText('보관 실패')).toBeInTheDocument();
      });
    });
  });

  describe('에러 처리', () => {
    it('should show error message when action fails', async () => {
      mockToggleTodo.mockRejectedValue(new Error('네트워크 오류'));
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });
    });

    it('should allow closing error message', async () => {
      mockToggleTodo.mockRejectedValue(new Error('네트워크 오류'));
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
      });
      
      const closeButton = screen.getByLabelText('에러 메시지 닫기');
      fireEvent.click(closeButton);
      
      expect(screen.queryByText('네트워크 오류')).not.toBeInTheDocument();
    });

    it('should clear error on card click', async () => {
      mockToggleTodo.mockRejectedValue(new Error('네트워크 오류'));
      
      const handleClick = jest.fn();
      render(<ConnectedTimelineCard todo={mockTodo} onClick={handleClick} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        expect(screen.getByText('네트워크 오류')).toBeInTheDocument();
      });
      
      const card = screen.getByLabelText('할일: 테스트 할일');
      fireEvent.click(card);
      
      expect(screen.queryByText('네트워크 오류')).not.toBeInTheDocument();
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('로딩 상태', () => {
    it('should disable interactions during loading', async () => {
      let resolveToggle: (value: boolean) => void;
      mockToggleTodo.mockReturnValue(new Promise(resolve => {
        resolveToggle = resolve;
      }));
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      fireEvent.click(completeButton);
      
      // Card should be disabled during loading
      const card = screen.getByLabelText('할일: 테스트 할일');
      expect(card.closest('.relative')?.querySelector('.pointer-events-none')).toBeInTheDocument();
      
      // Try clicking again should not trigger another call
      fireEvent.click(completeButton);
      expect(mockToggleTodo).toHaveBeenCalledTimes(1);
      
      resolveToggle!(true);
      await waitFor(() => {
        expect(card.closest('.relative')?.querySelector('.pointer-events-none')).not.toBeInTheDocument();
      });
    });
  });

  describe('접근성', () => {
    it('should have proper ARIA labels', () => {
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      expect(screen.getByLabelText('할일: 테스트 할일')).toBeInTheDocument();
      expect(screen.getByLabelText('완료 처리')).toBeInTheDocument();
      expect(screen.getByLabelText('보관함으로 이동')).toBeInTheDocument();
      expect(screen.getByLabelText('삭제')).toBeInTheDocument();
    });

    it('should handle error messages with proper roles', async () => {
      mockToggleTodo.mockRejectedValue(new Error('테스트 오류'));
      
      render(<ConnectedTimelineCard todo={mockTodo} />);
      
      const completeButton = screen.getByLabelText('완료 처리');
      fireEvent.click(completeButton);
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toBeInTheDocument();
        expect(errorAlert).toHaveTextContent('테스트 오류');
      });
    });
  });
});
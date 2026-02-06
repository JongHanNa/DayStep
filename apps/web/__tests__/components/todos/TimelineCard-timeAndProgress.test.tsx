/**
import { screen } from '@testing-library/dom' from '@testing-library/dom'; * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineCard } from '@/components/todos/TimelineCard';
import { Todo } from '@/types';

// Mock time-utils to have predictable outputs
jest.mock('@/lib/time-utils', () => ({
  formatDateTime: jest.fn(() => '2024년 1월 15일 오전 10:30'),
  formatRelativeTime: jest.fn(() => '2시간 전'),
  calculateProgress: jest.fn(() => 65),
  getTimeRemaining: jest.fn(() => '1일 남음'),
  isDeadlineApproaching: jest.fn(() => false),
  isOverdue: jest.fn(() => false),
}));

describe('TimelineCard - 시간 표시 및 진행률', () => {
  const mockTodo: Todo = {
    id: '1',
    content: '테스트 할일',
    completed: false,
    created_at: '2024-01-15T08:30:00Z',
    updated_at: '2024-01-15T09:00:00Z',
    user_id: 'test-user',
    order_index: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('진행률 표시', () => {
    it('should show progress bar for incomplete todos', () => {
      render(<TimelineCard todo={mockTodo} />);
      
      expect(screen.getByText('진행률')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.getByLabelText('진행률 65%')).toBeInTheDocument();
    });

    it('should not show progress bar for completed todos', () => {
      const completedTodo = { ...mockTodo, completed: true };
      render(<TimelineCard todo={completedTodo} />);
      
      expect(screen.queryByText('진행률')).not.toBeInTheDocument();
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });

    it('should show correct progress color based on value', () => {
      const { container } = render(<TimelineCard todo={mockTodo} />);
      const progressIndicator = container.querySelector('[style*="translateX"]');
      expect(progressIndicator).toHaveClass('bg-blue-500'); // 65% should be blue
    });
  });

  describe('시간 정보 표시', () => {
    it('should display relative time for creation date', () => {
      render(<TimelineCard todo={mockTodo} />);
      expect(screen.getByText('2시간 전')).toBeInTheDocument();
    });

    it('should display time remaining', () => {
      render(<TimelineCard todo={mockTodo} />);
      expect(screen.getByText('1일 남음')).toBeInTheDocument();
    });

    it('should show tooltip with full datetime on hover', () => {
      render(<TimelineCard todo={mockTodo} />);
      const relativeTimeElement = screen.getByText('2시간 전');
      expect(relativeTimeElement).toHaveAttribute('title', '2024년 1월 15일 오전 10:30');
    });
  });

  describe('마감일 임박/지연 상태', () => {
    it('should show warning style when deadline is approaching', () => {
      const { isDeadlineApproaching } = require('@/lib/time-utils');
      isDeadlineApproaching.mockReturnValue(true);
      
      const { container } = render(<TimelineCard todo={mockTodo} />);
      const clockIcon = container.querySelector('.text-yellow-500');
      expect(clockIcon).toBeInTheDocument();
    });

    it('should show danger style when overdue', () => {
      const { isOverdue } = require('@/lib/time-utils');
      isOverdue.mockReturnValue(true);
      
      const { container } = render(<TimelineCard todo={mockTodo} />);
      const clockIcon = container.querySelector('.text-red-500');
      expect(clockIcon).toBeInTheDocument();
    });

    it('should show "완료됨" for completed todos', () => {
      const completedTodo = { ...mockTodo, completed: true };
      const { getTimeRemaining } = require('@/lib/time-utils');
      getTimeRemaining.mockReturnValue('완료됨');
      
      render(<TimelineCard todo={completedTodo} />);
      expect(screen.getByText('완료됨')).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('should have proper ARIA labels for progress', () => {
      render(<TimelineCard todo={mockTodo} />);
      expect(screen.getByLabelText('진행률 65%')).toBeInTheDocument();
    });

    it('should have proper ARIA labels for card', () => {
      render(<TimelineCard todo={mockTodo} />);
      expect(screen.getByLabelText('할일: 테스트 할일')).toBeInTheDocument();
    });

    it('should have proper status badge labels', () => {
      render(<TimelineCard todo={mockTodo} />);
      expect(screen.getByLabelText(/상태:/)).toBeInTheDocument();
    });
  });

  describe('진행률 색상 로직', () => {
    const testCases = [
      { progress: 90, expectedColor: 'green', description: '높은 진행률 (90%)' },
      { progress: 70, expectedColor: 'blue', description: '양호한 진행률 (70%)' },
      { progress: 50, expectedColor: 'yellow', description: '보통 진행률 (50%)' },
      { progress: 30, expectedColor: 'orange', description: '낮은 진행률 (30%)' },
      { progress: 10, expectedColor: 'red', description: '매우 낮은 진행률 (10%)' },
    ];

    testCases.forEach(({ progress, expectedColor, description }) => {
      it(`should show ${expectedColor} color for ${description}`, () => {
        const { calculateProgress } = require('@/lib/time-utils');
        calculateProgress.mockReturnValue(progress);

        const { container } = render(<TimelineCard todo={mockTodo} />);
        const progressIndicator = container.querySelector('[style*="translateX"]');
        expect(progressIndicator).toHaveClass(`bg-${expectedColor}-500`);
      });
    });
  });

  describe('완료된 할일 처리', () => {
    it('should show completed status and opacity for completed todos', () => {
      const completedTodo = { ...mockTodo, completed: true };
      const { container } = render(<TimelineCard todo={completedTodo} />);
      
      const card = container.querySelector('.opacity-60');
      expect(card).toBeInTheDocument();
      expect(screen.getByText('완료')).toBeInTheDocument();
    });

    it('should not show progress for completed todos but still show time info', () => {
      const completedTodo = { ...mockTodo, completed: true };
      render(<TimelineCard todo={completedTodo} />);
      
      expect(screen.queryByText('진행률')).not.toBeInTheDocument();
      expect(screen.getByText('2시간 전')).toBeInTheDocument(); // 여전히 시간 정보는 표시
    });
  });
});
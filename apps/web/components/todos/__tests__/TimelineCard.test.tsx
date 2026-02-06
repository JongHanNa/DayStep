import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineCard, TodoPriority, TodoStatus } from '../TimelineCard';
import { Todo } from '@/types';

// Mock 데이터
const mockTodo: Todo = {
  id: '1',
  content: '테스트 할일',
  description: '테스트용 할일 설명입니다.',
  completed: false,
  createdAt: '2025-01-27T10:00:00Z',
  updatedAt: '2025-01-27T11:00:00Z',
  userId: 'user-1',
  position: 1,
} as Todo;

const mockCompletedTodo: Todo = {
  ...mockTodo,
  id: '2',
  content: '완료된 할일',
  completed: true,
} as Todo;

describe('TimelineCard', () => {
  it('should render todo information correctly', () => {
    render(<TimelineCard todo={mockTodo} />);
    
    expect(screen.getByText('테스트 할일')).toBeInTheDocument();
    expect(screen.getByText('테스트용 할일 설명입니다.')).toBeInTheDocument();
    expect(screen.getByText('대기 중')).toBeInTheDocument();
  });

  it('should render completed todo with proper styling', () => {
    render(<TimelineCard todo={mockCompletedTodo} />);
    
    expect(screen.getByText('완료된 할일')).toBeInTheDocument();
    expect(screen.getByText('완료')).toBeInTheDocument();
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass('opacity-60');
  });

  it('should display priority badge correctly', () => {
    render(<TimelineCard todo={mockTodo} />);
    
    // 기본 우선순위는 'medium'
    expect(screen.getByText('보통')).toBeInTheDocument();
    expect(screen.getByLabelText('우선순위: medium')).toBeInTheDocument();
  });

  it('should display formatted date and time', () => {
    render(<TimelineCard todo={mockTodo} />);
    
    // 날짜 형식 확인 (한국 로케일)
    expect(screen.getByText('1월 27일')).toBeInTheDocument();
    // 시간 형식 확인 (실제 출력은 "오후 08:00" 형식)
    expect(screen.getByText('오후 08:00')).toBeInTheDocument();
  });

  it('should call onClick when card is clicked', () => {
    const mockOnClick = jest.fn();
    render(<TimelineCard todo={mockTodo} onClick={mockOnClick} />);
    
    const card = screen.getByRole('article');
    fireEvent.click(card);
    
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should apply custom className', () => {
    const customClass = 'custom-timeline-card';
    render(<TimelineCard todo={mockTodo} className={customClass} />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveClass(customClass);
  });

  it('should handle todo without description', () => {
    const todoWithoutDescription = {
      ...mockTodo,
      description: '',
    } as Todo;
    
    render(<TimelineCard todo={todoWithoutDescription} />);
    
    expect(screen.getByText('테스트 할일')).toBeInTheDocument();
    // 설명이 없으면 설명 텍스트가 렌더링되지 않아야 함
    expect(screen.queryByText('테스트용 할일 설명입니다.')).not.toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<TimelineCard todo={mockTodo} />);
    
    const card = screen.getByRole('article');
    expect(card).toHaveAttribute('aria-label', '할일: 테스트 할일');
    
    expect(screen.getByLabelText('우선순위: medium')).toBeInTheDocument();
    expect(screen.getByLabelText('상태: pending')).toBeInTheDocument();
  });

  it('should handle different priority levels with colors', () => {
    const highPriorityTodo = {
      ...mockTodo,
      priority: 'high' as TodoPriority,
    } as any;
    
    const { rerender } = render(<TimelineCard todo={highPriorityTodo} />);
    expect(screen.getByText('높음')).toBeInTheDocument();
    
    const card = screen.getByRole('article');
    expect(card.className).toContain('border-red-500');
    expect(card.className).toContain('bg-red-50');
    
    const lowPriorityTodo = {
      ...mockTodo,
      priority: 'low' as TodoPriority,
    } as any;
    
    rerender(<TimelineCard todo={lowPriorityTodo} />);
    expect(screen.getByText('낮음')).toBeInTheDocument();
    
    const updatedCard = screen.getByRole('article');
    expect(updatedCard.className).toContain('border-green-500');
    expect(updatedCard.className).toContain('bg-green-50');
  });

  it('should handle different status types', () => {
    // mockTodo의 기본 상태는 pending이므로 "대기 중"이 표시됨
    render(<TimelineCard todo={mockTodo} />);
    expect(screen.getByText('대기 중')).toBeInTheDocument();
  });

  it('should apply priority colors consistently across components', () => {
    const highPriorityTodo = {
      ...mockTodo,
      priority: 'high' as TodoPriority,
    } as any;
    
    render(<TimelineCard todo={highPriorityTodo} />);
    
    // 카드 배경 및 테두리 색상 확인
    const card = screen.getByRole('article');
    expect(card.className).toContain('border-red-500');
    expect(card.className).toContain('bg-red-50');
    
    // 우선순위 배지 색상 확인
    const priorityBadge = screen.getByLabelText('우선순위: high');
    expect(priorityBadge.className).toContain('bg-red-100');
    expect(priorityBadge.className).toContain('text-red-800');
  });

  it('should display medium priority with default yellow colors', () => {
    render(<TimelineCard todo={mockTodo} />);
    
    const card = screen.getByRole('article');
    expect(card.className).toContain('border-yellow-500');
    expect(card.className).toContain('bg-yellow-50');
    
    const priorityBadge = screen.getByLabelText('우선순위: medium');
    expect(priorityBadge.className).toContain('bg-yellow-100');
  });

  it('should handle missing timestamps gracefully', () => {
    const todoWithoutTimestamps = {
      ...mockTodo,
      createdAt: undefined,
      updatedAt: undefined,
    } as any;
    
    // 에러 없이 렌더링되어야 함
    expect(() => {
      render(<TimelineCard todo={todoWithoutTimestamps} />);
    }).not.toThrow();
  });
});
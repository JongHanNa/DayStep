import React from 'react';
import {fireEvent} from '@testing-library/react-native';
import {renderWithProviders} from '../../../__tests__/test-utils';
import {TodoCard} from '../TodoCard';
import {createMockTodo} from '../../../__tests__/fixtures/todos';

// Mock dependencies
jest.mock('@/hooks/useHaptic', () => ({
  useHaptic: () => ({
    light: jest.fn(),
    medium: jest.fn(),
    selection: jest.fn(),
    heavy: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    trigger: jest.fn(),
  }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    primaryColor: '#3B82F6',
    colorTheme: {background: '#FFFFFF', text: '#1F2937'},
  }),
}));

jest.mock('@/theme/animations', () => ({
  springs: {
    press: {damping: 30, stiffness: 400, mass: 0.3},
    default: {damping: 25, stiffness: 300, mass: 0.5},
    snappy: {damping: 30, stiffness: 400, mass: 0.3},
    bouncy: {damping: 10, stiffness: 300, mass: 0.5},
  },
  scales: {pressIn: 0.97},
}));

jest.mock('@/lib/iconMap', () => ({
  resolveTodoIcon: jest.fn(() => null),
}));

jest.mock('@/lib/todoUtils', () => ({
  getPriorityColor: jest.fn(() => null),
}));

jest.mock('@/components/todo/MissedTodoActionPanel', () => ({
  MissedTodoActionPanel: () => null,
}));

jest.mock('@/components/todo/DeferredTodoActionPanel', () => ({
  DeferredTodoActionPanel: () => null,
}));

describe('TodoCard', () => {
  const defaultProps = {
    onToggle: jest.fn(),
    onPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('todo 제목 렌더링', () => {
    const todo = createMockTodo({title: '아침 운동'});
    const {getByText} = renderWithProviders(
      <TodoCard todo={todo as any} {...defaultProps} />,
    );
    expect(getByText('아침 운동')).toBeTruthy();
  });

  test('완료된 todo 스타일 적용', () => {
    const todo = createMockTodo({title: '완료된 할일', completed: true});
    const {getByText} = renderWithProviders(
      <TodoCard todo={todo as any} {...defaultProps} />,
    );
    expect(getByText('완료된 할일')).toBeTruthy();
  });

  test('press 콜백 호출', () => {
    const onPress = jest.fn();
    const todo = createMockTodo({title: '클릭 테스트'});
    const {getByText} = renderWithProviders(
      <TodoCard todo={todo as any} {...defaultProps} onPress={onPress} />,
    );
    fireEvent.press(getByText('클릭 테스트'));
    expect(onPress).toHaveBeenCalledWith(todo);
  });
});

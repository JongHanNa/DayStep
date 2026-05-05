import React from 'react';
import {Text} from 'react-native';
import {fireEvent} from '@testing-library/react-native';
import {renderWithProviders} from '../../../__tests__/test-utils';
import {AnimatedPressable} from '../AnimatedPressable';

// useHaptic mock
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

jest.mock('@/theme/animations', () => ({
  springs: {
    press: {damping: 30, stiffness: 400, mass: 0.3},
    default: {damping: 25, stiffness: 300, mass: 0.5},
    snappy: {damping: 30, stiffness: 400, mass: 0.3},
  },
  scales: {pressIn: 0.97},
}));

describe('AnimatedPressable', () => {
  test('children 렌더링', () => {
    const {getByText} = renderWithProviders(
      <AnimatedPressable>
        <Text>Press me</Text>
      </AnimatedPressable>,
    );
    expect(getByText('Press me')).toBeTruthy();
  });

  test('onPress 콜백 호출', () => {
    const onPress = jest.fn();
    const {getByText} = renderWithProviders(
      <AnimatedPressable onPress={onPress}>
        <Text>Button</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByText('Button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('disabled 시 onPress 미호출', () => {
    const onPress = jest.fn();
    const {getByText} = renderWithProviders(
      <AnimatedPressable onPress={onPress} disabled>
        <Text>Disabled</Text>
      </AnimatedPressable>,
    );
    fireEvent.press(getByText('Disabled'));
    expect(onPress).not.toHaveBeenCalled();
  });
});

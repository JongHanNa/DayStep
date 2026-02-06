/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ColoredProgress } from '@/components/todos/ColoredProgress';

describe('ColoredProgress', () => {
  it('should render with default props', () => {
    render(<ColoredProgress />);
    const progressRoot = screen.getByRole('progressbar');
    expect(progressRoot).toBeInTheDocument();
  });

  it('should render with specified value', () => {
    render(<ColoredProgress value={50} />);
    const progressRoot = screen.getByRole('progressbar');
    expect(progressRoot).toHaveAttribute('aria-valuenow', '50');
  });

  it('should apply correct color classes', () => {
    const { container, rerender } = render(<ColoredProgress value={50} color="green" />);
    let indicator = container.querySelector('[style*="translateX"]');
    expect(indicator).toHaveClass('bg-green-500');

    rerender(<ColoredProgress value={50} color="red" />);
    indicator = container.querySelector('[style*="translateX"]');
    expect(indicator).toHaveClass('bg-red-500');
  });

  it('should render with custom className', () => {
    render(<ColoredProgress className="custom-class" />);
    const progressRoot = screen.getByRole('progressbar');
    expect(progressRoot).toHaveClass('custom-class');
  });

  it('should handle all color variants', () => {
    const colors = ['green', 'blue', 'yellow', 'orange', 'red'] as const;
    
    colors.forEach(color => {
      const { container, unmount } = render(<ColoredProgress value={50} color={color} />);
      const indicator = container.querySelector('[style*="translateX"]');
      expect(indicator).toHaveClass(`bg-${color}-500`);
      unmount();
    });
  });

  it('should handle value prop correctly', () => {
    const { rerender } = render(<ColoredProgress value={0} />);
    let progressRoot = screen.getByRole('progressbar');
    expect(progressRoot).toHaveAttribute('aria-valuenow', '0');

    rerender(<ColoredProgress value={100} />);
    progressRoot = screen.getByRole('progressbar');
    expect(progressRoot).toHaveAttribute('aria-valuenow', '100');
  });

  it('should apply transform style based on value', () => {
    const { container } = render(<ColoredProgress value={25} />);
    const indicator = container.querySelector('[style*="translateX"]');
    expect(indicator).toHaveStyle('transform: translateX(-75%)');
  });

  it('should have correct accessibility attributes', () => {
    render(<ColoredProgress value={75} aria-label="Loading progress" />);
    const progressRoot = screen.getByRole('progressbar');
    expect(progressRoot).toHaveAttribute('aria-valuenow', '75');
    expect(progressRoot).toHaveAttribute('aria-label', 'Loading progress');
  });
});
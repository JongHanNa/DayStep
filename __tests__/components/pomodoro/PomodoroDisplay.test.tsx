import { render, screen } from '@testing-library/react';
// screen imported from @testing-library/react
import { PomodoroDisplay } from '@/components/pomodoro/PomodoroDisplay';
import { TimerType } from '@/types/pomodoro';

describe('PomodoroDisplay', () => {
  const defaultProps = {
    progress: 0.5,
    remainingTime: 12.5 * 60 * 1000, // 12.5 minutes
    duration: 25 * 60 * 1000, // 25 minutes
    timerType: 'POMODORO' as TimerType,
    isRunning: true,
    isPaused: false,
  };

  it('should render all components correctly', () => {
    render(<PomodoroDisplay {...defaultProps} />);
    
    // Should render circular progress
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    
    // Should render timer display
    expect(screen.getByText('포모도로')).toBeInTheDocument();
    expect(screen.getByText('12:30')).toBeInTheDocument();
    expect(screen.getByText('진행 중')).toBeInTheDocument();
    
    // Should render progress percentage
    expect(screen.getByText('50%')).toBeInTheDocument();
    expect(screen.getByText('완료')).toBeInTheDocument();
  });

  it('should calculate progress percentage correctly', () => {
    const { rerender } = render(<PomodoroDisplay {...defaultProps} progress={0.25} />);
    expect(screen.getByText('25%')).toBeInTheDocument();

    rerender(<PomodoroDisplay {...defaultProps} progress={0.75} />);
    expect(screen.getByText('75%')).toBeInTheDocument();

    rerender(<PomodoroDisplay {...defaultProps} progress={1} />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    rerender(<PomodoroDisplay {...defaultProps} progress={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('should use correct colors for different timer types', () => {
    const { container, rerender } = render(<PomodoroDisplay {...defaultProps} timerType="POMODORO" />);
    
    // Check if POMODORO color is applied (red)
    let progressCircle = container.querySelector('circle[stroke-dasharray]');
    expect(progressCircle).toHaveAttribute('stroke', '#ef4444');

    rerender(<PomodoroDisplay {...defaultProps} timerType="SHORT_BREAK" />);
    progressCircle = container.querySelector('circle[stroke-dasharray]');
    expect(progressCircle).toHaveAttribute('stroke', '#10b981');

    rerender(<PomodoroDisplay {...defaultProps} timerType="LONG_BREAK" />);
    progressCircle = container.querySelector('circle[stroke-dasharray]');
    expect(progressCircle).toHaveAttribute('stroke', '#3b82f6');
  });

  it('should show pulse animation when timer is running and not paused', () => {
    const { container } = render(
      <PomodoroDisplay {...defaultProps} isRunning={true} isPaused={false} />
    );
    
    const pulseElement = container.querySelector('.animate-ping');
    expect(pulseElement).toBeInTheDocument();
  });

  it('should not show pulse animation when timer is paused', () => {
    const { container } = render(
      <PomodoroDisplay {...defaultProps} isRunning={true} isPaused={true} />
    );
    
    const pulseElement = container.querySelector('.animate-ping');
    expect(pulseElement).not.toBeInTheDocument();
  });

  it('should not show pulse animation when timer is not running', () => {
    const { container } = render(
      <PomodoroDisplay {...defaultProps} isRunning={false} isPaused={false} />
    );
    
    const pulseElement = container.querySelector('.animate-ping');
    expect(pulseElement).not.toBeInTheDocument();
  });

  it('should apply custom size to circular progress', () => {
    const { container } = render(
      <PomodoroDisplay {...defaultProps} size={250} />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '250');
    expect(svg).toHaveAttribute('height', '250');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <PomodoroDisplay {...defaultProps} className="custom-display" />
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-display');
  });

  it('should pass correct props to CircularProgress', () => {
    render(<PomodoroDisplay {...defaultProps} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
  });

  it('should pass correct props to TimerDisplay', () => {
    render(<PomodoroDisplay {...defaultProps} />);
    
    expect(screen.getByText('포모도로')).toBeInTheDocument();
    expect(screen.getByText('12:30')).toBeInTheDocument();
    expect(screen.getByText('진행 중')).toBeInTheDocument();
  });

  it('should handle edge cases for progress percentage', () => {
    const { rerender } = render(<PomodoroDisplay {...defaultProps} progress={0.001} />);
    expect(screen.getByText('0%')).toBeInTheDocument();

    rerender(<PomodoroDisplay {...defaultProps} progress={0.999} />);
    expect(screen.getByText('100%')).toBeInTheDocument();

    rerender(<PomodoroDisplay {...defaultProps} progress={0.555} />);
    expect(screen.getByText('56%')).toBeInTheDocument();
  });

  it('should render with default size when not specified', () => {
    const { container } = render(<PomodoroDisplay {...defaultProps} />);
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '200');
    expect(svg).toHaveAttribute('height', '200');
  });

  it('should have proper layout structure', () => {
    const { container } = render(<PomodoroDisplay {...defaultProps} />);
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex', 'flex-col', 'items-center', 'space-y-6');
  });
});
import { render, screen } from '@testing-library/react';
// screen imported from @testing-library/reactimport { TimerDisplay } from '@/components/pomodoro/TimerDisplay';
import { TimerType } from '@/types/pomodoro';

describe('TimerDisplay', () => {
  const defaultProps = {
    remainingTime: 25 * 60 * 1000, // 25 minutes
    timerType: 'POMODORO' as TimerType,
    isRunning: false,
    isPaused: false,
  };

  it('should render timer type label correctly', () => {
    render(<TimerDisplay {...defaultProps} />);
    expect(screen.getByText('포모도로')).toBeInTheDocument();
  });

  it('should render different timer types correctly', () => {
    const { rerender } = render(<TimerDisplay {...defaultProps} />);
    expect(screen.getByText('포모도로')).toBeInTheDocument();

    rerender(<TimerDisplay {...defaultProps} timerType="SHORT_BREAK" />);
    expect(screen.getByText('짧은 휴식')).toBeInTheDocument();

    rerender(<TimerDisplay {...defaultProps} timerType="LONG_BREAK" />);
    expect(screen.getByText('긴 휴식')).toBeInTheDocument();
  });

  it('should format time correctly', () => {
    const { rerender } = render(<TimerDisplay {...defaultProps} />);
    expect(screen.getByText('25:00')).toBeInTheDocument();

    rerender(<TimerDisplay {...defaultProps} remainingTime={5 * 60 * 1000 + 30 * 1000} />);
    expect(screen.getByText('05:30')).toBeInTheDocument();

    rerender(<TimerDisplay {...defaultProps} remainingTime={0} />);
    expect(screen.getByText('00:00')).toBeInTheDocument();

    rerender(<TimerDisplay {...defaultProps} remainingTime={59000} />); // 59 seconds
    expect(screen.getByText('00:59')).toBeInTheDocument();
  });

  it('should show correct status when not running', () => {
    render(<TimerDisplay {...defaultProps} isRunning={false} />);
    expect(screen.getByText('대기 중')).toBeInTheDocument();
  });

  it('should show correct status when running', () => {
    render(<TimerDisplay {...defaultProps} isRunning={true} isPaused={false} />);
    expect(screen.getByText('진행 중')).toBeInTheDocument();
  });

  it('should show correct status when paused', () => {
    render(<TimerDisplay {...defaultProps} isRunning={true} isPaused={true} />);
    expect(screen.getByText('일시정지')).toBeInTheDocument();
  });

  it('should apply correct CSS classes for timer types', () => {
    const { rerender } = render(<TimerDisplay {...defaultProps} timerType="POMODORO" />);
    const pomodoroLabel = screen.getByText('포모도로');
    expect(pomodoroLabel).toHaveClass('text-red-600', 'dark:text-red-400');

    rerender(<TimerDisplay {...defaultProps} timerType="SHORT_BREAK" />);
    const shortBreakLabel = screen.getByText('짧은 휴식');
    expect(shortBreakLabel).toHaveClass('text-green-600', 'dark:text-green-400');

    rerender(<TimerDisplay {...defaultProps} timerType="LONG_BREAK" />);
    const longBreakLabel = screen.getByText('긴 휴식');
    expect(longBreakLabel).toHaveClass('text-blue-600', 'dark:text-blue-400');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <TimerDisplay {...defaultProps} className="custom-timer" />
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-timer');
  });

  it('should handle edge cases for time formatting', () => {
    const { rerender } = render(<TimerDisplay {...defaultProps} remainingTime={1000} />);
    expect(screen.getByText('00:01')).toBeInTheDocument();

    rerender(<TimerDisplay {...defaultProps} remainingTime={60000} />);
    expect(screen.getByText('01:00')).toBeInTheDocument();

    rerender(<TimerDisplay {...defaultProps} remainingTime={3661000} />); // 61 minutes 1 second
    expect(screen.getByText('61:01')).toBeInTheDocument();
  });

  it('should display status with correct colors', () => {
    const { rerender } = render(<TimerDisplay {...defaultProps} isRunning={false} />);
    let status = screen.getByText('대기 중');
    expect(status).toHaveClass('text-muted-foreground');

    rerender(<TimerDisplay {...defaultProps} isRunning={true} isPaused={false} />);
    status = screen.getByText('진행 중');
    expect(status).toHaveClass('text-green-600', 'dark:text-green-400');

    rerender(<TimerDisplay {...defaultProps} isRunning={true} isPaused={true} />);
    status = screen.getByText('일시정지');
    expect(status).toHaveClass('text-yellow-600', 'dark:text-yellow-400');
  });

  it('should have proper typography classes', () => {
    render(<TimerDisplay {...defaultProps} />);
    
    const timerType = screen.getByText('포모도로');
    expect(timerType).toHaveClass('text-sm', 'font-medium', 'uppercase', 'tracking-wide');

    const time = screen.getByText('25:00');
    expect(time).toHaveClass('text-4xl', 'md:text-5xl', 'font-mono', 'font-bold');

    const status = screen.getByText('대기 중');
    expect(status).toHaveClass('text-xs', 'font-medium', 'uppercase', 'tracking-wider');
  });
});
import { render, screen } from '@testing-library/react';
// screen imported from @testing-library/react
import { CircularProgress } from '@/components/pomodoro/CircularProgress';

describe('CircularProgress', () => {
  it('should render with default props', () => {
    render(<CircularProgress progress={0.5} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeInTheDocument();
    expect(progressbar).toHaveAttribute('aria-valuenow', '50');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should render with custom size', () => {
    const { container } = render(
      <CircularProgress progress={0.3} size={150} />
    );
    
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '150');
    expect(svg).toHaveAttribute('height', '150');
  });

  it('should render children content', () => {
    render(
      <CircularProgress progress={0.7}>
        <div data-testid="center-content">Timer Content</div>
      </CircularProgress>
    );
    
    expect(screen.getByTestId('center-content')).toBeInTheDocument();
    expect(screen.getByText('Timer Content')).toBeInTheDocument();
  });

  it('should handle progress values correctly', () => {
    const { rerender } = render(<CircularProgress progress={-0.1} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');

    rerender(<CircularProgress progress={1.5} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');

    rerender(<CircularProgress progress={0.75} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '75');
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CircularProgress progress={0.5} className="custom-class" />
    );
    
    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('custom-class');
  });

  it('should render gradient when showGradient is true', () => {
    const { container } = render(
      <CircularProgress progress={0.5} showGradient={true} />
    );
    
    const gradient = container.querySelector('linearGradient');
    expect(gradient).toBeInTheDocument();
  });

  it('should not render gradient when showGradient is false', () => {
    const { container } = render(
      <CircularProgress progress={0.5} showGradient={false} />
    );
    
    const gradient = container.querySelector('linearGradient');
    expect(gradient).not.toBeInTheDocument();
  });

  it('should render glow effect when progress > 0', () => {
    const { container } = render(<CircularProgress progress={0.1} />);
    
    const circles = container.querySelectorAll('circle');
    // Should have background track + progress circle + glow effect
    expect(circles).toHaveLength(3);
  });

  it('should not render glow effect when progress is 0', () => {
    const { container } = render(<CircularProgress progress={0} />);
    
    const circles = container.querySelectorAll('circle');
    // Should have background track + progress circle only
    expect(circles).toHaveLength(2);
  });

  it('should calculate circumference correctly', () => {
    const size = 120;
    const strokeWidth = 8;
    const radius = (size - strokeWidth) / 2;
    const expectedCircumference = 2 * Math.PI * radius;
    
    const { container } = render(
      <CircularProgress progress={0.5} size={size} strokeWidth={strokeWidth} />
    );
    
    const progressCircle = container.querySelectorAll('circle')[1];
    expect(progressCircle).toHaveAttribute('stroke-dasharray', expectedCircumference.toString());
  });

  it('should have proper accessibility attributes', () => {
    render(<CircularProgress progress={0.6} />);
    
    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toHaveAttribute('aria-labelledby', 'progress-title');
    expect(progressbar).toHaveAttribute('aria-valuenow', '60');
    expect(progressbar).toHaveAttribute('aria-valuemin', '0');
    expect(progressbar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should use correct colors based on progress with gradient', () => {
    const { container, rerender } = render(
      <CircularProgress progress={0.2} showGradient={true} />
    );
    
    // Low progress should be green-ish
    let gradientStops = container.querySelectorAll('stop');
    expect(gradientStops[0]).toHaveAttribute('stop-color', '#10b981');
    
    // Medium progress should be yellow-ish
    rerender(<CircularProgress progress={0.5} showGradient={true} />);
    gradientStops = container.querySelectorAll('stop');
    expect(gradientStops[0]).toHaveAttribute('stop-color', '#f59e0b');
    
    // High progress should be red-ish
    rerender(<CircularProgress progress={0.8} showGradient={true} />);
    gradientStops = container.querySelectorAll('stop');
    expect(gradientStops[0]).toHaveAttribute('stop-color', '#ef4444');
  });
});
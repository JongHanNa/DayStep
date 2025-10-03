'use client';

// Performance Observer for Core Web Vitals
export interface WebVital {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
}

// Core Web Vitals 임계값
const VITALS_THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  FID: { good: 100, poor: 300 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
} as const;

// 점수 평가 함수
function getRating(name: WebVital['name'], value: number): WebVital['rating'] {
  const thresholds = VITALS_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

// Web Vitals 수집 및 분석
export function reportWebVitals(onVital: (vital: WebVital) => void) {
  if (typeof window === 'undefined') return;

  // 동적 import로 web-vitals 라이브러리 로드
  import('web-vitals').then((webVitals) => {
    // v5 API 사용
    webVitals.onCLS((metric: any) => onVital({
      name: 'CLS',
      value: metric.value,
      rating: getRating('CLS', metric.value),
      delta: metric.delta,
      id: metric.id,
    } as WebVital));

    webVitals.onINP((metric: any) => onVital({
      name: 'FID', // INP는 FID를 대체
      value: metric.value,
      rating: getRating('FID', metric.value),
      delta: metric.delta,
      id: metric.id,
    } as WebVital));

    webVitals.onFCP((metric: any) => onVital({
      name: 'FCP',
      value: metric.value,
      rating: getRating('FCP', metric.value),
      delta: metric.delta,
      id: metric.id,
    } as WebVital));

    webVitals.onLCP((metric: any) => onVital({
      name: 'LCP',
      value: metric.value,
      rating: getRating('LCP', metric.value),
      delta: metric.delta,
      id: metric.id,
    } as WebVital));

    webVitals.onTTFB((metric: any) => onVital({
      name: 'TTFB',
      value: metric.value,
      rating: getRating('TTFB', metric.value),
      delta: metric.delta,
      id: metric.id,
    } as WebVital));
  }).catch(err => {
    console.warn('Failed to load web-vitals:', err);
  });
}

// Performance API 래퍼
export class PerformanceMonitor {
  private metrics: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initObservers();
    }
  }

  private initObservers() {
    // Resource loading 모니터링
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'resource') {
              this.trackResource(entry as PerformanceResourceTiming);
            }
          }
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource observer not supported:', e);
      }

      // Navigation 모니터링
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'navigation') {
              this.trackNavigation(entry as PerformanceNavigationTiming);
            }
          }
        });
        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navigationObserver);
      } catch (e) {
        console.warn('Navigation observer not supported:', e);
      }
    }
  }

  private trackResource(entry: PerformanceResourceTiming) {
    const duration = entry.responseEnd - entry.startTime;
    
    // 리소스 타입별 분류
    if (entry.name.includes('.js')) {
      this.metrics.set('js_load_time', (this.metrics.get('js_load_time') || 0) + duration);
    } else if (entry.name.includes('.css')) {
      this.metrics.set('css_load_time', (this.metrics.get('css_load_time') || 0) + duration);
    } else if (entry.name.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i)) {
      this.metrics.set('image_load_time', (this.metrics.get('image_load_time') || 0) + duration);
    }
  }

  private trackNavigation(entry: PerformanceNavigationTiming) {
    this.metrics.set('dns_time', entry.domainLookupEnd - entry.domainLookupStart);
    this.metrics.set('tcp_time', entry.connectEnd - entry.connectStart);
    this.metrics.set('request_time', entry.responseStart - entry.requestStart);
    this.metrics.set('response_time', entry.responseEnd - entry.responseStart);
    this.metrics.set('dom_parse_time', entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart);
    this.metrics.set('dom_ready_time', entry.domContentLoadedEventEnd - entry.startTime);
    this.metrics.set('load_complete_time', entry.loadEventEnd - entry.startTime);
  }

  // 메트릭 수집
  public getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  // 메모리 사용량 (Chrome/Edge only)
  public getMemoryUsage(): any {
    if ('memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  }

  // 정리
  public disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Analytics 전송 (GA4, Amplitude 등에 활용)
export function sendAnalytics(eventName: string, data: Record<string, any>) {
  // Google Analytics 4
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as any).gtag('event', eventName, data);
  }

  // 개발 환경에서는 콘솔에 로그
  if (process.env.NODE_ENV === 'development') {
    console.log('Analytics Event:', eventName, data);
  }
}

// Bundle Analyzer (개발용)
export function analyzeBundle() {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return;
  }

  const scripts = Array.from(document.scripts);
  const totalSize = scripts.reduce((sum, script) => {
    return sum + (script.src ? 1 : script.innerHTML.length);
  }, 0);

  console.log('Bundle Analysis:', {
    totalScripts: scripts.length,
    estimatedSize: `${(totalSize / 1024).toFixed(2)}KB`,
    scripts: scripts.map(s => s.src || 'inline').filter(Boolean),
  });
}

// 성능 메트릭 전역 상태
let globalMetrics: Record<string, number> = {};
const globalWebVitals: WebVital[] = [];

// 전역 성능 모니터 인스턴스
let globalMonitor: PerformanceMonitor | null = null;

// 성능 모니터링 초기화
export function initPerformanceMonitoring() {
  if (typeof window === 'undefined' || globalMonitor) return;

  globalMonitor = new PerformanceMonitor();

  // Web Vitals 수집
  reportWebVitals((vital) => {
    globalWebVitals.push(vital);
    sendAnalytics('web_vital', {
      metric_name: vital.name,
      metric_value: vital.value,
      metric_rating: vital.rating,
    });
  });

  // 주기적 메트릭 업데이트
  setInterval(() => {
    if (globalMonitor) {
      globalMetrics = globalMonitor.getMetrics();
    }
  }, 5000);
}

// 현재 성능 메트릭 조회
export function getCurrentMetrics() {
  return {
    metrics: globalMetrics,
    webVitals: globalWebVitals,
    memory: globalMonitor?.getMemoryUsage() || null,
  };
}
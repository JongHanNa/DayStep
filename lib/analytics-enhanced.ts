/**
 * 향상된 성능 분석 및 모니터링 시스템
 */

import { onCLS, onFCP, onINP, onLCP, onTTFB } from "web-vitals";

/**
 * 성능 지표 타입 정의
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  timestamp: number;
  url: string;
  userAgent: string;
  connectionType?: string;
  deviceType: "desktop" | "mobile" | "tablet";
  batteryLevel?: number;
  isCharging?: boolean;
}

export interface PerformanceReport {
  sessionId: string;
  timestamp: number;
  metrics: PerformanceMetric[];
  userEnvironment: {
    userAgent: string;
    language: string;
    platform: string;
    cookieEnabled: boolean;
    onLine: boolean;
    connectionType?: string;
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  pageInfo: {
    url: string;
    referrer: string;
    title: string;
    loadTime: number;
  };
  resourceTiming: {
    totalResources: number;
    totalSize: number;
    largestResource: {
      name: string;
      size: number;
      duration: number;
    };
  };
}

/**
 * 디바이스 타입 감지
 */
function getDeviceType(): "desktop" | "mobile" | "tablet" {
  const userAgent = navigator.userAgent;

  if (/tablet|ipad/i.test(userAgent)) {
    return "tablet";
  }

  if (/mobile|android|iphone/i.test(userAgent)) {
    return "mobile";
  }

  return "desktop";
}

/**
 * 네트워크 연결 타입 감지
 */
function getConnectionType(): string | undefined {
  const connection =
    (navigator as any).connection ||
    (navigator as any).mozConnection ||
    (navigator as any).webkitConnection;

  return connection?.effectiveType || connection?.type;
}

/**
 * 배터리 정보 수집
 */
async function getBatteryInfo(): Promise<{
  level?: number;
  charging?: boolean;
}> {
  try {
    if ("getBattery" in navigator) {
      const battery = await (navigator as any).getBattery();
      return {
        level: battery.level,
        charging: battery.charging,
      };
    }
  } catch (error) {
    console.warn("Battery API not available:", error);
  }
  return {};
}

/**
 * 리소스 타이밍 분석
 */
function analyzeResourceTiming() {
  const resources = performance.getEntriesByType(
    "resource"
  ) as PerformanceResourceTiming[];

  let totalSize = 0;
  let largestResource = { name: "", size: 0, duration: 0 };

  resources.forEach((resource) => {
    const size = resource.transferSize || 0;
    totalSize += size;

    if (size > largestResource.size) {
      largestResource = {
        name: resource.name,
        size: size,
        duration: resource.duration,
      };
    }
  });

  return {
    totalResources: resources.length,
    totalSize,
    largestResource,
  };
}

/**
 * 성능 지표 수집 클래스
 */
export class PerformanceAnalytics {
  private sessionId: string;
  private metrics: PerformanceMetric[] = [];
  private reportInterval: number = 30000; // 30초
  private maxMetrics: number = 100;
  private lastReportTime: number = 0;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeWebVitals();
    this.startPeriodicReporting();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Web Vitals 초기화
   */
  private initializeWebVitals() {
    // Core Web Vitals 수집
    onCLS(this.handleMetric.bind(this));
    onFCP(this.handleMetric.bind(this));
    onINP(this.handleMetric.bind(this)); // FID 대신 INP 사용
    onLCP(this.handleMetric.bind(this));
    onTTFB(this.handleMetric.bind(this));

    // 커스텀 메트릭 수집
    this.collectCustomMetrics();
  }

  /**
   * 메트릭 핸들러
   */
  private async handleMetric(metric: any) {
    const batteryInfo = await getBatteryInfo();

    const performanceMetric: PerformanceMetric = {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      connectionType: getConnectionType(),
      deviceType: getDeviceType(),
      batteryLevel: batteryInfo.level,
      isCharging: batteryInfo.charging,
    };

    this.addMetric(performanceMetric);

    // 즉시 중요한 메트릭 전송
    if (metric.rating === "poor" || metric.name === "LCP") {
      this.sendMetric(performanceMetric);
    }
  }

  /**
   * 커스텀 메트릭 수집
   */
  private collectCustomMetrics() {
    // 메모리 사용량
    if ("memory" in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      this.addMetric({
        name: "JSHeapUsed",
        value: memory.usedJSHeapSize / 1024 / 1024, // MB
        rating: memory.usedJSHeapSize > 150 * 1024 * 1024 ? "poor" : "good",
        timestamp: Date.now(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        deviceType: getDeviceType(),
      });
    }

    // DOM 복잡도
    const domNodes = document.querySelectorAll("*").length;
    this.addMetric({
      name: "DOMNodes",
      value: domNodes,
      rating:
        domNodes > 1500
          ? "poor"
          : domNodes > 800
            ? "needs-improvement"
            : "good",
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
    });

    // 스크립트 로딩 시간
    const scriptResources = performance
      .getEntriesByType("resource")
      .filter((resource) => resource.name.includes(".js"))
      .reduce((total, resource) => total + resource.duration, 0);

    this.addMetric({
      name: "ScriptLoadTime",
      value: scriptResources,
      rating:
        scriptResources > 3000
          ? "poor"
          : scriptResources > 1500
            ? "needs-improvement"
            : "good",
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      deviceType: getDeviceType(),
    });
  }

  /**
   * 메트릭 추가
   */
  private addMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);

    // 메트릭 수 제한
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // 로컬 스토리지에 저장 (개발 환경에서만)
    if (process.env.NODE_ENV === "development") {
      this.saveToLocalStorage();
    }
  }

  /**
   * 주기적 리포팅
   */
  private startPeriodicReporting() {
    setInterval(() => {
      this.generateAndSendReport();
    }, this.reportInterval);

    // 페이지 언로드 시 마지막 리포트 전송
    window.addEventListener("beforeunload", () => {
      this.generateAndSendReport(true);
    });

    // 페이지 숨김 시 리포트 전송 (모바일 대응)
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        this.generateAndSendReport();
      }
    });
  }

  /**
   * 성능 리포트 생성 및 전송
   */
  private async generateAndSendReport(isBeforeUnload: boolean = false) {
    const now = Date.now();

    // 너무 자주 리포트하지 않도록 제한
    if (!isBeforeUnload && now - this.lastReportTime < this.reportInterval) {
      return;
    }

    const batteryInfo = await getBatteryInfo();

    const report: PerformanceReport = {
      sessionId: this.sessionId,
      timestamp: now,
      metrics: [...this.metrics],
      userEnvironment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        connectionType: getConnectionType(),
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
      pageInfo: {
        url: window.location.href,
        referrer: document.referrer,
        title: document.title,
        loadTime: performance.now(),
      },
      resourceTiming: analyzeResourceTiming(),
    };

    this.sendReport(report, isBeforeUnload);
    this.lastReportTime = now;

    // 전송 후 메트릭 초기화 (일부만 유지)
    this.metrics = this.metrics.slice(-10);
  }

  /**
   * 개별 메트릭 전송
   */
  private sendMetric(metric: PerformanceMetric) {
    if (process.env.NODE_ENV === "development") {
      console.log("Performance Metric:", metric);
    }

    // 프로덕션에서는 실제 분석 서비스로 전송
    // this.sendToAnalyticsService('metric', metric);
  }

  /**
   * 리포트 전송
   */
  private sendReport(report: PerformanceReport, isBeforeUnload: boolean) {
    if (
      process.env.NODE_ENV === "development" &&
      window.location.search.includes("debug=true")
    ) {
      console.log("Performance Report:", report);
    }

    // 프로덕션에서는 실제 분석 서비스로 전송
    if (isBeforeUnload && "sendBeacon" in navigator) {
      // sendBeacon으로 확실한 전송 보장
      navigator.sendBeacon(
        "/api/analytics/performance",
        JSON.stringify(report)
      );
    } else {
      // 일반적인 경우 fetch 사용
      // this.sendToAnalyticsService('report', report);
    }
  }

  /**
   * 로컬 스토리지에 저장 (개발용)
   */
  private saveToLocalStorage() {
    try {
      const data = {
        sessionId: this.sessionId,
        metrics: this.metrics.slice(-20), // 최근 20개만 저장
        timestamp: Date.now(),
      };

      localStorage.setItem("daystep_performance_data", JSON.stringify(data));
    } catch (error) {
      console.warn("Failed to save performance data to localStorage:", error);
    }
  }

  /**
   * 즉시 리포트 생성
   */
  public generateReportNow(): PerformanceReport | null {
    if (this.metrics.length === 0) return null;

    return {
      sessionId: this.sessionId,
      timestamp: Date.now(),
      metrics: [...this.metrics],
      userEnvironment: {
        userAgent: navigator.userAgent,
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        connectionType: getConnectionType(),
        deviceMemory: (navigator as any).deviceMemory,
        hardwareConcurrency: navigator.hardwareConcurrency,
      },
      pageInfo: {
        url: window.location.href,
        referrer: document.referrer,
        title: document.title,
        loadTime: performance.now(),
      },
      resourceTiming: analyzeResourceTiming(),
    };
  }

  /**
   * 성능 점수 계산
   */
  public calculatePerformanceScore(): number {
    const latestMetrics = this.metrics.slice(-10);
    if (latestMetrics.length === 0) return 0;

    let score = 0;
    let count = 0;

    latestMetrics.forEach((metric) => {
      let metricScore = 0;

      switch (metric.rating) {
        case "good":
          metricScore = 100;
          break;
        case "needs-improvement":
          metricScore = 60;
          break;
        case "poor":
          metricScore = 30;
          break;
      }

      // Core Web Vitals에 더 높은 가중치
      const weight = ["LCP", "FID", "CLS"].includes(metric.name) ? 2 : 1;
      score += metricScore * weight;
      count += weight;
    });

    return count > 0 ? Math.round(score / count) : 0;
  }

  /**
   * 메트릭 통계
   */
  public getMetricStats() {
    const stats: Record<
      string,
      { good: number; needsImprovement: number; poor: number; latest: number }
    > = {};

    this.metrics.forEach((metric) => {
      if (!stats[metric.name]) {
        stats[metric.name] = {
          good: 0,
          needsImprovement: 0,
          poor: 0,
          latest: metric.value,
        };
      }

      stats[metric.name][
        metric.rating === "needs-improvement"
          ? "needsImprovement"
          : metric.rating
      ]++;
      stats[metric.name].latest = metric.value;
    });

    return stats;
  }
}

// 전역 인스턴스
let analyticsInstance: PerformanceAnalytics | null = null;

/**
 * 분석 시스템 초기화
 */
export function initializePerformanceAnalytics(): PerformanceAnalytics {
  if (!analyticsInstance && typeof window !== "undefined") {
    analyticsInstance = new PerformanceAnalytics();
  }
  return analyticsInstance!;
}

/**
 * 분석 인스턴스 가져오기
 */
export function getPerformanceAnalytics(): PerformanceAnalytics | null {
  return analyticsInstance;
}

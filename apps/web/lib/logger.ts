/**
 * 환경별 로깅 유틸리티
 * 프로덕션에서는 불필요한 로그를 제거하여 성능 최적화
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * 개발 환경에서만 디버그 로그 출력
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(`🐛 [DEBUG] ${message}`, context || '');
    }
  }

  /**
   * 정보성 로그 (개발 환경에서만)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`ℹ️ [INFO] ${message}`, context || '');
    }
  }

  /**
   * 경고 로그 (모든 환경)
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`⚠️ [WARN] ${message}`, context || '');
  }

  /**
   * 에러 로그 (모든 환경)
   */
  error(message: string, context?: LogContext | Error): void {
    console.error(`❌ [ERROR] ${message}`, context || '');
  }

  /**
   * OAuth 관련 로그 (개발 환경에서만)
   */
  oauth(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`🔐 [OAuth] ${message}`, context || '');
    }
  }

  /**
   * 성능 관련 로그 (개발 환경에서만)
   */
  performance(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`⚡ [PERF] ${message}`, context || '');
    }
  }

  /**
   * 타임라인 관련 로그 (개발 환경에서만)
   */
  timeline(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`📅 [TIMELINE] ${message}`, context || '');
    }
  }

  /**
   * 스토어 액션 로그 (개발 환경에서만)
   */
  store(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`🏪 [STORE] ${message}`, context || '');
    }
  }

  /**
   * API 호출 로그 (개발 환경에서만)
   */
  api(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`🌐 [API] ${message}`, context || '');
    }
  }

  /**
   * 조건부 로깅
   */
  conditionalLog(condition: boolean, level: LogLevel, message: string, context?: LogContext): void {
    if (condition) {
      switch (level) {
        case 'debug':
          this.debug(message, context);
          break;
        case 'info':
          this.info(message, context);
          break;
        case 'warn':
          this.warn(message, context);
          break;
        case 'error':
          this.error(message, context);
          break;
      }
    }
  }

  /**
   * 시간 측정 시작
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(`⏱️ [TIME] ${label}`);
    }
  }

  /**
   * 시간 측정 종료
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(`⏱️ [TIME] ${label}`);
    }
  }

  /**
   * 그룹 로깅 시작
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(`📂 ${label}`);
    }
  }

  /**
   * 그룹 로깅 종료
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }

  /**
   * 접힌 그룹 로깅
   */
  groupCollapsed(label: string): void {
    if (this.isDevelopment) {
      console.groupCollapsed(`📁 ${label}`);
    }
  }
}

// 싱글톤 인스턴스 생성
export const logger = new Logger();

// 편의를 위한 개별 함수 export
export const {
  debug,
  info,
  warn,
  error,
  oauth,
  performance,
  timeline,
  store,
  api,
  time,
  timeEnd,
  group,
  groupEnd,
  groupCollapsed
} = logger;
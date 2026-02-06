/**
 * API 클라이언트 유틸리티
 * 중앙화된 HTTP 요청 처리와 에러 핸들링
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public url: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiClientOptions {
  baseUrl?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  body?: any;
}

export class ApiClient {
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultHeaders: Record<string, string>;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || '';
    this.defaultTimeout = options.timeout || 10000; // 10초
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
  }

  /**
   * HTTP 요청 수행
   */
  private async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.defaultTimeout,
      retries = 0,
      retryDelay = 1000,
      body,
      headers = {},
      ...fetchOptions
    } = options;

    const fullUrl = `${this.baseUrl}${url}`;
    const requestHeaders = { ...this.defaultHeaders, ...headers };

    // body가 있는 경우 JSON으로 직렬화
    const requestBody = body ? JSON.stringify(body) : undefined;

    // AbortController로 타임아웃 구현
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestOptions: RequestInit = {
      ...fetchOptions,
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    };

    let lastError: Error;

    // 재시도 로직
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(fullUrl, requestOptions);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            response.statusText,
            fullUrl
          );
        }

        // 응답이 JSON인 경우 파싱, 아니면 텍스트로 반환
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text() as T;
        }

      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error as Error;

        // 마지막 시도가 아니면 재시도
        if (attempt < retries) {
          await this.delay(retryDelay);
          continue;
        }

        // AbortError는 타임아웃으로 처리
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ApiError(
            'Request timeout',
            408,
            'Request Timeout',
            fullUrl
          );
        }

        // 네트워크 에러
        if (error instanceof TypeError) {
          throw new ApiError(
            'Network error',
            0,
            'Network Error',
            fullUrl
          );
        }

        throw error;
      }
    }

    throw lastError!;
  }

  /**
   * 지연 함수
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET 요청
   */
  async get<T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST 요청
   */
  async post<T>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'POST', body: data });
  }

  /**
   * PUT 요청
   */
  async put<T>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PUT', body: data });
  }

  /**
   * DELETE 요청
   */
  async delete<T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }

  /**
   * PATCH 요청
   */
  async patch<T>(url: string, data?: any, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(url, { ...options, method: 'PATCH', body: data });
  }
}

// 기본 API 클라이언트 인스턴스
export const apiClient = new ApiClient({
  timeout: 15000, // 15초
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * API 응답을 위한 타입 헬퍼
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

/**
 * 페이지네이션을 위한 타입
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * React에서 사용할 수 있는 API 호출 헬퍼
 */
export function useApiCall() {
  const handleApiError = (error: unknown): string => {
    if (error instanceof ApiError) {
      switch (error.status) {
        case 0:
          return '네트워크 연결을 확인해주세요.';
        case 401:
          return '로그인이 필요합니다.';
        case 403:
          return '접근 권한이 없습니다.';
        case 404:
          return '요청한 데이터를 찾을 수 없습니다.';
        case 408:
          return '요청 시간이 초과되었습니다.';
        case 500:
          return '서버 오류가 발생했습니다.';
        default:
          return error.message || '알 수 없는 오류가 발생했습니다.';
      }
    }

    if (error instanceof Error) {
      return error.message;
    }

    return '알 수 없는 오류가 발생했습니다.';
  };

  return { handleApiError };
}
import type { NextConfig } from "next";
// @ts-ignore
import withPWA from 'next-pwa';

// 빌드 타겟 결정 (BUILD_TARGET 환경변수 우선, 후위 MOBILE_BUILD)
const buildTarget = process.env.BUILD_TARGET || (process.env.MOBILE_BUILD === 'true' ? 'mobile' : 'web');
const isMobileBuild = buildTarget === 'mobile';
const isWebBuild = buildTarget === 'web';
const isDevelopment = process.env.NODE_ENV === 'development';

const nextConfig: NextConfig = {
  // 환경별 기본 설정
  ...(isMobileBuild && {
    // 모바일 빌드 설정 (Capacitor export 모드)
    output: 'export',
    distDir: 'out',
    trailingSlash: true,
    generateBuildId: () => `mobile-build-${Date.now()}`,
    // 모바일에서 불필요한 기능 비활성화
    poweredByHeader: false,
    reactStrictMode: false, // 모바일 하이드레이션 문제 해결을 위해 비활성화
    // 모바일 전용 페이지 확장자 우선 순위 설정
    pageExtensions: isMobileBuild ? ['mobile.tsx', 'mobile.ts', 'tsx', 'ts', 'jsx', 'js'] : ['tsx', 'ts', 'jsx', 'js'],
    // 경로 설정 단순화
    assetPrefix: '',
    basePath: '',
    // 모바일 빌드 시 린팅 건너뛰기
    eslint: {
      ignoreDuringBuilds: true,
    },
    typescript: {
      ignoreBuildErrors: false, // 타입 에러는 여전히 확인
    },
    // 빌드 추적 비활성화로 성능 향상 (experimental로 이동)
    experimental: {
      outputFileTracing: false,
    },
  }),
  
  ...(isWebBuild && {
    // 웹 빌드 설정 (Vercel serverless 모드 - standalone 제거)
    // output: 'standalone', // Vercel 배포 시 충돌 방지를 위해 제거
    poweredByHeader: false,
    reactStrictMode: false, // 하이드레이션 에러 방지
    compress: true,
  }),
  
  // 성능 최적화 설정
  compiler: {
    // 환경별 console 제어 전략
    // - 개발 환경/프리뷰: 모든 console 보존 (디버깅 필수)
    // - 웹 프로덕션: console.log 제거 (브라우저 콘솔 정리)
    // - 모바일 프로덕션: 모든 console 보존 (Xcode/Android Studio 디버깅)
    removeConsole: (() => {
      // 개발 환경 또는 프리뷰 모드: 모든 console 보존
      if (isDevelopment || process.env.PREVIEW_MODE) {
        return false;
      }

      // 프로덕션 환경 분기
      if (isMobileBuild) {
        // 모바일 프로덕션: Xcode/Android Studio 디버깅을 위해 모든 console 보존
        return false;
      } else {
        // 웹 프로덕션: error/warn만 남기고 나머지 제거 (console.log 포함)
        return { exclude: ['error', 'warn'] };
      }
    })(),
    // 모바일에서도 디버깅 정보 보존을 위한 설정
    ...(isMobileBuild && {
      emotion: false, // 불필요한 CSS-in-JS 최적화 비활성화
      // 소스맵 생성으로 디버깅 향상 (프로덕션에서도 유지)
      reactRemoveProperties: false, // React 속성 보존
    }),
  },
  
  // 환경별 필요한 패키지만 트랜스파일 (성능 최적화)
  transpilePackages: [
    // 필수 Supabase 패키지만 포함
    '@supabase/supabase-js',
    '@supabase/realtime-js',
    '@supabase/postgrest-js',
    ...(isMobileBuild ? [] : ['@supabase/ssr']), // 웹에서만 필요
    // 필수 UI 라이브러리만 포함
    'framer-motion',
  ],

  // Next.js 15 + Supabase 간헐적 SyntaxError 완전 해결을 위한 실험적 설정  
  experimental: {
    // ESM 외부화를 기본값으로 되돌림 (middleware edge runtime 호환성을 위해)
    // esmExternals: false, // edge runtime에서 문제 발생으로 주석 처리
    
    // Supabase 패키지 최적화 비활성화 (호환성 문제 방지)
    // optimizePackageImports: [
    //   '@supabase/supabase-js',
    // ],
    // 환경별 패키지 임포트 최적화 (빌드 속도 향상)
    optimizePackageImports: [
      'lucide-react', // 아이콘 라이브러리 - 트리 셰이킹 효과 큼
      'date-fns', // 날짜 라이브러리 - 사용하는 함수만 번들링
      '@dnd-kit/core', // DnD 라이브러리 - 모듈 분할 효과 큼
      '@dnd-kit/sortable',
      '@radix-ui/react-dialog', // 자주 사용되는 UI 컴포넌트
      '@radix-ui/react-dropdown-menu',
      // 환경별 최적화
      ...(isMobileBuild ? [
        '@capacitor/core',
        '@capacitor/preferences'
      ] : [
        'zustand', // 웹에서 상태관리 최적화 필요
        'framer-motion' // 웹에서 애니메이션 최적화 필요
      ]),
    ],
    // 메모리 사용량 최적화 (모바일에서 더 중요)
    webpackMemoryOptimizations: true,
    // 모바일에서 추가 최적화
    ...(isMobileBuild && {
      scrollRestoration: true,
    }),
    // 웹에서만 활성화할 기능들
    ...(isWebBuild && {
      // serverComponentsExternalPackages는 root level로 이동됨
    }),
  },

  // 이미지 최적화 설정
  images: isMobileBuild ? {
    unoptimized: true, // export 모드에서는 이미지 최적화 비활성화
  } : {
    // 지원하는 이미지 포맷 (성능 우선순위 순)
    formats: ['image/avif', 'image/webp'],
    // 모바일 우선 디바이스 크기 (모바일 최적화)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // 외부 이미지 도메인 허용
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    // 이미지 최적화 설정
    minimumCacheTTL: 31536000, // 1년 캐싱
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },


  // 웹팩 설정 커스터마이징 (ESM/CJS 해상도 일관성 확보)
  webpack: (config, { dev, isServer }) => {
    // 개발 모드에서 간헐적 SyntaxError 방지를 위한 추가 안정성 설정
    if (dev) {
      // 대형 문자열 문제 해결을 위한 캐시 비활성화 (빌드 속도 우선)
      config.cache = false;
      
      // 심볼릭 링크 해상도 비활성화로 모듈 경로 일관성 확보
      config.resolve.symlinks = false;
      
      // 개발 모드 추가 안정성 설정
      config.optimization = {
        ...config.optimization,
        removeAvailableModules: false,
        removeEmptyChunks: false,
        splitChunks: false,
      };
      
      // 파일 시스템 모니터링 개선 (초기 빌드 안정성)
      config.watchOptions = {
        poll: false,
        aggregateTimeout: 300,
        ignored: ['**/node_modules/**', '**/.git/**', '**/.next/**'],
        // 핫 리로드 제어
        ...(process.env.DISABLE_HOT_RELOAD === 'true' && {
          ignored: '**/*', // 모든 파일 변경 무시
          poll: false,
        }),
      };
    }
    
    // CJS 우선 해상도로 간헐적 ESM 구문 오류 방지
    config.resolve.mainFields = ["main", "module", "browser"];
    
    // 런타임 청크 단일화로 모듈 경계 변동성 축소
    config.optimization = {
      ...config.optimization,
      runtimeChunk: "single",
    };

    // Next.js 15 + Supabase 호환성을 위한 fallback 설정
    config.resolve.fallback = {
      ...config.resolve.fallback,
      ws: false,
      crypto: false,
    };
    
    // 모바일 빌드 시 동적 API 라우트를 정적 모바일 버전으로 리다이렉트
    if (isMobileBuild) {
      const path = require('path');
      config.resolve.alias = {
        ...config.resolve.alias,
        [path.resolve(__dirname, 'app/api/auth/google/url/route.ts')]: path.resolve(__dirname, 'app/api/auth/google/url/route.mobile.ts'),
        [path.resolve(__dirname, 'app/api/auth/google/callback/route.ts')]: path.resolve(__dirname, 'app/api/auth/google/callback/route.mobile.ts'),
        [path.resolve(__dirname, 'app/api/auth/callback/route.ts')]: path.resolve(__dirname, 'app/api/auth/callback/route.mobile.ts'),
        [path.resolve(__dirname, 'app/api/analytics/performance/route.ts')]: path.resolve(__dirname, 'app/api/analytics/performance/route.mobile.ts'),
        [path.resolve(__dirname, 'app/api/sse/route.ts')]: path.resolve(__dirname, 'app/api/sse/route.mobile.ts'),
        [path.resolve(__dirname, 'app/auth/callback/route.ts')]: path.resolve(__dirname, 'app/auth/callback/route.mobile.ts'),
      };
    }
    
    // TypeScript 설정 수정
    if (config.module && config.module.rules) {
      config.module.rules.forEach((rule: any) => {
        if (rule && typeof rule === 'object' && rule.test && rule.test.toString().includes('tsx?')) {
          if (rule.exclude) {
            if (Array.isArray(rule.exclude)) {
              rule.exclude.push(/supabase\/functions/, /mobile\//, /\/src\//, /^src\//);
              // 모바일 빌드에서 API 라우트도 제외
              if (isMobileBuild) {
                rule.exclude.push(/app\/api\//);
              }
            } else {
              const excludes = [rule.exclude, /supabase\/functions/, /mobile\//, /\/src\//, /^src\//];
              if (isMobileBuild) {
                excludes.push(/app\/api\//);
              }
              rule.exclude = excludes;
            }
          } else {
            const excludes = [/supabase\/functions/, /mobile\//, /\/src\//, /^src\//];
            if (isMobileBuild) {
              excludes.push(/app\/api\//);
            }
            rule.exclude = excludes;
          }
        }
      });
    }
    // 모바일 전용 최적화 - Capacitor WebView 호환성 향상
    if (isMobileBuild && !dev && !isServer) {
      // 단순한 청크 분할로 로딩 순서 문제 해결
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 0,
        maxSize: 0,
        cacheGroups: {
          default: {
            minChunks: 1,
            priority: -20,
            reuseExistingChunk: true,
          },
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            priority: -10,
            reuseExistingChunk: true,
          },
        },
      };
      // 런타임 청크를 메인 번들에 인라인으로 포함
      config.optimization.runtimeChunk = false;
      
      // Capacitor WebView에서 CSS @규칙 처리 개선
      if (config.module && config.module.rules) {
        config.module.rules.forEach((rule: any) => {
          if (rule && typeof rule === 'object' && rule.test && rule.test.toString().includes('css')) {
            if (rule.use && Array.isArray(rule.use)) {
              rule.use.forEach((loader: any) => {
                if (loader && typeof loader === 'object' && loader.loader && loader.loader.includes('css-loader')) {
                  loader.options = {
                    ...loader.options,
                    url: false, // CSS내 url() 처리 비활성화로 오류 방지
                    import: false, // CSS @import 처리 비활성화
                  };
                }
              });
            }
          }
        });
      }
    }

    // 웹 전용 최적화
    if (isWebBuild && !dev && !isServer) {
      // 번들 크기 분석을 위한 설정
      if (process.env.ANALYZE === 'true') {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: `bundle-analysis-${buildTarget}.html`,
          })
        );
      }

      // 고급 번들 최적화 (기존 optimization 병합)
      config.optimization = {
        ...config.optimization,
        usedExports: true,
        sideEffects: false,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // React 관련 청크
            react: {
              test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              name: 'react',
              chunks: 'all',
              priority: 30,
              enforce: true,
            },
            // UI 라이브러리 청크
            ui: {
              test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 25,
              enforce: true,
            },
            // Supabase 관련 청크
            supabase: {
              test: /[\\/]node_modules[\\/](@supabase)[\\/]/,
              name: 'supabase',
              chunks: 'all',
              priority: 20,
              enforce: true,
            },
            // 상태 관리 청크
            state: {
              test: /[\\/]node_modules[\\/](zustand|immer)[\\/]/,
              name: 'state',
              chunks: 'all',
              priority: 15,
              enforce: true,
            },
            // 공통 vendor 청크
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendor',
              chunks: 'all',
              priority: 10,
              minChunks: 2,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }

    return config;
  },

  // 웹 전용 헤더 설정 (모바일 export 모드에서는 지원되지 않음)
  ...(isWebBuild && {
    async rewrites() {
      return [
        {
          source: '/.well-known/apple-app-site-association',
          destination: '/api/apple-app-site-association',
        },
        {
          source: '/.well-known/assetlinks.json',
          destination: '/api/assetlinks',
        },
      ];
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            // 보안 헤더
            {
              key: 'X-Content-Type-Options',
              value: 'nosniff',
            },
            {
              key: 'X-Frame-Options',
              value: 'DENY',
            },
            {
              key: 'X-XSS-Protection',
              value: '1; mode=block',
            },
            {
              key: 'Referrer-Policy',
              value: 'strict-origin-when-cross-origin',
            },
            {
              key: 'Permissions-Policy',
              value: 'camera=(), microphone=(), geolocation=()',
            },
            // 성능 헤더
            {
              key: 'X-DNS-Prefetch-Control',
              value: 'on',
            },
            // PWA 관련 헤더
            {
              key: 'X-UA-Compatible',
              value: 'IE=edge',
            },
          ],
        },
        {
          // 정적 자산 캐싱 최적화
          source: '/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
        {
          // API 라우트 캐싱 설정
          source: '/api/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'no-store, max-age=0',
            },
          ],
        },
      ];
    },
  }),
  
  // 환경별 빌드 정보 출력
  env: {
    BUILD_TARGET: buildTarget,
    BUILD_TIMESTAMP: new Date().toISOString(),
    BUILD_MODE: isDevelopment ? 'development' : 'production',
  },
};

// PWA 설정 - 웹 빌드에서만 활성화
const pwaConfig = isWebBuild ? withPWA({
  dest: 'public',
  disable: isDevelopment,
  register: true,
  skipWaiting: true,
  sw: 'sw.js',
  runtimeCaching: [
    {
      urlPattern: /^https?.*/, 
      handler: 'NetworkFirst',
      options: {
        cacheName: 'https-calls',
        networkTimeoutSeconds: 15,
        expiration: {
          maxEntries: 150,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
}) : ((config: NextConfig) => config);

export default pwaConfig(nextConfig);
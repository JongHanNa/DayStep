import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  safelist: [
    // 우선순위별 색상 클래스 - 동적 생성되므로 safelist에 추가
    'border-red-500', 'dark:border-red-400', 'bg-red-50', 'dark:bg-red-950/20',
    'text-red-700', 'dark:text-red-300', 'text-red-500', 'dark:text-red-400',
    'bg-red-100', 'text-red-800', 'dark:bg-red-900/30', 'dark:text-red-300',
    'accent-red-500',

    'border-yellow-500', 'dark:border-yellow-400', 'bg-yellow-50', 'dark:bg-yellow-950/20',
    'text-yellow-700', 'dark:text-yellow-300', 'text-yellow-500', 'dark:text-yellow-400',
    'bg-yellow-100', 'text-yellow-800', 'dark:bg-yellow-900/30', 'dark:text-yellow-300',
    'accent-yellow-500',

    'border-green-500', 'dark:border-green-400', 'bg-green-50', 'dark:bg-green-950/20',
    'text-green-700', 'dark:text-green-300', 'text-green-500', 'dark:text-green-400',
    'bg-green-100', 'text-green-800', 'dark:bg-green-900/30', 'dark:text-green-300',
    'accent-green-500',
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      colors: {
        // 🎨 DaisyUI 테마 시스템과 통합
        // shadcn/ui 호환성을 위한 CSS 변수 매핑
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // 🎨 타임라인 전용 색상 (DaisyUI 확장)
        timeline: {
          bg: "hsl(var(--timeline-bg))",
          connector: "hsl(var(--timeline-connector))",
          'connector-active': "hsl(var(--timeline-connector-active))",
        },

        // 🎨 섹션 헤더 색상
        section: {
          header: "hsl(var(--section-header))",
          'header-hover': "hsl(var(--section-header-hover))",
        },

        // 🎨 상태 색상
        status: {
          completed: "hsl(var(--status-completed))",
          'in-progress': "hsl(var(--status-in-progress))",
          pending: "hsl(var(--status-pending))",
        },

        // 🎨 브랜드 색상 (하위 호환성)
        brand: {
          DEFAULT: "hsl(var(--brand-primary))",
          primary: "hsl(var(--brand-primary))",
          hover: "hsl(var(--brand-primary-hover))",
          light: "hsl(var(--brand-primary-light))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        daystep_light: {
          // DaisyUI 기본 색상
          "primary": "#4a5568",          // 브랜드 메인 색상
          "primary-focus": "#2d3748",    // 호버 상태
          "primary-content": "#ffffff",  // 텍스트 색상

          "secondary": "#f1f5f9",
          "secondary-content": "#0f172a",

          "accent": "#3b82f6",
          "accent-content": "#ffffff",

          "neutral": "#1e293b",
          "neutral-content": "#f8fafc",

          "base-100": "#ffffff",    // 메인 배경
          "base-200": "#f8fafc",    // 보조 배경
          "base-300": "#e2e8f0",    // 더 어두운 배경
          "base-content": "#0f172a", // 텍스트

          "info": "#3b82f6",
          "success": "#22c55e",
          "warning": "#f97316",
          "error": "#dc2626",

          // 커스텀 CSS 변수 (DaisyUI 5.0+ 지원)
          "--rounded-box": "0.5rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-text-case": "none",
          "--border-btn": "0",              // Soft Button: 테두리 제거
          "--btn-focus-scale": "0.98",      // Soft Button: 클릭 시 살짝 축소 효과
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",
        },
        daystep_dark: {
          "primary": "#6b7280",
          "primary-focus": "#4a5568",
          "primary-content": "#ffffff",

          "secondary": "#334155",
          "secondary-content": "#f8fafc",

          "accent": "#60a5fa",
          "accent-content": "#ffffff",

          "neutral": "#0f172a",
          "neutral-content": "#f8fafc",

          "base-100": "#0f172a",
          "base-200": "#1e293b",
          "base-300": "#334155",
          "base-content": "#f8fafc",

          "info": "#60a5fa",
          "success": "#34d399",
          "warning": "#fb923c",
          "error": "#f87171",

          "--rounded-box": "0.5rem",
          "--rounded-btn": "0.5rem",
          "--rounded-badge": "1rem",
          "--animation-btn": "0.25s",
          "--animation-input": "0.2s",
          "--btn-text-case": "none",
          "--border-btn": "0",              // Soft Button: 테두리 제거
          "--btn-focus-scale": "0.98",      // Soft Button: 클릭 시 살짝 축소 효과
          "--tab-border": "1px",
          "--tab-radius": "0.5rem",
        },
      },
    ],
    darkTheme: "daystep_dark",
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
} satisfies Config;
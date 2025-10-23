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
    themes: true,
    base: true,
    styled: true,
    utils: true,
    logs: false,
  },
} satisfies Config;
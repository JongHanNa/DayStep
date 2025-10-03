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
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        // 🎨 브랜드 포인트 색상 - 체계적 네이밍
        brand: {
          // 메인 브랜드 색상
          DEFAULT: "var(--brand-primary)",
          primary: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          light: "var(--brand-primary-light)",
          medium: "var(--brand-primary-medium)",

          // 하위 호환성 별칭 (기존 코드 지원)
          accent: "var(--brand-accent)",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
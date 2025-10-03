# 🔧 Development Workflow Guide

## Overview

This guide outlines the complete development workflow for DayStep, from initial setup through deployment. It covers development practices, testing strategies, and collaboration workflows.

## 🚀 Quick Start Checklist

### Prerequisites
- [ ] **Node.js** 18.0 or later
- [ ] **npm** or **yarn** package manager
- [ ] **Git** version control
- [ ] **VS Code** (recommended) with extensions
- [ ] **Supabase** account for backend services

### Initial Setup
```bash
# 1. Clone repository
git clone https://github.com/JongHanNa/DayStep.git
cd DayStep

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# 4. Start development server
npm run dev
```

---

## 🏗️ Development Environment

### Required VS Code Extensions
```json
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "ms-vscode.eslint",
    "ms-playwright.playwright",
    "ms-vscode.test-adapter-converter"
  ]
}
```

### Recommended Settings
```json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "'([^']*)'"]
  ]
}
```

---

## 📁 Project Structure Guide

### Directory Organization
```
DayStep/
├── 📱 app/                    # Next.js App Router
│   ├── (authenticated)/      # Protected routes group
│   ├── api/                   # Server-side API routes
│   ├── auth/                  # Authentication pages
│   └── globals.css            # Global styles
├── 🧩 components/             # React components
│   ├── ui/                    # Base UI components (shadcn/ui)
│   ├── timeline/              # Timeline-specific components
│   ├── todos/                 # Todo management components
│   ├── layout/                # App layout components
│   └── providers/             # Context providers
├── 🔧 hooks/                  # Custom React hooks
├── 📚 lib/                    # Utilities and configurations
│   ├── supabase.ts           # Database client
│   ├── auth/                 # Authentication utilities
│   └── utils.ts              # Common utilities
├── 🏪 state/                  # Global state management
│   └── stores/               # Zustand store definitions
├── 🎯 services/              # Business logic layer
├── 🌍 shared/                # Shared utilities and types
├── 📋 types/                 # TypeScript type definitions
├── 🧪 __tests__/             # Test files
└── 📱 mobile/                # Capacitor mobile app
```

### File Naming Conventions
- **Components**: PascalCase (`TodoCard.tsx`)
- **Hooks**: camelCase with "use" prefix (`useSwipeGesture.ts`)
- **Utilities**: camelCase (`dateUtils.ts`)
- **Types**: PascalCase (`TimelineItem.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS.ts`)

---

## ⚡ Development Scripts

### Core Development Commands
```bash
# Development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Formatting
npx prettier --write .
```

### Testing Commands
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Debug E2E tests
npm run test:e2e:debug
```

### Mobile Development Commands
```bash
# Build for mobile and sync with Capacitor
npm run build:mobile:fast

# Open in Xcode (iOS)
npm run mobile:ios

# Open in Android Studio
npm run mobile:android

# Sync native projects
npm run mobile:sync

# Clean mobile build
npm run mobile:clean
```

---

## 🔄 Git Workflow

### Branch Strategy
```
main
├── develop (default branch)
├── feature/timeline-improvements
├── feature/pomodoro-timer
├── bugfix/auth-redirect
└── hotfix/critical-security-patch
```

### Commit Message Convention
```bash
# Format: type(scope): description

# Types:
feat(timeline): add drag and drop functionality
fix(auth): resolve OAuth callback redirect issue
docs(api): update authentication documentation
style(ui): improve button hover states
refactor(store): simplify todo state management
test(hooks): add tests for useSwipeGesture hook
chore(deps): update Next.js to v15
```

### Branch Workflow
```bash
# 1. Create feature branch
git checkout develop
git pull origin develop
git checkout -b feature/new-feature-name

# 2. Make changes and commit
git add .
git commit -m "feat(feature): implement new functionality"

# 3. Push to remote
git push origin feature/new-feature-name

# 4. Create Pull Request
# Use GitHub CLI or web interface

# 5. After approval, merge and cleanup
git checkout develop
git pull origin develop
git branch -d feature/new-feature-name
```

### Pre-commit Hooks
```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged",
      "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml}": ["prettier --write"]
  }
}
```

---

## 🧪 Testing Strategy

### Testing Pyramid
```
    E2E Tests (10%)           ← Full user workflows
      ↑
Integration Tests (20%)      ← Component interactions
      ↑
Unit Tests (70%)             ← Individual functions
```

### Unit Testing (Jest + React Testing Library)
```typescript
// Example: __tests__/components/TodoCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import TodoCard from '@/components/todos/TodoCard';

describe('TodoCard', () => {
  const mockTodo = {
    id: '1',
    title: 'Test Todo',
    completed: false,
    createdAt: new Date(),
  };

  it('renders todo title', () => {
    render(<TodoCard todo={mockTodo} />);
    expect(screen.getByText('Test Todo')).toBeInTheDocument();
  });

  it('calls onComplete when checkbox clicked', () => {
    const onComplete = jest.fn();
    render(<TodoCard todo={mockTodo} onComplete={onComplete} />);
    
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onComplete).toHaveBeenCalledWith(mockTodo.id);
  });
});
```

### Integration Testing
```typescript
// Example: __tests__/integration/TodoFlow.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TodoFlow from '@/components/todos/TodoFlow';

describe('Todo Flow Integration', () => {
  it('creates and completes todo', async () => {
    const user = userEvent.setup();
    render(<TodoFlow />);

    // Create todo
    await user.type(screen.getByPlaceholderText('Add todo'), 'New task');
    await user.click(screen.getByRole('button', { name: /add/i }));

    // Verify creation
    expect(screen.getByText('New task')).toBeInTheDocument();

    // Complete todo
    await user.click(screen.getByRole('checkbox'));

    // Verify completion
    await waitFor(() => {
      expect(screen.getByRole('checkbox')).toBeChecked();
    });
  });
});
```

### E2E Testing (Playwright)
```typescript
// Example: e2e/todos.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Todo Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Assume user is already authenticated
  });

  test('user can create and complete todo', async ({ page }) => {
    // Create todo
    await page.fill('[placeholder="할일을 입력하세요..."]', 'E2E Test Todo');
    await page.click('button[type="submit"]');

    // Verify creation
    await expect(page.locator('text=E2E Test Todo')).toBeVisible();

    // Complete todo
    await page.click('input[type="checkbox"]');

    // Verify completion
    await expect(page.locator('input[type="checkbox"]')).toBeChecked();
  });
});
```

---

## 🎨 UI Development Workflow

### Component Development Process
1. **Design Review**: Review designs and requirements
2. **Component Planning**: Break down into atomic components
3. **Base Implementation**: Create component structure
4. **Styling**: Apply Tailwind CSS styles
5. **Interactivity**: Add event handlers and state
6. **Accessibility**: ARIA labels, keyboard navigation
7. **Testing**: Unit tests and visual tests
8. **Documentation**: Update component docs

### Styling Guidelines
```typescript
// Use Tailwind CSS with consistent patterns
const ButtonVariants = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
  outline: 'border border-input bg-background hover:bg-accent',
  ghost: 'hover:bg-accent hover:text-accent-foreground',
};

// Use cn() utility for conditional classes
const buttonClasses = cn(
  'inline-flex items-center justify-center rounded-md',
  'text-sm font-medium transition-colors',
  'focus-visible:outline-none focus-visible:ring-2',
  variants[variant],
  size === 'sm' && 'h-9 px-3',
  size === 'md' && 'h-10 px-4 py-2',
  size === 'lg' && 'h-11 px-8',
  disabled && 'pointer-events-none opacity-50',
  className
);
```

### Responsive Design Approach
```typescript
// Mobile-first responsive design
const ResponsiveComponent = () => {
  return (
    <div className={cn(
      // Mobile (default)
      'flex flex-col space-y-4 p-4',
      // Tablet
      'md:flex-row md:space-y-0 md:space-x-6 md:p-6',
      // Desktop
      'lg:p-8 xl:max-w-7xl xl:mx-auto'
    )}>
      {/* Content */}
    </div>
  );
};
```

---

## 🔧 State Management Patterns

### Zustand Store Pattern
```typescript
// Template for new stores
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface MyStore {
  // State
  items: MyItem[];
  loading: boolean;
  error: string | null;
  
  // Actions
  loadItems: () => Promise<void>;
  addItem: (item: MyItem) => void;
  updateItem: (id: string, updates: Partial<MyItem>) => void;
  removeItem: (id: string) => void;
  clearError: () => void;
}

export const useMyStore = create<MyStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        // Initial state
        items: [],
        loading: false,
        error: null,
        
        // Actions
        loadItems: async () => {
          set((state) => {
            state.loading = true;
            state.error = null;
          });
          
          try {
            const items = await fetchItems();
            set((state) => {
              state.items = items;
              state.loading = false;
            });
          } catch (error) {
            set((state) => {
              state.error = error.message;
              state.loading = false;
            });
          }
        },
        
        addItem: (item) =>
          set((state) => {
            state.items.push(item);
          }),
          
        updateItem: (id, updates) =>
          set((state) => {
            const index = state.items.findIndex(item => item.id === id);
            if (index !== -1) {
              Object.assign(state.items[index], updates);
            }
          }),
          
        removeItem: (id) =>
          set((state) => {
            state.items = state.items.filter(item => item.id !== id);
          }),
          
        clearError: () =>
          set((state) => {
            state.error = null;
          }),
      })),
      {
        name: 'my-store',
        partialize: (state) => ({
          items: state.items,
        }),
      }
    ),
    { name: 'MyStore' }
  )
);
```

---

## 🚀 Performance Guidelines

### Bundle Optimization
```typescript
// Dynamic imports for code splitting
const HeavyComponent = lazy(() => 
  import('@/components/heavy/HeavyComponent')
);

// Route-based code splitting (automatic with App Router)
const DashboardPage = () => (
  <Suspense fallback={<LoadingSkeleton />}>
    <DashboardContent />
  </Suspense>
);
```

### Image Optimization
```typescript
import Image from 'next/image';

// Optimized images
<Image
  src="/profile-picture.jpg"
  alt="User profile"
  width={200}
  height={200}
  priority // For above-the-fold images
  placeholder="blur" // For better UX
  sizes="(max-width: 768px) 100vw, 200px"
/>
```

### Memoization Patterns
```typescript
// Expensive calculations
const expensiveValue = useMemo(() => {
  return calculateComplexValue(data);
}, [data]);

// Callback stability
const handleClick = useCallback((id: string) => {
  onItemClick(id);
}, [onItemClick]);

// Component memoization
const OptimizedComponent = memo(MyComponent, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id &&
         prevProps.updatedAt === nextProps.updatedAt;
});
```

---

## 📊 Quality Assurance

### Code Quality Checklist
- [ ] TypeScript errors resolved (`tsc --noEmit`)
- [ ] ESLint warnings addressed (`npm run lint`)
- [ ] Code formatted (`prettier --write .`)
- [ ] Tests passing (`npm test`)
- [ ] E2E tests passing (`npm run test:e2e`)
- [ ] Bundle size within limits (`npm run analyze`)
- [ ] Accessibility checked (axe-core, manual testing)
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness verified

### Performance Checklist
- [ ] Core Web Vitals passing (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- [ ] Bundle size optimized (First Load JS < 110KB)
- [ ] Images optimized and properly sized
- [ ] Unused code eliminated
- [ ] Critical CSS inlined
- [ ] JavaScript minified and compressed

### Accessibility Checklist
- [ ] Semantic HTML structure
- [ ] ARIA labels and roles
- [ ] Keyboard navigation working
- [ ] Color contrast ratios met (WCAG AA)
- [ ] Screen reader compatibility
- [ ] Focus indicators visible
- [ ] Alternative text for images

---

## 🔄 Deployment Workflow

### Production Deployment Checklist
- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Performance benchmarks met
- [ ] Security review completed
- [ ] Backup procedures in place
- [ ] Rollback plan prepared

### Web Deployment (Vercel)
```bash
# Automatic deployment on push to main
git push origin main

# Manual deployment
npm run build
vercel --prod
```

### Mobile Deployment
```bash
# iOS
npm run build:mobile:fast
npm run mobile:ios
# Build and submit through Xcode

# Android
npm run build:mobile:fast
npm run mobile:android
# Build and submit through Android Studio
```

---

## 🛠️ Troubleshooting Guide

### Common Issues

#### **Build Failures**
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Check TypeScript
npx tsc --noEmit
```

#### **Development Server Issues**
```bash
# Kill existing processes
lsof -ti:3000 | xargs kill -9

# Restart with fresh cache
npm run dev -- --reset-cache
```

#### **Mobile Build Issues**
```bash
# Clean Capacitor build
npm run mobile:clean
npm run build:mobile:fast

# Reset iOS build
rm -rf mobile/ios/DerivedData
npm run mobile:ios
```

### Debug Tools
- **React DevTools**: Component tree and state inspection
- **Chrome DevTools**: Performance profiling and network analysis
- **VS Code Debugger**: Breakpoint debugging for Node.js code
- **Flipper**: Mobile app debugging (when using React Native components)

---

This comprehensive workflow guide ensures consistent development practices and high-quality code delivery across the DayStep project.
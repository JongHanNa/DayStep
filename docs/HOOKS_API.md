# 🪝 Custom Hooks API Documentation

## Overview

DayStep uses custom React hooks to encapsulate complex logic and provide reusable functionality across components. This document provides comprehensive API documentation for all custom hooks.

## 📱 Gesture & Interaction Hooks

### `useSwipeGesture`

Provides touch and mouse swipe gesture detection with configurable sensitivity and direction handling.

#### **Import**
```typescript
import { useSwipeGesture } from '@/hooks/use-swipe-gesture';
```

#### **Type Definitions**
```typescript
interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  maxVerticalDistance?: number;
  touchOnly?: boolean;
}

interface SwipeGestureReturn {
  onTouchStart: TouchEventHandler;
  onTouchEnd: TouchEventHandler;
  onMouseDown?: MouseEventHandler;
  onMouseUp?: MouseEventHandler;
}
```

#### **Parameters**
- `onSwipeLeft` (optional): Callback function triggered on left swipe
- `onSwipeRight` (optional): Callback function triggered on right swipe  
- `minSwipeDistance` (default: `50`): Minimum distance in pixels to register as swipe
- `maxVerticalDistance` (default: `100`): Maximum vertical movement allowed for horizontal swipe
- `touchOnly` (default: `false`): If true, only responds to touch events (no mouse)

#### **Usage Example**
```typescript
const MyComponent = () => {
  const swipeGesture = useSwipeGesture({
    onSwipeLeft: () => navigateNext(),
    onSwipeRight: () => navigatePrevious(),
    minSwipeDistance: 100,
    maxVerticalDistance: 80,
    touchOnly: true
  });

  return (
    <div {...swipeGesture} className="swipeable-area">
      Content that responds to swipes
    </div>
  );
};
```

#### **Implementation Details**
- **Touch Detection**: Uses `TouchEventHandler` for mobile devices
- **Mouse Detection**: Uses `MouseEventHandler` for desktop (unless `touchOnly`)
- **Threshold Calculation**: Measures distance and direction to determine valid swipe
- **Performance**: Uses `useRef` to avoid re-renders during gesture tracking

---

### `useDragAndDrop`

Provides drag-and-drop functionality for reordering timeline items.

#### **Import**
```typescript
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
```

#### **Usage Example**
```typescript
const TimelineComponent = () => {
  const { dragHandlers, dropHandlers } = useDragAndDrop({
    onReorder: (sourceId, targetId) => {
      // Handle item reordering
      updateItemOrder(sourceId, targetId);
    }
  });

  return (
    <div {...dropHandlers}>
      {items.map(item => (
        <div key={item.id} {...dragHandlers(item.id)}>
          {item.title}
        </div>
      ))}
    </div>
  );
};
```

---

## 🎵 Media & Audio Hooks

### `useAudio`

Manages audio playbook and sound effects for the application.

#### **Import**
```typescript
import { useAudio } from '@/hooks/useAudio';
```

#### **Type Definitions**
```typescript
interface AudioConfig {
  volume?: number;
  preload?: boolean;
  loop?: boolean;
}

interface AudioControls {
  play: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
  isPlaying: boolean;
  isLoading: boolean;
}
```

#### **Usage Example**
```typescript
const PomodoroTimer = () => {
  const completionSound = useAudio('/sounds/completion.mp3', {
    volume: 0.8,
    preload: true
  });

  const handleTimerComplete = async () => {
    await completionSound.play();
  };

  return (
    <button onClick={handleTimerComplete}>
      Complete Pomodoro
    </button>
  );
};
```

---

## ⏰ Timer & Date Hooks

### `usePomodoro`

Provides complete Pomodoro timer functionality with session tracking.

#### **Import**
```typescript
import { usePomodoro } from '@/hooks/usePomodoro';
```

#### **Type Definitions**
```typescript
interface PomodoroSession {
  id: string;
  duration: number;
  startTime: Date;
  endTime?: Date;
  completed: boolean;
  type: 'work' | 'break' | 'longBreak';
}

interface PomodoroControls {
  start: () => void;
  pause: () => void;
  stop: () => void;
  reset: () => void;
  skip: () => void;
  isRunning: boolean;
  isPaused: boolean;
  currentSession: PomodoroSession | null;
  timeRemaining: number;
  progress: number; // 0-1
}
```

#### **Usage Example**
```typescript
const PomodoroTimer = () => {
  const {
    start,
    pause,
    stop,
    reset,
    isRunning,
    timeRemaining,
    progress,
    currentSession
  } = usePomodoro({
    workDuration: 25 * 60, // 25 minutes
    shortBreakDuration: 5 * 60, // 5 minutes
    longBreakDuration: 15 * 60, // 15 minutes
    longBreakInterval: 4 // Every 4 work sessions
  });

  return (
    <div>
      <div>Time: {Math.floor(timeRemaining / 60)}:{timeRemaining % 60}</div>
      <div>Progress: {Math.round(progress * 100)}%</div>
      <button onClick={isRunning ? pause : start}>
        {isRunning ? 'Pause' : 'Start'}
      </button>
      <button onClick={stop}>Stop</button>
      <button onClick={reset}>Reset</button>
    </div>
  );
};
```

---

## 🔔 Notification Hooks

### `useNotifications`

Manages browser push notifications and permission handling.

#### **Import**
```typescript
import { useNotifications } from '@/hooks/useNotifications';
```

#### **Type Definitions**
```typescript
interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  requireInteraction?: boolean;
  actions?: NotificationAction[];
}

interface NotificationControls {
  requestPermission: () => Promise<NotificationPermission>;
  sendNotification: (options: NotificationOptions) => Promise<void>;
  isSupported: boolean;
  permission: NotificationPermission;
}
```

#### **Usage Example**
```typescript
const TaskNotifications = () => {
  const {
    requestPermission,
    sendNotification,
    isSupported,
    permission
  } = useNotifications();

  const handleTaskReminder = async () => {
    if (permission === 'granted') {
      await sendNotification({
        title: 'Task Reminder',
        body: 'Your scheduled task is due now!',
        icon: '/icons/notification-icon.png',
        requireInteraction: true
      });
    } else if (permission === 'default') {
      await requestPermission();
    }
  };

  return (
    <div>
      {!isSupported && <p>Notifications not supported</p>}
      <button onClick={handleTaskReminder}>
        Set Task Reminder
      </button>
    </div>
  );
};
```

---

## 🌐 Network & Data Hooks

### `useNetworkStatus`

Monitors network connectivity and provides offline/online status.

#### **Import**
```typescript
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
```

#### **Type Definitions**
```typescript
interface NetworkStatus {
  isOnline: boolean;
  isOffline: boolean;
  connectionType: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  effectiveType: string;
  downlink: number;
  rtt: number;
}
```

#### **Usage Example**
```typescript
const SyncStatus = () => {
  const { isOnline, isOffline, connectionType } = useNetworkStatus();

  return (
    <div>
      <span className={isOnline ? 'text-green-500' : 'text-red-500'}>
        {isOnline ? 'Online' : 'Offline'}
      </span>
      {isOnline && <span>({connectionType})</span>}
    </div>
  );
};
```

---

## 🔄 State & Storage Hooks

### `usePersistentState`

Provides state that automatically syncs with localStorage.

#### **Import**
```typescript
import { usePersistentState } from '@/hooks/usePersistentState';
```

#### **Usage Example**
```typescript
const UserPreferences = () => {
  const [theme, setTheme] = usePersistentState('theme', 'light');
  const [language, setLanguage] = usePersistentState('language', 'ko');

  return (
    <div>
      <select value={theme} onChange={(e) => setTheme(e.target.value)}>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </div>
  );
};
```

---

## 📱 Device & Platform Hooks

### `useMediaQuery`

Provides responsive breakpoint detection with TypeScript support.

#### **Import**
```typescript
import { useMediaQuery } from '@/hooks/use-media-query';
```

#### **Usage Example**
```typescript
const ResponsiveComponent = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
  const isDesktop = useMediaQuery('(min-width: 1025px)');

  if (isMobile) {
    return <MobileLayout />;
  } else if (isTablet) {
    return <TabletLayout />;
  } else {
    return <DesktopLayout />;
  }
};
```

---

### `useSafeArea`

Handles device safe areas for mobile devices (notches, home indicators).

#### **Import**
```typescript
import { useSafeArea } from '@/hooks/useSafeArea';
```

#### **Type Definitions**
```typescript
interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
```

#### **Usage Example**
```typescript
const MobileLayout = () => {
  const safeAreaInsets = useSafeArea();

  return (
    <div 
      style={{
        paddingTop: safeAreaInsets.top,
        paddingBottom: safeAreaInsets.bottom,
        paddingLeft: safeAreaInsets.left,
        paddingRight: safeAreaInsets.right,
      }}
    >
      Content with safe area handling
    </div>
  );
};
```

---

## 🎯 Timeline-Specific Hooks

### `useCurrentTimeScroll`

Automatically scrolls timeline to current time on mount.

#### **Import**
```typescript
import { useCurrentTimeScroll } from '@/hooks/useCurrentTimeScroll';
```

#### **Usage Example**
```typescript
const DayView = () => {
  const timelineRef = useRef<HTMLDivElement>(null);
  
  useCurrentTimeScroll(timelineRef, {
    enabled: isToday(currentDate),
    offset: 200, // Scroll offset from current time
    behavior: 'smooth'
  });

  return (
    <div ref={timelineRef} className="timeline-container">
      {/* Timeline content */}
    </div>
  );
};
```

---

## 🚀 Performance Hooks

### `useVirtualScrolling`

Implements virtual scrolling for large lists to improve performance.

#### **Import**
```typescript
import { useVirtualScrolling } from '@/hooks/useVirtualScrolling';
```

#### **Usage Example**
```typescript
const LargeList = ({ items }) => {
  const {
    containerRef,
    visibleItems,
    startIndex,
    endIndex,
    totalHeight
  } = useVirtualScrolling({
    items,
    itemHeight: 60,
    containerHeight: 400,
    overscan: 5
  });

  return (
    <div ref={containerRef} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={item.id}
            style={{
              position: 'absolute',
              top: (startIndex + index) * 60,
              height: 60,
              width: '100%'
            }}
          >
            {item.title}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 🛠️ Hook Best Practices

### 1. **Performance Optimization**
- Use `useCallback` and `useMemo` appropriately
- Implement cleanup functions in `useEffect`
- Avoid creating objects in dependency arrays

### 2. **Error Handling**
- Always handle async operation errors
- Provide fallback states for network failures
- Use error boundaries for hook errors

### 3. **TypeScript Integration**
- Define clear interfaces for hook options and return types
- Use generic types for reusable hooks
- Provide default values for optional parameters

### 4. **Testing**
- Test hooks in isolation using `@testing-library/react-hooks`
- Mock external dependencies and APIs
- Test both success and error scenarios

---

## 📝 Creating Custom Hooks

### Template
```typescript
import { useState, useEffect, useCallback } from 'react';

interface UseMyHookOptions {
  // Define options interface
}

interface UseMyHookReturn {
  // Define return type interface
}

export function useMyHook(options: UseMyHookOptions): UseMyHookReturn {
  // Implementation
  
  return {
    // Return values
  };
}
```

### Example Implementation
```typescript
export function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T) => {
    try {
      setStoredValue(value);
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  return [storedValue, setValue];
}
```

This documentation provides comprehensive coverage of all custom hooks used in the DayStep application, with clear examples and type definitions for each hook.
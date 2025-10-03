// Pomodoro Service Worker for handling notifications and background tasks

const CACHE_NAME = 'pomodoro-v1';
const NOTIFICATION_TAG = 'pomodoro-timer';

// Install event - cache essential resources
self.addEventListener('install', (event) => {
  console.log('Pomodoro Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/sounds/notification.mp3',
        '/sounds/success.mp3',
        '/sounds/warning.mp3',
        '/sounds/break.mp3',
        '/sounds/focus.mp3',
      ]).catch(() => {
        // Ignore cache errors for sound files that might not exist
        console.log('Some sound files not found, using fallback sounds');
      });
    })
  );
  
  // Take control immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Pomodoro Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('pomodoro-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients
      return self.clients.claim();
    })
  );
});

// Message handler for communication with main thread
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'TIMER_COMPLETED':
      handleTimerCompleted(data);
      break;
    case 'SHOW_NOTIFICATION':
      showNotification(data);
      break;
    case 'REQUEST_PERMISSION':
      requestNotificationPermission();
      break;
    case 'CLEAR_NOTIFICATIONS':
      clearNotifications();
      break;
    default:
      console.log('Unknown message type:', type);
  }
});

// Handle timer completion
async function handleTimerCompleted(data) {
  const { timerType, duration, sessionId } = data;
  
  const title = getNotificationTitle(timerType);
  const body = getNotificationBody(timerType, duration);
  const icon = '/icon-192x192.png';
  const badge = '/icon-192x192.png';
  
  await showNotification({
    title,
    body,
    icon,
    badge,
    tag: `${NOTIFICATION_TAG}-${sessionId}`,
    requireInteraction: true,
    actions: getNotificationActions(timerType),
    data: {
      timerType,
      sessionId,
      timestamp: Date.now(),
    }
  });
}

// Show notification
async function showNotification(options) {
  try {
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      await self.registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag || NOTIFICATION_TAG,
        requireInteraction: options.requireInteraction || false,
        actions: options.actions || [],
        data: options.data || {},
        silent: false,
        vibrate: [200, 100, 200], // Vibration pattern for mobile
      });
    } else {
      console.log('Notification permission denied');
    }
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
}

// Request notification permission
async function requestNotificationPermission() {
  try {
    const permission = await Notification.requestPermission();
    
    // Send permission status back to main thread
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'PERMISSION_STATUS',
        permission: permission
      });
    });
    
    return permission;
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return 'denied';
  }
}

// Clear all notifications
async function clearNotifications() {
  try {
    const notifications = await self.registration.getNotifications();
    notifications.forEach(notification => {
      if (notification.tag && notification.tag.startsWith(NOTIFICATION_TAG)) {
        notification.close();
      }
    });
  } catch (error) {
    console.error('Failed to clear notifications:', error);
  }
}

// Get notification title based on timer type
function getNotificationTitle(timerType) {
  switch (timerType) {
    case 'POMODORO':
      return '🍅 포모도로 완료!';
    case 'SHORT_BREAK':
      return '☕ 짧은 휴식 완료!';
    case 'LONG_BREAK':
      return '🌿 긴 휴식 완료!';
    default:
      return '⏰ 타이머 완료!';
  }
}

// Get notification body based on timer type
function getNotificationBody(timerType, duration) {
  const minutes = Math.floor(duration / 60000);
  
  switch (timerType) {
    case 'POMODORO':
      return `${minutes}분 집중 세션이 완료되었습니다. 잠시 휴식을 취하세요!`;
    case 'SHORT_BREAK':
      return `${minutes}분 휴식이 끝났습니다. 다음 포모도로를 시작할 준비가 되셨나요?`;
    case 'LONG_BREAK':
      return `${minutes}분 긴 휴식이 끝났습니다. 새로운 포모도로 세션을 시작하세요!`;
    default:
      return `${minutes}분 타이머가 완료되었습니다.`;
  }
}

// Get notification actions based on timer type
function getNotificationActions(timerType) {
  const baseActions = [
    {
      action: 'view',
      title: '앱 열기',
      icon: '/icon-192x192.png'
    }
  ];

  switch (timerType) {
    case 'POMODORO':
      return [
        ...baseActions,
        {
          action: 'start-break',
          title: '휴식 시작',
          icon: '/icon-192x192.png'
        }
      ];
    case 'SHORT_BREAK':
    case 'LONG_BREAK':
      return [
        ...baseActions,
        {
          action: 'start-pomodoro',
          title: '포모도로 시작',
          icon: '/icon-192x192.png'
        }
      ];
    default:
      return baseActions;
  }
}

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  const { action, data } = event.notification;
  
  event.notification.close();
  
  switch (action) {
    case 'view':
      handleViewAction();
      break;
    case 'start-break':
      handleStartBreakAction(data);
      break;
    case 'start-pomodoro':
      handleStartPomodoroAction(data);
      break;
    default:
      // Default action (click on notification body)
      handleViewAction();
  }
});

// Handle view action - open or focus the app
async function handleViewAction() {
  try {
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });
    
    // Find existing window
    const existingClient = clients.find(client => 
      client.url.includes(self.registration.scope.replace('/pomodoro-sw.js', ''))
    );
    
    if (existingClient) {
      // Focus existing window
      await existingClient.focus();
    } else {
      // Open new window
      await self.clients.openWindow('/');
    }
  } catch (error) {
    console.error('Failed to handle view action:', error);
  }
}

// Handle start break action
async function handleStartBreakAction(data) {
  try {
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'START_BREAK_TIMER',
        data: data
      });
    });
    
    // Also open/focus the app
    await handleViewAction();
  } catch (error) {
    console.error('Failed to handle start break action:', error);
  }
}

// Handle start pomodoro action
async function handleStartPomodoroAction(data) {
  try {
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'START_POMODORO_TIMER',
        data: data
      });
    });
    
    // Also open/focus the app
    await handleViewAction();
  } catch (error) {
    console.error('Failed to handle start pomodoro action:', error);
  }
}

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('Notification closed:', event.notification.tag);
  
  // Track notification close for analytics (optional)
  // Could send message to main thread if needed
});

// Handle background sync (for future use)
self.addEventListener('sync', (event) => {
  if (event.tag === 'pomodoro-sync') {
    event.waitUntil(syncPomodoroData());
  }
});

// Sync pomodoro data when connection is restored
async function syncPomodoroData() {
  try {
    const clients = await self.clients.matchAll();
    
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_POMODORO_DATA',
        data: { timestamp: Date.now() }
      });
    });
  } catch (error) {
    console.error('Failed to sync pomodoro data:', error);
  }
}

// Handle push events (for future web push notifications)
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      
      if (data.type === 'pomodoro-reminder') {
        event.waitUntil(
          showNotification({
            title: data.title,
            body: data.body,
            tag: `push-${Date.now()}`,
            requireInteraction: true,
            data: data.data
          })
        );
      }
    } catch (error) {
      console.error('Failed to handle push event:', error);
    }
  }
});

console.log('Pomodoro Service Worker loaded');
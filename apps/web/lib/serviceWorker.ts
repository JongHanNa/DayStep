// Service Worker registration and management utilities

export interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  registration: ServiceWorkerRegistration | null;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private listeners: Map<string, Function[]> = new Map();

  /**
   * Check if service workers are supported
   */
  isSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Register the Pomodoro service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!this.isSupported()) {
      console.warn('Service Workers are not supported in this browser');
      return null;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/pomodoro-sw.js', {
        scope: '/',
      });

      console.log('Pomodoro Service Worker registered successfully:', this.registration);

      // Set up event listeners
      this.setupEventListeners();

      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;

      this.emit('registered', this.registration);
      return this.registration;

    } catch (error) {
      console.error('Failed to register Pomodoro Service Worker:', error);
      this.emit('error', error);
      return null;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      if (result) {
        this.registration = null;
        this.emit('unregistered');
      }
      return result;
    } catch (error) {
      console.error('Failed to unregister service worker:', error);
      return false;
    }
  }

  /**
   * Send message to service worker
   */
  async sendMessage(type: string, data?: any): Promise<void> {
    if (!this.registration || !this.registration.active) {
      console.warn('Service worker not active');
      return;
    }

    try {
      this.registration.active.postMessage({ type, data });
    } catch (error) {
      console.error('Failed to send message to service worker:', error);
    }
  }

  /**
   * Get current service worker state
   */
  getState(): ServiceWorkerState {
    return {
      isSupported: this.isSupported(),
      isRegistered: !!this.registration,
      isActive: !!(this.registration && this.registration.active),
      registration: this.registration,
    };
  }

  /**
   * Add event listener
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  /**
   * Remove event listener
   */
  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emit event to listeners
   */
  private emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in service worker event callback:', error);
        }
      });
    }
  }

  /**
   * Set up service worker event listeners
   */
  private setupEventListeners(): void {
    if (!this.isSupported()) return;

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.emit('message', event.data);
    });

    // Listen for service worker updates
    if (this.registration) {
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                // New service worker is available
                this.emit('updateavailable', newWorker);
              } else {
                // First time install
                this.emit('ready', newWorker);
              }
            }
          });
        }
      });
    }

    // Listen for controller change (when new service worker takes control)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      this.emit('controllerchange');
    });
  }

  /**
   * Update the service worker
   */
  async update(): Promise<void> {
    if (!this.registration) {
      console.warn('No service worker registration found');
      return;
    }

    try {
      await this.registration.update();
      this.emit('updatechecked');
    } catch (error) {
      console.error('Failed to update service worker:', error);
    }
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      return;
    }

    try {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      this.emit('skipwaiting');
    } catch (error) {
      console.error('Failed to skip waiting:', error);
    }
  }

  /**
   * Get all active notifications
   */
  async getNotifications(): Promise<Notification[]> {
    if (!this.registration) {
      return [];
    }

    try {
      return await this.registration.getNotifications();
    } catch (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications(): Promise<void> {
    await this.sendMessage('CLEAR_NOTIFICATIONS');
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      this.emit('permissionchange', permission);
      return permission;
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return 'denied';
    }
  }
}

// Export singleton instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Initialize service worker when module is imported
if (typeof window !== 'undefined') {
  // Register service worker on page load
  window.addEventListener('load', async () => {
    await serviceWorkerManager.register();
  });
}

export default serviceWorkerManager;
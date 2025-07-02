/**
 * Notification Service for PWA push notifications
 * 
 * Following CLAUDE.md principles - clean, focused notification management
 * Handles service alerts and push notifications
 */

import { ServiceAlert } from './RealMTAService';

export interface NotificationPreferences {
  serviceAlerts: boolean;
  routeDelays: boolean;
  scheduleReminders: boolean;
  severityFilter: 'all' | 'warning-severe' | 'severe-only';
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class NotificationService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private lastNotification: ServiceAlert | null = null;
  private preferences: NotificationPreferences;
  
  // This would be replaced with actual VAPID key in production
  private readonly VAPID_PUBLIC_KEY = 'test-vapid-key-would-be-real-in-production';

  constructor() {
    this.preferences = this.loadPreferences();
    this.initializeServiceWorker();
  }

  private loadPreferences(): NotificationPreferences {
    if (typeof localStorage === 'undefined') {
      return this.getDefaultPreferences();
    }

    try {
      const saved = localStorage.getItem('commutex-notification-preferences');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[NotificationService] Error loading preferences:', error);
    }

    return this.getDefaultPreferences();
  }

  private getDefaultPreferences(): NotificationPreferences {
    return {
      serviceAlerts: true,
      routeDelays: true,
      scheduleReminders: false,
      severityFilter: 'warning-severe'
    };
  }

  private savePreferences(): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    try {
      localStorage.setItem('commutex-notification-preferences', JSON.stringify(this.preferences));
    } catch (error) {
      console.error('[NotificationService] Error saving preferences:', error);
    }
  }

  async initializeServiceWorker(): Promise<void> {
    if ('serviceWorker' in navigator) {
      try {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
        console.log('[NotificationService] Service worker ready for notifications');
      } catch (error) {
        console.error('[NotificationService] Service worker initialization failed:', error);
      }
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      throw new Error('This browser does not support notifications');
    }

    let permission = Notification.permission;

    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    console.log('[NotificationService] Notification permission:', permission);
    return permission;
  }

  async isNotificationSupported(): Promise<boolean> {
    return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
  }

  async isPushSupported(): Promise<boolean> {
    return typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator;
  }

  async setupPushNotifications(): Promise<PushSubscriptionData | null> {
    if (!await this.isPushSupported()) {
      throw new Error('Push notifications are not supported');
    }

    const permission = await this.requestPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    if (!this.serviceWorkerRegistration) {
      await this.initializeServiceWorker();
    }

    if (!this.serviceWorkerRegistration) {
      throw new Error('Service worker not available');
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.VAPID_PUBLIC_KEY)
      });

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      console.log('[NotificationService] Push subscription created');
      return subscriptionData;

    } catch (error) {
      console.error('[NotificationService] Push subscription failed:', error);
      throw error;
    }
  }

  async sendServiceAlertNotification(alert: ServiceAlert): Promise<void> {
    if (!this.shouldShowNotification(alert)) {
      return;
    }

    // Store as last notification attempt regardless of notification success
    this.lastNotification = alert;

    if (typeof window === 'undefined' || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      console.log('[NotificationService] No permission for notifications');
      return;
    }

    try {
      // For immediate local notifications
      const notification = new Notification('CommuteX Service Alert', {
        body: alert.alertText,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: `alert-${alert.affectedRoutes.join('-')}`,
        requireInteraction: alert.severity === 'severe',
        data: {
          alert: alert,
          url: '/?action=alerts'
        }
      });

      notification.onclick = () => {
        if (typeof window !== 'undefined') {
          window.focus();
          notification.close();
          // Navigate to alerts page
          window.location.href = '/?action=alerts';
        }
      };

      console.log('[NotificationService] Service alert notification sent:', alert.severity);

    } catch (error) {
      console.error('[NotificationService] Failed to send notification:', error);
    }
  }

  private shouldShowNotification(alert: ServiceAlert): boolean {
    if (!this.preferences.serviceAlerts) {
      return false;
    }

    switch (this.preferences.severityFilter) {
      case 'severe-only':
        return alert.severity === 'severe';
      case 'warning-severe':
        return alert.severity === 'warning' || alert.severity === 'severe';
      case 'all':
        return true;
      default:
        return true;
    }
  }

  async sendRouteDelayNotification(route: string, delay: number, reason?: string): Promise<void> {
    if (!this.preferences.routeDelays) {
      return;
    }

    if (typeof window === 'undefined' || typeof Notification === 'undefined' || Notification.permission !== 'granted') {
      return;
    }

    const notification = new Notification('Route Delay Alert', {
      body: `${route} train delayed by ${delay} minutes${reason ? `: ${reason}` : ''}`,
      icon: '/icons/icon-192x192.png',
      tag: `delay-${route}`,
      data: {
        route: route,
        delay: delay,
        reason: reason,
        url: '/'
      }
    });

    notification.onclick = () => {
      if (typeof window !== 'undefined') {
        window.focus();
        notification.close();
      }
    };

    console.log('[NotificationService] Route delay notification sent:', route, delay);
  }

  getLastNotification(): ServiceAlert | null {
    return this.lastNotification;
  }

  updatePreferences(newPreferences: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...newPreferences };
    this.savePreferences();
    console.log('[NotificationService] Preferences updated:', this.preferences);
  }

  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  async unsubscribeFromPush(): Promise<void> {
    if (!this.serviceWorkerRegistration) {
      return;
    }

    try {
      const subscription = await this.serviceWorkerRegistration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        console.log('[NotificationService] Unsubscribed from push notifications');
      }
    } catch (error) {
      console.error('[NotificationService] Error unsubscribing from push:', error);
    }
  }

  async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.serviceWorkerRegistration) {
      return null;
    }

    try {
      return await this.serviceWorkerRegistration.pushManager.getSubscription();
    } catch (error) {
      console.error('[NotificationService] Error getting push subscription:', error);
      return null;
    }
  }

  // Utility functions for push subscription
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    if (typeof window === 'undefined' || typeof window.atob !== 'function') {
      throw new Error('Base64 decoding not available in this environment');
    }

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes).map(byte => String.fromCharCode(byte)).join('');
    
    if (typeof window === 'undefined' || typeof window.btoa !== 'function') {
      throw new Error('Base64 encoding not available in this environment');
    }
    
    return window.btoa(binary);
  }

  async testNotification(): Promise<void> {
    const testAlert: ServiceAlert = {
      alertText: 'This is a test notification from CommuteX',
      affectedRoutes: ['TEST'],
      severity: 'info'
    };

    await this.sendServiceAlertNotification(testAlert);
  }

  getNotificationStatus(): {
    supported: boolean;
    permission: NotificationPermission;
    pushSupported: boolean;
    hasSubscription: boolean;
  } {
    return {
      supported: typeof window !== 'undefined' && 'Notification' in window,
      permission: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied',
      pushSupported: typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator,
      hasSubscription: false // Would check actual subscription status
    };
  }

  // For background processing of alerts
  async processServiceAlerts(alerts: ServiceAlert[]): Promise<void> {
    for (const alert of alerts) {
      // Only send notifications for new or updated alerts
      // In a real implementation, we'd track which alerts we've already shown
      await this.sendServiceAlertNotification(alert);
    }
  }
}
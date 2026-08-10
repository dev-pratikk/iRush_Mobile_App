import { getItemAsync, setItemAsync } from '../../lib/storage';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  createdAtMs: number;
  type: 'api_error' | 'api_warning' | 'info' | 'system';
  endpoint?: string;
  path?: string;
  statusCode?: number | null;
  errorMessage?: string;
  isRead: boolean;
  count: number;
}

type NotificationListener = (notifications: AppNotification[]) => void;

const STORAGE_KEY = '@irush_notifications_v1';
const MAX_NOTIFICATIONS = 60;

class NotificationService {
  private notifications: AppNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private loaded = false;

  constructor() {
    this.loadFromStorage();
  }

  private async loadFromStorage(): Promise<void> {
    try {
      const raw = await getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.notifications = parsed.map((item) => ({
            ...item,
            count: typeof item.count === 'number' && item.count > 0 ? item.count : 1,
          }));
        }
      }
    } catch (e) {
      if (__DEV__) console.log('[NotificationService] Load failed:', e);
    } finally {
      this.loaded = true;
      this.notify();
    }
  }

  private async saveToStorage(): Promise<void> {
    try {
      await setItemAsync(STORAGE_KEY, JSON.stringify(this.notifications.slice(0, MAX_NOTIFICATIONS)));
    } catch (e) {
      if (__DEV__) console.log('[NotificationService] Save failed:', e);
    }
  }

  public subscribe(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    listener(this.getNotifications());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const data = this.getNotifications();
    this.listeners.forEach((fn) => fn(data));
  }

  public getNotifications(): AppNotification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter((n) => !n.isRead).length;
  }

  public addNotification(
    item: Omit<AppNotification, 'id' | 'createdAtMs' | 'isRead' | 'timestamp' | 'count'> & { count?: number }
  ): AppNotification | null {
    const now = new Date();
    const createdAtMs = now.getTime();
    const timeStr = now.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

    // Check if a notification for this exact API endpoint or title already exists
    const existingIndex = this.notifications.findIndex(
      (n) =>
        (item.endpoint && n.endpoint === item.endpoint) ||
        (n.type === item.type && n.title === item.title)
    );

    if (existingIndex !== -1) {
      // Nest repeat occurrences into the existing single notification card
      const existing = this.notifications[existingIndex];
      const newCount = (existing.count || 1) + (item.count || 1);

      const updatedNotif: AppNotification = {
        ...existing,
        ...item,
        id: existing.id,
        count: newCount,
        createdAtMs,
        timestamp: timeStr,
        isRead: false,
      };

      // Move updated single notification card to the top
      this.notifications.splice(existingIndex, 1);
      this.notifications.unshift(updatedNotif);

      this.saveToStorage();
      this.notify();
      return updatedNotif;
    }

    const newNotif: AppNotification = {
      ...item,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      createdAtMs,
      timestamp: timeStr,
      isRead: false,
      count: item.count || 1,
    };

    this.notifications.unshift(newNotif);

    if (this.notifications.length > MAX_NOTIFICATIONS) {
      this.notifications = this.notifications.slice(0, MAX_NOTIFICATIONS);
    }

    this.saveToStorage();
    this.notify();
    return newNotif;
  }

  public pushApiError(
    apiName: string,
    pathOrEndpoint: string,
    statusCode: number | null,
    errorMessage: string
  ): AppNotification | null {
    const codeText = statusCode ? `HTTP ${statusCode}` : 'Error';
    const cleanApiName = apiName.replace(/^API Failure:\s*/i, '').trim();

    return this.addNotification({
      title: `⚠️ Heartbeat Alert: ${cleanApiName} Not Working`,
      message: `${codeText} on ${pathOrEndpoint} — ${errorMessage}`,
      type: 'api_error',
      endpoint: pathOrEndpoint,
      path: pathOrEndpoint,
      statusCode,
      errorMessage,
    });
  }

  public markAsRead(id: string): void {
    const target = this.notifications.find((n) => n.id === id);
    if (target && !target.isRead) {
      target.isRead = true;
      this.saveToStorage();
      this.notify();
    }
  }

  public markAllAsRead(): void {
    let changed = false;
    this.notifications.forEach((n) => {
      if (!n.isRead) {
        n.isRead = true;
        changed = true;
      }
    });

    if (changed) {
      this.saveToStorage();
      this.notify();
    }
  }

  public deleteNotification(id: string): void {
    const initialLen = this.notifications.length;
    this.notifications = this.notifications.filter((n) => n.id !== id);
    if (this.notifications.length !== initialLen) {
      this.saveToStorage();
      this.notify();
    }
  }

  public clearAll(): void {
    if (this.notifications.length > 0) {
      this.notifications = [];
      this.saveToStorage();
      this.notify();
    }
  }
}

export const notificationService = new NotificationService();

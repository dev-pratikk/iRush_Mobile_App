import { apiClient } from '../../lib/api-client';
import { notificationService } from './notification.service';

export interface PingPongEndpointReport {
  id: string;
  name: string;
  endpoint: string;
  path: string;
  status: 'testing' | 'ok' | 'error';
  statusCode: number | null;
  latencyMs: number | null;
  lastChecked: string | null;
  errorMessage?: string;
}

export const PINGPONG_MONITORED_APIS: { id: string; name: string; path: string; query?: string }[] = [
  { id: 'stats', name: 'Dashboard Stats API', path: '/dashboard/stats' },
  { id: 'open-orders', name: 'Open Orders Summary API', path: '/dashboard/open-orders' },
  { id: 'orders-list', name: 'Orders List API', path: '/dashboard/orders' },
  { id: 'orders-new', name: 'New Orders Category API', path: '/dashboard/orders', query: '?orderCategory=new' },
  { id: 'orders-repeat', name: 'Repeated Orders Category API', path: '/dashboard/orders', query: '?orderCategory=repeated' },
  { id: 'orders-search', name: 'Fast Search API', path: '/dashboard/orders/search/test' },
  { id: 'pending-orders', name: 'Pending Orders List API', path: '/dashboard/open-orders', query: '?filter=pending' },
  { id: 'partial-orders', name: 'Partial Orders List API', path: '/dashboard/open-orders', query: '?filter=partial' },
  { id: 'quotes-summary', name: 'Quotes Overview API', path: '/dashboard/quotes' },
  { id: 'quotes-salesperson', name: 'Quotes by Salesperson API', path: '/dashboard/quotes/salesperson' },
  { id: 'quotes-servicetype', name: 'Quotes by Service Type API', path: '/dashboard/quotes/service-type' },
];

type PingPongListener = (reports: PingPongEndpointReport[]) => void;

class PingPongService {
  private reports: Map<string, PingPongEndpointReport> = new Map();
  private listeners: Set<PingPongListener> = new Set();
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.resetReports();
  }

  public resetReports(): void {
    const baseURL = apiClient.baseURL;
    PINGPONG_MONITORED_APIS.forEach((api) => {
      const fullUrl = `${baseURL}${api.path}${api.query || ''}`;
      this.reports.set(api.id, {
        id: api.id,
        name: api.name,
        endpoint: fullUrl,
        path: `${api.path}${api.query || ''}`,
        status: 'testing',
        statusCode: null,
        latencyMs: null,
        lastChecked: null,
      });
    });
  }

  public subscribe(listener: PingPongListener): () => void {
    this.listeners.add(listener);
    listener(this.getReports());
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    const data = this.getReports();
    this.listeners.forEach((fn) => fn(data));
  }

  public getReports(): PingPongEndpointReport[] {
    return Array.from(this.reports.values());
  }

  public updateReport(id: string, update: Partial<PingPongEndpointReport>): void {
    const current = this.reports.get(id);
    if (current) {
      this.reports.set(id, { ...current, ...update });
      this.notify();
    }
  }

  public async pingEndpoint(
    apiItem: (typeof PINGPONG_MONITORED_APIS)[0],
    token?: string | null
  ): Promise<PingPongEndpointReport> {
    const baseURL = apiClient.baseURL;
    const fullUrl = `${baseURL}${apiItem.path}${apiItem.query || ''}`;
    const startTime = Date.now();

    this.updateReport(apiItem.id, { status: 'testing' });

    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latencyMs = Date.now() - startTime;
      const nowStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const result: PingPongEndpointReport = {
        id: apiItem.id,
        name: apiItem.name,
        endpoint: fullUrl,
        path: `${apiItem.path}${apiItem.query || ''}`,
        status: response.ok ? 'ok' : 'error',
        statusCode: response.status,
        latencyMs,
        lastChecked: nowStr,
        errorMessage: response.ok ? undefined : `HTTP ${response.status} ${response.statusText}`,
      };

      this.reports.set(apiItem.id, result);
      this.notify();

      if (!response.ok) {
        notificationService.pushApiError(
          apiItem.name,
          `${apiItem.path}${apiItem.query || ''}`,
          response.status,
          `HTTP ${response.status} ${response.statusText}`
        );
      }

      return result;
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const nowStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });

      const errMsg = err?.name === 'AbortError' ? 'Ping Timeout (10s)' : err?.message || 'Network Error';
      const statusCode = err?.name === 'AbortError' ? 408 : 500;

      const result: PingPongEndpointReport = {
        id: apiItem.id,
        name: apiItem.name,
        endpoint: fullUrl,
        path: `${apiItem.path}${apiItem.query || ''}`,
        status: 'error',
        statusCode,
        latencyMs,
        lastChecked: nowStr,
        errorMessage: errMsg,
      };

      this.reports.set(apiItem.id, result);
      this.notify();

      notificationService.pushApiError(
        apiItem.name,
        `${apiItem.path}${apiItem.query || ''}`,
        statusCode,
        errMsg
      );

      return result;
    }
  }

  public async pingAll(token?: string | null): Promise<PingPongEndpointReport[]> {
    const promises = PINGPONG_MONITORED_APIS.map((api) => this.pingEndpoint(api, token));
    return await Promise.all(promises);
  }

  public startAutoPingPong(token?: string | null, intervalMs: number = 15000): void {
    this.stopAutoPingPong();
    this.pingAll(token);
    this.timerId = setInterval(() => {
      this.pingAll(token);
    }, intervalMs);
  }

  public stopAutoPingPong(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public isAutoPinging(): boolean {
    return this.timerId !== null;
  }
}

export const pingPongService = new PingPongService();

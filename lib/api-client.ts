import Constants from 'expo-constants';

type Primitive = string | number | boolean | null | undefined;

export type ApiErrorKind = 'timeout' | 'network' | 'http' | 'parse' | 'unknown';

export class ApiClientError extends Error {
  kind: ApiErrorKind;
  status?: number;
  details?: string;
  url: string;

  constructor(message: string, options: { kind: ApiErrorKind; url: string; status?: number; details?: string }) {
    super(message);
    this.name = 'ApiClientError';
    this.kind = options.kind;
    this.url = options.url;
    this.status = options.status;
    this.details = options.details;
  }
}

export interface ApiRequestOptions {
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, Primitive>;
  token?: string | null;
  timeoutMs?: number;
  signal?: AbortSignal;
  auth?: boolean;
  parseAs?: 'json' | 'text';
  baseURL?: string;
}

const DEFAULT_TIMEOUT_MS = 30000;

const configuredBaseURL =
  Constants.expoConfig?.extra?.apiBaseUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'https://proboardv2.rushpcb.com/api/mobile/v1';

const buildUrl = (baseURL: string, path: string, query?: Record<string, Primitive>) => {
  const url = new URL(path.replace(/^\//, ''), `${baseURL.replace(/\/+$/, '')}/`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
};

const createTimeoutController = (signal: AbortSignal | undefined, timeoutMs: number) => {
  const controller = new AbortController();
  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return {
    controller,
    wasTimeout: () => timedOut,
    cleanup: () => clearTimeout(timeoutId),
  };
};

const buildHeaders = (options: ApiRequestOptions) => {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.auth !== false && options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  const hasJsonBody = options.body !== undefined && options.body !== null && !(options.body instanceof FormData);
  if (hasJsonBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

const parseResponse = async <T>(response: Response, parseAs: 'json' | 'text') => {
  if (response.status === 204) {
    return undefined as T;
  }

  try {
    if (parseAs === 'text') {
      return (await response.text()) as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    throw new ApiClientError('Invalid response format', {
      kind: 'parse',
      url: response.url,
    });
  }
};

export const apiClient = {
  baseURL: configuredBaseURL,

  async request<T>(options: ApiRequestOptions): Promise<T> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const method = options.method ?? 'GET';
    const url = buildUrl(options.baseURL ?? configuredBaseURL, options.path, options.query);
    const timeout = createTimeoutController(options.signal, timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: buildHeaders(options),
        signal: timeout.controller.signal,
        body:
          options.body === undefined || options.body === null || options.body instanceof FormData
            ? (options.body as BodyInit | undefined)
            : JSON.stringify(options.body),
      });

      if (!response.ok) {
        let details = '';
        try {
          details = (await response.text()).slice(0, 250);
        } catch {}

        throw new ApiClientError(`Server error ${response.status}`, {
          kind: 'http',
          url,
          status: response.status,
          details,
        });
      }

      return await parseResponse<T>(response, options.parseAs ?? 'json');
    } catch (error: any) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error?.name === 'AbortError') {
        if (timeout.wasTimeout()) {
          throw new ApiClientError(`Request timed out after ${timeoutMs / 1000}s`, {
            kind: 'timeout',
            url,
          });
        }

        throw new ApiClientError('Request was cancelled', {
          kind: 'unknown',
          url,
        });
      }

      if (typeof error?.message === 'string' && error.message.includes('Network request failed')) {
        throw new ApiClientError('Network request failed', {
          kind: 'network',
          url,
        });
      }

      throw new ApiClientError(error?.message || 'Unknown request error', {
        kind: 'unknown',
        url,
      });
    } finally {
      timeout.cleanup();
    }
  },

  get<T>(options: Omit<ApiRequestOptions, 'method'>) {
    return this.request<T>({ ...options, method: 'GET' });
  },
};

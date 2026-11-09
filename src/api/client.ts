// Native Fetch API client strictly adhering to Lumon API Swagger Contract
// Swagger: https://lumon-api.vercel.app/docs

import type { LumonApiError, TokenPair } from '../types/lumon';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'https://lumon-api.vercel.app/api/v1').replace(/\/$/, '');

// Session state (accessToken strictly kept in memory)
let inMemoryAccessToken: string | null = null;
let inMemoryRefreshToken: string | null = localStorage.getItem('lumon_refresh_token');

export function setSessionTokens(tokens: TokenPair | null): void {
  if (tokens) {
    inMemoryAccessToken = tokens.accessToken;
    inMemoryRefreshToken = tokens.refreshToken;
    localStorage.setItem('lumon_refresh_token', tokens.refreshToken);
  } else {
    inMemoryAccessToken = null;
    inMemoryRefreshToken = null;
    localStorage.removeItem('lumon_refresh_token');
  }
}

export function getAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function getRefreshToken(): string | null {
  return inMemoryRefreshToken;
}

export function clearSession(): void {
  setSessionTokens(null);
  window.dispatchEvent(new CustomEvent('lumon:session-cleared'));
}

/**
 * Computes X-Lumon-Build header:
 * - localhost / 127.0.0.1 -> 'dev'
 * - production -> Git SHA (7 to 40 hex chars)
 */
export function getLumonBuildHeader(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'dev';
    }
  }
  const envSha = import.meta.env.VITE_LUMON_BUILD || import.meta.env.VITE_COMMIT_SHA;
  if (envSha && /^[0-9a-f]{7,40}$/i.test(envSha)) {
    return envSha;
  }
  return 'dev';
}

export interface RequestOptions extends RequestInit {
  idempotencyKey?: string;
  ifMatch?: string;
  skipAuth?: boolean;
  retryCount?: number;
}

export interface ApiResponse<T> {
  data: T;
  etag?: string | null;
  requestId?: string | null;
  idempotentReplayed?: boolean;
}

// Mutex promise to guarantee single-use refresh token is never called concurrently
let refreshPromise: Promise<string | null> | null = null;

async function executeTokenRefresh(): Promise<string | null> {
  if (!inMemoryRefreshToken) {
    clearSession();
    return null;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Lumon-Build': getLumonBuildHeader(),
      },
      body: JSON.stringify({ refreshToken: inMemoryRefreshToken }),
    });

    if (!res.ok) {
      clearSession();
      return null;
    }

    const data = (await res.json()) as TokenPair;
    setSessionTokens(data);
    return data.accessToken;
  } catch {
    clearSession();
    return null;
  } finally {
    refreshPromise = null;
  }
}

export async function apiFetch<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const headers = new Headers(options.headers || {});

  // Add Lumon Build Header
  headers.set('X-Lumon-Build', getLumonBuildHeader());

  // Add Content-Type if request has body and not already set
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Idempotency-Key
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }

  // If-Match
  if (options.ifMatch) {
    headers.set('If-Match', options.ifMatch);
  }

  // Authorization
  if (!options.skipAuth && inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const etag = response.headers.get('ETag');
  const requestId = response.headers.get('X-Request-Id');
  const idempotentReplayed = response.headers.get('Idempotent-Replayed') === 'true';

  // Check 204 No Content
  if (response.status === 204) {
    return { data: undefined as unknown as T, etag, requestId, idempotentReplayed };
  }

  // Handle Token Expiration (401 TOKEN_EXPIRED)
  if (response.status === 401 && !options.skipAuth) {
    let errJson: LumonApiError | null = null;
    try {
      errJson = await response.clone().json();
    } catch {
      // not json
    }

    if (errJson?.error === 'TOKEN_EXPIRED') {
      if (!refreshPromise) {
        refreshPromise = executeTokenRefresh();
      }
      const newAccessToken = await refreshPromise;
      if (newAccessToken) {
        // Retry the original request once
        headers.set('Authorization', `Bearer ${newAccessToken}`);
        const retryRes = await fetch(url, {
          ...options,
          headers,
        });
        if (retryRes.status === 204) {
          return { data: undefined as unknown as T, etag, requestId, idempotentReplayed };
        }
        if (!retryRes.ok) {
          const retryErr = (await retryRes.json()) as LumonApiError;
          throw retryErr;
        }
        const data = (await retryRes.json()) as T;
        return { data, etag: retryRes.headers.get('ETag'), requestId: retryRes.headers.get('X-Request-Id'), idempotentReplayed: retryRes.headers.get('Idempotent-Replayed') === 'true' };
      }
    } else if (errJson?.error === 'TOKEN_INVALID' || errJson?.error === 'SESSION_REVOKED') {
      clearSession();
      throw errJson;
    }
  }

  // Handle Rate Limiting / Unavailable (429 or 503)
  if ((response.status === 429 || response.status === 503) && (options.retryCount ?? 0) < 2) {
    const retryAfterSec = parseInt(response.headers.get('Retry-After') || '1', 10);
    const delayMs = Math.max(1, isNaN(retryAfterSec) ? 1 : retryAfterSec) * 1000;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return apiFetch<T>(endpoint, {
      ...options,
      retryCount: (options.retryCount ?? 0) + 1,
    });
  }

  if (!response.ok) {
    let errorData: LumonApiError;
    try {
      errorData = (await response.json()) as LumonApiError;
    } catch {
      errorData = {
        error: `HTTP_${response.status}`,
        message: response.statusText || 'Error en la petición',
        details: null,
        timestamp: new Date().toISOString(),
        path: endpoint,
        requestId: requestId || '',
      };
    }
    throw errorData;
  }

  const data = (await response.json()) as T;
  return {
    data,
    etag,
    requestId,
    idempotentReplayed,
  };
}

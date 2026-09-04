/**
 * API client for the NestJS backend.
 * Handles auth token management and request/response normalization.
 *
 * Two independent instances are exported: `api` (host sessions) and
 * `guestApi` (guest sessions). They use separate localStorage keys and
 * separate refresh endpoints so a host logged into the dashboard and a
 * guest browsing/booking in the same browser don't clobber each other's
 * session — the backend also issues role-scoped tokens that only work
 * against the matching guard, so mixing them up would just 401 anyway.
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

interface ApiClientConfig {
  accessTokenKey: string;
  refreshTokenKey: string;
  refreshEndpoint: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(private readonly config: ApiClientConfig) {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem(config.accessTokenKey);
      this.refreshToken = localStorage.getItem(config.refreshTokenKey);
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  setTokens(tokens: AuthTokens) {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;

    if (typeof window !== 'undefined') {
      localStorage.setItem(this.config.accessTokenKey, tokens.accessToken);
      localStorage.setItem(this.config.refreshTokenKey, tokens.refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.config.accessTokenKey);
      localStorage.removeItem(this.config.refreshTokenKey);
    }
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<ApiResponse<T>> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.accessToken && { Authorization: `Bearer ${this.accessToken}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        // If 401, try to refresh the token
        if (response.status === 401 && this.refreshToken) {
          const refreshed = await this.refreshTokens();
          if (refreshed) {
            // Retry the original request with new token
            return this.request<T>(endpoint, options);
          }
        }

        return {
          success: false,
          error: data.error || {
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred',
          },
        };
      }

      return data;
    } catch {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Failed to connect to the server',
        },
      };
    }
  }

  private async refreshTokens(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1${this.config.refreshEndpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        return false;
      }

      const data = await response.json();
      if (data.success && data.data) {
        this.setTokens({
          accessToken: data.data.accessToken,
          refreshToken: data.data.refreshToken,
        });
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Convenience methods
  async get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  }

  async put<T>(endpoint: string, body?: unknown) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
  }

  async delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

/** Host dashboard session — unchanged localStorage keys for backwards compat. */
export const api = new ApiClient({
  accessTokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  refreshEndpoint: '/auth/refresh',
});

/** Guest (guest-facing account) session — independent from the host session above. */
export const guestApi = new ApiClient({
  accessTokenKey: 'guest_access_token',
  refreshTokenKey: 'guest_refresh_token',
  refreshEndpoint: '/auth/guest/refresh',
});

/** Admin console session — independent from host/guest sessions above. */
export const adminApi = new ApiClient({
  accessTokenKey: 'admin_access_token',
  refreshTokenKey: 'admin_refresh_token',
  refreshEndpoint: '/auth/admin/refresh',
});

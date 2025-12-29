import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

// ============================================================================
// Token Storage
// ============================================================================

interface TokenStorage {
  getAccessToken: () => Promise<string | null>;
  setAccessToken: (token: string) => Promise<void>;
  getRefreshToken: () => Promise<string | null>;
  setRefreshToken: (token: string) => Promise<void>;
  clearTokens: () => Promise<void>;
}

const tokenStorage: TokenStorage = {
  getAccessToken: async () => {
    if (Platform.OS === 'web') {
      return sessionStorage.getItem('accessToken');
    }
    return SecureStore.getItemAsync('accessToken');
  },

  setAccessToken: async (token: string) => {
    if (Platform.OS === 'web') {
      sessionStorage.setItem('accessToken', token);
      return;
    }
    await SecureStore.setItemAsync('accessToken', token);
  },

  getRefreshToken: async () => {
    if (Platform.OS === 'web') {
      return sessionStorage.getItem('refreshToken');
    }
    return SecureStore.getItemAsync('refreshToken');
  },

  setRefreshToken: async (token: string) => {
    if (Platform.OS === 'web') {
      sessionStorage.setItem('refreshToken', token);
      return;
    }
    await SecureStore.setItemAsync('refreshToken', token);
  },

  clearTokens: async () => {
    if (Platform.OS === 'web') {
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('refreshToken');
      return;
    }
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
  },
};

// ============================================================================
// API Error
// ============================================================================

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ============================================================================
// API Client
// ============================================================================

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async getHeaders(includeContentType = true): Promise<HeadersInit> {
    const accessToken = await tokenStorage.getAccessToken();
    return {
      ...(includeContentType ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    };
  }

  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      return this.refreshPromise!;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) {
        throw new ApiError('NO_REFRESH_TOKEN', 'Session expirée', 401);
      }

      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await tokenStorage.clearTokens();
        throw new ApiError('REFRESH_FAILED', 'Session expirée, veuillez vous reconnecter', 401);
      }

      const data = await response.json();
      await tokenStorage.setAccessToken(data.accessToken);
      await tokenStorage.setRefreshToken(data.refreshToken);
    })();

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // Only include Content-Type header if there's a body
    const hasBody = options.body !== undefined;
    const headers = await this.getHeaders(hasBody);
    const url = `${this.baseUrl}${endpoint}`;

    let response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    // Handle 401 - try token refresh (but not for auth endpoints)
    const isAuthEndpoint = endpoint.startsWith('/auth/');
    if (response.status === 401 && !isAuthEndpoint) {
      try {
        await this.refreshToken();
        const newHeaders = await this.getHeaders(hasBody);
        response = await fetch(url, {
          ...options,
          headers: { ...newHeaders, ...options.headers },
        });
      } catch (error) {
        if (error instanceof ApiError) throw error;
        throw new ApiError('UNAUTHORIZED', 'Session expirée', 401);
      }
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(
        data?.error || 'UNKNOWN_ERROR',
        data?.message || 'Une erreur est survenue',
        response.status
      );
    }

    return data as T;
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  put<T>(endpoint: string, data: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async uploadFile<T = { url: string }>(endpoint: string, fileUri: string, fieldName = 'file'): Promise<T> {
    // For React Native, we need to create a special FormData with the file URI
    const formData = new FormData();

    // Get file extension from URI
    const uriParts = fileUri.split('.');
    const fileExt = uriParts[uriParts.length - 1]?.toLowerCase() || 'jpg';
    const mimeType = fileExt === 'png' ? 'image/png' : fileExt === 'gif' ? 'image/gif' : 'image/jpeg';

    // Append the file with proper format for React Native
    formData.append(fieldName, {
      uri: fileUri,
      name: `upload.${fileExt}`,
      type: mimeType,
    } as any);

    const accessToken = await tokenStorage.getAccessToken();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        // Don't set Content-Type, let the browser set it with boundary
      },
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new ApiError(
        data?.error || 'UPLOAD_FAILED',
        data?.message || 'Échec du téléchargement',
        response.status
      );
    }

    return response.json();
  }

  // ============================================================================
  // Auth Helpers
  // ============================================================================

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await tokenStorage.setAccessToken(accessToken);
    await tokenStorage.setRefreshToken(refreshToken);
  }

  async clearTokens(): Promise<void> {
    await tokenStorage.clearTokens();
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await tokenStorage.getAccessToken();
    return !!token;
  }

  async getAccessToken(): Promise<string | null> {
    return tokenStorage.getAccessToken();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const api = new ApiClient(API_URL);
export { tokenStorage };

import { create } from 'zustand';
import { authApi } from '../services/api';
import { wsService } from '../services/websocket';
import type { User, AuthTokens } from '../types';

interface AuthStore {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  clearError: () => void;
}

const getStoredTokens = (): AuthTokens | null => {
  const accessToken = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  if (accessToken && refreshToken) {
    return { accessToken, refreshToken, expiresIn: '7d' };
  }
  return null;
};

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  tokens: getStoredTokens(),
  isAuthenticated: !!getStoredTokens(),
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await authApi.login({ email, password });
        //try this
      // const { user, accessToken, refreshToken, expiresIn } = data;
      // const tokens = { accessToken, refreshToken, expiresIn };
      const { user, tokens } = data;
      const { accessToken, refreshToken } = tokens;
      
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      wsService.connect(accessToken);
      set({ user, tokens, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Login failed', isLoading: false });
      throw err;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const { data: response } = await authApi.register(data);
      // const { user, accessToken, refreshToken, expiresIn } = response;
      // const tokens = { accessToken, refreshToken, expiresIn };
      const { user, tokens } = response;
      const { accessToken, refreshToken } = tokens;
        
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);

      wsService.connect(accessToken);
      set({ user, tokens, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      set({ error: err.response?.data?.error || 'Registration failed', isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    const { tokens } = get();
    try {
      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      wsService.disconnect();
      set({ user: null, tokens: null, isAuthenticated: false });
    }
  },

  fetchMe: async () => {
    // Don't wipe tokens if already authenticated — just fetch user profile
    const stored = getStoredTokens();
    if (!stored) {
      set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const { data } = await authApi.getMe();
      set({ user: data.user, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      // Only log out on 401 — not on network errors or 5xx
      if (err.response?.status === 401) {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({ user: null, tokens: null, isAuthenticated: false, isLoading: false });
      } else {
        // Network error or server error — keep the user logged in
        set({ isLoading: false });
      }
    }
  },

  clearError: () => set({ error: null }),
}));
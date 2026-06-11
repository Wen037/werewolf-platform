import { api } from './api';
import type { User } from '../types';

interface AuthResponse {
  token: string;
  refreshToken?: string;
  user: User;
}

function storeAuth(data: AuthResponse) {
  localStorage.setItem('token', data.token);
  if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
  localStorage.setItem('user', JSON.stringify(data.user));
}

export const AuthService = {
  async register(email: string, username: string, password: string): Promise<{ message: string }> {
    return api.post('/auth/register', { email, username, password });
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/verify-otp', { email, otp });
    storeAuth(data);
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });
    storeAuth(data);
    return data;
  },

  async fetchCurrentUser(): Promise<User> {
    const user = await api.get<User>('/users/me');
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  },

  logout() {
    // Revoke the refresh token server-side (fire-and-forget — local cleanup
    // proceeds even if the request fails)
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      api.post('/auth/logout', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/';
  },

  getToken(): string | null {
    return localStorage.getItem('token');
  },

  getCurrentUser(): User | null {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    try { return JSON.parse(raw) as User; } catch { return null; }
  },

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  },
};

import { api } from './api';
import type { User } from '../types';

interface AuthResponse {
  token: string;
  user: User;
}

export const AuthService = {
  async register(email: string, username: string, password: string): Promise<{ message: string }> {
    return api.post('/auth/register', { email, username, password });
  },

  async verifyOtp(email: string, otp: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/verify-otp', { email, otp });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await api.post<AuthResponse>('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    return data;
  },

  logout() {
    localStorage.removeItem('token');
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

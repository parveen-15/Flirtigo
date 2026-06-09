import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '@/store/authStore';

// All HTTP API calls go through the /proxy path which Next.js rewrites to BACKEND_URL.
// This avoids CORS issues and doesn't expose the backend URL in the JS bundle.
// For WebSocket (Socket.io) and Google OAuth redirects, NEXT_PUBLIC_* vars are still used.
const API_URL = '/proxy';
export const DIRECT_API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(config => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: any) => void; reject: (e: any) => void }> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${API_URL}/api/auth/refresh`, {}, {
          headers: { Authorization: `Bearer ${refreshToken}` },
        });
        const { accessToken, refreshToken: newRefreshToken } = res.data;
        useAuthStore.getState().setTokens(accessToken, newRefreshToken);
        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);
        useAuthStore.getState().logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export const authApi = {
  sendOtp: (phone: string) => api.post('/api/auth/otp/send', { phone }),
  verifyOtp: (phone: string, otp: string) => api.post('/api/auth/otp/verify', { phone, otp, ageConfirmed: 'true' }),
  logout: () => api.post('/api/auth/logout'),
  getMe: () => api.get('/api/auth/me'),
};

export const guestApi = {
  createSession: () => api.post('/api/auth/guest'),
  logout: () => api.post('/api/auth/guest/logout'),
};

export const usersApi = {
  getProfile: () => api.get('/api/users/profile'),
  updateProfile: (data: any) => api.patch('/api/users/profile', data),
};

export const subscriptionsApi = {
  getCurrent: () => api.get('/api/subscriptions/current'),
  createOrder: (plan: string) => api.post('/api/subscriptions/create-order', { plan }),
  verifyPayment: (data: any) => api.post('/api/subscriptions/verify-payment', data),
  getPaymentHistory: () => api.get('/api/subscriptions/payments'),
};

export const reportsApi = {
  create: (data: any) => api.post('/api/reports', data),
  blockUser: (blockedId: string) => api.post('/api/reports/block', { blockedId }),
  getMyReports: () => api.get('/api/reports/my-reports'),
};

export const adminApi = {
  getDashboard: () => api.get('/api/admin/dashboard'),
  getUsers: (params: any) => api.get('/api/admin/users', { params }),
  banUser: (id: string, data: any) => api.post(`/api/admin/users/${id}/ban`, data),
  unbanUser: (id: string) => api.post(`/api/admin/users/${id}/unban`),
  getReports: (params: any) => api.get('/api/admin/reports', { params }),
  resolveReport: (id: string, data: any) => api.patch(`/api/admin/reports/${id}`, data),
  getAnalytics: (period: string) => api.get('/api/admin/analytics', { params: { period } }),
};

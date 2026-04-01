import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach token to every request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => error ? p.reject(error) : p.resolve(token!));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Skip retry for refresh endpoint and non-401 errors
    if (
      originalRequest.url?.includes('/auth/refresh') ||
      originalRequest.url?.includes('/auth/login') ||
      error.response?.status !== 401
    ) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      }).then((token) => {
        originalRequest.headers!.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      isRefreshing = false;
      processQueue(new Error('No refresh token'), null);
      return Promise.reject(error);
    }

    try {
      const { data } = await axios.post(
        `${BASE_URL}/auth/refresh`,
        { refreshToken },
        { headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
      );

      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      processQueue(null, data.accessToken);
      originalRequest.headers!.Authorization = `Bearer ${data.accessToken}`;
      isRefreshing = false;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      isRefreshing = false;
      // DO NOT clear tokens or redirect — let the user stay on the page
      // They can manually log out if needed
      console.warn('[API] Refresh failed — keeping session alive');
      return Promise.reject(refreshError);
    }
  }
);

export const authApi = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  getMe: () => api.get('/auth/me'),
};

export const vehiclesApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/vehicles', { params }),
  getById: (id: string) => api.get(`/vehicles/${id}`),
  getByVin: (vin: string) => api.get(`/vehicles/vin/${vin}`),
  create: (data: unknown) => api.post('/vehicles', data),
  update: (id: string, data: unknown) => api.put(`/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/vehicles/${id}`),
  getStats: () => api.get('/vehicles/stats'),
};

export const auctionsApi = {
  getAll: (params?: Record<string, unknown>) => api.get('/auctions', { params }),
  getById: (id: string) => api.get(`/auctions/${id}`),
  create: (data: unknown) => api.post('/auctions', data),
  updateStatus: (id: string, status: string) => api.patch(`/auctions/${id}/status`, { status }),
  addLot: (id: string, data: unknown) => api.post(`/auctions/${id}/lots`, data),
  start: (id: string) => api.post(`/auctions/${id}/start`),
  advance: (id: string) => api.post(`/auctions/${id}/advance`),
  end: (id: string) => api.post(`/auctions/${id}/end`),
};

export const lotsApi = {
  getById: (id: string) => api.get(`/lots/${id}`),
  getByAuction: (auctionId: string) => api.get(`/lots/auction/${auctionId}`),
  getActiveLot: (auctionId: string) => api.get(`/lots/auction/${auctionId}/active`),
};

export const bidsApi = {
  getByLot: (lotId: string) => api.get(`/bids/lot/${lotId}`),
  getMyBids: () => api.get('/bids/my'),
  place: (data: { lotId: string; amount: number }) => api.post('/bids', data),
};

export const aiApi = {
  suggestBid: (data: any) => api.post('/ai/suggest-bid', data),
  analyzeVehicle: (data: any) => api.post('/ai/analyze-vehicle', data),
};

export default api;

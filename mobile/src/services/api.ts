import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../constants/config';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear auth data on unauthorized
      await AsyncStorage.multiRemove(['auth_token', 'user_data', 'refresh_token']);
      // The AuthContext will handle the redirect
    }
    return Promise.reject(error);
  }
);

export default api;

// API Helper Functions
export const apiHelpers = {
  // Generic GET request
  get: async <T>(url: string, params?: object): Promise<T> => {
    const response = await api.get<T>(url, { params });
    return response.data;
  },

  // Generic POST request
  post: async <T>(url: string, data?: object): Promise<T> => {
    const response = await api.post<T>(url, data);
    return response.data;
  },

  // Generic PUT request
  put: async <T>(url: string, data?: object): Promise<T> => {
    const response = await api.put<T>(url, data);
    return response.data;
  },

  // Generic PATCH request
  patch: async <T>(url: string, data?: object): Promise<T> => {
    const response = await api.patch<T>(url, data);
    return response.data;
  },

  // Generic DELETE request
  delete: async <T>(url: string): Promise<T> => {
    const response = await api.delete<T>(url);
    return response.data;
  },
};

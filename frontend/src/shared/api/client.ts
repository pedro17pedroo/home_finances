import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

// Get base URL for static assets (uploads)
const getBaseUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL || '/api';
  // Remove /api suffix to get the base server URL
  return apiUrl.replace(/\/api$/, '');
};

/**
 * Resolve asset URL - converts local upload paths to full URLs
 * @param url - The URL or path to resolve
 * @returns Full URL for the asset
 */
export const resolveAssetUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  
  // If it's already a full URL, return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  // If it's a local upload path, prepend the base URL
  if (url.startsWith('/uploads/')) {
    return `${getBaseUrl()}${url}`;
  }
  
  return url;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Export both names for compatibility
export const api = apiClient;
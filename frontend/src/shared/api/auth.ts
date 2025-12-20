import { apiClient } from './client';
import type { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  User, 
  ApiResponse 
} from '../types';

export const authApi = {
  login: (data: LoginRequest) => 
    apiClient.post<ApiResponse<AuthResponse>>('/auth/login', data),

  register: (data: RegisterRequest) => 
    apiClient.post<ApiResponse<AuthResponse>>('/auth/register', data),

  getCurrentUser: () => 
    apiClient.get<ApiResponse<{ user: User }>>('/auth/me'),

  updateProfile: (data: Partial<User>) => 
    apiClient.put<ApiResponse<{ user: User }>>('/auth/profile', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) => 
    apiClient.put<ApiResponse<{ message: string }>>('/auth/change-password', data),
};
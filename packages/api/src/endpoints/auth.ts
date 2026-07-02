import { apiClient } from '../client';
import type { ApiResponse, AuthResponse } from '../types';

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/users/register', body).then((r) => r.data.data),

  login: (body: { email: string; password: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', body).then((r) => r.data.data),

  forgotPassword: (body: { email: string }) =>
    apiClient.post<ApiResponse<string>>('/api/v1/auth/forgot-password', body).then((r) => r.data),

  resetPassword: (body: { email: string; otp: string; newPassword: string }) =>
    apiClient.post<ApiResponse<string>>('/api/v1/auth/reset-password', body).then((r) => r.data),

  googleLogin: (body: { idToken: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/google', body).then((r) => r.data.data),
};

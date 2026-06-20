import { apiClient } from '../client';
import type { ApiResponse, AuthResponse } from '../types';

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/users/register', body).then((r) => r.data.data),

  login: (body: { email: string; password: string }) =>
    apiClient.post<ApiResponse<AuthResponse>>('/api/v1/auth/login', body).then((r) => r.data.data),
};

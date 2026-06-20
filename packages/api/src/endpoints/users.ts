import { apiClient } from '../client';
import type { ApiResponse, UserResponse } from '../types';

export const usersApi = {
  me: () => apiClient.get<ApiResponse<UserResponse>>('/api/v1/users/me').then((r) => r.data.data),
};

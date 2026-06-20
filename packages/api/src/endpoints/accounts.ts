import { apiClient } from '../client';
import type { ApiResponse, AccountResponse, CreateAccountRequest } from '../types';

export const accountsApi = {
  list: () =>
    apiClient.get<ApiResponse<AccountResponse[]>>('/api/v1/accounts').then((r) => r.data.data),

  create: (body: CreateAccountRequest) =>
    apiClient.post<ApiResponse<AccountResponse>>('/api/v1/accounts', body).then((r) => r.data.data),

  update: (id: string, body: { name: string; isActive: boolean }) =>
    apiClient.patch<ApiResponse<AccountResponse>>(`/api/v1/accounts/${id}`, body).then((r) => r.data.data),
};

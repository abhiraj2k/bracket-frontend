import { apiClient } from '../client';
import type { ApiResponse, PageResponse, TransactionResponse, CreateTransactionRequest } from '../types';

export const transactionsApi = {
  list: (params: { month?: number; year?: number; page?: number; size?: number }) =>
    apiClient
      .get<ApiResponse<PageResponse<TransactionResponse>>>('/api/v1/reports/ledger', { params })
      .then((r) => r.data.data),

  get: (id: string) =>
    apiClient.get<ApiResponse<TransactionResponse>>(`/api/v1/transactions/${id}`).then((r) => r.data.data),

  create: (body: CreateTransactionRequest) =>
    apiClient.post<ApiResponse<TransactionResponse>>('/api/v1/transactions', body).then((r) => r.data.data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/transactions/${id}`).then((r) => r.data),
};

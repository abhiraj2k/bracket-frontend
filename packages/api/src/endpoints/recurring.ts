import { apiClient } from '../client';
import type { ApiResponse, RecurringTransactionResponse, CreateRecurringTransactionRequest } from '../types';

export const recurringApi = {
  list: () =>
    apiClient
      .get<ApiResponse<RecurringTransactionResponse[]>>('/api/v1/recurring-transactions')
      .then((r) => r.data.data),

  create: (body: CreateRecurringTransactionRequest) =>
    apiClient
      .post<ApiResponse<RecurringTransactionResponse>>('/api/v1/recurring-transactions', body)
      .then((r) => r.data.data),

  cancel: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/recurring-transactions/${id}`).then((r) => r.data),
};

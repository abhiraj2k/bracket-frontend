import { apiClient } from '../client';
import type { ApiResponse, CategoryBreakdownItem, CreditCardBracket } from '../types';

export const reportsApi = {
  breakdown: (params: { month: number; year: number }) =>
    apiClient
      .get<ApiResponse<CategoryBreakdownItem[]>>('/api/v1/reports/breakdown', { params })
      .then((r) => r.data.data),

  creditCardBracket: () =>
    apiClient.get<ApiResponse<CreditCardBracket>>('/api/v1/reports/credit-card-bracket').then((r) => r.data.data),
};

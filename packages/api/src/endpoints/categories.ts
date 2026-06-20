import { apiClient } from '../client';
import type { ApiResponse, CategoryResponse } from '../types';

export const categoriesApi = {
  list: () =>
    apiClient.get<ApiResponse<CategoryResponse[]>>('/api/v1/categories').then((r) => r.data.data),

  create: (body: { name: string; categoryType: 'EXPENSE' | 'INCOME'; parentCategoryId?: string }) =>
    apiClient.post<ApiResponse<CategoryResponse>>('/api/v1/categories', body).then((r) => r.data.data),

  updateAlias: (categoryId: string, customAlias: string | null) =>
    apiClient.put<ApiResponse<void>>(`/api/v1/categories/mapping/${categoryId}`, { customAlias }).then((r) => r.data),
};

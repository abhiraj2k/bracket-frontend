import { apiClient } from '../client';
import type { ApiResponse, TagResponse } from '../types';

export const tagsApi = {
  list: () => apiClient.get<ApiResponse<TagResponse[]>>('/api/v1/tags').then((r) => r.data.data),
  create: (name: string) =>
    apiClient.post<ApiResponse<TagResponse>>('/api/v1/tags', { name }).then((r) => r.data.data),
};

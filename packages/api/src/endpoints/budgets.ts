import { apiClient } from '../client';
import type {
  ApiResponse,
  BudgetGoalResponse,
  BudgetPeriodResponse,
  CreateBudgetGoalRequest,
  CategoryMappingResponse,
  AddCategoryMappingRequest,
} from '../types';

export const budgetsApi = {
  listGoals: () =>
    apiClient.get<ApiResponse<BudgetGoalResponse[]>>('/api/v1/budgets/goals').then((r) => r.data.data),

  createGoal: (body: CreateBudgetGoalRequest) =>
    apiClient.post<ApiResponse<BudgetGoalResponse>>('/api/v1/budgets/goals', body).then((r) => r.data.data),

  deleteGoal: (id: string) =>
    apiClient.delete<ApiResponse<void>>(`/api/v1/budgets/goals/${id}`).then((r) => r.data),

  currentPeriods: () =>
    apiClient.get<ApiResponse<BudgetPeriodResponse[]>>('/api/v1/budgets/periods/current').then((r) => r.data.data),

  listCategoryMappings: (goalId: string) =>
    apiClient
      .get<ApiResponse<CategoryMappingResponse[]>>(`/api/v1/budgets/goals/${goalId}/categories`)
      .then((r) => r.data.data),

  addCategoryMapping: (goalId: string, body: AddCategoryMappingRequest) =>
    apiClient
      .post<ApiResponse<CategoryMappingResponse>>(`/api/v1/budgets/goals/${goalId}/categories`, body)
      .then((r) => r.data.data),

  removeCategoryMapping: (goalId: string, categoryId: string) =>
    apiClient
      .delete<ApiResponse<void>>(`/api/v1/budgets/goals/${goalId}/categories/${categoryId}`)
      .then((r) => r.data),
};

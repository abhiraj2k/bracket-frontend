import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

export const keys = {
  me: ['me'] as const,
  accounts: ['accounts'] as const,
  categories: ['categories'] as const,
  tags: ['tags'] as const,
  transactions: (p: object) => ['transactions', p] as const,
  transaction: (id: string) => ['transaction', id] as const,
  budgetPeriods: ['budget-periods'] as const,
  budgetGoals: ['budget-goals'] as const,
  goalCategories: (goalId: string) => ['goal-categories', goalId] as const,
  breakdown: (p: object) => ['breakdown', p] as const,
  ccBracket: ['cc-bracket'] as const,
  recurring: ['recurring'] as const,
};

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

// Auth
export interface AuthResponse {
  accessToken: string;
  userId: string;
  householdId: string;
  name: string;
  email: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  householdId: string;
  createdAt: string;
}

// Accounts
export type AccountType = 'BANK' | 'CREDIT_CARD' | 'CASH' | 'LOAN';

export interface AccountResponse {
  id: string;
  name: string;
  accountType: AccountType;
  balance: string;
  isActive: boolean;
  billingStartDay: number | null;
  billingEndDay: number | null;
  createdAt: string;
}

export interface CreateAccountRequest {
  name: string;
  accountType: AccountType;
  openingBalance: string;
  billingStartDay?: number;
  billingEndDay?: number;
}

// Categories
export interface CategoryResponse {
  id: string;
  name: string;
  parentCategoryId: string | null;
  categoryType: 'EXPENSE' | 'INCOME';
  isGlobal: boolean;
  customAlias: string | null;
}

// Tags
export interface TagResponse {
  id: string;
  name: string;
  isGlobal: boolean;
}

// Transactions
export type TransactionType = 'EXPENSE' | 'INCOME' | 'TRANSFER';

export interface LineItemRequest {
  categoryId?: string;
  amount: string;
  tagIds?: string[];
  budgetGoalId?: string;
  note?: string;
}

export interface LineItemResponse {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  amount: string;
  tagIds: string[];
  budgetGoalId: string | null;
  note: string | null;
}

export interface CreateTransactionRequest {
  sourceAccountId: string;
  destAccountId?: string;
  transactionType: TransactionType;
  totalAmount: string;
  transactionDate: string;
  note?: string;
  lineItems: LineItemRequest[];
}

export interface TransactionResponse {
  id: string;
  sourceAccountId: string;
  sourceAccountName: string;
  destAccountId: string | null;
  destAccountName: string | null;
  transactionType: TransactionType;
  totalAmount: string;
  transactionDate: string;
  note: string | null;
  lineItems: LineItemResponse[];
  createdAt: string;
}

// Budget
export type BudgetType = 'NEEDS' | 'WANTS' | 'INVESTMENTS' | 'CUSTOM';
export type AlertLevel = 'OK' | 'WARNING' | 'ALERT' | 'MILESTONE';

export interface BudgetGoalResponse {
  id: string;
  name: string;
  targetAmount: string;
  budgetType: BudgetType;
  isActive: boolean;
  createdAt: string;
}

export interface CreateBudgetGoalRequest {
  name: string;
  targetAmount: string;
  budgetType: BudgetType;
}

export interface BudgetPeriodResponse {
  id: string;
  budgetGoalId: string;
  budgetGoalName: string;
  budgetType: BudgetType;
  periodMonth: number;
  periodYear: number;
  targetAmount: string;
  startingBalance: string;
  spentAmount: string;
  remainingAmount: string;
  alertLevel: AlertLevel;
}

export interface CategoryMappingResponse {
  budgetGoalId: string;
  categoryId: string;
  isDefault: boolean;
}

export interface AddCategoryMappingRequest {
  categoryId: string;
  isDefault: boolean;
}

// Reports
export interface CategoryBreakdownItem {
  categoryId: string;
  categoryName: string;
  total: string;
  percentage: number;
}

export interface CreditCardBracket {
  totalCreditCardLiability: string;
  accountCount: number;
  accounts: { id: string; name: string; balance: string }[];
}

// Recurring
export type RecurrenceFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface RecurringTransactionResponse {
  id: string;
  name: string;
  frequency: RecurrenceFrequency;
  nextExecutionDate: string;
  isActive: boolean;
  headerTemplate: Record<string, unknown>;
  lineItemsTemplate: unknown[];
}

export interface CreateRecurringTransactionRequest {
  name: string;
  frequency: RecurrenceFrequency;
  startDate: string;
  headerTemplate: Record<string, unknown>;
  lineItemsTemplate: unknown[];
}

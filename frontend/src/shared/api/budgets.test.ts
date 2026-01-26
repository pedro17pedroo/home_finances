import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from './client';
import {
  createBudget,
  getBudgets,
  getBudget,
  updateBudget,
  deleteBudget,
  configureAlerts,
  updateAlert,
  deleteAlert,
  getBudgetStatus,
  getBudgetHistory,
  TimePeriodType,
  BudgetStatus,
  ThresholdType,
  AlertPosition,
  ChannelType,
  type CreateBudgetRequest,
  type UpdateBudgetRequest,
  type BudgetWithStatus,
  type Alert,
  type BudgetHistory,
} from './budgets';

// Mock the API client
vi.mock('./client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Budget API Client Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBudget', () => {
    it('should create a budget and return the created budget with status', async () => {
      const mockRequest: CreateBudgetRequest = {
        categoryId: 1,
        amount: 1000,
        timePeriod: TimePeriodType.MONTHLY,
        status: BudgetStatus.ACTIVE,
      };

      const mockResponse: BudgetWithStatus = {
        id: 1,
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: TimePeriodType.MONTHLY,
        status: BudgetStatus.ACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        currentSpending: 0,
        percentageUsed: 0,
        remainingAmount: 1000,
        exceededAmount: 0,
        isExceeded: false,
        alerts: [],
      };

      vi.mocked(apiClient.post).mockResolvedValue({
        data: { data: mockResponse },
      } as any);

      const result = await createBudget(mockRequest);

      expect(apiClient.post).toHaveBeenCalledWith('/budgets', mockRequest);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getBudgets', () => {
    it('should fetch all budgets without filters', async () => {
      const mockBudgets: BudgetWithStatus[] = [
        {
          id: 1,
          organizationId: 1,
          categoryId: 1,
          amount: 1000,
          currency: 'USD',
          timePeriod: TimePeriodType.MONTHLY,
          status: BudgetStatus.ACTIVE,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          currentSpending: 500,
          percentageUsed: 50,
          remainingAmount: 500,
          exceededAmount: 0,
          isExceeded: false,
          alerts: [],
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockBudgets },
      } as any);

      const result = await getBudgets();

      expect(apiClient.get).toHaveBeenCalledWith('/budgets', { params: undefined });
      expect(result).toEqual(mockBudgets);
    });

    it('should fetch budgets with filters', async () => {
      const filters = {
        status: BudgetStatus.ACTIVE,
        categoryId: 1,
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: [] },
      } as any);

      await getBudgets(filters);

      expect(apiClient.get).toHaveBeenCalledWith('/budgets', { params: filters });
    });
  });

  describe('getBudget', () => {
    it('should fetch a single budget by id', async () => {
      const mockBudget: BudgetWithStatus = {
        id: 1,
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: TimePeriodType.MONTHLY,
        status: BudgetStatus.ACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        currentSpending: 500,
        percentageUsed: 50,
        remainingAmount: 500,
        exceededAmount: 0,
        isExceeded: false,
        alerts: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockBudget },
      } as any);

      const result = await getBudget(1);

      expect(apiClient.get).toHaveBeenCalledWith('/budgets/1');
      expect(result).toEqual(mockBudget);
    });
  });

  describe('updateBudget', () => {
    it('should update a budget and return the updated budget', async () => {
      const updateData: UpdateBudgetRequest = {
        amount: 1500,
        status: BudgetStatus.INACTIVE,
      };

      const mockResponse: BudgetWithStatus = {
        id: 1,
        organizationId: 1,
        categoryId: 1,
        amount: 1500,
        currency: 'USD',
        timePeriod: TimePeriodType.MONTHLY,
        status: BudgetStatus.INACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        currentSpending: 500,
        percentageUsed: 33.33,
        remainingAmount: 1000,
        exceededAmount: 0,
        isExceeded: false,
        alerts: [],
      };

      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: mockResponse },
      } as any);

      const result = await updateBudget(1, updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/budgets/1', updateData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteBudget', () => {
    it('should delete a budget', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({} as any);

      await deleteBudget(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/budgets/1');
    });
  });

  describe('configureAlerts', () => {
    it('should configure alerts for a budget', async () => {
      const alerts = [
        {
          thresholdType: ThresholdType.PERCENTAGE,
          thresholdValue: 80,
          position: AlertPosition.BEFORE_LIMIT,
          channels: [
            { type: ChannelType.IN_APP, enabled: true },
            { type: ChannelType.EMAIL, enabled: true },
          ],
        },
      ];

      vi.mocked(apiClient.post).mockResolvedValue({} as any);

      await configureAlerts(1, alerts);

      expect(apiClient.post).toHaveBeenCalledWith('/budgets/1/alerts', { alerts });
    });
  });

  describe('updateAlert', () => {
    it('should update an alert and return the updated alert', async () => {
      const updateData = {
        thresholdValue: 90,
      };

      const mockAlert: Alert = {
        id: 1,
        budgetId: 1,
        thresholdType: ThresholdType.PERCENTAGE,
        thresholdValue: 90,
        position: AlertPosition.BEFORE_LIMIT,
        channels: [{ type: ChannelType.IN_APP, enabled: true }],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      };

      vi.mocked(apiClient.put).mockResolvedValue({
        data: { data: mockAlert },
      } as any);

      const result = await updateAlert(1, updateData);

      expect(apiClient.put).toHaveBeenCalledWith('/alerts/1', updateData);
      expect(result).toEqual(mockAlert);
    });
  });

  describe('deleteAlert', () => {
    it('should delete an alert', async () => {
      vi.mocked(apiClient.delete).mockResolvedValue({} as any);

      await deleteAlert(1);

      expect(apiClient.delete).toHaveBeenCalledWith('/alerts/1');
    });
  });

  describe('getBudgetStatus', () => {
    it('should fetch budget status with spending information', async () => {
      const mockStatus: BudgetWithStatus = {
        id: 1,
        organizationId: 1,
        categoryId: 1,
        amount: 1000,
        currency: 'USD',
        timePeriod: TimePeriodType.MONTHLY,
        status: BudgetStatus.ACTIVE,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        currentSpending: 850,
        percentageUsed: 85,
        remainingAmount: 150,
        exceededAmount: 0,
        isExceeded: false,
        alerts: [],
      };

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockStatus },
      } as any);

      const result = await getBudgetStatus(1);

      expect(apiClient.get).toHaveBeenCalledWith('/budgets/1/status');
      expect(result).toEqual(mockStatus);
    });
  });

  describe('getBudgetHistory', () => {
    it('should fetch archived periods for a budget', async () => {
      const mockHistory: BudgetHistory[] = [
        {
          id: 1,
          budgetId: 1,
          periodStartDate: '2024-01-01T00:00:00Z',
          periodEndDate: '2024-01-31T23:59:59Z',
          finalSpendingAmount: 950,
          percentageUsed: 95,
          alertsTriggered: ['alert-1', 'alert-2'],
          createdAt: '2024-02-01T00:00:00Z',
        },
      ];

      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockHistory },
      } as any);

      const result = await getBudgetHistory(1);

      expect(apiClient.get).toHaveBeenCalledWith('/budgets/1/history');
      expect(result).toEqual(mockHistory);
    });
  });

  describe('API response handling', () => {
    it('should handle response with data wrapper', async () => {
      const mockBudget = { id: 1, amount: 1000 };
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { data: mockBudget },
      } as any);

      const result = await getBudget(1);
      expect(result).toEqual(mockBudget);
    });

    it('should handle response without data wrapper', async () => {
      const mockBudget = { id: 1, amount: 1000 };
      vi.mocked(apiClient.get).mockResolvedValue({
        data: mockBudget,
      } as any);

      const result = await getBudget(1);
      expect(result).toEqual(mockBudget);
    });
  });
});

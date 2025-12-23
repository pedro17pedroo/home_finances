import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../../shared/api/reports';

export const reportKeys = {
  all: ['reports'] as const,
  financialOverview: (months: number) => [...reportKeys.all, 'financial-overview', months] as const,
};

export function useFinancialOverview(months: number = 6) {
  return useQuery({
    queryKey: reportKeys.financialOverview(months),
    queryFn: () => reportsApi.getFinancialOverview(months),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
}

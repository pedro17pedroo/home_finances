import { useQuery } from '@tanstack/react-query';
import { accountTypesApi } from '../../../shared/api/account-types';

export function useAccountTypes() {
  return useQuery({
    queryKey: ['account-types'],
    queryFn: accountTypesApi.getAll,
    staleTime: 1000 * 60 * 60, // 1 hora - tipos de conta não mudam frequentemente
  });
}

export function useAccountType(code: string) {
  return useQuery({
    queryKey: ['account-types', code],
    queryFn: () => accountTypesApi.getByCode(code),
    enabled: !!code,
    staleTime: 1000 * 60 * 60, // 1 hora
  });
}

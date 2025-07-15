import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook para gerenciar a sincronização do cache React Query
 * Centraliza a lógica de invalidação para manter o frontend sincronizado
 */
export const useCacheSync = () => {
  const queryClient = useQueryClient();

  // Invalidar todas as queries relacionadas a transações
  const syncTransactions = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/monthly-transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/expenses-by-category"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/savings"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/user/limits"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] }),
    ]);
  };

  // Invalidar todas as queries relacionadas a contas
  const syncAccounts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/savings"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/user/limits"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] }),
    ]);
  };

  // Invalidar todas as queries relacionadas a categorias
  const syncCategories = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/expenses-by-category"] }),
    ]);
  };

  // Invalidar todas as queries relacionadas a metas de poupança
  const syncSavingsGoals = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/savings-goals"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial-summary"] }),
    ]);
  };

  // Invalidar todas as queries relacionadas a empréstimos
  const syncLoans = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/loans"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }),
    ]);
  };

  // Invalidar todas as queries relacionadas a dívidas
  const syncDebts = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/debts"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }),
    ]);
  };

  // Invalidar todas as queries relacionadas a planos/assinatura
  const syncSubscription = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/user/limits"] }),
    ]);
  };

  // Invalidar todas as queries relacionadas a utilizador
  const syncUser = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/user/limits"] }),
    ]);
  };

  // Invalidar tudo o dashboard
  const syncDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/monthly-transactions"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/expenses-by-category"] }),
    ]);
  };

  // Invalidar todas as queries relacionadas a transferências
  const syncTransfers = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["/api/transfers"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/accounts/savings"] }),
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/financial-summary"] }),
    ]);
  };

  // Invalidar tudo (usar apenas em casos extremos)
  const syncAll = async () => {
    await queryClient.invalidateQueries();
  };

  return {
    syncTransactions,
    syncAccounts,
    syncCategories,
    syncSavingsGoals,
    syncLoans,
    syncDebts,
    syncTransfers,
    syncSubscription,
    syncUser,
    syncDashboard,
    syncAll,
  };
};
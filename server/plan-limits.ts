import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { SystemConfig } from './system-config';

// Dynamic plan limits from database settings
export async function getPlanLimits() {
  return await SystemConfig.getPlanLimits();
}

// Legacy constant for backward compatibility - will be removed
export const PLAN_LIMITS = {
  basic: {
    maxAccounts: 5,
    maxTransactionsPerMonth: 1000,
  },
  premium: {
    maxAccounts: Infinity,
    maxTransactionsPerMonth: Infinity,
  },
  enterprise: {
    maxAccounts: Infinity,
    maxTransactionsPerMonth: Infinity,
  }
};

// Middleware para validar limite de contas bancárias
export const validateAccountLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session!.userId;
    const user = req.session!.user;
    
    if (!user || !user.planType) {
      return res.status(400).json({ message: 'Plano do usuário não encontrado' });
    }

    const allPlanLimits = await getPlanLimits();
    const planLimits = allPlanLimits[user.planType as keyof typeof allPlanLimits];
    
    // Se o plano tem contas ilimitadas (valor -1), permitir
    if (planLimits.maxAccounts === -1) {
      return next();
    }

    // Verificar quantas contas o usuário já tem
    const existingAccounts = await storage.getAccounts(userId);
    
    if (existingAccounts.length >= planLimits.maxAccounts) {
      return res.status(403).json({ 
        message: `Limite de contas bancárias atingido para o plano ${user.planType}`,
        limit: planLimits.maxAccounts,
        current: existingAccounts.length,
        upgradeRequired: true
      });
    }

    next();
  } catch (error: any) {
    console.error('Error validating account limit:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Middleware para validar limite de transações mensais
export const validateTransactionLimit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session!.userId;
    const user = req.session!.user;
    
    if (!user || !user.planType) {
      return res.status(400).json({ message: 'Plano do usuário não encontrado' });
    }

    const allPlanLimits = await getPlanLimits();
    const planLimits = allPlanLimits[user.planType as keyof typeof allPlanLimits];
    
    // Se o plano tem transações ilimitadas (valor -1), permitir
    if (planLimits.maxTransactionsPerMonth === -1) {
      return next();
    }

    // Calcular início e fim do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Verificar quantas transações o usuário já fez este mês
    const monthlyTransactions = await storage.getTransactionsByDateRange(userId, startOfMonth, endOfMonth);
    
    if (monthlyTransactions.length >= planLimits.maxTransactionsPerMonth) {
      return res.status(403).json({ 
        message: `Limite de transações mensais atingido para o plano ${user.planType}`,
        limit: planLimits.maxTransactionsPerMonth,
        current: monthlyTransactions.length,
        upgradeRequired: true
      });
    }

    next();
  } catch (error: any) {
    console.error('Error validating transaction limit:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
};

// Função para obter o status atual dos limites do usuário
export const getUserLimitsStatus = async (userId: number, planType: string) => {
  try {
    const allPlanLimits = await getPlanLimits();
    const planLimits = allPlanLimits[planType as keyof typeof allPlanLimits];
    
    // Contar contas existentes
    const accounts = await storage.getAccounts(userId);
    const accountsCount = accounts.length;
    
    // Contar transações do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const monthlyTransactions = await storage.getTransactionsByDateRange(userId, startOfMonth, endOfMonth);
    const transactionsCount = monthlyTransactions.length;
    
    // -1 means unlimited
    const isAccountsUnlimited = planLimits.maxAccounts === -1;
    const isTransactionsUnlimited = planLimits.maxTransactionsPerMonth === -1;
    
    return {
      accounts: {
        current: accountsCount,
        limit: planLimits.maxAccounts,
        percentage: isAccountsUnlimited ? 0 : (accountsCount / planLimits.maxAccounts) * 100,
        canCreate: isAccountsUnlimited || accountsCount < planLimits.maxAccounts
      },
      transactions: {
        current: transactionsCount,
        limit: planLimits.maxTransactionsPerMonth,
        percentage: isTransactionsUnlimited ? 0 : (transactionsCount / planLimits.maxTransactionsPerMonth) * 100,
        canCreate: isTransactionsUnlimited || transactionsCount < planLimits.maxTransactionsPerMonth
      },
      planType,
      isUnlimited: isAccountsUnlimited && isTransactionsUnlimited
    };
  } catch (error) {
    console.error('Error getting user limits status:', error);
    throw error;
  }
};
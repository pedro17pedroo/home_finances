import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

// Define os limites para cada plano
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

    const planLimits = PLAN_LIMITS[user.planType as keyof typeof PLAN_LIMITS];
    
    // Se o plano tem contas ilimitadas, permitir
    if (planLimits.maxAccounts === Infinity) {
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

    const planLimits = PLAN_LIMITS[user.planType as keyof typeof PLAN_LIMITS];
    
    // Se o plano tem transações ilimitadas, permitir
    if (planLimits.maxTransactionsPerMonth === Infinity) {
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
    const planLimits = PLAN_LIMITS[planType as keyof typeof PLAN_LIMITS];
    
    // Contar contas existentes
    const accounts = await storage.getAccounts(userId);
    const accountsCount = accounts.length;
    
    // Contar transações do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const monthlyTransactions = await storage.getTransactionsByDateRange(userId, startOfMonth, endOfMonth);
    const transactionsCount = monthlyTransactions.length;
    
    return {
      accounts: {
        current: accountsCount,
        limit: planLimits.maxAccounts,
        percentage: planLimits.maxAccounts === Infinity ? 0 : (accountsCount / planLimits.maxAccounts) * 100,
        canCreate: planLimits.maxAccounts === Infinity || accountsCount < planLimits.maxAccounts
      },
      transactions: {
        current: transactionsCount,
        limit: planLimits.maxTransactionsPerMonth,
        percentage: planLimits.maxTransactionsPerMonth === Infinity ? 0 : (transactionsCount / planLimits.maxTransactionsPerMonth) * 100,
        canCreate: planLimits.maxTransactionsPerMonth === Infinity || transactionsCount < planLimits.maxTransactionsPerMonth
      },
      planType,
      isUnlimited: planLimits.maxAccounts === Infinity && planLimits.maxTransactionsPerMonth === Infinity
    };
  } catch (error) {
    console.error('Error getting user limits status:', error);
    throw error;
  }
};
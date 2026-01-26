# Budget Management - Exemplos de Código 💻

Este documento fornece exemplos práticos de código para integração e extensão do sistema de orçamentos.

---

## 📱 Mobile - Exemplos React Native

### Exemplo 1: Navegar para Lista de Orçamentos

```typescript
import { useNavigation } from '@react-navigation/native';

function DashboardScreen() {
  const navigation = useNavigation();

  const handleBudgetsPress = () => {
    navigation.navigate('BudgetList' as never);
  };

  return (
    <TouchableOpacity onPress={handleBudgetsPress}>
      <Text>Ver Orçamentos</Text>
    </TouchableOpacity>
  );
}
```

### Exemplo 2: Criar Orçamento Programaticamente

```typescript
import { createBudget, TimePeriodType, BudgetStatus } from '../../services/budget.service';

async function createMonthlyBudget() {
  try {
    const budget = await createBudget({
      categoryId: 5,
      amount: 1000,
      timePeriod: TimePeriodType.MONTHLY,
      status: BudgetStatus.ACTIVE,
      alerts: [
        {
          thresholdType: 'percentage',
          thresholdValue: 80,
          position: 'before_limit',
          channels: [
            { type: 'in_app', enabled: true },
            { type: 'email', enabled: true },
          ],
        },
        {
          thresholdType: 'percentage',
          thresholdValue: 100,
          position: 'before_limit',
          channels: [
            { type: 'in_app', enabled: true },
          ],
        },
      ],
    });

    console.log('Orçamento criado:', budget);
    return budget;
  } catch (error) {
    console.error('Erro ao criar orçamento:', error);
    throw error;
  }
}
```

### Exemplo 3: Listar Orçamentos com Filtros

```typescript
import { getBudgets, BudgetStatus } from '../../services/budget.service';

async function loadActiveBudgets() {
  try {
    const budgets = await getBudgets({
      status: BudgetStatus.ACTIVE,
    });

    console.log(`${budgets.length} orçamentos ativos encontrados`);
    return budgets;
  } catch (error) {
    console.error('Erro ao carregar orçamentos:', error);
    return [];
  }
}
```

### Exemplo 4: Componente de Card de Orçamento Customizado

```typescript
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BudgetWithStatus } from '../../services/budget.service';

interface BudgetCardProps {
  budget: BudgetWithStatus;
  onPress: () => void;
}

export const BudgetCard: React.FC<BudgetCardProps> = ({ budget, onPress }) => {
  const getProgressColor = () => {
    if (budget.isExceeded) return '#EF4444';
    if (budget.percentageUsed >= 90) return '#F59E0B';
    return '#10B981';
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <Text style={styles.category}>Categoria #{budget.categoryId}</Text>
      <Text style={styles.amount}>R$ {budget.amount.toFixed(2)}</Text>
      
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${Math.min(budget.percentageUsed, 100)}%`,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>
      
      <Text style={[styles.percentage, { color: getProgressColor() }]}>
        {budget.percentageUsed.toFixed(1)}% usado
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  category: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
  },
});
```

---

## 🌐 Web - Exemplos React

### Exemplo 1: Hook Customizado para Orçamentos

```typescript
import { useState, useEffect } from 'react';
import { getBudgets, BudgetWithStatus } from '../shared/api/budgets';

export function useBudgets() {
  const [budgets, setBudgets] = useState<BudgetWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBudgets = async () => {
    try {
      setLoading(true);
      const data = await getBudgets();
      setBudgets(data);
      setError(null);
    } catch (err) {
      setError('Erro ao carregar orçamentos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBudgets();
  }, []);

  return {
    budgets,
    loading,
    error,
    reload: loadBudgets,
  };
}

// Uso:
function MyComponent() {
  const { budgets, loading, error, reload } = useBudgets();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      {budgets.map(budget => (
        <div key={budget.id}>{budget.amount}</div>
      ))}
      <button onClick={reload}>Recarregar</button>
    </div>
  );
}
```

### Exemplo 2: Disparar Notificação de Budget

```typescript
import { showBudgetNotification } from '../shared/components/BudgetNotificationToast';

function triggerBudgetAlert() {
  showBudgetNotification({
    title: 'Orçamento Atingido!',
    message: 'Você atingiu 80% do seu orçamento de alimentação',
    type: 'warning',
    budgetId: 123,
    metadata: {
      currentSpending: 800,
      budgetAmount: 1000,
      percentageUsed: 80,
    },
  });
}
```

### Exemplo 3: Componente de Progresso Reutilizável

```typescript
import React from 'react';

interface BudgetProgressProps {
  current: number;
  total: number;
  showPercentage?: boolean;
}

export const BudgetProgress: React.FC<BudgetProgressProps> = ({
  current,
  total,
  showPercentage = true,
}) => {
  const percentage = (current / total) * 100;
  const isExceeded = percentage > 100;
  const isWarning = percentage >= 90 && percentage <= 100;

  const getColor = () => {
    if (isExceeded) return 'bg-red-500';
    if (isWarning) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${getColor()} transition-all duration-300`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {showPercentage && (
        <p className={`text-sm mt-1 font-semibold ${
          isExceeded ? 'text-red-600' :
          isWarning ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {percentage.toFixed(1)}%
        </p>
      )}
    </div>
  );
};

// Uso:
<BudgetProgress current={800} total={1000} />
```

### Exemplo 4: Formulário com React Hook Form

```typescript
import { useForm } from 'react-hook-form';
import { createBudget, TimePeriodType } from '../shared/api/budgets';

interface BudgetFormData {
  categoryId: string;
  amount: number;
  timePeriod: TimePeriodType;
}

export function BudgetFormWithValidation() {
  const { register, handleSubmit, formState: { errors } } = useForm<BudgetFormData>();

  const onSubmit = async (data: BudgetFormData) => {
    try {
      await createBudget({
        categoryId: data.categoryId,
        amount: data.amount,
        timePeriod: data.timePeriod,
      });
      alert('Orçamento criado com sucesso!');
    } catch (error) {
      alert('Erro ao criar orçamento');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Categoria</label>
        <input
          {...register('categoryId', { required: 'Categoria é obrigatória' })}
          type="number"
          className="w-full px-4 py-2 border rounded"
        />
        {errors.categoryId && (
          <span className="text-red-500 text-sm">{errors.categoryId.message}</span>
        )}
      </div>

      <div>
        <label>Valor</label>
        <input
          {...register('amount', {
            required: 'Valor é obrigatório',
            min: { value: 0.01, message: 'Valor deve ser maior que zero' },
          })}
          type="number"
          step="0.01"
          className="w-full px-4 py-2 border rounded"
        />
        {errors.amount && (
          <span className="text-red-500 text-sm">{errors.amount.message}</span>
        )}
      </div>

      <div>
        <label>Período</label>
        <select
          {...register('timePeriod', { required: 'Período é obrigatório' })}
          className="w-full px-4 py-2 border rounded"
        >
          <option value="daily">Diário</option>
          <option value="weekly">Semanal</option>
          <option value="monthly">Mensal</option>
          <option value="annual">Anual</option>
        </select>
        {errors.timePeriod && (
          <span className="text-red-500 text-sm">{errors.timePeriod.message}</span>
        )}
      </div>

      <button
        type="submit"
        className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Criar Orçamento
      </button>
    </form>
  );
}
```

---

## 🔧 Backend - Exemplos Node.js/TypeScript

### Exemplo 1: Criar Orçamento via Service

```typescript
import { BudgetService } from './domain/services/budget.service';

async function createBudgetExample() {
  try {
    const budget = await BudgetService.createBudget(
      {
        categoryId: '5',
        amount: 1000,
        timePeriod: 'monthly',
        status: 'active',
        alerts: [
          {
            thresholdType: 'percentage',
            thresholdValue: 80,
            position: 'before_limit',
            channels: [
              { type: 'in_app', enabled: true },
              { type: 'email', enabled: true },
            ],
          },
        ],
      },
      1, // organizationId
      'BRL' // currency
    );

    console.log('Budget created:', budget);
    return budget;
  } catch (error) {
    console.error('Error creating budget:', error);
    throw error;
  }
}
```

### Exemplo 2: Calcular Gastos de um Orçamento

```typescript
import { BudgetService } from './domain/services/budget.service';

async function calculateBudgetSpending(budgetId: number) {
  try {
    const spending = await BudgetService.calculateSpending(budgetId);

    console.log('Spending calculation:', {
      totalSpent: spending.totalSpent,
      budgetAmount: spending.budgetAmount,
      percentageUsed: spending.percentageUsed,
      remainingAmount: spending.remainingAmount,
      exceededAmount: spending.exceededAmount,
      isExceeded: spending.isExceeded,
    });

    return spending;
  } catch (error) {
    console.error('Error calculating spending:', error);
    throw error;
  }
}
```

### Exemplo 3: Middleware de Validação Customizado

```typescript
import { Request, Response, NextFunction } from 'express';
import { BadRequestError } from '../core/errors/app-error';

export function validateBudgetAmount(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { amount } = req.body;

  if (amount === undefined || amount === null) {
    throw new BadRequestError('Amount is required');
  }

  if (typeof amount !== 'number' || amount <= 0) {
    throw new BadRequestError('Amount must be a positive number');
  }

  if (amount > 1000000) {
    throw new BadRequestError('Amount cannot exceed 1,000,000');
  }

  next();
}

// Uso em rota:
router.post(
  '/budgets',
  authenticate,
  validateBudgetAmount,
  BudgetController.createBudget
);
```

### Exemplo 4: Disparar Alertas Manualmente

```typescript
import { AlertService } from './domain/services/alert.service';
import { BudgetService } from './domain/services/budget.service';

async function checkAndTriggerAlerts(budgetId: number) {
  try {
    // Calculate current spending
    const spending = await BudgetService.calculateSpending(budgetId);

    // Check which alerts should be triggered
    const triggeredAlerts = await AlertService.checkAlerts(
      budgetId,
      spending.totalSpent
    );

    console.log(`${triggeredAlerts.length} alerts triggered`);

    // Trigger each alert
    for (const triggeredAlert of triggeredAlerts) {
      await AlertService.triggerAlert(triggeredAlert.alert, spending);
    }

    return triggeredAlerts;
  } catch (error) {
    console.error('Error checking alerts:', error);
    throw error;
  }
}
```

### Exemplo 5: Criar Endpoint Customizado

```typescript
import { Router } from 'express';
import { BudgetService } from '../domain/services/budget.service';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Endpoint customizado: Obter orçamentos excedidos
router.get(
  '/budgets/exceeded',
  authenticate,
  async (req, res, next) => {
    try {
      const organizationId = req.user!.organizationId;

      // Get all active budgets
      const budgets = await BudgetService.listBudgets(organizationId, {
        status: 'active',
      });

      // Filter exceeded budgets
      const exceededBudgets = budgets.filter(b => b.isExceeded);

      res.json({
        status: 'success',
        data: {
          count: exceededBudgets.length,
          budgets: exceededBudgets,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
```

---

## 🧪 Testes - Exemplos

### Exemplo 1: Teste de Integração de API

```typescript
import request from 'supertest';
import { app } from '../src/app';

describe('Budget API Integration', () => {
  let authToken: string;
  let budgetId: number;

  beforeAll(async () => {
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        emailOrPhone: 'test@example.com',
        password: 'password123',
      });

    authToken = loginResponse.body.data.token;
  });

  it('should create a budget', async () => {
    const response = await request(app)
      .post('/api/budgets')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        categoryId: 1,
        amount: 1000,
        timePeriod: 'monthly',
        status: 'active',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty('id');
    budgetId = response.body.data.id;
  });

  it('should list budgets', async () => {
    const response = await request(app)
      .get('/api/budgets')
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('should get budget details', async () => {
    const response = await request(app)
      .get(`/api/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe(budgetId);
  });
});
```

### Exemplo 2: Teste Unitário de Service

```typescript
import { BudgetService } from '../src/domain/services/budget.service';

describe('BudgetService', () => {
  describe('createBudget', () => {
    it('should create a budget with default status', async () => {
      const budget = await BudgetService.createBudget(
        {
          categoryId: '1',
          amount: 1000,
          timePeriod: 'monthly',
        },
        1,
        'BRL'
      );

      expect(budget.status).toBe('active');
      expect(budget.amount).toBe('1000');
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        BudgetService.createBudget(
          {
            categoryId: '1',
            amount: -100,
            timePeriod: 'monthly',
          },
          1,
          'BRL'
        )
      ).rejects.toThrow('Budget amount must be greater than zero');
    });
  });
});
```

---

## 🎨 Utilitários - Exemplos

### Exemplo 1: Formatador de Moeda

```typescript
export function formatCurrency(value: number, currency: string = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value);
}

// Uso:
const formatted = formatCurrency(1234.56); // "R$ 1.234,56"
```

### Exemplo 2: Calculador de Período

```typescript
export function getBudgetPeriodLabel(
  timePeriod: string,
  customStartDate?: string,
  customEndDate?: string
): string {
  const labels: Record<string, string> = {
    daily: 'Diário',
    weekly: 'Semanal',
    monthly: 'Mensal',
    annual: 'Anual',
  };

  if (timePeriod === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate).toLocaleDateString('pt-BR');
    const end = new Date(customEndDate).toLocaleDateString('pt-BR');
    return `${start} - ${end}`;
  }

  return labels[timePeriod] || timePeriod;
}
```

### Exemplo 3: Validador de Alertas

```typescript
export function validateAlerts(alerts: AlertConfig[]): string | null {
  if (alerts.length > 3) {
    return 'Máximo de 3 alertas permitidos';
  }

  const beforeCount = alerts.filter(a => a.position === 'before_limit').length;
  const afterCount = alerts.filter(a => a.position === 'after_limit').length;

  if (alerts.length === 3 && (beforeCount !== 2 || afterCount !== 1)) {
    return 'Deve ter exatamente 2 alertas antes e 1 depois do limite';
  }

  for (const alert of alerts) {
    if (alert.thresholdType === 'percentage') {
      if (alert.position === 'before_limit' && (alert.thresholdValue <= 0 || alert.thresholdValue > 100)) {
        return 'Alertas antes do limite devem estar entre 0 e 100%';
      }
      if (alert.position === 'after_limit' && alert.thresholdValue <= 100) {
        return 'Alertas depois do limite devem ser maiores que 100%';
      }
    }
  }

  return null; // Valid
}
```

---

**Última Atualização:** 25 de Janeiro de 2026  
**Versão:** 1.0.0

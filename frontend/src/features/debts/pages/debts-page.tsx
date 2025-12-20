import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtsApi } from '../../../shared/api/debts';
import { accountsApi } from '../../../shared/api/accounts';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import { Button } from '../../../shared/components/ui/button';
import { Card } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import type { CreateDebtRequest, UpdateDebtRequest, Debt } from '../../../shared/types';

export function DebtsPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const queryClient = useQueryClient();

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: debtsApi.getDebts
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAccounts
  });

  const { data: summary } = useQuery({
    queryKey: ['debts', 'summary'],
    queryFn: debtsApi.getDebtsSummary
  });

  const createMutation = useMutation({
    mutationFn: debtsApi.createDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setShowCreateForm(false);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDebtRequest }) =>
      debtsApi.updateDebt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setEditingDebt(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: debtsApi.deleteDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    }
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const data: CreateDebtRequest = {
      accountId: parseInt(formData.get('accountId') as string),
      amount: parseFloat(formData.get('amount') as string),
      creditor: formData.get('creditor') as string,
      interestRate: formData.get('interestRate') ? parseFloat(formData.get('interestRate') as string) : undefined,
      dueDate: formData.get('dueDate') as string || undefined,
      description: formData.get('description') as string || undefined
    };

    createMutation.mutate(data);
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingDebt) return;

    const formData = new FormData(e.currentTarget);
    
    const data: UpdateDebtRequest = {
      amount: parseFloat(formData.get('amount') as string),
      creditor: formData.get('creditor') as string,
      interestRate: formData.get('interestRate') ? parseFloat(formData.get('interestRate') as string) : undefined,
      dueDate: formData.get('dueDate') as string || undefined,
      status: formData.get('status') as 'pendente' | 'pago' | 'cancelado',
      description: formData.get('description') as string || undefined
    };

    updateMutation.mutate({ id: editingDebt.id, data });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pago': return 'text-green-600 bg-green-100';
      case 'cancelado': return 'text-red-600 bg-red-100';
      default: return 'text-yellow-600 bg-yellow-100';
    }
  };

  const isOverdue = (debt: Debt) => {
    return debt.status === 'pendente' && debt.dueDate && new Date(debt.dueDate) < new Date();
  };

  if (isLoading) {
    return <div className="p-6">Carregando dívidas...</div>;
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">💳 Dívidas</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          Nova Dívida
        </Button>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-600">Total Dívidas</h3>
            <p className="text-2xl font-bold">{summary.totalDebts}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-600">Valor Total</h3>
            <p className="text-2xl font-bold">{formatCurrency(summary.totalAmount)}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-600">Pendentes</h3>
            <p className="text-2xl font-bold text-yellow-600">{summary.pendingDebts}</p>
          </Card>
          <Card className="p-4">
            <h3 className="text-sm font-medium text-gray-600">Em Atraso</h3>
            <p className="text-2xl font-bold text-red-600">{summary.overdueDebts}</p>
          </Card>
        </div>
      )}

      {showCreateForm && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Nova Dívida</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select name="accountId" required>
              <option value="">Selecionar conta</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCurrency(account.balance)}
                </option>
              ))}
            </Select>
            <Input name="amount" type="number" step="0.01" placeholder="Valor da dívida" required />
            <Input name="creditor" placeholder="Nome do credor" required />
            <Input name="interestRate" type="number" step="0.01" placeholder="Taxa de juros (%)" />
            <Input name="dueDate" type="date" placeholder="Data de vencimento" />
            <Input name="description" placeholder="Descrição (opcional)" className="md:col-span-2" />
            
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Dívida'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {editingDebt && (
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Editar Dívida</h2>
          <form onSubmit={handleUpdate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input name="amount" type="number" step="0.01" defaultValue={editingDebt.amount} required />
            <Input name="creditor" defaultValue={editingDebt.creditor} required />
            <Input name="interestRate" type="number" step="0.01" defaultValue={editingDebt.interestRate || ''} />
            <Input name="dueDate" type="date" defaultValue={editingDebt.dueDate ? editingDebt.dueDate.split('T')[0] : ''} />
            <Select name="status" defaultValue={editingDebt.status}>
              <option value="pendente">Pendente</option>
              <option value="pago">Pago</option>
              <option value="cancelado">Cancelado</option>
            </Select>
            <Input name="description" defaultValue={editingDebt.description || ''} />
            
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditingDebt(null)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        {debts.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Nenhuma dívida encontrada</p>
            <Button className="mt-4" onClick={() => setShowCreateForm(true)}>
              Criar Primeira Dívida
            </Button>
          </Card>
        ) : (
          debts.map(debt => (
            <Card key={debt.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{debt.creditor}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(debt.status)}`}>
                      {debt.status}
                    </span>
                    {isOverdue(debt) && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
                        Em Atraso
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Valor:</span>
                      <p className="font-medium">{formatCurrency(debt.amount)}</p>
                    </div>
                    {debt.interestRate && (
                      <div>
                        <span className="text-gray-600">Taxa:</span>
                        <p className="font-medium">{debt.interestRate}%</p>
                      </div>
                    )}
                    {debt.dueDate && (
                      <div>
                        <span className="text-gray-600">Vencimento:</span>
                        <p className="font-medium">{formatDate(debt.dueDate)}</p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-600">Criado:</span>
                      <p className="font-medium">{formatDate(debt.createdAt)}</p>
                    </div>
                  </div>
                  
                  {debt.description && (
                    <p className="text-gray-600 text-sm mt-2">{debt.description}</p>
                  )}
                </div>
                
                <div className="flex gap-2 ml-4">
                  <Button size="sm" variant="outline" onClick={() => setEditingDebt(debt)}>
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Tem certeza que deseja remover esta dívida?')) {
                        deleteMutation.mutate(debt.id);
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
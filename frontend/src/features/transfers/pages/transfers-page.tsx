import React, { useState } from 'react';
import { Link } from 'wouter';
import { ArrowLeftRight, Plus, Undo2, ArrowRight } from 'lucide-react';
import { useTransfers, useTransferSummary, useCreateTransfer, useReverseTransfer } from '../hooks/use-transfers';
import { useAccounts } from '../../accounts/hooks/use-accounts';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import { showConfirm, showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';
import type { CreateTransferRequest } from '../../../shared/types';

export function TransfersPage() {
  const { data: transfers, isLoading: transfersLoading } = useTransfers();
  const { data: summary, isLoading: summaryLoading } = useTransferSummary();
  const { data: accounts } = useAccounts();
  const createTransferMutation = useCreateTransfer();
  const reverseTransferMutation = useReverseTransfer();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateTransferRequest>({
    fromAccountId: 0,
    toAccountId: 0,
    amount: 0,
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransferMutation.mutateAsync(formData);
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating transfer:', error);
    }
  };

  const handleReverse = async (id: number) => {
    const confirmed = await showConfirm(
      'Reverter Transferência',
      'Tem certeza que deseja reverter esta transferência? Os saldos das contas serão atualizados.',
      'Sim, Reverter',
      'Cancelar',
      true
    );
    if (confirmed) {
      try {
        await reverseTransferMutation.mutateAsync(id);
        showSuccessToast('Transferência revertida com sucesso');
      } catch (error) {
        console.error('Error reversing transfer:', error);
        showErrorToast('Erro ao reverter transferência');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      fromAccountId: 0,
      toAccountId: 0,
      amount: 0,
      description: '',
    });
  };

  const getAccountName = (accountId: number) => {
    const account = accounts?.find(acc => acc.id === accountId);
    return account ? `${account.name} (${account.bank})` : 'Conta não encontrada';
  };

  const availableToAccounts = accounts?.filter(acc => acc.id !== formData.fromAccountId) || [];
  const availableFromAccounts = accounts?.filter(acc => acc.id !== formData.toAccountId) || [];

  if (transfersLoading || summaryLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">Transferências</h1>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Navigation */}
        <div className="mb-4">
          <Link href="/dashboard">
            <span className="text-blue-600 hover:text-blue-800 cursor-pointer">
              ← Voltar ao Dashboard
            </span>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transferências</h1>
            <p className="text-gray-600">Transfira dinheiro entre suas contas</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transferência
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Total de Transferências</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{summary.totalTransfers}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Valor Total Transferido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.totalAmount)}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Este Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{summary.thisMonth}</div>
                <p className="text-sm text-gray-500 mt-1">transferências</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-gray-500">Valor Este Mês</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(summary.thisMonthAmount)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transfers List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ArrowLeftRight className="mr-2 h-5 w-5" />
              Histórico de Transferências
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!transfers || transfers.length === 0 ? (
              <div className="text-center py-12">
                <ArrowLeftRight className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma transferência encontrada</h3>
                <p className="text-gray-500 mb-4">
                  Comece transferindo dinheiro entre suas contas.
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Primeira Transferência
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900">
                          {getAccountName(transfer.fromAccountId)}
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <div className="text-sm font-medium text-gray-900">
                          {getAccountName(transfer.toAccountId)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(Number(transfer.amount))}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(transfer.date)}
                        </div>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleReverse(transfer.id)}
                        disabled={reverseTransferMutation.isPending}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Undo2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Transfer Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Nova Transferência</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta de Origem
                  </label>
                  <Select
                    value={formData.fromAccountId.toString()}
                    onChange={(e) => setFormData({ ...formData, fromAccountId: Number(e.target.value) })}
                    required
                  >
                    <option value="0">Selecione a conta de origem</option>
                    {availableFromAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.bank} ({formatCurrency(Number(account.balance))})
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conta de Destino
                  </label>
                  <Select
                    value={formData.toAccountId.toString()}
                    onChange={(e) => setFormData({ ...formData, toAccountId: Number(e.target.value) })}
                    required
                  >
                    <option value="0">Selecione a conta de destino</option>
                    {availableToAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.bank} ({formatCurrency(Number(account.balance))})
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    required
                    min="0.01"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição (opcional)
                  </label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Motivo da transferência"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createTransferMutation.isPending || formData.fromAccountId === 0 || formData.toAccountId === 0}
                    className="flex-1"
                  >
                    {createTransferMutation.isPending ? 'Transferindo...' : 'Transferir'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
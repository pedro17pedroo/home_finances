import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard, PiggyBank, History, ArrowRightLeft } from 'lucide-react';
import { useAccounts, useCreateAccount, useDeleteAccount } from '../hooks/use-accounts';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { formatCurrency } from '../../../shared/lib/utils';
import type { CreateAccountRequest } from '../../../shared/types';

const accountTypeLabels = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
};

const angolaBanks = [
  'BAI',
  'BFA',
  'BIC',
  'Millennium Atlântico',
  'Standard Bank',
  'BPC',
  'Banco Sol',
  'Banco Económico',
  'Outros',
];

export function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccountMutation = useCreateAccount();
  const deleteAccountMutation = useDeleteAccount();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateAccountRequest>({
    name: '',
    type: 'corrente',
    bank: '',
    balance: 0,
    interestRate: undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccountMutation.mutateAsync(formData);
      setShowForm(false);
      setFormData({ name: '', type: 'corrente', bank: '', balance: 0, interestRate: undefined });
    } catch (error) {
      console.error('Error creating account:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        await deleteAccountMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting account:', error);
      }
    }
  };

  // Simplificar nome do banco
  const getBankName = (bank: string) => {
    return bank
      .replace('Banco Angolano de Investimentos (BAI)', 'BAI')
      .replace('Banco de Fomento Angola (BFA)', 'BFA')
      .replace('Banco BIC', 'BIC')
      .replace('Banco de Poupança e Crédito (BPC)', 'BPC');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas Bancárias</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie suas contas bancárias e carteiras</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="flex items-center text-gray-600">
              <History className="w-4 h-4 mr-2" />
              Histórico
            </Button>
            <Button variant="outline" size="sm" className="flex items-center text-gray-600">
              <ArrowRightLeft className="w-4 h-4 mr-2" />
              Transferir
            </Button>
            <Button onClick={() => setShowForm(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta
            </Button>
          </div>
        </div>

        {/* Accounts List */}
        {accounts && accounts.length > 0 ? (
          <div className="space-y-4">
            {accounts.map((account) => {
              const bankName = getBankName(account.bank);
              return (
                <Card key={account.id} className="bg-white dark:bg-gray-800">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <CreditCard className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            Banco {bankName}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {bankName} • {accountTypeLabels[account.type as keyof typeof accountTypeLabels]}
                          </p>
                          <p className="text-xl font-bold text-gray-900 dark:text-white mt-2">
                            {formatCurrency(Number(account.balance))}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          disabled={deleteAccountMutation.isPending}
                          className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-12 text-center">
              <CreditCard className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Nenhuma conta encontrada
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Comece criando sua primeira conta bancária para controlar suas finanças.
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modal de criação */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Nova Conta</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Conta Principal"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banco</label>
                  <Select
                    value={formData.bank}
                    onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                    required
                  >
                    <option value="">Selecione</option>
                    {angolaBanks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'corrente' | 'poupanca' })}
                  >
                    <option value="corrente">Conta Corrente</option>
                    <option value="poupanca">Poupança</option>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Saldo Inicial</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createAccountMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {createAccountMutation.isPending ? 'Criando...' : 'Criar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

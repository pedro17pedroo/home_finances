import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard, History, ArrowRightLeft, Eye, EyeOff, ArrowRight, X } from 'lucide-react';
import { useAccounts, useCreateAccount, useDeleteAccount } from '../hooks/use-accounts';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { formatCurrency } from '../../../shared/lib/utils';
import { showDeleteConfirm, showError, showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';
import type { CreateAccountRequest } from '../../../shared/types';

const accountTypeLabels = {
  corrente: 'Conta Corrente',
  poupanca: 'Poupança',
};

const angolaBanks = [
  'Banco Angolano de Investimentos (BAI)',
  'Banco de Fomento Angola (BFA)',
  'Banco BIC',
  'Millennium Atlântico',
  'Standard Bank',
  'Banco de Poupança e Crédito (BPC)',
  'Banco Sol',
  'Banco Económico',
  'Outros',
];

// Mock de transferências (em produção viria do backend)
interface Transfer {
  id: number;
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  description: string;
  date: string;
}

export function AccountsPageImproved() {
  const { data: accounts, isLoading } = useAccounts();
  const createAccountMutation = useCreateAccount();
  const deleteAccountMutation = useDeleteAccount();

  const [showForm, setShowForm] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  
  const [formData, setFormData] = useState<CreateAccountRequest>({
    name: '',
    type: 'corrente',
    bank: '',
    balance: 0,
    interestRate: undefined,
  });

  const [transferData, setTransferData] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: 0,
    description: '',
    date: new Date().toISOString().split('T')[0],
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

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (transferData.fromAccountId === transferData.toAccountId) {
      await showError('Erro', 'Conta de origem e destino não podem ser iguais');
      return;
    }

    // Adicionar transferência ao histórico local
    const newTransfer: Transfer = {
      id: Date.now(),
      fromAccountId: Number(transferData.fromAccountId),
      toAccountId: Number(transferData.toAccountId),
      amount: transferData.amount,
      description: transferData.description,
      date: transferData.date,
    };

    setTransfers([newTransfer, ...transfers]);
    setShowTransferModal(false);
    setTransferData({
      fromAccountId: '',
      toAccountId: '',
      amount: 0,
      description: '',
      date: new Date().toISOString().split('T')[0],
    });

    // Mostrar histórico após transferência
    setShowHistory(true);
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta conta');
    if (confirmed) {
      try {
        await deleteAccountMutation.mutateAsync(id);
        showSuccessToast('Conta excluída com sucesso');
      } catch (error) {
        console.error('Error deleting account:', error);
        showErrorToast('Erro ao excluir conta');
      }
    }
  };

  const getBankName = (bank: string) => {
    return bank
      .replace('Banco Angolano de Investimentos (BAI)', 'BAI')
      .replace('Banco de Fomento Angola (BFA)', 'BFA')
      .replace('Banco BIC', 'BIC')
      .replace('Banco de Poupança e Crédito (BPC)', 'BPC');
  };

  const getAccountName = (accountId: number) => {
    const account = accounts?.find(a => a.id === accountId);
    return account ? `${getBankName(account.bank)}` : 'Conta desconhecida';
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
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
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center text-gray-600"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {showHistory ? 'Ocultar' : 'Histórico'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center text-gray-600"
              onClick={() => setShowTransferModal(true)}
            >
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
                        <button className="p-2 text-gray-400 hover:text-gray-600">
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
              <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                Nenhuma conta encontrada
              </h3>
              <p className="text-gray-500 mb-6">
                Comece criando sua primeira conta bancária para controlar suas finanças.
              </p>
              <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Conta
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Histórico de Transferências */}
        {showHistory && (
          <Card className="bg-white dark:bg-gray-800 mt-6">
            <CardContent className="p-6">
              <div className="flex items-center space-x-2 mb-4">
                <ArrowRight className="w-5 h-5 text-gray-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Transferências</h3>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {transfers.length === 0 ? 'Nenhuma transferência realizada ainda' : `${transfers.length} transferência(s) realizada(s)`}
              </p>

              {transfers.length === 0 ? (
                <div className="text-center py-8">
                  <ArrowRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-gray-900 dark:text-white font-medium mb-2">Nenhuma transferência realizada ainda</h4>
                  <p className="text-gray-500 text-sm">Use o botão "Transferir" para movimentar dinheiro entre contas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transfers.map((transfer) => (
                    <div key={transfer.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <ArrowRightLeft className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {getAccountName(transfer.fromAccountId)} → {getAccountName(transfer.toAccountId)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {transfer.description || 'Transferência entre contas'} • {new Date(transfer.date).toLocaleDateString('pt-AO')}
                          </p>
                        </div>
                      </div>
                      <div className="text-lg font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(transfer.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modal Nova Conta */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Criar Nova Conta</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Adicione uma nova conta bancária ao seu controle financeiro.</p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da Conta</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: BAI - CC"
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
                    <option value="">Selecione o banco</option>
                    {angolaBanks.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Conta</label>
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
                    placeholder="0"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa de Juros (%)</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interestRate || 0}
                    onChange={(e) => setFormData({ ...formData, interestRate: Number(e.target.value) || undefined })}
                    placeholder="0"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createAccountMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {createAccountMutation.isPending ? 'Criando...' : 'Criar Conta'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Transferir */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Transferir entre contas</h2>
                <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">Transfira dinheiro entre suas contas bancárias.</p>
              
              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta de origem</label>
                  <Select
                    value={transferData.fromAccountId}
                    onChange={(e) => setTransferData({ ...transferData, fromAccountId: e.target.value })}
                    required
                  >
                    <option value="">Selecionar conta de origem</option>
                    {accounts?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {getBankName(account.bank)} - {formatCurrency(Number(account.balance))}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta de destino</label>
                  <Select
                    value={transferData.toAccountId}
                    onChange={(e) => setTransferData({ ...transferData, toAccountId: e.target.value })}
                    required
                  >
                    <option value="">Selecionar conta de destino</option>
                    {accounts?.filter(a => a.id.toString() !== transferData.fromAccountId).map((account) => (
                      <option key={account.id} value={account.id}>
                        {getBankName(account.bank)} - {formatCurrency(Number(account.balance))}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (Kz)</label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transferData.amount || ''}
                    onChange={(e) => setTransferData({ ...transferData, amount: Number(e.target.value) })}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
                  <textarea
                    value={transferData.description}
                    onChange={(e) => setTransferData({ ...transferData, description: e.target.value })}
                    placeholder="Motivo da transferência..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data</label>
                  <Input
                    type="date"
                    value={transferData.date}
                    onChange={(e) => setTransferData({ ...transferData, date: e.target.value })}
                    required
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowTransferModal(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    disabled={!accounts || accounts.length < 2}
                  >
                    Transferir
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

import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CreditCard, PiggyBank, X, Building2, Wallet, ArrowLeftRight, ArrowRight, Undo2 } from 'lucide-react';
import { useAccounts, useCreateAccount, useDeleteAccount, useUpdateAccount, useAccountSummary } from '../hooks/use-accounts';
import { useBanks } from '../hooks/use-banks';
import { useAccountTypes } from '../hooks/use-account-types';
import { useTransfers, useCreateTransfer, useReverseTransfer } from '../../transfers/hooks/use-transfers';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Input } from '../../../shared/components/ui/input';
import { SelectNative as Select } from '../../../shared/components/ui/select-native';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import { showDeleteConfirm, showSuccessToast, showErrorToast, showConfirm } from '../../../shared/lib/alerts';
import type { CreateAccountRequest, Account, CreateTransferRequest } from '../../../shared/types';

type TabType = 'contas' | 'transferencias';

export function AccountsPageImproved() {
  const [activeTab, setActiveTab] = useState<TabType>('contas');
  
  // Accounts state
  const { data: accounts, isLoading } = useAccounts();
  const { data: summary } = useAccountSummary();
  const { data: banks } = useBanks();
  const { data: accountTypes } = useAccountTypes();
  const createAccountMutation = useCreateAccount();
  const updateAccountMutation = useUpdateAccount();
  const deleteAccountMutation = useDeleteAccount();

  const [showAccountForm, setShowAccountForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountFormData, setAccountFormData] = useState<CreateAccountRequest>({
    name: '', type: 'corrente', bank: '', balance: 0, interestRate: undefined,
  });

  // Transfers state
  const { data: transfers, isLoading: transfersLoading } = useTransfers();
  const createTransferMutation = useCreateTransfer();
  const reverseTransferMutation = useReverseTransfer();
  
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [transferFormData, setTransferFormData] = useState<CreateTransferRequest>({
    fromAccountId: 0, toAccountId: 0, amount: 0, description: '',
  });

  // Account handlers
  const openCreateAccountForm = () => {
    setEditingAccount(null);
    setAccountFormData({ name: '', type: 'corrente', bank: '', balance: 0, interestRate: undefined });
    setShowAccountForm(true);
  };

  const openEditAccountForm = (account: Account) => {
    setEditingAccount(account);
    setAccountFormData({
      name: account.name,
      type: account.type,
      bank: account.bank,
      balance: Number(account.balance),
      interestRate: account.interestRate ? Number(account.interestRate) : undefined,
    });
    setShowAccountForm(true);
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await updateAccountMutation.mutateAsync({
          id: editingAccount.id,
          data: { name: accountFormData.name, type: accountFormData.type, bank: accountFormData.bank, interestRate: accountFormData.interestRate },
        });
        showSuccessToast('Conta atualizada com sucesso!');
      } else {
        await createAccountMutation.mutateAsync(accountFormData);
        showSuccessToast('Conta criada com sucesso!');
      }
      setShowAccountForm(false);
      setEditingAccount(null);
    } catch (error: any) {
      showErrorToast(error?.response?.data?.message || 'Erro ao salvar conta');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    const confirmed = await showDeleteConfirm('esta conta');
    if (confirmed) {
      try {
        await deleteAccountMutation.mutateAsync(id);
        showSuccessToast('Conta excluída com sucesso!');
      } catch (error: any) {
        showErrorToast(error?.response?.data?.message || 'Erro ao excluir conta');
      }
    }
  };

  // Transfer handlers
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransferMutation.mutateAsync(transferFormData);
      showSuccessToast('Transferência realizada com sucesso!');
      setShowTransferForm(false);
      setTransferFormData({ fromAccountId: 0, toAccountId: 0, amount: 0, description: '' });
    } catch (error: any) {
      showErrorToast(error?.response?.data?.message || 'Erro ao realizar transferência');
    }
  };

  const handleReverseTransfer = async (id: number) => {
    const confirmed = await showConfirm(
      'Reverter Transferência',
      'Tem certeza que deseja reverter esta transferência?',
      'Sim, Reverter', 'Cancelar', true
    );
    if (confirmed) {
      try {
        await reverseTransferMutation.mutateAsync(id);
        showSuccessToast('Transferência revertida com sucesso!');
      } catch (error: any) {
        showErrorToast(error?.response?.data?.message || 'Erro ao reverter transferência');
      }
    }
  };

  const getAccountName = (accountId: number) => {
    const account = accounts?.find(acc => acc.id === accountId);
    return account ? `${account.name} (${account.bank})` : 'Conta não encontrada';
  };

  const availableToAccounts = accounts?.filter(acc => acc.id !== transferFormData.fromAccountId) || [];
  const availableFromAccounts = accounts?.filter(acc => acc.id !== transferFormData.toAccountId) || [];

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>)}
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contas Bancárias</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie suas contas e transferências</p>
          </div>
          <Button 
            onClick={activeTab === 'contas' ? openCreateAccountForm : () => setShowTransferForm(true)} 
            size="sm" 
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            {activeTab === 'contas' ? 'Nova Conta' : 'Nova Transferência'}
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('contas')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'contas'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CreditCard className="w-4 h-4 inline mr-2" />
              Contas
            </button>
            <button
              onClick={() => setActiveTab('transferencias')}
              className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'transferencias'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <ArrowLeftRight className="w-4 h-4 inline mr-2" />
              Transferências
            </button>
          </nav>
        </div>

        {activeTab === 'contas' ? (
          <>
            {/* Summary Cards - Simple style */}
            {summary && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Saldo Total</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{formatCurrency(summary.totalBalance)}</p>
                      <p className="text-gray-400 text-xs mt-1">{summary.totalAccounts} conta(s)</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl">
                      <Wallet className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Poupança</p>
                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{formatCurrency(summary.savingsBalance)}</p>
                      <p className="text-gray-400 text-xs mt-1">{summary.accountsByType?.poupanca || 0} conta(s)</p>
                    </div>
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl">
                      <PiggyBank className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-sm">Conta Corrente</p>
                      <p className="text-2xl font-bold text-violet-600 dark:text-violet-400 mt-1">{formatCurrency(summary.currentBalance)}</p>
                      <p className="text-gray-400 text-xs mt-1">{summary.accountsByType?.corrente || 0} conta(s)</p>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-900/20 p-3 rounded-xl">
                      <CreditCard className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Accounts List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Minhas Contas</h2>
              </div>
              
              {accounts && accounts.length > 0 ? (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {accounts.map((account) => {
                    const isPoupanca = account.type === 'poupanca';
                    const badgeClass = isPoupanca 
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' 
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
                    
                    return (
                      <div key={account.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{account.name}</h3>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-sm text-gray-500 dark:text-gray-400">{account.bank}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                                  {isPoupanca ? 'Poupança' : 'Corrente'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-400 uppercase tracking-wide">Saldo</p>
                              <p className={`text-xl font-bold ${Number(account.balance) >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600'}`}>
                                {formatCurrency(Number(account.balance))}
                              </p>
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => openEditAccountForm(account)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteAccount(account.id)}
                                disabled={deleteAccountMutation.isPending}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all disabled:opacity-50"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="px-6 py-12 text-center">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Nenhuma conta</h3>
                  <p className="text-gray-500 text-sm mb-4">Crie sua primeira conta bancária</p>
                  <Button onClick={openCreateAccountForm} size="sm">
                    <Plus className="w-4 h-4 mr-2" />Criar Conta
                  </Button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Transfers Tab */
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Histórico de Transferências</h2>
            </div>
            
            {transfersLoading ? (
              <div className="p-6 animate-pulse space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-700 rounded-lg"></div>)}
              </div>
            ) : transfers && transfers.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {transfers.map((transfer) => (
                  <div key={transfer.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-lg">
                          <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="font-medium text-gray-900 dark:text-white">{getAccountName(transfer.fromAccountId)}</span>
                            <ArrowRight className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-gray-900 dark:text-white">{getAccountName(transfer.toAccountId)}</span>
                          </div>
                          {transfer.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{transfer.description}</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(Number(transfer.amount))}</p>
                          <p className="text-xs text-gray-500">{formatDate(transfer.date)}</p>
                        </div>
                        <button
                          onClick={() => handleReverseTransfer(transfer.id)}
                          disabled={reverseTransferMutation.isPending}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                          title="Reverter"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-semibold mb-1 text-gray-900 dark:text-white">Nenhuma transferência</h3>
                <p className="text-gray-500 text-sm mb-4">Transfira dinheiro entre suas contas</p>
                <Button onClick={() => setShowTransferForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />Nova Transferência
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Account Modal */}
        {showAccountForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {editingAccount ? 'Editar Conta' : 'Nova Conta'}
                </h2>
                <button onClick={() => { setShowAccountForm(false); setEditingAccount(null); }} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                  <Input value={accountFormData.name} onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })} placeholder="Ex: Conta Principal" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banco</label>
                  <Select value={accountFormData.bank} onChange={(e) => setAccountFormData({ ...accountFormData, bank: e.target.value })} required>
                    <option value="">Selecione</option>
                    {banks?.map((bank) => <option key={bank.id} value={bank.name}>{bank.name}</option>)}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
                  <Select value={accountFormData.type} onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value })}>
                    {accountTypes?.map((type) => (
                      <option key={type.id} value={type.code}>{type.name}</option>
                    ))}
                  </Select>
                </div>
                {!editingAccount && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Saldo Inicial (Kz)</label>
                    <Input type="number" step="0.01" value={accountFormData.balance} onChange={(e) => setAccountFormData({ ...accountFormData, balance: Number(e.target.value) })} required />
                  </div>
                )}
                {accountFormData.type === 'poupanca' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa de Juros (%)</label>
                    <Input type="number" step="0.01" value={accountFormData.interestRate || ''} onChange={(e) => setAccountFormData({ ...accountFormData, interestRate: e.target.value ? Number(e.target.value) : undefined })} placeholder="Ex: 5.5" />
                  </div>
                )}
                <div className="flex space-x-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setShowAccountForm(false); setEditingAccount(null); }} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={createAccountMutation.isPending || updateAccountMutation.isPending} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {(createAccountMutation.isPending || updateAccountMutation.isPending) ? 'Salvando...' : editingAccount ? 'Salvar' : 'Criar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-xl">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Nova Transferência</h2>
                <button onClick={() => setShowTransferForm(false)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta de Origem</label>
                  <Select value={transferFormData.fromAccountId.toString()} onChange={(e) => setTransferFormData({ ...transferFormData, fromAccountId: Number(e.target.value) })} required>
                    <option value="0">Selecione</option>
                    {availableFromAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name} - {acc.bank} ({formatCurrency(Number(acc.balance))})</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta de Destino</label>
                  <Select value={transferFormData.toAccountId.toString()} onChange={(e) => setTransferFormData({ ...transferFormData, toAccountId: Number(e.target.value) })} required>
                    <option value="0">Selecione</option>
                    {availableToAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>{acc.name} - {acc.bank} ({formatCurrency(Number(acc.balance))})</option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (Kz)</label>
                  <Input type="number" step="0.01" min="0.01" value={transferFormData.amount} onChange={(e) => setTransferFormData({ ...transferFormData, amount: Number(e.target.value) })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (opcional)</label>
                  <Input value={transferFormData.description} onChange={(e) => setTransferFormData({ ...transferFormData, description: e.target.value })} placeholder="Motivo da transferência" />
                </div>
                <div className="flex space-x-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowTransferForm(false)} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={createTransferMutation.isPending || transferFormData.fromAccountId === 0 || transferFormData.toAccountId === 0} className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {createTransferMutation.isPending ? 'Transferindo...' : 'Transferir'}
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

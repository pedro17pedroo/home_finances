import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Handshake, Clock, CreditCard, X } from 'lucide-react';
import { loansApi } from '../../../shared/api/loans';
import { debtsApi } from '../../../shared/api/debts';
import { accountsApi } from '../../../shared/api/accounts';
import { formatCurrency } from '../../../shared/lib/utils';
import { showDeleteConfirm, showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import type { CreateLoanRequest, CreateDebtRequest, Loan, Debt } from '../../../shared/types';

type TabType = 'loans' | 'debts';
type FilterType = 'todos' | 'pendente' | 'pago' | 'cancelado';

export function LoansPage() {
  const [activeTab, setActiveTab] = useState<TabType>('loans');
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterType>('todos');
  const queryClient = useQueryClient();

  // Loans queries
  const { data: loans = [], isLoading: loansLoading } = useQuery({
    queryKey: ['loans'],
    queryFn: loansApi.getLoans
  });

  // Debts queries
  const { data: debts = [], isLoading: debtsLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: debtsApi.getDebts
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: accountsApi.getAccounts
  });

  // Mutations
  const createLoanMutation = useMutation({
    mutationFn: loansApi.createLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowForm(false);
    }
  });

  const createDebtMutation = useMutation({
    mutationFn: debtsApi.createDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      setShowForm(false);
    }
  });

  const deleteLoanMutation = useMutation({
    mutationFn: loansApi.deleteLoan,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['loans'] })
  });

  const deleteDebtMutation = useMutation({
    mutationFn: debtsApi.deleteDebt,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['debts'] })
  });

  const [formData, setFormData] = useState({
    accountId: '',
    amount: '',
    person: '',
    interestRate: '',
    dueDate: '',
    description: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'loans') {
      const data: CreateLoanRequest = {
        accountId: parseInt(formData.accountId),
        amount: parseFloat(formData.amount),
        borrower: formData.person,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        dueDate: formData.dueDate || undefined,
        description: formData.description || undefined
      };
      createLoanMutation.mutate(data);
    } else {
      const data: CreateDebtRequest = {
        accountId: parseInt(formData.accountId),
        amount: parseFloat(formData.amount),
        creditor: formData.person,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        dueDate: formData.dueDate || undefined,
        description: formData.description || undefined
      };
      createDebtMutation.mutate(data);
    }

    setFormData({ accountId: '', amount: '', person: '', interestRate: '', dueDate: '', description: '' });
  };

  const handleDelete = async (id: number) => {
    const itemName = activeTab === 'loans' ? 'este empréstimo' : 'esta dívida';
    const confirmed = await showDeleteConfirm(itemName);
    if (confirmed) {
      try {
        if (activeTab === 'loans') {
          await deleteLoanMutation.mutateAsync(id);
        } else {
          await deleteDebtMutation.mutateAsync(id);
        }
        showSuccessToast(`${activeTab === 'loans' ? 'Empréstimo' : 'Dívida'} excluído(a) com sucesso`);
      } catch (error) {
        console.error('Error deleting:', error);
        showErrorToast(`Erro ao excluir ${activeTab === 'loans' ? 'empréstimo' : 'dívida'}`);
      }
    }
  };

  // Filter data
  const filterData = <T extends Loan | Debt>(items: T[]): T[] => {
    return items.filter(item => {
      const matchesSearch = activeTab === 'loans' 
        ? (item as Loan).borrower?.toLowerCase().includes(searchTerm.toLowerCase())
        : (item as Debt).creditor?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'todos' || item.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  };

  const filteredLoans = filterData(loans);
  const filteredDebts = filterData(debts);

  // Calculate totals
  const totalLoansAmount = loans.filter(l => l.status === 'pendente').reduce((sum, l) => sum + Number(l.amount), 0);
  const pendingLoans = loans.filter(l => l.status === 'pendente').length;
  const totalDebtsAmount = debts.filter(d => d.status === 'pendente').reduce((sum, d) => sum + Number(d.amount), 0);
  const pendingDebts = debts.filter(d => d.status === 'pendente').length;

  const isLoading = loansLoading || debtsLoading;

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
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Empréstimos e Dívidas</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gerencie empréstimos dados e dívidas</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Empréstimos Dados</p>
                  <p className="text-xl font-bold text-orange-600">{formatCurrency(totalLoansAmount)}</p>
                  <p className="text-xs text-gray-400">{loans.length} empréstimos</p>
                </div>
                <Handshake className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes (Empréstimos)</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{pendingLoans}</p>
                  <p className="text-xs text-gray-400">A receber</p>
                </div>
                <Clock className="w-5 h-5 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total em Dívidas</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totalDebtsAmount)}</p>
                  <p className="text-xs text-gray-400">{debts.length} dívidas</p>
                </div>
                <CreditCard className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes (Dívidas)</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{pendingDebts}</p>
                  <p className="text-xs text-gray-400">A pagar</p>
                </div>
                <Clock className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button
            onClick={() => setActiveTab('loans')}
            className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'loans'
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Handshake className="w-4 h-4 mr-2" />
            Empréstimos Dados
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'debts'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Dívidas
          </button>
        </div>

        {/* Content Section */}
        <Card className="bg-white dark:bg-gray-800">
          <CardContent className="p-6">
            {/* Section Header */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activeTab === 'loans' ? 'Empréstimos Dados' : 'Dívidas'}
              </h3>
              <Button 
                onClick={() => setShowForm(true)} 
                size="sm" 
                className={activeTab === 'loans' 
                  ? "bg-orange-500 hover:bg-orange-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
                }
              >
                <Plus className="w-4 h-4 mr-2" />
                {activeTab === 'loans' ? 'Novo Empréstimo' : 'Nova Dívida'}
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Buscar por nome ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as FilterType)}
                  className="w-32"
                >
                  <option value="todos">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </Select>
              </div>
            </div>

            {/* List */}
            {activeTab === 'loans' ? (
              filteredLoans.length > 0 ? (
                <div className="space-y-3">
                  {filteredLoans.map((loan) => (
                    <div key={loan.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{loan.borrower}</p>
                        <p className="text-sm text-gray-500">{loan.description || 'Empréstimo'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-orange-600">{formatCurrency(Number(loan.amount))}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            loan.status === 'pago' ? 'bg-green-100 text-green-600' :
                            loan.status === 'cancelado' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            {loan.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(loan.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-gray-900 dark:text-white font-medium mb-2">Nenhum empréstimo</h4>
                  <p className="text-gray-500 text-sm mb-6">Comece registrando um empréstimo dado.</p>
                  <Button 
                    onClick={() => setShowForm(true)} 
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Novo Empréstimo
                  </Button>
                </div>
              )
            ) : (
              filteredDebts.length > 0 ? (
                <div className="space-y-3">
                  {filteredDebts.map((debt) => (
                    <div key={debt.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{debt.creditor}</p>
                        <p className="text-sm text-gray-500">{debt.description || 'Dívida'}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold text-red-600">{formatCurrency(Number(debt.amount))}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            debt.status === 'pago' ? 'bg-green-100 text-green-600' :
                            debt.status === 'cancelado' ? 'bg-red-100 text-red-600' :
                            'bg-yellow-100 text-yellow-600'
                          }`}>
                            {debt.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDelete(debt.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-gray-900 dark:text-white font-medium mb-2">Nenhuma dívida</h4>
                  <p className="text-gray-500 text-sm mb-6">Comece registrando uma dívida.</p>
                  <Button 
                    onClick={() => setShowForm(true)} 
                    className="bg-red-500 hover:bg-red-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Dívida
                  </Button>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeTab === 'loans' ? 'Novo Empréstimo' : 'Nova Dívida'}
                </h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                {activeTab === 'loans' 
                  ? 'Registre um empréstimo que você fez para alguém.' 
                  : 'Registre uma dívida que você tem com alguém.'}
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Conta
                  </label>
                  <Select
                    value={formData.accountId}
                    onChange={(e) => setFormData({ ...formData, accountId: e.target.value })}
                    required
                  >
                    <option value="">Selecionar conta</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {formatCurrency(Number(account.balance))}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {activeTab === 'loans' ? 'Nome do Devedor' : 'Nome do Credor'}
                  </label>
                  <Input
                    value={formData.person}
                    onChange={(e) => setFormData({ ...formData, person: e.target.value })}
                    placeholder={activeTab === 'loans' ? 'Quem recebeu o empréstimo' : 'A quem você deve'}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor (Kz)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Taxa de Juros (%) - Opcional
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.interestRate}
                    onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data de Vencimento (Opcional)
                  </label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição (Opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Motivo ou observações..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createLoanMutation.isPending || createDebtMutation.isPending} 
                    className={`flex-1 ${activeTab === 'loans' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'}`}
                  >
                    {(createLoanMutation.isPending || createDebtMutation.isPending) ? 'Criando...' : 'Criar'}
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

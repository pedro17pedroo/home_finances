import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Handshake, Clock, CreditCard, X, Ban, DollarSign, CheckCircle } from 'lucide-react';
import { loansApi, MakePaymentRequest, CancelRequest } from '../../../shared/api/loans';
import { debtsApi } from '../../../shared/api/debts';
import { accountsApi } from '../../../shared/api/accounts';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import { showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import type { CreateLoanRequest, CreateDebtRequest, Loan, Debt } from '../../../shared/types';

type TabType = 'loans' | 'debts';
type FilterType = 'todos' | 'pendente' | 'pago' | 'cancelado';
type ModalType = 'create' | 'payment' | 'cancel' | null;

export function LoansPage() {
  const [activeTab, setActiveTab] = useState<TabType>('loans');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedItem, setSelectedItem] = useState<Loan | Debt | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterType>('todos');
  const queryClient = useQueryClient();

  // Queries
  const { data: loans = [], isLoading: loansLoading } = useQuery({ queryKey: ['loans'], queryFn: loansApi.getLoans });
  const { data: debts = [], isLoading: debtsLoading } = useQuery({ queryKey: ['debts'], queryFn: debtsApi.getDebts });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.getAccounts });

  // Create mutations
  const createLoanMutation = useMutation({
    mutationFn: loansApi.createLoan,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setModalType(null);
      showSuccessToast('Empréstimo criado com sucesso');
    },
    onError: (error: any) => showErrorToast(error.response?.data?.message || 'Erro ao criar empréstimo')
  });

  const createDebtMutation = useMutation({
    mutationFn: debtsApi.createDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setModalType(null);
      showSuccessToast('Dívida criada com sucesso');
    },
    onError: (error: any) => showErrorToast(error.response?.data?.message || 'Erro ao criar dívida')
  });

  // Payment mutations
  const payLoanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MakePaymentRequest }) => loansApi.makePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setModalType(null);
      setSelectedItem(null);
      showSuccessToast('Pagamento registado com sucesso');
    },
    onError: (error: any) => showErrorToast(error.response?.data?.message || 'Erro ao registar pagamento')
  });

  const payDebtMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: MakePaymentRequest }) => debtsApi.makePayment(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      setModalType(null);
      setSelectedItem(null);
      showSuccessToast('Pagamento registado com sucesso');
    },
    onError: (error: any) => showErrorToast(error.response?.data?.message || 'Erro ao registar pagamento')
  });

  // Cancel mutations
  const cancelLoanMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CancelRequest }) => loansApi.cancelLoan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setModalType(null);
      setSelectedItem(null);
      showSuccessToast('Empréstimo cancelado com sucesso');
    },
    onError: (error: any) => showErrorToast(error.response?.data?.message || 'Erro ao cancelar empréstimo')
  });

  const cancelDebtMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CancelRequest }) => debtsApi.cancelDebt(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setModalType(null);
      setSelectedItem(null);
      showSuccessToast('Dívida cancelada com sucesso');
    },
    onError: (error: any) => showErrorToast(error.response?.data?.message || 'Erro ao cancelar dívida')
  });

  // Form states
  const [createFormData, setCreateFormData] = useState({ accountId: '', amount: '', person: '', interestRate: '', dueDate: '', description: '' });
  const [paymentAmount, setPaymentAmount] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createFormData.accountId) { showErrorToast('Selecione uma conta'); return; }
    
    if (activeTab === 'loans') {
      const data: CreateLoanRequest = {
        accountId: parseInt(createFormData.accountId), amount: parseFloat(createFormData.amount), borrower: createFormData.person,
        interestRate: createFormData.interestRate ? parseFloat(createFormData.interestRate) : undefined,
        dueDate: createFormData.dueDate || undefined, description: createFormData.description || undefined
      };
      createLoanMutation.mutate(data);
    } else {
      const data: CreateDebtRequest = {
        accountId: parseInt(createFormData.accountId), amount: parseFloat(createFormData.amount), creditor: createFormData.person,
        interestRate: createFormData.interestRate ? parseFloat(createFormData.interestRate) : undefined,
        dueDate: createFormData.dueDate || undefined, description: createFormData.description || undefined
      };
      createDebtMutation.mutate(data);
    }
    setCreateFormData({ accountId: '', amount: '', person: '', interestRate: '', dueDate: '', description: '' });
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !paymentAmount) return;
    const data: MakePaymentRequest = { amount: parseFloat(paymentAmount) };
    if (activeTab === 'loans') {
      payLoanMutation.mutate({ id: selectedItem.id, data });
    } else {
      payDebtMutation.mutate({ id: selectedItem.id, data });
    }
    setPaymentAmount('');
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !cancelReason.trim()) return;
    const data: CancelRequest = { reason: cancelReason };
    if (activeTab === 'loans') {
      cancelLoanMutation.mutate({ id: selectedItem.id, data });
    } else {
      cancelDebtMutation.mutate({ id: selectedItem.id, data });
    }
    setCancelReason('');
  };

  const openPaymentModal = (item: Loan | Debt) => { setSelectedItem(item); setModalType('payment'); };
  const openCancelModal = (item: Loan | Debt) => { setSelectedItem(item); setModalType('cancel'); };

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

  const getRemainingAmount = (item: Loan | Debt) => {
    const total = Number(item.amount);
    const paid = Number(item.paidAmount || 0);
    return total - paid;
  };

  const getProgressPercent = (item: Loan | Debt) => {
    const total = Number(item.amount);
    const paid = Number(item.paidAmount || 0);
    return total > 0 ? (paid / total) * 100 : 0;
  };

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
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Empréstimos Dados</p>
                  <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(totalLoansAmount)}</p>
                  <p className="text-xs text-gray-400">{loans.length} empréstimos</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl">
                  <Handshake className="w-5 h-5 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes (Empréstimos)</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{pendingLoans}</p>
                  <p className="text-xs text-gray-400">A receber</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-xl">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total em Dívidas</p>
                  <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(totalDebtsAmount)}</p>
                  <p className="text-xs text-gray-400">{debts.length} dívidas</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                  <CreditCard className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Pendentes (Dívidas)</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{pendingDebts}</p>
                  <p className="text-xs text-gray-400">A pagar</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl">
                  <Clock className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
          <button onClick={() => setActiveTab('loans')} className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'loans' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <Handshake className="w-4 h-4 mr-2" />Empréstimos Dados
          </button>
          <button onClick={() => setActiveTab('debts')} className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'debts' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <CreditCard className="w-4 h-4 mr-2" />Dívidas
          </button>
        </div>

        {/* Content */}
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{activeTab === 'loans' ? 'Empréstimos Dados' : 'Dívidas'}</h3>
              <Button onClick={() => setModalType('create')} size="sm" className={activeTab === 'loans' ? "bg-orange-500 hover:bg-orange-600 text-white" : "bg-red-500 hover:bg-red-600 text-white"}>
                <Plus className="w-4 h-4 mr-2" />{activeTab === 'loans' ? 'Novo Empréstimo' : 'Nova Dívida'}
              </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input type="text" placeholder="Buscar por nome..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as FilterType)} className="w-32">
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
                    <div key={loan.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{loan.borrower}</p>
                          <p className="text-sm text-gray-500">{loan.description || 'Empréstimo'}</p>
                          {loan.dueDate && <p className="text-xs text-gray-400">Vencimento: {formatDate(loan.dueDate)}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-orange-600">{formatCurrency(Number(loan.amount))}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${loan.status === 'pago' ? 'bg-green-100 text-green-600' : loan.status === 'cancelado' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {loan.status}
                          </span>
                        </div>
                      </div>
                      {loan.status === 'pendente' && (
                        <>
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Pago: {formatCurrency(Number(loan.paidAmount || 0))}</span>
                              <span>Restante: {formatCurrency(getRemainingAmount(loan))}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-orange-500 h-2 rounded-full transition-all" style={{ width: `${getProgressPercent(loan)}%` }}></div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openCancelModal(loan)} className="text-gray-600">
                              <Ban className="w-3 h-3 mr-1" />Cancelar
                            </Button>
                            <Button size="sm" onClick={() => openPaymentModal(loan)} className="bg-green-600 hover:bg-green-700 text-white">
                              <DollarSign className="w-3 h-3 mr-1" />Registar Pagamento
                            </Button>
                          </div>
                        </>
                      )}
                      {loan.status === 'pago' && (
                        <div className="flex items-center text-green-600 text-sm mt-2">
                          <CheckCircle className="w-4 h-4 mr-1" />Pago integralmente
                        </div>
                      )}
                      {loan.status === 'cancelado' && loan.cancelReason && (
                        <p className="text-sm text-gray-500 mt-2">Motivo: {loan.cancelReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Handshake className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-gray-900 dark:text-white font-medium mb-2">Nenhum empréstimo</h4>
                  <p className="text-gray-500 text-sm mb-6">Comece registrando um empréstimo dado.</p>
                  <Button onClick={() => setModalType('create')} className="bg-orange-500 hover:bg-orange-600"><Plus className="w-4 h-4 mr-2" />Novo Empréstimo</Button>
                </div>
              )
            ) : (
              filteredDebts.length > 0 ? (
                <div className="space-y-3">
                  {filteredDebts.map((debt) => (
                    <div key={debt.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{debt.creditor}</p>
                          <p className="text-sm text-gray-500">{debt.description || 'Dívida'}</p>
                          {debt.dueDate && <p className="text-xs text-gray-400">Vencimento: {formatDate(debt.dueDate)}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">{formatCurrency(Number(debt.amount))}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${debt.status === 'pago' ? 'bg-green-100 text-green-600' : debt.status === 'cancelado' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-600'}`}>
                            {debt.status}
                          </span>
                        </div>
                      </div>
                      {debt.status === 'pendente' && (
                        <>
                          <div className="mb-2">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Pago: {formatCurrency(Number(debt.paidAmount || 0))}</span>
                              <span>Restante: {formatCurrency(getRemainingAmount(debt))}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${getProgressPercent(debt)}%` }}></div>
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openCancelModal(debt)} className="text-gray-600">
                              <Ban className="w-3 h-3 mr-1" />Cancelar
                            </Button>
                            <Button size="sm" onClick={() => openPaymentModal(debt)} className="bg-green-600 hover:bg-green-700 text-white">
                              <DollarSign className="w-3 h-3 mr-1" />Registar Pagamento
                            </Button>
                          </div>
                        </>
                      )}
                      {debt.status === 'pago' && (
                        <div className="flex items-center text-green-600 text-sm mt-2">
                          <CheckCircle className="w-4 h-4 mr-1" />Pago integralmente
                        </div>
                      )}
                      {debt.status === 'cancelado' && debt.cancelReason && (
                        <p className="text-sm text-gray-500 mt-2">Motivo: {debt.cancelReason}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-gray-900 dark:text-white font-medium mb-2">Nenhuma dívida</h4>
                  <p className="text-gray-500 text-sm mb-6">Comece registrando uma dívida.</p>
                  <Button onClick={() => setModalType('create')} className="bg-red-500 hover:bg-red-600"><Plus className="w-4 h-4 mr-2" />Nova Dívida</Button>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Create Modal */}
        {modalType === 'create' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeTab === 'loans' ? 'Novo Empréstimo' : 'Nova Dívida'}</h2>
                <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-sm text-gray-500 mb-4">{activeTab === 'loans' ? 'Registre um empréstimo que você fez para alguém.' : 'Registre uma dívida que você tem com alguém.'}</p>
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Conta</label>
                  <Select value={createFormData.accountId} onChange={(e) => setCreateFormData({ ...createFormData, accountId: e.target.value })} required>
                    <option value="">Selecionar conta</option>
                    {accounts.map(account => (<option key={account.id} value={account.id}>{account.name} - {formatCurrency(Number(account.balance))}</option>))}
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{activeTab === 'loans' ? 'Nome do Devedor' : 'Nome do Credor'}</label>
                  <Input value={createFormData.person} onChange={(e) => setCreateFormData({ ...createFormData, person: e.target.value })} placeholder={activeTab === 'loans' ? 'Quem recebeu o empréstimo' : 'A quem você deve'} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor (Kz)</label>
                  <Input type="number" step="0.01" value={createFormData.amount} onChange={(e) => setCreateFormData({ ...createFormData, amount: e.target.value })} placeholder="0.00" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Taxa de Juros (%) - Opcional</label>
                  <Input type="number" step="0.01" value={createFormData.interestRate} onChange={(e) => setCreateFormData({ ...createFormData, interestRate: e.target.value })} placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data de Vencimento (Opcional)</label>
                  <Input type="date" value={createFormData.dueDate} onChange={(e) => setCreateFormData({ ...createFormData, dueDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição (Opcional)</label>
                  <textarea value={createFormData.description} onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })} placeholder="Motivo ou observações..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" rows={2} />
                </div>
                <div className="flex space-x-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setModalType(null)} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={createLoanMutation.isPending || createDebtMutation.isPending} className={`flex-1 ${activeTab === 'loans' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-red-500 hover:bg-red-600'}`}>
                    {(createLoanMutation.isPending || createDebtMutation.isPending) ? 'Criando...' : 'Criar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {modalType === 'payment' && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Registar Pagamento</h2>
                <button onClick={() => { setModalType(null); setSelectedItem(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500">{'borrower' in selectedItem ? selectedItem.borrower : selectedItem.creditor}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">Total: {formatCurrency(Number(selectedItem.amount))}</p>
                <p className="text-sm text-gray-500">Já pago: {formatCurrency(Number(selectedItem.paidAmount || 0))}</p>
                <p className="text-sm font-medium text-green-600">Restante: {formatCurrency(getRemainingAmount(selectedItem))}</p>
              </div>
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valor do Pagamento (Kz)</label>
                  <Input type="number" step="0.01" min="0.01" max={getRemainingAmount(selectedItem)} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.00" required />
                  <p className="text-xs text-gray-500 mt-1">Máximo: {formatCurrency(getRemainingAmount(selectedItem))}</p>
                </div>
                <div className="flex space-x-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setModalType(null); setSelectedItem(null); }} className="flex-1">Cancelar</Button>
                  <Button type="submit" disabled={payLoanMutation.isPending || payDebtMutation.isPending} className="flex-1 bg-green-600 hover:bg-green-700">
                    {(payLoanMutation.isPending || payDebtMutation.isPending) ? 'Registando...' : 'Confirmar Pagamento'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {modalType === 'cancel' && selectedItem && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cancelar {activeTab === 'loans' ? 'Empréstimo' : 'Dívida'}</h2>
                <button onClick={() => { setModalType(null); setSelectedItem(null); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  {activeTab === 'loans' 
                    ? 'Ao cancelar, o valor será devolvido à sua conta.' 
                    : 'Ao cancelar, o valor recebido será debitado da sua conta.'}
                </p>
              </div>
              <form onSubmit={handleCancelSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Motivo do Cancelamento</label>
                  <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Informe o motivo do cancelamento..." className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none" rows={3} required minLength={3} />
                </div>
                <div className="flex space-x-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => { setModalType(null); setSelectedItem(null); }} className="flex-1">Voltar</Button>
                  <Button type="submit" disabled={cancelLoanMutation.isPending || cancelDebtMutation.isPending} className="flex-1 bg-red-600 hover:bg-red-700">
                    {(cancelLoanMutation.isPending || cancelDebtMutation.isPending) ? 'Cancelando...' : 'Confirmar Cancelamento'}
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

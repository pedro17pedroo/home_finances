import React, { useState, useMemo, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Filter, Search, ArrowUpDown, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTransactions, useTransactionSummary, useCreateTransaction } from '../hooks/use-transactions';
import { useAccounts, useCreateAccount } from '../../accounts/hooks/use-accounts';
import { useCategories, useCreateCategory } from '../../categories/hooks/use-categories';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import { showSuccessToast, showErrorToast } from '../../../shared/lib/alerts';
import type { CreateTransactionRequest, CreateAccountRequest } from '../../../shared/types';
import type { CreateCategoryRequest } from '../../../shared/api/categories';
import { useSearch } from 'wouter';

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

export function TransactionsPage() {
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: summary, isLoading: summaryLoading } = useTransactionSummary();
  const { data: accounts } = useAccounts();
  const { data: categoriesData } = useCategories();
  const createTransactionMutation = useCreateTransaction();
  const createAccountMutation = useCreateAccount();
  const createCategoryMutation = useCreateCategory();
  const searchString = useSearch();

  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  
  const [formData, setFormData] = useState<CreateTransactionRequest>({
    accountId: 0,
    amount: 0,
    type: 'despesa',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  // Abrir modal automaticamente se vier com parâmetro ?type=receita ou ?type=despesa
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const typeParam = params.get('type');
    if (typeParam === 'receita' || typeParam === 'despesa') {
      setFormData(prev => ({ ...prev, type: typeParam, category: '' }));
      setShowForm(true);
      // Limpar o parâmetro da URL sem recarregar a página
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchString]);

  // Inline forms state
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [accountFormData, setAccountFormData] = useState<CreateAccountRequest>({
    name: '',
    type: 'corrente',
    bank: '',
    balance: 0,
  });
  const [categoryFormData, setCategoryFormData] = useState<CreateCategoryRequest>({
    name: '',
    type: 'receita',
    color: '#10B981',
  });

  // Get categories filtered by transaction type
  const availableCategories = useMemo(() => {
    if (!categoriesData) return [];
    return categoriesData.filter(cat => cat.type === formData.type);
  }, [categoriesData, formData.type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransactionMutation.mutateAsync(formData);
      setShowForm(false);
      resetForm();
      showSuccessToast('Transação criada com sucesso!');
    } catch (error) {
      console.error('Error creating transaction:', error);
      showErrorToast('Erro ao criar transação');
    }
  };

  const resetForm = () => {
    setFormData({
      accountId: 0,
      amount: 0,
      type: 'despesa',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newAccount = await createAccountMutation.mutateAsync(accountFormData);
      setFormData({ ...formData, accountId: newAccount.id });
      setShowAccountForm(false);
      setAccountFormData({ name: '', type: 'corrente', bank: '', balance: 0 });
      showSuccessToast('Conta criada com sucesso!');
    } catch (error) {
      console.error('Error creating account:', error);
      showErrorToast('Erro ao criar conta');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newCategory = await createCategoryMutation.mutateAsync({
        ...categoryFormData,
        type: formData.type, // Use the transaction type
      });
      setFormData({ ...formData, category: newCategory.name });
      setShowCategoryForm(false);
      setCategoryFormData({ name: '', type: formData.type, color: formData.type === 'receita' ? '#10B981' : '#EF4444' });
      showSuccessToast('Categoria criada com sucesso!');
    } catch (error) {
      console.error('Error creating category:', error);
      showErrorToast('Erro ao criar categoria');
    }
  };

  const openAccountForm = () => {
    setShowAccountForm(true);
    setAccountFormData({ name: '', type: 'corrente', bank: '', balance: 0 });
  };

  const openCategoryForm = () => {
    setShowCategoryForm(true);
    setCategoryFormData({ 
      name: '', 
      type: formData.type, 
      color: formData.type === 'receita' ? '#10B981' : '#EF4444' 
    });
  };

  const getAccountName = (accountId: number) => {
    const account = accounts?.find(acc => acc.id === accountId);
    return account ? `${account.name} (${account.bank})` : 'Conta não encontrada';
  };

  // Obter categorias únicas das transações
  const uniqueCategories = useMemo(() => {
    if (!transactions) return [];
    const categories = [...new Set(transactions.map(t => t.category).filter(Boolean))];
    return categories.sort();
  }, [transactions]);

  // Filtrar e ordenar transações
  const filteredAndSortedTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let filtered = transactions.filter(transaction => {
      // Filtro por tipo
      const typeMatch = filterType === 'all' || transaction.type === filterType;
      
      // Filtro por conta
      const accountMatch = filterAccount === 'all' || transaction.accountId?.toString() === filterAccount;
      
      // Filtro por categoria
      const categoryMatch = filterCategory === 'all' || transaction.category === filterCategory;
      
      // Filtro por intervalo de datas
      let dateMatch = true;
      if (dateFrom) {
        const transactionDate = new Date(transaction.date);
        const fromDate = new Date(dateFrom);
        dateMatch = transactionDate >= fromDate;
      }
      if (dateTo && dateMatch) {
        const transactionDate = new Date(transaction.date);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        dateMatch = transactionDate <= toDate;
      }
      
      // Filtro por busca
      const searchMatch = searchTerm === '' || 
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getAccountName(transaction.accountId!).toLowerCase().includes(searchTerm.toLowerCase());
      
      return typeMatch && accountMatch && categoryMatch && dateMatch && searchMatch;
    });

    // Ordenar por data de criação (mais recentes primeiro)
    filtered.sort((a, b) => {
      const createdA = new Date(a.createdAt).getTime();
      const createdB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? createdB - createdA : createdA - createdB;
    });

    return filtered;
  }, [transactions, filterType, filterAccount, filterCategory, dateFrom, dateTo, searchTerm, sortOrder, accounts]);

  // Paginação
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedTransactions, currentPage, itemsPerPage]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterAccount, filterCategory, dateFrom, dateTo, searchTerm]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterAccount !== 'all') count++;
    if (filterCategory !== 'all') count++;
    if (dateFrom) count++;
    if (dateTo) count++;
    return count;
  }, [filterAccount, filterCategory, dateFrom, dateTo]);

  // Limpar todos os filtros
  const clearAllFilters = () => {
    setFilterType('all');
    setFilterAccount('all');
    setFilterCategory('all');
    setDateFrom('');
    setDateTo('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  if (transactionsLoading || summaryLoading) {
    return (
      <AppLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Transações</h1>
            <p className="text-gray-600 dark:text-gray-400">Gerencie todas as suas receitas e despesas</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center text-gray-900 dark:text-white">
                  <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                  Total de Receitas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.totalReceitas)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {transactions?.filter(t => t.type === 'receita').length || 0} transações
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center text-gray-900 dark:text-white">
                  <TrendingDown className="w-5 h-5 mr-2 text-red-600" />
                  Total de Despesas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(summary.totalDespesas)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {transactions?.filter(t => t.type === 'despesa').length || 0} transações
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-white dark:bg-gray-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center text-gray-900 dark:text-white">
                  Saldo Líquido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${summary.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.saldo)}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {transactions?.length || 0} transações totais
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Search */}
        <Card className="bg-white dark:bg-gray-800 mb-6">
          <CardContent className="p-6">
            {/* Linha principal de filtros */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center mb-4">
              {/* Type Filter */}
              <div className="flex items-center space-x-3">
                <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filterType === 'all'
                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    Todas ({transactions?.length || 0})
                  </button>
                  <button
                    onClick={() => setFilterType('receita')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filterType === 'receita'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-green-700 dark:hover:text-green-400'
                    }`}
                  >
                    Receitas ({transactions?.filter(t => t.type === 'receita').length || 0})
                  </button>
                  <button
                    onClick={() => setFilterType('despesa')}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      filterType === 'despesa'
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 shadow-sm'
                        : 'text-gray-600 dark:text-gray-300 hover:text-red-700 dark:hover:text-red-400'
                    }`}
                  >
                    Despesas ({transactions?.filter(t => t.type === 'despesa').length || 0})
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Buscar por descrição, categoria ou conta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>
              </div>

              {/* Botão Filtros Avançados */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium border rounded-md transition-colors ${
                  showAdvancedFilters || activeFiltersCount > 0
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                    : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
                {activeFiltersCount > 0 && (
                  <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Sort Order */}
              <button
                onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span>{sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigas'}</span>
              </button>
            </div>

            {/* Filtros Avançados */}
            {showAdvancedFilters && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Filtro por Conta */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Conta
                    </label>
                    <Select
                      value={filterAccount}
                      onChange={(e) => setFilterAccount(e.target.value)}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    >
                      <option value="all">Todas as contas</option>
                      {accounts?.map((account) => (
                        <option key={account.id} value={account.id.toString()}>
                          {account.name} ({account.bank})
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Filtro por Categoria */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Categoria
                    </label>
                    <Select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    >
                      <option value="all">Todas as categorias</option>
                      {uniqueCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </Select>
                  </div>

                  {/* Data Inicial */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data Inicial
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                  </div>

                  {/* Data Final */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Data Final
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                </div>

                {/* Botão Limpar Filtros */}
                {activeFiltersCount > 0 && (
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={clearAllFilters}
                      className="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 flex items-center"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Limpar todos os filtros
                    </button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-gray-900 dark:text-white">
                {filterType === 'all' ? 'Todas as Transações' : 
                 filterType === 'receita' ? 'Receitas' : 'Despesas'}
                {filteredAndSortedTransactions.length > 0 && (
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                    ({filteredAndSortedTransactions.length} {filteredAndSortedTransactions.length === 1 ? 'transação' : 'transações'})
                  </span>
                )}
              </CardTitle>
              
              {/* Items per page selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Mostrar:</span>
                <Select
                  value={itemsPerPage.toString()}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="w-20 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                >
                  <option value="5">5</option>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {paginatedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">
                  {searchTerm || activeFiltersCount > 0 ? '🔍' : filterType === 'receita' ? '💰' : filterType === 'despesa' ? '💸' : '📊'}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  {searchTerm || activeFiltersCount > 0 ? 'Nenhuma transação encontrada' :
                   filterType === 'all' ? 'Nenhuma transação registrada' :
                   filterType === 'receita' ? 'Nenhuma receita registrada' : 'Nenhuma despesa registrada'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm || activeFiltersCount > 0 ? 'Tente ajustar os filtros de busca.' :
                   `Comece registrando suas ${filterType === 'all' ? 'transações' : filterType === 'receita' ? 'receitas' : 'despesas'}.`}
                </p>
                {!searchTerm && activeFiltersCount === 0 && (
                  <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    {filterType === 'all' ? 'Primeira Transação' :
                     filterType === 'receita' ? 'Primeira Receita' : 'Primeira Despesa'}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  {paginatedTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className={`w-3 h-3 rounded-full ${
                          transaction.type === 'receita' ? 'bg-green-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {transaction.description || transaction.category}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {transaction.category} • {getAccountName(transaction.accountId!)} • {formatDate(transaction.date)}
                          </div>
                          {transaction.balanceAfter && (
                            <div className="text-xs text-gray-400 mt-1">
                              Saldo: {transaction.balanceBefore ? formatCurrency(Number(transaction.balanceBefore)) : '—'} → {formatCurrency(Number(transaction.balanceAfter))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className={`text-lg font-semibold ${
                            transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                          </div>
                          {transaction.balanceAfter && (
                            <div className="text-xs text-gray-500">
                              Saldo: {formatCurrency(Number(transaction.balanceAfter))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} de {filteredAndSortedTransactions.length} transações
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {/* Página anterior */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Anterior
                      </button>
                      
                      {/* Indicador de página */}
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        Página {currentPage} de {totalPages}
                      </span>
                      
                      {/* Próxima página */}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Create Transaction Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Nova Transação</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo
                  </label>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as 'receita' | 'despesa', category: '' })}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </Select>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Conta
                    </label>
                    <button
                      type="button"
                      onClick={openAccountForm}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Nova Conta
                    </button>
                  </div>
                  <Select
                    value={formData.accountId.toString()}
                    onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) })}
                    required
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value="0">Selecione a conta</option>
                    {accounts?.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} - {account.bank} ({formatCurrency(Number(account.balance))})
                      </option>
                    ))}
                  </Select>
                  {(!accounts || accounts.length === 0) && (
                    <p className="text-xs text-amber-600 mt-1">
                      Nenhuma conta cadastrada. Clique em "Nova Conta" para criar.
                    </p>
                  )}
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Categoria
                    </label>
                    <button
                      type="button"
                      onClick={openCategoryForm}
                      className={`text-xs flex items-center ${formData.type === 'receita' ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Nova Categoria
                    </button>
                  </div>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value="">Selecione a categoria</option>
                    {availableCategories.map((category) => (
                      <option key={category.id || category.name} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                  {availableCategories.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Nenhuma categoria de {formData.type} cadastrada. Clique em "Nova Categoria" para criar.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Valor
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    required
                    min="0.01"
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Data
                  </label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrição (opcional)
                  </label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Detalhes da transação"
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
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
                    disabled={createTransactionMutation.isPending || formData.accountId === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {createTransactionMutation.isPending ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Inline Account Creation Modal */}
        {showAccountForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">Nova Conta</h2>
                <button onClick={() => setShowAccountForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateAccount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome</label>
                  <Input
                    value={accountFormData.name}
                    onChange={(e) => setAccountFormData({ ...accountFormData, name: e.target.value })}
                    placeholder="Ex: Conta Principal"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Banco</label>
                  <Select
                    value={accountFormData.bank}
                    onChange={(e) => setAccountFormData({ ...accountFormData, bank: e.target.value })}
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
                    value={accountFormData.type}
                    onChange={(e) => setAccountFormData({ ...accountFormData, type: e.target.value as 'corrente' | 'poupanca' })}
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
                    value={accountFormData.balance}
                    onChange={(e) => setAccountFormData({ ...accountFormData, balance: Number(e.target.value) })}
                    required
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowAccountForm(false)} className="flex-1">
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

        {/* Inline Category Creation Modal */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                  Nova Categoria de {formData.type === 'receita' ? 'Receita' : 'Despesa'}
                </h2>
                <button onClick={() => setShowCategoryForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome da Categoria
                  </label>
                  <Input
                    value={categoryFormData.name}
                    onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                    placeholder="Ex: Alimentação"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cor
                  </label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="color"
                      value={categoryFormData.color}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <Input
                      value={categoryFormData.color}
                      onChange={(e) => setCategoryFormData({ ...categoryFormData, color: e.target.value })}
                      placeholder="#10B981"
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowCategoryForm(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCategoryMutation.isPending} 
                    className={`flex-1 ${formData.type === 'receita' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-500 hover:bg-red-600'}`}
                  >
                    {createCategoryMutation.isPending ? 'Criando...' : 'Criar Categoria'}
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
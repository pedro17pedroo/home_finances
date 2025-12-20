import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Filter, Search, Calendar, ArrowUpDown } from 'lucide-react';
import { useTransactions, useTransactionSummary, useCreateTransaction, useDeleteTransaction } from '../hooks/use-transactions';
import { useAccounts } from '../../accounts/hooks/use-accounts';
import { AppLayout } from '../../../shared/components/layout/app-layout';
import { Button } from '../../../shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card';
import { Input } from '../../../shared/components/ui/input';
import { Select } from '../../../shared/components/ui/select';
import { formatCurrency, formatDate } from '../../../shared/lib/utils';
import type { CreateTransactionRequest } from '../../../shared/types';

const categories = {
  receita: [
    'Salário',
    'Freelance',
    'Investimentos',
    'Vendas',
    'Prêmios',
    'Outros'
  ],
  despesa: [
    'Alimentação',
    'Moradia',
    'Transporte',
    'Lazer',
    'Saúde',
    'Educação',
    'Compras',
    'Contas',
    'Outros'
  ]
};

export function TransactionsPage() {
  const { data: transactions, isLoading: transactionsLoading } = useTransactions();
  const { data: summary, isLoading: summaryLoading } = useTransactionSummary();
  const { data: accounts } = useAccounts();
  const createTransactionMutation = useCreateTransaction();
  const deleteTransactionMutation = useDeleteTransaction();

  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'receita' | 'despesa'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // desc = mais recentes primeiro
  const [formData, setFormData] = useState<CreateTransactionRequest>({
    accountId: 0,
    amount: 0,
    type: 'receita',
    category: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTransactionMutation.mutateAsync(formData);
      setShowForm(false);
      resetForm();
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        await deleteTransactionMutation.mutateAsync(id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      accountId: 0,
      amount: 0,
      type: 'receita',
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  const getAccountName = (accountId: number) => {
    const account = accounts?.find(acc => acc.id === accountId);
    return account ? `${account.name} (${account.bank})` : 'Conta não encontrada';
  };

  // Filtrar e ordenar transações
  const filteredAndSortedTransactions = useMemo(() => {
    if (!transactions) return [];
    
    let filtered = transactions.filter(transaction => {
      // Filtro por tipo
      const typeMatch = filterType === 'all' || transaction.type === filterType;
      
      // Filtro por busca
      const searchMatch = searchTerm === '' || 
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        getAccountName(transaction.accountId!).toLowerCase().includes(searchTerm.toLowerCase());
      
      return typeMatch && searchMatch;
    });

    // Ordenar por data (mais recentes primeiro por padrão)
    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return filtered;
  }, [transactions, filterType, searchTerm, sortOrder, accounts]);

  const availableCategories = categories[formData.type] || [];

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
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
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

              {/* Sort Order */}
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                <button
                  onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                  className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  <span>{sortOrder === 'desc' ? 'Mais recentes' : 'Mais antigas'}</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">
              {filterType === 'all' ? 'Todas as Transações' : 
               filterType === 'receita' ? 'Receitas' : 'Despesas'}
              {filteredAndSortedTransactions.length > 0 && (
                <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                  ({filteredAndSortedTransactions.length} {filteredAndSortedTransactions.length === 1 ? 'transação' : 'transações'})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredAndSortedTransactions.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">
                  {searchTerm ? '🔍' : filterType === 'receita' ? '💰' : filterType === 'despesa' ? '💸' : '📊'}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  {searchTerm ? 'Nenhuma transação encontrada' :
                   filterType === 'all' ? 'Nenhuma transação registrada' :
                   filterType === 'receita' ? 'Nenhuma receita registrada' : 'Nenhuma despesa registrada'}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {searchTerm ? 'Tente ajustar os filtros de busca.' :
                   `Comece registrando suas ${filterType === 'all' ? 'transações' : filterType === 'receita' ? 'receitas' : 'despesas'}.`}
                </p>
                {!searchTerm && (
                  <Button onClick={() => setShowForm(true)} className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" />
                    {filterType === 'all' ? 'Primeira Transação' :
                     filterType === 'receita' ? 'Primeira Receita' : 'Primeira Despesa'}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedTransactions.map((transaction) => (
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
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className={`text-lg font-semibold ${
                        transaction.type === 'receita' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.type === 'receita' ? '+' : '-'}{formatCurrency(Number(transaction.amount))}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(transaction.id)}
                        disabled={deleteTransactionMutation.isPending}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Transaction Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Nova Transação</h2>
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Conta
                  </label>
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
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Categoria
                  </label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    required
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                  >
                    <option value="">Selecione a categoria</option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </Select>
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
      </div>
    </AppLayout>
  );
}
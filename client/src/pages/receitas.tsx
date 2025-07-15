import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Filter, Search, Calendar, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TransactionForm from "@/components/forms/transaction-form";
import TransactionLimitGuard from "@/components/auth/transaction-limit-guard";
import { formatCurrency, formatDate } from "@/lib/utils";

import type { Transaction, Category } from "@shared/schema";

export default function Receitas() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/transactions", "receitas"],
    queryFn: async () => {
      const response = await fetch("/api/transactions");
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      return data.filter((t: Transaction) => t.type === 'receita');
    },
  });

  const { data: categories } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const totalReceitas = transactions?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  // Calculate this month's income
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const thisMonthReceitas = transactions?.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth && 
           transactionDate.getFullYear() === currentYear;
  }).reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

  // Calculate monthly average (based on months with data)
  const monthlyTotals = transactions?.reduce((acc, t) => {
    const transactionDate = new Date(t.date);
    const monthKey = `${transactionDate.getFullYear()}-${transactionDate.getMonth()}`;
    acc[monthKey] = (acc[monthKey] || 0) + parseFloat(t.amount);
    return acc;
  }, {} as Record<string, number>) || {};

  const monthsWithData = Object.keys(monthlyTotals).length;
  const averageMonthlyReceitas = monthsWithData > 0 ? totalReceitas / monthsWithData : 0;

  // Filter and paginate transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(transaction => {
      const matchesSearch = !searchTerm || 
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = selectedCategory === "all" || transaction.category === selectedCategory;
      
      const amount = parseFloat(transaction.amount);
      const matchesMinAmount = !minAmount || amount >= parseFloat(minAmount);
      const matchesMaxAmount = !maxAmount || amount <= parseFloat(maxAmount);
      
      const transactionDate = new Date(transaction.date);
      const matchesStartDate = !startDate || transactionDate >= new Date(startDate);
      const matchesEndDate = !endDate || transactionDate <= new Date(endDate);
      
      return matchesSearch && matchesCategory && matchesMinAmount && matchesMaxAmount && matchesStartDate && matchesEndDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, searchTerm, selectedCategory, minAmount, maxAmount, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategory("all");
    setMinAmount("");
    setMaxAmount("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
  };

  const receitaCategories = categories?.filter(cat => cat.type === 'receita') || [];

  return (
    <TransactionLimitGuard>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Receitas</h1>
            <p className="text-sm sm:text-base text-slate-600">Gerencie suas fontes de renda</p>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white flex-shrink-0 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nova Receita</span>
            <span className="sm:hidden">Nova</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
          <Card className="p-4 sm:p-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">Total de Receitas</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-600 break-words">
                {formatCurrency(totalReceitas)}
              </p>
            </CardContent>
          </Card>
          <Card className="p-4 sm:p-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">Este Mês</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">
                {formatCurrency(thisMonthReceitas)}
              </p>
            </CardContent>
          </Card>
          <Card className="p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm sm:text-base lg:text-lg font-semibold">Média Mensal</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900 break-words">
                {formatCurrency(averageMonthlyReceitas)}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Histórico de Receitas</CardTitle>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={clearFilters}
                  className="text-xs"
                >
                  <Filter className="h-3 w-3 mr-1" />
                  Limpar Filtros
                </Button>
                <span className="text-sm text-slate-500">
                  {filteredTransactions.length} de {transactions?.length || 0} transações
                </span>
              </div>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {receitaCategories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  placeholder="Valor mín."
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  placeholder="Valor máx."
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  placeholder="Data início"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
              
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="date"
                  placeholder="Data fim"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg animate-pulse">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-200 rounded-full"></div>
                      <div>
                        <div className="h-4 bg-slate-200 rounded w-32"></div>
                        <div className="h-3 bg-slate-200 rounded w-24 mt-1"></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                      <div className="h-3 bg-slate-200 rounded w-20 mt-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500 text-lg">Nenhuma receita registrada</p>
                <p className="text-slate-400 mt-2">Clique em "Nova Receita" para começar</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {paginatedTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 flex-1">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-900 text-sm sm:text-base truncate">
                          {transaction.description || transaction.category}
                        </p>
                        <p className="text-xs sm:text-sm text-slate-500 truncate">
                          {transaction.category}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-semibold text-green-600 text-sm sm:text-base">
                        {formatCurrency(transaction.amount)}
                      </p>
                      <p className="text-xs sm:text-sm text-slate-500">
                        {formatDate(transaction.date)}
                      </p>
                    </div>
                  </div>
                ))}
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-6 border-t border-slate-200">
                    <div className="text-sm text-slate-600">
                      Página {currentPage} de {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Receita</DialogTitle>
          </DialogHeader>
          <TransactionForm 
            defaultType="receita"
            onSuccess={() => {
              setIsModalOpen(false);
              // Force refresh of receitas query
              queryClient.invalidateQueries({ queryKey: ["/api/transactions", "receitas"] });
            }} 
          />
        </DialogContent>
      </Dialog>
    </TransactionLimitGuard>
  );
}

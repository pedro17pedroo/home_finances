import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';

interface ExportScreenProps {
  navigation: any;
}

interface DataCounts {
  transactions: number;
  accounts: number;
  categories: number;
  transfers: number;
  savingsGoals: number;
  loans: number;
  debts: number;
  recurringTransactions: number;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'year' | 'month'>('month');
  const [selectedData, setSelectedData] = useState<string[]>(['transactions', 'accounts']);
  const [dataCounts, setDataCounts] = useState<DataCounts>({
    transactions: 0,
    accounts: 0,
    categories: 0,
    transfers: 0,
    savingsGoals: 0,
    loans: 0,
    debts: 0,
    recurringTransactions: 0,
  });

  const fetchDataCounts = useCallback(async () => {
    try {
      const [
        transactionsRes,
        accountsRes,
        categoriesRes,
        transfersRes,
        savingsRes,
        loansRes,
        debtsRes,
      ] = await Promise.all([
        api.get('/transactions').catch(() => ({ data: { data: [] } })),
        api.get('/accounts').catch(() => ({ data: { data: [] } })),
        api.get('/categories').catch(() => ({ data: { data: [] } })),
        api.get('/transfers').catch(() => ({ data: { data: { transfers: [] } } })),
        api.get('/savings-goals').catch(() => ({ data: { data: [] } })),
        api.get('/loans').catch(() => ({ data: { data: { loans: [] } } })),
        api.get('/debts').catch(() => ({ data: { data: { debts: [] } } })),
      ]);

      const getLength = (res: any) => {
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) return data.length;
        if (data?.transactions) return data.transactions.length;
        if (data?.transfers) return data.transfers.length;
        if (data?.loans) return data.loans.length;
        if (data?.debts) return data.debts.length;
        if (data?.savingsGoals) return data.savingsGoals.length;
        return 0;
      };

      setDataCounts({
        transactions: getLength(transactionsRes),
        accounts: getLength(accountsRes),
        categories: getLength(categoriesRes),
        transfers: getLength(transfersRes),
        savingsGoals: getLength(savingsRes),
        loans: getLength(loansRes),
        debts: getLength(debtsRes),
        recurringTransactions: 0,
      });
    } catch (error) {
      console.error('Erro ao carregar contagens:', error);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDataCounts();
  }, [fetchDataCounts]);

  const periods = [
    { value: 'month', label: 'Este Mês', description: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) },
    { value: 'year', label: 'Este Ano', description: new Date().getFullYear().toString() },
    { value: 'all', label: 'Todos os Dados', description: 'Desde o início' },
  ];

  const dataTypes = [
    { id: 'transactions', label: 'Transações', icon: 'swap-horizontal' as const, count: dataCounts.transactions },
    { id: 'accounts', label: 'Contas', icon: 'wallet' as const, count: dataCounts.accounts },
    { id: 'categories', label: 'Categorias', icon: 'pricetags' as const, count: dataCounts.categories },
    { id: 'transfers', label: 'Transferências', icon: 'arrow-forward' as const, count: dataCounts.transfers },
    { id: 'savingsGoals', label: 'Metas de Poupança', icon: 'flag' as const, count: dataCounts.savingsGoals },
    { id: 'loans', label: 'Empréstimos', icon: 'cash' as const, count: dataCounts.loans },
    { id: 'debts', label: 'Dívidas', icon: 'card' as const, count: dataCounts.debts },
  ];

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    switch (selectedPeriod) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(2020, 0, 1);
    }

    return { startDate, endDate };
  };

  const handleExportJSON = async () => {
    if (selectedData.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um tipo de dado');
      return;
    }

    setLoading('json');
    try {
      const { startDate, endDate } = getDateRange();

      const response = await api.post('/export/data', {
        format: 'json',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        includeAccounts: selectedData.includes('accounts'),
        includeTransactions: selectedData.includes('transactions'),
        includeLoans: selectedData.includes('loans'),
        includeDebts: selectedData.includes('debts'),
        includeSavingsGoals: selectedData.includes('savingsGoals'),
        includeTransfers: selectedData.includes('transfers'),
      });

      const jsonContent = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data, null, 2);
      
      const filename = `backup_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
      }
      
      Alert.alert('Sucesso', 'Backup JSON exportado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao exportar JSON:', error);
      Alert.alert('Erro', error.message || 'Não foi possível exportar os dados');
    } finally {
      setLoading(null);
    }
  };

  const handleExportCSV = async () => {
    setLoading('csv');
    try {
      const { startDate, endDate } = getDateRange();

      const response = await api.get('/export/transactions', {
        params: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        responseType: 'text',
      });

      const csvContent = response.data;
      
      const filename = `transacoes_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
      }
      
      Alert.alert('Sucesso', 'Transações exportadas em CSV!');
    } catch (error: any) {
      console.error('Erro ao exportar CSV:', error);
      Alert.alert('Erro', error.message || 'Não foi possível exportar as transações');
    } finally {
      setLoading(null);
    }
  };

  const handleExportBackup = async () => {
    setLoading('backup');
    try {
      const response = await api.get('/export/backup');

      const jsonContent = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data, null, 2);
      
      const filename = `backup_completo_${new Date().toISOString().split('T')[0]}.json`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, jsonContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json' });
      }
      
      Alert.alert('Sucesso', 'Backup completo exportado!');
    } catch (error: any) {
      console.error('Erro ao criar backup:', error);
      Alert.alert('Erro', error.message || 'Não foi possível criar o backup');
    } finally {
      setLoading(null);
    }
  };

  const handleExportSummary = async () => {
    setLoading('summary');
    try {
      const response = await api.get('/export/summary', {
        responseType: 'text',
      });

      const textContent = response.data;
      
      const filename = `resumo_financeiro_${new Date().toISOString().split('T')[0]}.txt`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, textContent);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/plain' });
      }
      
      Alert.alert('Sucesso', 'Resumo financeiro exportado!');
    } catch (error: any) {
      console.error('Erro ao gerar resumo:', error);
      Alert.alert('Erro', error.message || 'Não foi possível gerar o resumo');
    } finally {
      setLoading(null);
    }
  };

  const handleExportPDF = async () => {
    setLoading('pdf');
    try {
      // Buscar dados para o relatório
      const [accountsRes, transactionsRes, loansRes, debtsRes, savingsRes] = await Promise.all([
        api.get('/accounts').catch(() => ({ data: { data: [] } })),
        api.get('/transactions').catch(() => ({ data: { data: [] } })),
        api.get('/loans').catch(() => ({ data: { data: { loans: [] } } })),
        api.get('/debts').catch(() => ({ data: { data: { debts: [] } } })),
        api.get('/savings-goals').catch(() => ({ data: { data: [] } })),
      ]);

      // Extrair arrays corretamente
      const getArray = (res: any, key?: string) => {
        const data = res.data?.data || res.data;
        if (Array.isArray(data)) return data;
        if (key && data?.[key]) return data[key];
        if (data?.transactions) return data.transactions;
        return [];
      };

      const accounts = getArray(accountsRes);
      const transactions = getArray(transactionsRes);
      const loans = getArray(loansRes, 'loans');
      const debts = getArray(debtsRes, 'debts');
      const savings = getArray(savingsRes);

      const totalBalance = accounts.reduce((sum: number, acc: any) => sum + parseFloat(acc.balance || 0), 0);
      const totalIncome = transactions
        .filter((t: any) => t.type === 'receita')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
      const totalExpenses = transactions
        .filter((t: any) => t.type === 'despesa')
        .reduce((sum: number, t: any) => sum + parseFloat(t.amount || 0), 0);
      const totalLoans = loans
        .filter((l: any) => l.status === 'pendente')
        .reduce((sum: number, l: any) => sum + parseFloat(l.amount || 0), 0);
      const totalDebts = debts
        .filter((d: any) => d.status === 'pendente')
        .reduce((sum: number, d: any) => sum + parseFloat(d.amount || 0), 0);
      const totalSavingsTarget = savings.reduce((sum: number, s: any) => sum + parseFloat(s.targetAmount || 0), 0);
      const totalSavingsCurrent = savings.reduce((sum: number, s: any) => sum + parseFloat(s.currentAmount || 0), 0);

      const formatCurrency = (value: number) => `${value.toLocaleString('pt-AO')} Kz`;
      const dateStr = new Date().toLocaleDateString('pt-AO', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // Gerar HTML para o PDF
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Relatório Financeiro</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Helvetica', Arial, sans-serif; padding: 40px; color: #333; }
            .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4F46E5; }
            .header h1 { color: #4F46E5; font-size: 28px; margin-bottom: 5px; }
            .header p { color: #666; font-size: 14px; }
            .date { text-align: right; color: #888; font-size: 12px; margin-bottom: 20px; }
            .section { margin-bottom: 25px; }
            .section-title { background: #4F46E5; color: white; padding: 10px 15px; font-size: 16px; font-weight: bold; border-radius: 5px 5px 0 0; }
            .section-content { border: 1px solid #ddd; border-top: none; padding: 15px; border-radius: 0 0 5px 5px; }
            .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .row:last-child { border-bottom: none; }
            .label { color: #666; }
            .value { font-weight: bold; color: #333; }
            .value.positive { color: #10B981; }
            .value.negative { color: #EF4444; }
            .summary-box { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 20px; border-radius: 10px; margin-top: 20px; }
            .summary-box h3 { margin-bottom: 15px; font-size: 18px; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .summary-value { font-size: 20px; font-weight: bold; }
            .accounts-list { margin-top: 10px; }
            .account-item { display: flex; justify-content: space-between; padding: 5px 10px; background: #f9f9f9; margin: 3px 0; border-radius: 3px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #888; font-size: 11px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 Relatório Financeiro</h1>
            <p>Finance Control</p>
          </div>
          
          <div class="date">Gerado em: ${dateStr}</div>

          <div class="section">
            <div class="section-title">💰 Contas Bancárias</div>
            <div class="section-content">
              <div class="row">
                <span class="label">Total de Contas</span>
                <span class="value">${accounts.length}</span>
              </div>
              <div class="row">
                <span class="label">Saldo Total</span>
                <span class="value positive">${formatCurrency(totalBalance)}</span>
              </div>
              <div class="accounts-list">
                ${accounts.map((acc: any) => `
                  <div class="account-item">
                    <span>${acc.name}</span>
                    <span>${formatCurrency(parseFloat(acc.balance || 0))}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">📈 Transações</div>
            <div class="section-content">
              <div class="row">
                <span class="label">Total de Transações</span>
                <span class="value">${transactions.length}</span>
              </div>
              <div class="row">
                <span class="label">Total de Receitas</span>
                <span class="value positive">${formatCurrency(totalIncome)}</span>
              </div>
              <div class="row">
                <span class="label">Total de Despesas</span>
                <span class="value negative">${formatCurrency(totalExpenses)}</span>
              </div>
              <div class="row">
                <span class="label">Balanço</span>
                <span class="value ${totalIncome - totalExpenses >= 0 ? 'positive' : 'negative'}">${formatCurrency(totalIncome - totalExpenses)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🤝 Empréstimos (A Receber)</div>
            <div class="section-content">
              <div class="row">
                <span class="label">Total de Empréstimos</span>
                <span class="value">${loans.length}</span>
              </div>
              <div class="row">
                <span class="label">Valor Pendente</span>
                <span class="value positive">${formatCurrency(totalLoans)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">💳 Dívidas (A Pagar)</div>
            <div class="section-content">
              <div class="row">
                <span class="label">Total de Dívidas</span>
                <span class="value">${debts.length}</span>
              </div>
              <div class="row">
                <span class="label">Valor Pendente</span>
                <span class="value negative">${formatCurrency(totalDebts)}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">🎯 Metas de Poupança</div>
            <div class="section-content">
              <div class="row">
                <span class="label">Total de Metas</span>
                <span class="value">${savings.length}</span>
              </div>
              <div class="row">
                <span class="label">Meta Total</span>
                <span class="value">${formatCurrency(totalSavingsTarget)}</span>
              </div>
              <div class="row">
                <span class="label">Poupado</span>
                <span class="value positive">${formatCurrency(totalSavingsCurrent)}</span>
              </div>
              <div class="row">
                <span class="label">Progresso</span>
                <span class="value">${totalSavingsTarget > 0 ? ((totalSavingsCurrent / totalSavingsTarget) * 100).toFixed(1) : 0}%</span>
              </div>
            </div>
          </div>

          <div class="summary-box">
            <h3>📊 Resumo do Patrimônio</h3>
            <div class="summary-row">
              <span>Patrimônio Líquido</span>
              <span class="summary-value">${formatCurrency(totalBalance + totalLoans - totalDebts)}</span>
            </div>
            <p style="font-size: 11px; margin-top: 10px; opacity: 0.8;">(Saldo + Empréstimos a Receber - Dívidas a Pagar)</p>
          </div>

          <div class="footer">
            <p>Gerado automaticamente por Finance Control</p>
            <p>${new Date().toISOString()}</p>
          </div>
        </body>
        </html>
      `;

      // Gerar PDF
      const { uri } = await Print.printToFileAsync({ html });
      
      // Renomear o ficheiro
      const filename = `relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`;
      const newUri = FileSystem.documentDirectory + filename;
      await FileSystem.moveAsync({ from: uri, to: newUri });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(newUri, { mimeType: 'application/pdf' });
      }
      
      Alert.alert('Sucesso', 'Relatório PDF exportado!');
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', error.message || 'Não foi possível gerar o PDF');
    } finally {
      setLoading(null);
    }
  };

  const toggleDataType = (id: string) => {
    setSelectedData(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const getTotalRecords = () => {
    return selectedData.reduce((total, id) => {
      const dt = dataTypes.find(d => d.id === id);
      return total + (dt?.count || 0);
    }, 0);
  };

  if (dataLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Carregando dados...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Exportar Dados</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Stats */}
        <View style={styles.statsContainer}>
          <StatCard title="Registros" value={getTotalRecords()} icon="documents" iconColor={COLORS.primary} />
          <StatCard title="Tipos" value={selectedData.length} icon="layers" iconColor={COLORS.info} />
        </View>

        {/* Período */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Período dos Dados</Text>
          <View style={styles.periodsContainer}>
            {periods.map((p) => (
              <TouchableOpacity
                key={p.value}
                style={[styles.periodButton, selectedPeriod === p.value && styles.periodButtonActive]}
                onPress={() => setSelectedPeriod(p.value as any)}
              >
                <Text style={[styles.periodLabel, selectedPeriod === p.value && styles.periodLabelActive]}>{p.label}</Text>
                <Text style={[styles.periodDesc, selectedPeriod === p.value && styles.periodDescActive]}>{p.description}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Tipos de Dados */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Tipos de Dados</Text>
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setSelectedData(dataTypes.map(d => d.id))}>
                <Text style={styles.actionText}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedData([])}>
                <Text style={styles.actionText}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.dataTypesContainer}>
            {dataTypes.map((dt) => {
              const isSelected = selectedData.includes(dt.id);
              return (
                <TouchableOpacity
                  key={dt.id}
                  style={[styles.dataTypeButton, isSelected && styles.dataTypeButtonActive]}
                  onPress={() => toggleDataType(dt.id)}
                >
                  <View style={styles.dataTypeContent}>
                    <Ionicons name={dt.icon} size={20} color={isSelected ? COLORS.primary : COLORS.textSecondary} />
                    <View style={styles.dataTypeInfo}>
                      <Text style={[styles.dataTypeLabel, isSelected && styles.dataTypeLabelActive]}>{dt.label}</Text>
                      <Text style={styles.dataTypeCount}>{dt.count} registros</Text>
                    </View>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Formatos de Exportação */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Formatos de Exportação</Text>
          
          <TouchableOpacity style={styles.exportOption} onPress={handleExportJSON} disabled={loading !== null}>
            <View style={[styles.exportIcon, { backgroundColor: `${COLORS.primary}20` }]}>
              <Ionicons name="code-working" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Backup Personalizado (JSON)</Text>
              <Text style={styles.exportDesc}>Exporta os dados selecionados em JSON</Text>
            </View>
            {loading === 'json' ? <ActivityIndicator color={COLORS.primary} /> : <Ionicons name="download" size={20} color={COLORS.primary} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportOption} onPress={handleExportCSV} disabled={loading !== null}>
            <View style={[styles.exportIcon, { backgroundColor: `${COLORS.success}20` }]}>
              <Ionicons name="grid" size={24} color={COLORS.success} />
            </View>
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Transações (CSV)</Text>
              <Text style={styles.exportDesc}>Planilha para Excel e Google Sheets</Text>
            </View>
            {loading === 'csv' ? <ActivityIndicator color={COLORS.success} /> : <Ionicons name="download" size={20} color={COLORS.success} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportOption} onPress={handleExportBackup} disabled={loading !== null}>
            <View style={[styles.exportIcon, { backgroundColor: `${COLORS.warning}20` }]}>
              <Ionicons name="cloud-download" size={24} color={COLORS.warning} />
            </View>
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Backup Completo (JSON)</Text>
              <Text style={styles.exportDesc}>Todos os dados para restauração</Text>
            </View>
            {loading === 'backup' ? <ActivityIndicator color={COLORS.warning} /> : <Ionicons name="download" size={20} color={COLORS.warning} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportOption} onPress={handleExportSummary} disabled={loading !== null}>
            <View style={[styles.exportIcon, { backgroundColor: `${COLORS.info}20` }]}>
              <Ionicons name="document-text" size={24} color={COLORS.info} />
            </View>
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Resumo Financeiro</Text>
              <Text style={styles.exportDesc}>Relatório de texto com resumo</Text>
            </View>
            {loading === 'summary' ? <ActivityIndicator color={COLORS.info} /> : <Ionicons name="download" size={20} color={COLORS.info} />}
          </TouchableOpacity>

          <TouchableOpacity style={styles.exportOption} onPress={handleExportPDF} disabled={loading !== null}>
            <View style={[styles.exportIcon, { backgroundColor: '#DC262620' }]}>
              <Ionicons name="document" size={24} color="#DC2626" />
            </View>
            <View style={styles.exportInfo}>
              <Text style={styles.exportTitle}>Relatório PDF</Text>
              <Text style={styles.exportDesc}>Relatório visual completo em PDF</Text>
            </View>
            {loading === 'pdf' ? <ActivityIndicator color="#DC2626" /> : <Ionicons name="download" size={20} color="#DC2626" />}
          </TouchableOpacity>
        </Card>

        {/* Info */}
        <Card style={[styles.card, { backgroundColor: `${COLORS.info}05` }]}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoTitle}>Informações</Text>
          </View>
          <Text style={styles.infoText}>• Os dados exportados não incluem senhas</Text>
          <Text style={styles.infoText}>• Use JSON para backup completo</Text>
          <Text style={styles.infoText}>• Use CSV para análise em planilhas</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.md, color: COLORS.textSecondary },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: COLORS.text },
  scrollView: { flex: 1, paddingHorizontal: SPACING.lg },
  statsContainer: { flexDirection: 'row', marginBottom: SPACING.lg, gap: SPACING.sm },
  card: { marginBottom: SPACING.lg },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  cardTitle: { fontSize: 18, fontWeight: '600', color: COLORS.text, marginBottom: SPACING.md },
  actions: { flexDirection: 'row', gap: SPACING.md },
  actionText: { fontSize: 14, color: COLORS.primary, fontWeight: '500' },
  periodsContainer: { gap: SPACING.sm },
  periodButton: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: 12, backgroundColor: COLORS.background, borderWidth: 2, borderColor: COLORS.border },
  periodButtonActive: { backgroundColor: `${COLORS.primary}10`, borderColor: COLORS.primary },
  periodLabel: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  periodLabelActive: { color: COLORS.primary },
  periodDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  periodDescActive: { color: COLORS.primary },
  dataTypesContainer: { gap: SPACING.sm },
  dataTypeButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: 12, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border },
  dataTypeButtonActive: { backgroundColor: `${COLORS.primary}10`, borderColor: COLORS.primary },
  dataTypeContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dataTypeInfo: { marginLeft: SPACING.sm },
  dataTypeLabel: { fontSize: 14, fontWeight: '500', color: COLORS.text },
  dataTypeLabelActive: { color: COLORS.primary },
  dataTypeCount: { fontSize: 12, color: COLORS.textSecondary },
  exportOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.md, borderRadius: 12, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  exportIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md },
  exportInfo: { flex: 1 },
  exportTitle: { fontSize: 16, fontWeight: '600', color: COLORS.text },
  exportDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  infoTitle: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  infoText: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
});

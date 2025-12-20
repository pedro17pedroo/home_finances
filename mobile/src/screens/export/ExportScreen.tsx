import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { useCurrency } from '../../hooks/useCurrency';
import { useDate } from '../../hooks/useDate';
import { COLORS, SPACING } from '../../constants/config';

interface ExportScreenProps {
  navigation: any;
}

interface ExportOption {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  format: 'json' | 'csv' | 'pdf' | 'xlsx';
  size: string;
  color: string;
}

export const ExportScreen: React.FC<ExportScreenProps> = ({ navigation }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'year' | 'month' | 'custom'>('month');
  const [selectedData, setSelectedData] = useState<string[]>(['transactions', 'accounts']);
  const { formatCurrency } = useCurrency();
  const { formatDate } = useDate();

  const exportOptions: ExportOption[] = [
    {
      id: 'json',
      title: 'Backup Completo (JSON)',
      description: 'Todos os dados em formato JSON para backup completo',
      icon: 'code-working',
      format: 'json',
      size: '~2.5 MB',
      color: COLORS.primary,
    },
    {
      id: 'csv',
      title: 'Planilha (CSV)',
      description: 'Dados em formato CSV para Excel e Google Sheets',
      icon: 'grid',
      format: 'csv',
      size: '~850 KB',
      color: COLORS.success,
    },
    {
      id: 'pdf',
      title: 'Relatório (PDF)',
      description: 'Relatório formatado em PDF para impressão',
      icon: 'document-text',
      format: 'pdf',
      size: '~1.2 MB',
      color: COLORS.error,
    },
    {
      id: 'xlsx',
      title: 'Excel (XLSX)',
      description: 'Planilha Excel com múltiplas abas organizadas',
      icon: 'stats-chart',
      format: 'xlsx',
      size: '~1.8 MB',
      color: COLORS.warning,
    },
  ];

  const periods = [
    { value: 'month', label: 'Este Mês', description: 'Dezembro 2024' },
    { value: 'year', label: 'Este Ano', description: '2024' },
    { value: 'all', label: 'Todos os Dados', description: 'Desde o início' },
    { value: 'custom', label: 'Período Personalizado', description: 'Escolher datas' },
  ];

  const dataTypes = [
    { id: 'transactions', label: 'Transações', icon: 'swap-horizontal' as keyof typeof Ionicons.glyphMap, count: 156 },
    { id: 'accounts', label: 'Contas', icon: 'wallet' as keyof typeof Ionicons.glyphMap, count: 3 },
    { id: 'categories', label: 'Categorias', icon: 'pricetags' as keyof typeof Ionicons.glyphMap, count: 12 },
    { id: 'transfers', label: 'Transferências', icon: 'arrow-forward' as keyof typeof Ionicons.glyphMap, count: 8 },
    { id: 'savings', label: 'Metas de Poupança', icon: 'flag' as keyof typeof Ionicons.glyphMap, count: 4 },
    { id: 'loans', label: 'Empréstimos', icon: 'cash' as keyof typeof Ionicons.glyphMap, count: 2 },
    { id: 'debts', label: 'Dívidas', icon: 'card' as keyof typeof Ionicons.glyphMap, count: 1 },
    { id: 'recurring', label: 'Transações Recorrentes', icon: 'repeat' as keyof typeof Ionicons.glyphMap, count: 5 },
  ];

  const handleExport = async (option: ExportOption) => {
    if (selectedData.length === 0) {
      Alert.alert('Erro', 'Selecione pelo menos um tipo de dado para exportar');
      return;
    }

    setLoading(option.id);
    try {
      // Simular processo de exportação
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Simular dados exportados
      const exportData = {
        format: option.format,
        period: selectedPeriod,
        dataTypes: selectedData,
        generatedAt: new Date().toISOString(),
        totalRecords: getTotalRecords(),
      };

      // Simular compartilhamento
      await Share.share({
        message: `Exportação do FinanceControl\nFormato: ${option.format.toUpperCase()}\nPeríodo: ${getPeriodLabel()}\nDados: ${selectedData.length} tipos\nGerado em: ${formatDate(new Date().toISOString())}`,
        title: 'Exportação FinanceControl',
      });

      Alert.alert(
        'Exportação Concluída',
        `Seus dados foram exportados com sucesso em formato ${option.format.toUpperCase()}!`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao exportar dados. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const toggleDataType = (dataTypeId: string) => {
    setSelectedData(prev => 
      prev.includes(dataTypeId)
        ? prev.filter(id => id !== dataTypeId)
        : [...prev, dataTypeId]
    );
  };

  const selectAllData = () => {
    setSelectedData(dataTypes.map(dt => dt.id));
  };

  const clearAllData = () => {
    setSelectedData([]);
  };

  const getTotalRecords = () => {
    return selectedData.reduce((total, dataTypeId) => {
      const dataType = dataTypes.find(dt => dt.id === dataTypeId);
      return total + (dataType?.count || 0);
    }, 0);
  };

  const getPeriodLabel = () => {
    const period = periods.find(p => p.value === selectedPeriod);
    return period?.label || 'Período selecionado';
  };

  const getEstimatedSize = (format: string) => {
    const baseSize = getTotalRecords() * 0.5; // KB por registro
    const multiplier = format === 'json' ? 2 : format === 'pdf' ? 3 : 1;
    return `~${Math.round(baseSize * multiplier)} KB`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Exportar Dados</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Registros"
            value={getTotalRecords()}
            icon="documents"
            color={COLORS.primary}
          />
          <StatCard
            title="Tipos"
            value={selectedData.length}
            icon="layers"
            color={COLORS.secondary}
          />
          <StatCard
            title="Período"
            value={getPeriodLabel()}
            icon="calendar"
            color={COLORS.info}
          />
        </View>

        {/* Seleção de Período */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Período dos Dados</Text>
          
          <View style={styles.periodsContainer}>
            {periods.map((period) => (
              <TouchableOpacity
                key={period.value}
                style={[
                  styles.periodButton,
                  selectedPeriod === period.value && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period.value as any)}
              >
                <Text style={[
                  styles.periodLabel,
                  selectedPeriod === period.value && styles.periodLabelActive,
                ]}>
                  {period.label}
                </Text>
                <Text style={[
                  styles.periodDescription,
                  selectedPeriod === period.value && styles.periodDescriptionActive,
                ]}>
                  {period.description}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Seleção de Dados */}
        <Card style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tipos de Dados</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity onPress={selectAllData} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={clearAllData} style={styles.actionButton}>
                <Text style={styles.actionButtonText}>Limpar</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.dataTypesContainer}>
            {dataTypes.map((dataType) => {
              const isSelected = selectedData.includes(dataType.id);
              return (
                <TouchableOpacity
                  key={dataType.id}
                  style={[
                    styles.dataTypeButton,
                    isSelected && styles.dataTypeButtonActive,
                  ]}
                  onPress={() => toggleDataType(dataType.id)}
                >
                  <View style={styles.dataTypeContent}>
                    <Ionicons
                      name={dataType.icon}
                      size={20}
                      color={isSelected ? COLORS.primary : COLORS.textSecondary}
                    />
                    <View style={styles.dataTypeInfo}>
                      <Text style={[
                        styles.dataTypeLabel,
                        isSelected && styles.dataTypeLabelActive,
                      ]}>
                        {dataType.label}
                      </Text>
                      <Text style={styles.dataTypeCount}>
                        {dataType.count} registros
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Opções de Exportação */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Formatos de Exportação</Text>
          
          <View style={styles.exportOptionsContainer}>
            {exportOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.exportOption}
                onPress={() => handleExport(option)}
                disabled={loading !== null}
              >
                <View style={[styles.exportIcon, { backgroundColor: `${option.color}20` }]}>
                  <Ionicons name={option.icon} size={24} color={option.color} />
                </View>
                
                <View style={styles.exportInfo}>
                  <Text style={styles.exportTitle}>{option.title}</Text>
                  <Text style={styles.exportDescription}>{option.description}</Text>
                  <Text style={styles.exportSize}>
                    Tamanho estimado: {getEstimatedSize(option.format)}
                  </Text>
                </View>

                <View style={styles.exportAction}>
                  {loading === option.id ? (
                    <View style={styles.loadingContainer}>
                      <Text style={styles.loadingText}>Exportando...</Text>
                    </View>
                  ) : (
                    <Ionicons name="download" size={20} color={COLORS.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Informações Importantes */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoTitle}>Informações Importantes</Text>
          </View>
          
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • Os dados exportados incluem apenas informações não sensíveis
            </Text>
            <Text style={styles.infoItem}>
              • Senhas e tokens de acesso não são incluídos na exportação
            </Text>
            <Text style={styles.infoItem}>
              • Recomendamos fazer backup regularmente
            </Text>
            <Text style={styles.infoItem}>
              • Arquivos grandes podem demorar mais para processar
            </Text>
            <Text style={styles.infoItem}>
              • Use JSON para backup completo e CSV para análise em planilhas
            </Text>
          </View>
        </Card>

        {/* Histórico de Exportações */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Exportações Recentes</Text>
          
          <View style={styles.historyContainer}>
            <View style={styles.historyItem}>
              <Ionicons name="document-text" size={16} color={COLORS.success} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>Relatório PDF - Novembro</Text>
                <Text style={styles.historyDate}>15 de dezembro, 14:30</Text>
              </View>
              <TouchableOpacity style={styles.historyAction}>
                <Ionicons name="share" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.historyItem}>
              <Ionicons name="grid" size={16} color={COLORS.primary} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>Backup CSV - Completo</Text>
                <Text style={styles.historyDate}>10 de dezembro, 09:15</Text>
              </View>
              <TouchableOpacity style={styles.historyAction}>
                <Ionicons name="share" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.historyItem}>
              <Ionicons name="code-working" size={16} color={COLORS.warning} />
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle}>Backup JSON - Completo</Text>
                <Text style={styles.historyDate}>1 de dezembro, 18:45</Text>
              </View>
              <TouchableOpacity style={styles.historyAction}>
                <Ionicons name="share" size={16} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  statsContainer: {
    flexDirection: 'row',
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  sectionCard: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  actionButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  actionButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  periodsContainer: {
    gap: SPACING.sm,
  },
  periodButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  periodButtonActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  periodLabelActive: {
    color: COLORS.primary,
  },
  periodDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  periodDescriptionActive: {
    color: COLORS.primary,
  },
  dataTypesContainer: {
    gap: SPACING.sm,
  },
  dataTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dataTypeButtonActive: {
    backgroundColor: `${COLORS.primary}10`,
    borderColor: COLORS.primary,
  },
  dataTypeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dataTypeInfo: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  dataTypeLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  dataTypeLabelActive: {
    color: COLORS.primary,
  },
  dataTypeCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  exportOptionsContainer: {
    gap: SPACING.md,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  exportIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  exportInfo: {
    flex: 1,
  },
  exportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  exportDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  exportSize: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  exportAction: {
    marginLeft: SPACING.sm,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  infoCard: {
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.info}05`,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  infoList: {
    gap: SPACING.sm,
  },
  infoItem: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  historyContainer: {
    gap: SPACING.sm,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  historyInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  historyAction: {
    padding: SPACING.xs,
  },
});
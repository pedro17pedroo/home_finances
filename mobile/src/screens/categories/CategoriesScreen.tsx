import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatCard } from '../../components/ui/StatCard';
import { COLORS, SPACING } from '../../constants/config';

interface Category {
  id: number;
  name: string;
  type: 'receita' | 'despesa';
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  isDefault: boolean;
  transactionCount: number;
  totalAmount: string;
  userId?: number;
}

interface CategoriesScreenProps {
  navigation: any;
}

export const CategoriesScreen: React.FC<CategoriesScreenProps> = ({ navigation }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'receita' | 'despesa'>('all');

  const fetchCategories = async () => {
    try {
      // Simular dados de categorias
      const mockCategories: Category[] = [
        // Categorias de Receita
        {
          id: 1,
          name: 'Salário',
          type: 'receita',
          icon: 'briefcase',
          color: COLORS.success,
          isDefault: true,
          transactionCount: 12,
          totalAmount: '4200000.00',
        },
        {
          id: 2,
          name: 'Freelance',
          type: 'receita',
          icon: 'laptop',
          color: '#10B981',
          isDefault: false,
          transactionCount: 8,
          totalAmount: '640000.00',
          userId: 1,
        },
        {
          id: 3,
          name: 'Investimentos',
          type: 'receita',
          icon: 'trending-up',
          color: '#059669',
          isDefault: false,
          transactionCount: 5,
          totalAmount: '125000.00',
          userId: 1,
        },
        {
          id: 4,
          name: 'Vendas',
          type: 'receita',
          icon: 'storefront',
          color: '#047857',
          isDefault: false,
          transactionCount: 3,
          totalAmount: '85000.00',
          userId: 1,
        },
        
        // Categorias de Despesa
        {
          id: 5,
          name: 'Moradia',
          type: 'despesa',
          icon: 'home',
          color: COLORS.error,
          isDefault: true,
          transactionCount: 12,
          totalAmount: '1440000.00',
        },
        {
          id: 6,
          name: 'Alimentação',
          type: 'despesa',
          icon: 'restaurant',
          color: '#EF4444',
          isDefault: true,
          transactionCount: 45,
          totalAmount: '675000.00',
        },
        {
          id: 7,
          name: 'Transporte',
          type: 'despesa',
          icon: 'car',
          color: '#DC2626',
          isDefault: true,
          transactionCount: 28,
          totalAmount: '420000.00',
        },
        {
          id: 8,
          name: 'Saúde',
          type: 'despesa',
          icon: 'medical',
          color: '#B91C1C',
          isDefault: true,
          transactionCount: 6,
          totalAmount: '180000.00',
        },
        {
          id: 9,
          name: 'Educação',
          type: 'despesa',
          icon: 'school',
          color: '#991B1B',
          isDefault: true,
          transactionCount: 4,
          totalAmount: '120000.00',
        },
        {
          id: 10,
          name: 'Lazer',
          type: 'despesa',
          icon: 'game-controller',
          color: '#7C2D12',
          isDefault: false,
          transactionCount: 15,
          totalAmount: '225000.00',
          userId: 1,
        },
        {
          id: 11,
          name: 'Utilidades',
          type: 'despesa',
          icon: 'flash',
          color: '#92400E',
          isDefault: true,
          transactionCount: 18,
          totalAmount: '270000.00',
        },
        {
          id: 12,
          name: 'Roupas',
          type: 'despesa',
          icon: 'shirt',
          color: '#78350F',
          isDefault: false,
          transactionCount: 7,
          totalAmount: '105000.00',
          userId: 1,
        },
      ];
      setCategories(mockCategories);
    } catch (error) {
      console.error('Erro ao carregar categorias:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const getFilteredCategories = () => {
    if (filter === 'all') return categories;
    return categories.filter(cat => cat.type === filter);
  };

  const getIncomeCategories = () => categories.filter(cat => cat.type === 'receita');
  const getExpenseCategories = () => categories.filter(cat => cat.type === 'despesa');
  const getCustomCategories = () => categories.filter(cat => !cat.isDefault);

  const getTotalTransactions = () => {
    return categories.reduce((total, cat) => total + cat.transactionCount, 0);
  };

  const getMostUsedCategory = () => {
    return categories.reduce((prev, current) => 
      prev.transactionCount > current.transactionCount ? prev : current
    );
  };

  const deleteCategory = (categoryId: number) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category?.isDefault) {
      alert('Não é possível excluir categorias padrão');
      return;
    }
    
    setCategories(prev => prev.filter(cat => cat.id !== categoryId));
  };

  const formatCurrency = (amount: string) => {
    const value = parseFloat(amount);
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const filteredCategories = getFilteredCategories();
  const mostUsed = getMostUsedCategory();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Carregando categorias...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Categorias</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddCategory')}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Estatísticas */}
        <View style={styles.statsContainer}>
          <StatCard
            title="Total"
            value={categories.length}
            icon="pricetags"
            color={COLORS.primary}
          />
          <StatCard
            title="Transações"
            value={getTotalTransactions()}
            icon="swap-horizontal"
            color={COLORS.secondary}
          />
          <StatCard
            title="Personalizadas"
            value={getCustomCategories().length}
            icon="create"
            color={COLORS.warning}
          />
        </View>

        {/* Categoria Mais Usada */}
        <Card style={styles.mostUsedCard}>
          <Text style={styles.mostUsedTitle}>Categoria Mais Usada</Text>
          <View style={styles.mostUsedContent}>
            <View style={[styles.mostUsedIcon, { backgroundColor: `${mostUsed.color}20` }]}>
              <Ionicons name={mostUsed.icon} size={24} color={mostUsed.color} />
            </View>
            <View style={styles.mostUsedInfo}>
              <Text style={styles.mostUsedName}>{mostUsed.name}</Text>
              <Text style={styles.mostUsedStats}>
                {mostUsed.transactionCount} transações • {formatCurrency(mostUsed.totalAmount)}
              </Text>
            </View>
          </View>
        </Card>

        {/* Filtros */}
        <View style={styles.filtersContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'all' && styles.filterButtonActive,
              ]}
              onPress={() => setFilter('all')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'all' && styles.filterTextActive,
                ]}
              >
                Todas ({categories.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'receita' && styles.filterButtonActive,
                filter === 'receita' && { backgroundColor: COLORS.success, borderColor: COLORS.success }
              ]}
              onPress={() => setFilter('receita')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'receita' && styles.filterTextActive,
                ]}
              >
                Receitas ({getIncomeCategories().length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterButton,
                filter === 'despesa' && styles.filterButtonActive,
                filter === 'despesa' && { backgroundColor: COLORS.error, borderColor: COLORS.error }
              ]}
              onPress={() => setFilter('despesa')}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === 'despesa' && styles.filterTextActive,
                ]}
              >
                Despesas ({getExpenseCategories().length})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Ação Rápida */}
        <View style={styles.quickActionContainer}>
          <Button
            title="Nova Categoria"
            onPress={() => navigation.navigate('AddCategory')}
            variant="primary"
            fullWidth
            size="large"
          />
        </View>

        {/* Lista de Categorias */}
        <View style={styles.categoriesList}>
          {filteredCategories.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Ionicons name="pricetags" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'Nenhuma categoria' : 
                 filter === 'receita' ? 'Nenhuma categoria de receita' :
                 'Nenhuma categoria de despesa'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all' 
                  ? 'Crie categorias para organizar suas transações'
                  : 'Altere o filtro para ver outras categorias'
                }
              </Text>
            </Card>
          ) : (
            <View style={styles.categoriesGrid}>
              {filteredCategories.map((category) => (
                <Card key={category.id} style={styles.categoryCard}>
                  <View style={styles.categoryHeader}>
                    <View style={[
                      styles.categoryIcon,
                      { backgroundColor: `${category.color}20` }
                    ]}>
                      <Ionicons
                        name={category.icon}
                        size={24}
                        color={category.color}
                      />
                    </View>
                    
                    <View style={styles.categoryInfo}>
                      <View style={styles.categoryTitleRow}>
                        <Text style={styles.categoryName}>{category.name}</Text>
                        {category.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Padrão</Text>
                          </View>
                        )}
                      </View>
                      
                      <Text style={[
                        styles.categoryType,
                        { color: category.type === 'receita' ? COLORS.success : COLORS.error }
                      ]}>
                        {category.type === 'receita' ? 'Receita' : 'Despesa'}
                      </Text>
                    </View>

                    {!category.isDefault && (
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => deleteCategory(category.id)}
                      >
                        <Ionicons name="trash" size={16} color={COLORS.error} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={styles.categoryStats}>
                    <View style={styles.statItem}>
                      <Ionicons name="swap-horizontal" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.statText}>
                        {category.transactionCount} transações
                      </Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Ionicons name="cash" size={14} color={COLORS.textSecondary} />
                      <Text style={styles.statText}>
                        {formatCurrency(category.totalAmount)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.categoryActions}>
                    <Button
                      title="Editar"
                      onPress={() => navigation.navigate('AddCategory', { categoryId: category.id })}
                      variant="outline"
                      size="small"
                      disabled={category.isDefault}
                    />
                    <Button
                      title="Ver Transações"
                      onPress={() => navigation.navigate('Transactions', { categoryId: category.id })}
                      variant="primary"
                      size="small"
                    />
                  </View>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Informações */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoTitle}>Sobre as Categorias</Text>
          </View>
          
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • Categorias ajudam a organizar e analisar seus gastos
            </Text>
            <Text style={styles.infoItem}>
              • Categorias padrão não podem ser excluídas
            </Text>
            <Text style={styles.infoItem}>
              • Você pode personalizar ícones e cores
            </Text>
            <Text style={styles.infoItem}>
              • Estatísticas são atualizadas automaticamente
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  scrollView: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  mostUsedCard: {
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.primary}05`,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  mostUsedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  mostUsedContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mostUsedIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  mostUsedInfo: {
    flex: 1,
  },
  mostUsedName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  mostUsedStats: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  filtersContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  filterButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    marginRight: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: 'white',
  },
  quickActionContainer: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  categoriesList: {
    paddingHorizontal: SPACING.lg,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  categoriesGrid: {
    gap: SPACING.md,
  },
  categoryCard: {
    marginBottom: SPACING.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  categoryInfo: {
    flex: 1,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: `${COLORS.info}20`,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: SPACING.xs,
  },
  defaultBadgeText: {
    fontSize: 10,
    color: COLORS.info,
    fontWeight: '500',
  },
  categoryType: {
    fontSize: 12,
    fontWeight: '500',
  },
  deleteButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  categoryStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  statText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  categoryActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
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
});
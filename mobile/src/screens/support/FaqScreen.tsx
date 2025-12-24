import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { Card } from '../../components/ui';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

interface FaqScreenProps {
  navigation?: any;
}

const categoryLabels: Record<string, string> = {
  geral: 'Geral',
  conta: 'Conta',
  pagamentos: 'Pagamentos',
  seguranca: 'Segurança',
};

const categoryIcons: Record<string, string> = {
  geral: 'help-circle',
  conta: 'person',
  pagamentos: 'card',
  seguranca: 'shield-checkmark',
};

export const FaqScreen: React.FC<FaqScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const [loading, setLoading] = useState(true);
  const [faqData, setFaqData] = useState<Record<string, FaqItem[]>>({});
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    loadFaq();
  }, []);

  const loadFaq = async () => {
    try {
      const response = await api.get('/public/faq');
      const data = response.data?.data || response.data;
      setFaqData(data.grouped || {});
    } catch (error) {
      console.error('Erro ao carregar FAQ:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = (id: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const categories = Object.keys(faqData);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Carregando...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Ajuda e FAQ</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContainer}
        >
          <TouchableOpacity
            style={[
              styles.categoryTab,
              { backgroundColor: !selectedCategory ? colors.primary : colors.surfaceSecondary }
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Ionicons 
              name="apps" 
              size={16} 
              color={!selectedCategory ? '#FFF' : colors.text} 
            />
            <Text style={[
              styles.categoryTabText,
              { color: !selectedCategory ? '#FFF' : colors.text }
            ]}>
              Todos
            </Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryTab,
                { backgroundColor: selectedCategory === cat ? colors.primary : colors.surfaceSecondary }
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Ionicons 
                name={categoryIcons[cat] as any || 'help-circle'} 
                size={16} 
                color={selectedCategory === cat ? '#FFF' : colors.text} 
              />
              <Text style={[
                styles.categoryTabText,
                { color: selectedCategory === cat ? '#FFF' : colors.text }
              ]}>
                {categoryLabels[cat] || cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* FAQ Items */}
        {(selectedCategory ? [selectedCategory] : categories).map(category => (
          <View key={category} style={styles.categorySection}>
            {!selectedCategory && (
              <View style={styles.categoryHeader}>
                <Ionicons 
                  name={categoryIcons[category] as any || 'help-circle'} 
                  size={20} 
                  color={colors.primary} 
                />
                <Text style={[styles.categoryTitle, { color: colors.text }]}>
                  {categoryLabels[category] || category}
                </Text>
              </View>
            )}
            {faqData[category]?.map(item => (
              <Card key={item.id} variant="default" padding="none" style={styles.faqCard}>
                <TouchableOpacity
                  style={styles.questionRow}
                  onPress={() => toggleItem(item.id)}
                >
                  <Text style={[styles.question, { color: colors.text }]}>
                    {item.question}
                  </Text>
                  <Ionicons
                    name={expandedItems.has(item.id) ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
                {expandedItems.has(item.id) && (
                  <View style={[styles.answerContainer, { borderTopColor: colors.border }]}>
                    <Text style={[styles.answer, { color: colors.textSecondary }]}>
                      {item.answer}
                    </Text>
                  </View>
                )}
              </Card>
            ))}
          </View>
        ))}

        {categories.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="help-circle-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Nenhuma pergunta frequente disponível
            </Text>
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  placeholder: { width: 40 },
  content: { flex: 1, paddingHorizontal: SPACING.md },
  categoriesScroll: { marginBottom: SPACING.lg },
  categoriesContainer: { gap: SPACING.sm, paddingVertical: SPACING.xs },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    gap: SPACING.xs,
  },
  categoryTabText: { fontSize: 14, fontWeight: '500' },
  categorySection: { marginBottom: SPACING.lg },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  categoryTitle: { fontSize: 16, fontWeight: '600' },
  faqCard: { marginBottom: SPACING.sm },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
  },
  question: { fontSize: 14, fontWeight: '500', flex: 1, marginRight: SPACING.sm },
  answerContainer: { padding: SPACING.md, paddingTop: 0, borderTopWidth: 1 },
  answer: { fontSize: 14, lineHeight: 22 },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { marginTop: SPACING.md, fontSize: 16 },
});

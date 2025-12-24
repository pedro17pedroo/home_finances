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
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface LegalScreenProps {
  navigation?: any;
  route?: {
    params?: {
      type: 'terms' | 'privacy';
    };
  };
}

export const LegalScreen: React.FC<LegalScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const type = route?.params?.type || 'terms';
  
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<{
    title: string;
    content: string;
    version: string;
    updatedAt: string;
  } | null>(null);

  useEffect(() => {
    loadContent();
  }, [type]);

  const loadContent = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/public/legal/${type}`);
      const data = response.data?.data || response.data;
      setContent(data);
    } catch (error) {
      console.error('Erro ao carregar conteúdo:', error);
    } finally {
      setLoading(false);
    }
  };

  const title = type === 'terms' ? 'Termos de Uso' : 'Política de Privacidade';

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
      // Headers
      if (line.startsWith('# ')) {
        return (
          <Text key={index} style={[styles.h1, { color: colors.text }]}>
            {line.substring(2)}
          </Text>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <Text key={index} style={[styles.h2, { color: colors.text }]}>
            {line.substring(3)}
          </Text>
        );
      }
      if (line.startsWith('### ')) {
        return (
          <Text key={index} style={[styles.h3, { color: colors.text }]}>
            {line.substring(4)}
          </Text>
        );
      }
      // List items
      if (line.startsWith('- ')) {
        return (
          <View key={index} style={styles.listItem}>
            <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
            <Text style={[styles.listText, { color: colors.textSecondary }]}>
              {line.substring(2)}
            </Text>
          </View>
        );
      }
      // Empty lines
      if (line.trim() === '') {
        return <View key={index} style={styles.spacer} />;
      }
      // Regular paragraphs
      return (
        <Text key={index} style={[styles.paragraph, { color: colors.textSecondary }]}>
          {line}
        </Text>
      );
    });
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {content ? (
          <>
            {renderContent(content.content)}
            
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
                Versão: {content.version}
              </Text>
              <Text style={[styles.footerText, { color: colors.textTertiary }]}>
                Última atualização: {new Date(content.updatedAt).toLocaleDateString('pt-AO')}
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={64} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Conteúdo não disponível
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
  h1: { fontSize: 24, fontWeight: '700', marginBottom: SPACING.md, marginTop: SPACING.lg },
  h2: { fontSize: 20, fontWeight: '600', marginBottom: SPACING.sm, marginTop: SPACING.lg },
  h3: { fontSize: 16, fontWeight: '600', marginBottom: SPACING.xs, marginTop: SPACING.md },
  paragraph: { fontSize: 14, lineHeight: 22, marginBottom: SPACING.sm },
  listItem: { flexDirection: 'row', marginBottom: SPACING.xs, paddingLeft: SPACING.sm },
  bullet: { fontSize: 14, marginRight: SPACING.sm },
  listText: { fontSize: 14, lineHeight: 22, flex: 1 },
  spacer: { height: SPACING.sm },
  footer: { borderTopWidth: 1, paddingTop: SPACING.md, marginTop: SPACING.lg },
  footerText: { fontSize: 12, marginBottom: SPACING.xs },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyText: { marginTop: SPACING.md, fontSize: 16 },
});

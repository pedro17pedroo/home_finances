import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { COLORS, SPACING } from '../../constants/config';
import api from '../../services/api';

interface AddCategoryScreenProps {
  navigation?: any;
  route?: {
    params?: {
      categoryId?: number;
      category?: {
        id: number;
        name: string;
        type: 'receita' | 'despesa';
        icon?: string;
        color?: string;
      };
    };
  };
}

export const AddCategoryScreen: React.FC<AddCategoryScreenProps> = ({ navigation, route }) => {
  const existingCategory = route?.params?.category;
  const isEditing = !!existingCategory;
  
  const [formData, setFormData] = useState({
    name: existingCategory?.name || '',
    type: (existingCategory?.type || 'despesa') as 'receita' | 'despesa',
    icon: (existingCategory?.icon || 'pricetag') as keyof typeof Ionicons.glyphMap,
    color: existingCategory?.color || COLORS.primary,
  });
  const [loading, setLoading] = useState(false);

  // Ícones disponíveis organizados por categoria
  const iconCategories = {
    'Geral': ['pricetag', 'bookmark', 'flag', 'star', 'heart', 'diamond'],
    'Trabalho': ['briefcase', 'laptop', 'desktop', 'business', 'construct', 'hammer'],
    'Casa': ['home', 'bed', 'tv', 'bulb', 'water', 'flame'],
    'Transporte': ['car', 'bus', 'bicycle', 'airplane', 'boat', 'train'],
    'Comida': ['restaurant', 'fast-food', 'pizza', 'wine', 'cafe', 'ice-cream'],
    'Saúde': ['medical', 'fitness', 'heart-circle', 'bandage', 'thermometer', 'pulse'],
    'Educação': ['school', 'library', 'book', 'pencil', 'calculator', 'trophy'],
    'Lazer': ['game-controller', 'musical-notes', 'camera', 'film', 'basketball', 'football'],
    'Compras': ['bag', 'shirt', 'watch', 'phone-portrait', 'laptop', 'gift'],
    'Finanças': ['card', 'cash', 'wallet', 'trending-up', 'trending-down', 'analytics'],
  };

  // Cores disponíveis (sem duplicatas)
  const availableColors = [
    COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.error,
    '#8B5CF6', '#EC4899', '#F97316', '#14B8A6', '#3B82F6',
    '#6366F1', '#8B5A2B', '#059669', '#DC2626', '#7C3AED',
    '#BE185D', '#D97706', '#047857', '#B91C1C', '#5B21B6',
  ];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Erro', 'Nome da categoria é obrigatório');
      return false;
    }

    if (formData.name.trim().length < 2) {
      Alert.alert('Erro', 'Nome deve ter pelo menos 2 caracteres');
      return false;
    }

    if (formData.name.trim().length > 30) {
      Alert.alert('Erro', 'Nome deve ter no máximo 30 caracteres');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      if (isEditing && existingCategory) {
        await api.put(`/categories/${existingCategory.id}`, {
          name: formData.name.trim(),
          type: formData.type,
          icon: formData.icon,
          color: formData.color,
        });
      } else {
        await api.post('/categories', {
          name: formData.name.trim(),
          type: formData.type,
          icon: formData.icon,
          color: formData.color,
        });
      }
      
      Alert.alert(
        'Sucesso',
        `Categoria ${isEditing ? 'atualizada' : 'criada'} com sucesso!`,
        [
          {
            text: 'OK',
            onPress: () => navigation?.goBack(),
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || `Erro ao ${isEditing ? 'atualizar' : 'criar'} categoria`;
      Alert.alert('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewIcon = () => {
    return (
      <View style={[styles.previewIcon, { backgroundColor: `${formData.color}20` }]}>
        <Ionicons name={formData.icon} size={32} color={formData.color} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditing ? 'Editar Categoria' : 'Nova Categoria'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Preview */}
        <Card style={styles.previewCard}>
          <Text style={styles.previewTitle}>Preview</Text>
          <View style={styles.previewContent}>
            {getPreviewIcon()}
            <View style={styles.previewInfo}>
              <Text style={styles.previewName}>
                {formData.name || 'Nome da Categoria'}
              </Text>
              <Text style={[
                styles.previewType,
                { color: formData.type === 'receita' ? COLORS.success : COLORS.error }
              ]}>
                {formData.type === 'receita' ? 'Receita' : 'Despesa'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Dados Básicos */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Dados Básicos</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nome da Categoria *</Text>
            <Input
              placeholder="Ex: Alimentação, Transporte, Salário"
              value={formData.name}
              onChangeText={(value) => handleInputChange('name', value)}
            />
            <Text style={styles.inputHint}>
              {formData.name.length}/30 caracteres
            </Text>
          </View>

          {/* Tipo de Categoria */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tipo *</Text>
            <View style={styles.typeContainer}>
              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'receita' && styles.typeButtonActive,
                  formData.type === 'receita' && { backgroundColor: `${COLORS.success}20`, borderColor: COLORS.success }
                ]}
                onPress={() => handleInputChange('type', 'receita')}
              >
                <Ionicons 
                  name="trending-up" 
                  size={20} 
                  color={formData.type === 'receita' ? COLORS.success : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.typeText,
                  formData.type === 'receita' && { color: COLORS.success }
                ]}>
                  Receita
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeButton,
                  formData.type === 'despesa' && styles.typeButtonActive,
                  formData.type === 'despesa' && { backgroundColor: `${COLORS.error}20`, borderColor: COLORS.error }
                ]}
                onPress={() => handleInputChange('type', 'despesa')}
              >
                <Ionicons 
                  name="trending-down" 
                  size={20} 
                  color={formData.type === 'despesa' ? COLORS.error : COLORS.textSecondary} 
                />
                <Text style={[
                  styles.typeText,
                  formData.type === 'despesa' && { color: COLORS.error }
                ]}>
                  Despesa
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Card>

        {/* Seleção de Ícone */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Ícone</Text>
          
          {Object.entries(iconCategories).map(([categoryName, icons]) => (
            <View key={categoryName} style={styles.iconCategory}>
              <Text style={styles.iconCategoryTitle}>{categoryName}</Text>
              <View style={styles.iconsGrid}>
                {icons.map((iconName) => (
                  <TouchableOpacity
                    key={iconName}
                    style={[
                      styles.iconButton,
                      formData.icon === iconName && styles.iconButtonActive,
                      formData.icon === iconName && { backgroundColor: `${formData.color}20`, borderColor: formData.color }
                    ]}
                    onPress={() => handleInputChange('icon', iconName)}
                  >
                    <Ionicons
                      name={iconName as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={formData.icon === iconName ? formData.color : COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </Card>

        {/* Seleção de Cor */}
        <Card style={styles.formCard}>
          <Text style={styles.formTitle}>Cor</Text>
          
          <View style={styles.colorsGrid}>
            {availableColors.map((color, index) => (
              <TouchableOpacity
                key={`color-${index}`}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  formData.color === color && styles.colorButtonActive,
                ]}
                onPress={() => handleInputChange('color', color)}
              >
                {formData.color === color && (
                  <Ionicons name="checkmark" size={16} color="white" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Informações */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoTitle}>Dicas para Categorias</Text>
          </View>
          
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • Use nomes claros e específicos
            </Text>
            <Text style={styles.infoItem}>
              • Escolha ícones que representem bem a categoria
            </Text>
            <Text style={styles.infoItem}>
              • Cores ajudam na identificação rápida
            </Text>
            <Text style={styles.infoItem}>
              • Evite criar muitas categorias similares
            </Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title="Cancelar"
            onPress={() => navigation.goBack()}
            variant="outline"
          />
          <Button
            title={loading ? (isEditing ? "Atualizando..." : "Criando...") : (isEditing ? "Atualizar" : "Criar Categoria")}
            onPress={handleSubmit}
            variant="primary"
            loading={loading}
            disabled={loading}
          />
        </View>
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
  previewCard: {
    marginBottom: SPACING.lg,
    backgroundColor: `${COLORS.primary}05`,
    borderColor: COLORS.primary,
    borderWidth: 1,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  previewContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  previewInfo: {
    flex: 1,
  },
  previewName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  previewType: {
    fontSize: 14,
    fontWeight: '500',
  },
  formCard: {
    marginBottom: SPACING.lg,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputHint: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  typeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  iconCategory: {
    marginBottom: SPACING.lg,
  },
  iconCategoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  iconsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    borderWidth: 2,
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorButtonActive: {
    borderColor: COLORS.text,
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
  buttonContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
});
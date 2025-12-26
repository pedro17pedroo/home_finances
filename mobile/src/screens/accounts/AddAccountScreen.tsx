import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Card, Select } from '../../components/ui';
import { Account } from '../../types';
import { SPACING, APP_CONFIG } from '../../constants/config';
import api from '../../services/api';

interface AddAccountScreenProps {
  navigation?: any;
  route?: {
    params?: {
      account?: Account;
    };
  };
}

interface Bank {
  id: number;
  code: string;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}

const ACCOUNT_TYPES = [
  { value: 'corrente', label: 'Conta Corrente' },
  { value: 'poupanca', label: 'Poupança' },
  { value: 'investimento', label: 'Investimento' },
  { value: 'carteira', label: 'Carteira' },
  { value: 'outro', label: 'Outro' },
];

const ACCOUNT_COLORS = [
  '#2563EB', '#7C3AED', '#059669', '#DC2626', '#D97706',
  '#0891B2', '#DB2777', '#4F46E5', '#65A30D', '#0D9488',
];

export const AddAccountScreen: React.FC<AddAccountScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const editAccount = route?.params?.account;
  const isEditing = !!editAccount;

  const [name, setName] = useState(editAccount?.name || '');
  const [type, setType] = useState(editAccount?.type || 'corrente');
  const [bankId, setBankId] = useState<string>(editAccount?.bankId?.toString() || '');
  const [balance, setBalance] = useState(editAccount?.balance || '0');
  const [color, setColor] = useState(editAccount?.color || ACCOUNT_COLORS[0]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);

  // Carregar lista de bancos
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        // Usar endpoint público (sem autenticação)
        // Remove /api do final pois já está incluído no APP_CONFIG.API_BASE_URL
        const baseUrl = APP_CONFIG.API_BASE_URL.replace(/\/api$/, '');
        const response = await fetch(`${baseUrl}/api/public/banks`);
        const data = await response.json();
        if (data.status === 'success') {
          setBanks(data.data.banks);
        }
      } catch (error) {
        console.error('Erro ao carregar bancos:', error);
      } finally {
        setLoadingBanks(false);
      }
    };
    fetchBanks();
  }, []);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!type) {
      newErrors.type = 'Tipo é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        type,
        bankId: bankId ? parseInt(bankId) : undefined,
        balance: parseFloat(balance) || 0,
        color,
      };

      if (isEditing) {
        await api.put(`/accounts/${editAccount.id}`, data);
        showSuccess('Conta atualizada com sucesso!');
      } else {
        await api.post('/accounts', data);
        showSuccess('Conta criada com sucesso!');
      }
      
      navigation?.goBack();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao salvar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {isEditing ? 'Editar Conta' : 'Nova Conta'}
          </Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Card variant="default" padding="lg">
            <Input
              label="Nome da Conta"
              placeholder="Ex: Conta Corrente BAI"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              leftIcon="wallet-outline"
              error={errors.name}
            />

            <Select
              label="Tipo de Conta"
              value={type}
              onValueChange={(value) => {
                setType(value as typeof type);
                if (errors.type) setErrors({ ...errors, type: '' });
              }}
              options={ACCOUNT_TYPES}
              error={errors.type}
            />

            {loadingBanks ? (
              <View style={styles.loadingBanks}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  A carregar bancos...
                </Text>
              </View>
            ) : (
              <Select
                label="Banco (opcional)"
                value={bankId}
                onValueChange={setBankId}
                options={[
                  { value: '', label: 'Selecione um banco' },
                  ...banks.map(b => ({
                    value: b.id.toString(),
                    label: b.shortName || b.name,
                  }))
                ]}
                placeholder="Selecione um banco"
              />
            )}

            <Input
              label="Saldo Inicial"
              placeholder="0.00"
              value={balance}
              onChangeText={setBalance}
              keyboardType="decimal-pad"
              leftIcon="cash-outline"
            />

            {/* Color Picker */}
            <View style={styles.colorSection}>
              <Text style={[styles.colorLabel, { color: colors.text }]}>Cor</Text>
              <View style={styles.colorGrid}>
                {ACCOUNT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorOption,
                      { backgroundColor: c },
                      color === c && styles.colorSelected,
                    ]}
                    onPress={() => setColor(c)}
                  >
                    {color === c && (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <Button
              title={isEditing ? 'Salvar Alterações' : 'Criar Conta'}
              onPress={handleSave}
              loading={loading}
              fullWidth
              size="lg"
              icon={isEditing ? 'checkmark-circle-outline' : 'add-circle-outline'}
              style={{ marginTop: SPACING.md }}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  colorSection: {
    marginTop: SPACING.md,
  },
  colorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingBanks: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  loadingText: {
    fontSize: 14,
  },
});

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
import { accountTypesService, AccountType } from '../../services/account-types.service';

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
  const [accountTypes, setAccountTypes] = useState<AccountType[]>([]);
  const [loadingAccountTypes, setLoadingAccountTypes] = useState(true);

  // Carregar tipos de conta
  useEffect(() => {
    const fetchAccountTypes = async () => {
      try {
        const types = await accountTypesService.getAll();
        console.log('Account types loaded:', types);
        setAccountTypes(types);
      } catch (error) {
        console.error('Erro ao carregar tipos de conta:', error);
        showError('Erro ao carregar tipos de conta');
        // Fallback para tipos padrão
        setAccountTypes([
          { id: 1, code: 'corrente', name: 'Conta Corrente', description: null, icon: null, color: null, isActive: true, displayOrder: 1, createdAt: '', updatedAt: '' },
          { id: 2, code: 'poupanca', name: 'Poupança', description: null, icon: null, color: null, isActive: true, displayOrder: 2, createdAt: '', updatedAt: '' },
          { id: 3, code: 'investimento', name: 'Investimento', description: null, icon: null, color: null, isActive: true, displayOrder: 3, createdAt: '', updatedAt: '' },
          { id: 4, code: 'carteira', name: 'Carteira', description: null, icon: null, color: null, isActive: true, displayOrder: 4, createdAt: '', updatedAt: '' },
          { id: 5, code: 'outro', name: 'Outro', description: null, icon: null, color: null, isActive: true, displayOrder: 5, createdAt: '', updatedAt: '' },
        ]);
      } finally {
        setLoadingAccountTypes(false);
      }
    };
    fetchAccountTypes();
  }, []);

  // Carregar lista de bancos
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        // Usar o cliente api configurado para o endpoint público
        const response = await api.get('/public/banks');
        const data = response.data;
        
        console.log('Banks response:', data);
        
        // Backend retorna { status: 'success', data: { banks: [...] } }
        if (data.status === 'success' && data.data?.banks) {
          setBanks(data.data.banks);
        } else if (data.banks) {
          // Fallback para formato direto
          setBanks(data.banks);
        } else if (Array.isArray(data)) {
          // Fallback para array direto
          setBanks(data);
        }
      } catch (error) {
        console.error('Erro ao carregar bancos:', error);
        showError('Erro ao carregar bancos');
        // Tentar endpoint alternativo sem autenticação
        try {
          const baseUrl = APP_CONFIG.API_BASE_URL.replace(/\/api$/, '');
          const response = await fetch(`${baseUrl}/api/public/banks`);
          const data = await response.json();
          if (data.status === 'success' && data.data?.banks) {
            setBanks(data.data.banks);
          }
        } catch (fallbackError) {
          console.error('Erro no fallback de bancos:', fallbackError);
        }
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

            {loadingBanks ? (
              <View style={styles.loadingBanks}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  A carregar bancos...
                </Text>
              </View>
            ) : (
              <Select
                label="Banco"
                value={bankId}
                onValueChange={(value) => setBankId(String(value))}
                options={[
                  { value: '', label: 'Selecione um banco' },
                  ...banks.map(b => ({
                    value: b.id.toString(),
                    label: b.name,
                  }))
                ]}
                placeholder="Selecione um banco"
              />
            )}

            {loadingAccountTypes ? (
              <View style={styles.loadingBanks}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  A carregar tipos de conta...
                </Text>
              </View>
            ) : (
              <Select
                label="Tipo de Conta"
                value={type}
                onValueChange={(value) => {
                  setType(value as typeof type);
                  if (errors.type) setErrors({ ...errors, type: '' });
                }}
                options={accountTypes.map(t => ({ value: t.code, label: t.name }))}
                error={errors.type}
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

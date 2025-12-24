import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Input, Card, Select } from '../../components/ui';
import { SavingsGoal, Account } from '../../types';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface AddSavingsGoalScreenProps {
  navigation?: any;
  route?: {
    params?: {
      goal?: SavingsGoal;
    };
  };
}

export const AddSavingsGoalScreen: React.FC<AddSavingsGoalScreenProps> = ({ navigation, route }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const editGoal = route?.params?.goal;
  const isEditing = !!editGoal;

  const [name, setName] = useState(editGoal?.name || '');
  const [targetAmount, setTargetAmount] = useState(editGoal?.targetAmount || '');
  const [currentAmount, setCurrentAmount] = useState(
    editGoal?.accountBalance || editGoal?.currentAmount || '0'
  );
  const [targetDate, setTargetDate] = useState(
    editGoal?.targetDate || editGoal?.deadline || ''
  );
  const [description, setDescription] = useState(editGoal?.description || '');
  const [accountId, setAccountId] = useState<number | undefined>(editGoal?.accountId);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/accounts');
      const data = response.data?.data || response.data || [];
      setAccounts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!targetAmount || parseFloat(targetAmount) <= 0) {
      newErrors.targetAmount = 'Valor da meta é obrigatório';
    }

    if (!accountId) {
      newErrors.accountId = 'Selecione uma conta';
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
        accountId: accountId,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0,
        targetDate: targetDate || undefined,
        description: description || undefined,
      };

      if (isEditing) {
        await api.put(`/savings-goals/${editGoal.id}`, data);
        showSuccess('Meta atualizada com sucesso!');
      } else {
        await api.post('/savings-goals', data);
        showSuccess('Meta criada com sucesso!');
      }
      
      navigation?.goBack();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao salvar meta');
    } finally {
      setLoading(false);
    }
  };

  const accountOptions = accounts.map(acc => ({ 
    value: acc.id, 
    label: `${acc.name}${acc.bank ? ` - ${acc.bank}` : ''} (${acc.type})` 
  }));

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
            {isEditing ? 'Editar Meta' : 'Nova Meta'}
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
              label="Nome da Meta"
              placeholder="Ex: Viagem para Europa"
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              leftIcon="flag-outline"
              error={errors.name}
            />

            <Input
              label="Valor da Meta (Kz)"
              placeholder="0.00"
              value={targetAmount}
              onChangeText={(text) => {
                setTargetAmount(text);
                if (errors.targetAmount) setErrors({ ...errors, targetAmount: '' });
              }}
              keyboardType="decimal-pad"
              leftIcon="cash-outline"
              error={errors.targetAmount}
            />

            <Input
              label="Valor Atual (Kz)"
              placeholder="0.00"
              value={currentAmount}
              onChangeText={setCurrentAmount}
              keyboardType="decimal-pad"
              leftIcon="wallet-outline"
            />

            <Input
              label="Data Limite (opcional)"
              placeholder="AAAA-MM-DD"
              value={targetDate}
              onChangeText={setTargetDate}
              leftIcon="calendar-outline"
            />

            <Select
              label="Conta Vinculada *"
              value={accountId || ''}
              onValueChange={(value) => setAccountId(value ? Number(value) : undefined)}
              options={accountOptions}
              error={errors.accountId}
            />

            <Input
              label="Descrição (opcional)"
              placeholder="Ex: Viagem de férias em família"
              value={description}
              onChangeText={setDescription}
              leftIcon="document-text-outline"
              multiline
            />

            <Button
              title={isEditing ? 'Salvar Alterações' : 'Criar Meta'}
              onPress={handleSave}
              loading={loading}
              fullWidth
              size="lg"
              icon={isEditing ? 'checkmark-circle-outline' : 'add-circle-outline'}
              style={{ marginTop: SPACING.md }}
            />
          </Card>

          {/* Tips */}
          <Card variant="outlined" padding="md" style={styles.tipsCard}>
            <Text style={[styles.tipsTitle, { color: colors.text }]}>💡 Dicas</Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Defina metas realistas e alcançáveis
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Vincule uma conta para acompanhar automaticamente
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Estabeleça uma data limite para manter o foco
            </Text>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
  },
  backButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  placeholder: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxl },
  tipsCard: { marginTop: SPACING.md },
  tipsTitle: { fontSize: 14, fontWeight: '600', marginBottom: SPACING.sm },
  tipText: { fontSize: 13, marginBottom: 4 },
});

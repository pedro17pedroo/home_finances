import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { COLORS, SPACING } from '../../constants/config';

interface NotificationSettings {
  pushNotifications: boolean;
  debtReminders: boolean;
  loanReminders: boolean;
  goalAchievements: boolean;
  lowBalance: boolean;
  transactions: boolean;
  systemUpdates: boolean;
  reminderDays: number;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationSettingsScreenProps {
  navigation: any;
}

export const NotificationSettingsScreen: React.FC<NotificationSettingsScreenProps> = ({ navigation }) => {
  const [settings, setSettings] = useState<NotificationSettings>({
    pushNotifications: true,
    debtReminders: true,
    loanReminders: true,
    goalAchievements: true,
    lowBalance: true,
    transactions: false,
    systemUpdates: false,
    reminderDays: 3,
    quietHours: {
      enabled: true,
      start: '22:00',
      end: '08:00',
    },
  });

  const [loading, setLoading] = useState(false);

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateQuietHours = (key: 'enabled' | 'start' | 'end', value: any) => {
    setSettings(prev => ({
      ...prev,
      quietHours: {
        ...prev.quietHours,
        [key]: value,
      },
    }));
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Simular salvamento das configurações
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Sucesso',
        'Configurações de notificação salvas com sucesso!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Erro ao salvar configurações. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Restaurar Padrões',
      'Tem certeza que deseja restaurar as configurações padrão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: () => {
            setSettings({
              pushNotifications: true,
              debtReminders: true,
              loanReminders: true,
              goalAchievements: true,
              lowBalance: true,
              transactions: false,
              systemUpdates: false,
              reminderDays: 3,
              quietHours: {
                enabled: true,
                start: '22:00',
                end: '08:00',
              },
            });
          },
        },
      ]
    );
  };

  const testNotification = () => {
    Alert.alert(
      'Notificação de Teste',
      'Esta é uma notificação de teste do FinanceControl!',
      [{ text: 'OK' }]
    );
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
        <Text style={styles.title}>Configurações</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Configurações Gerais */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Configurações Gerais</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications" size={20} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receber notificações no dispositivo
                </Text>
              </View>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(value) => updateSetting('pushNotifications', value)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings.pushNotifications ? COLORS.primary : COLORS.textSecondary}
            />
          </View>
        </Card>

        {/* Tipos de Notificação */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tipos de Notificação</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="card" size={20} color={COLORS.error} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Lembretes de Dívidas</Text>
                <Text style={styles.settingDescription}>
                  Alertas sobre vencimento de dívidas
                </Text>
              </View>
            </View>
            <Switch
              value={settings.debtReminders}
              onValueChange={(value) => updateSetting('debtReminders', value)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings.debtReminders ? COLORS.primary : COLORS.textSecondary}
              disabled={!settings.pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="cash" size={20} color={COLORS.success} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Lembretes de Empréstimos</Text>
                <Text style={styles.settingDescription}>
                  Alertas sobre vencimento de empréstimos
                </Text>
              </View>
            </View>
            <Switch
              value={settings.loanReminders}
              onValueChange={(value) => updateSetting('loanReminders', value)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings.loanReminders ? COLORS.primary : COLORS.textSecondary}
              disabled={!settings.pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="trophy" size={20} color={COLORS.warning} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Metas Atingidas</Text>
                <Text style={styles.settingDescription}>
                  Celebrar quando atingir suas metas
                </Text>
              </View>
            </View>
            <Switch
              value={settings.goalAchievements}
              onValueChange={(value) => updateSetting('goalAchievements', value)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings.goalAchievements ? COLORS.primary : COLORS.textSecondary}
              disabled={!settings.pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="wallet" size={20} color={COLORS.error} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Saldo Baixo</Text>
                <Text style={styles.settingDescription}>
                  Alertas quando o saldo estiver baixo
                </Text>
              </View>
            </View>
            <Switch
              value={settings.lowBalance}
              onValueChange={(value) => updateSetting('lowBalance', value)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings.lowBalance ? COLORS.primary : COLORS.textSecondary}
              disabled={!settings.pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="swap-horizontal" size={20} color={COLORS.primary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Transações</Text>
                <Text style={styles.settingDescription}>
                  Notificações sobre novas transações
                </Text>
              </View>
            </View>
            <Switch
              value={settings.transactions}
              onValueChange={(value) => updateSetting('transactions', value)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings.transactions ? COLORS.primary : COLORS.textSecondary}
              disabled={!settings.pushNotifications}
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="settings" size={20} color={COLORS.textSecondary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Atualizações do Sistema</Text>
                <Text style={styles.settingDescription}>
                  Informações sobre atualizações e manutenção
                </Text>
              </View>
            </View>
            <Switch
              value={settings.systemUpdates}
              onValueChange={(value) => updateSetting('systemUpdates', value)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings.systemUpdates ? COLORS.primary : COLORS.textSecondary}
              disabled={!settings.pushNotifications}
            />
          </View>
        </Card>

        {/* Configurações de Tempo */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Configurações de Tempo</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="time" size={20} color={COLORS.warning} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Antecedência dos Lembretes</Text>
                <Text style={styles.settingDescription}>
                  Quantos dias antes do vencimento notificar
                </Text>
              </View>
            </View>
            <View style={styles.reminderDaysContainer}>
              {[1, 3, 7, 15].map((days) => (
                <TouchableOpacity
                  key={days}
                  style={[
                    styles.reminderDayButton,
                    settings.reminderDays === days && styles.reminderDayButtonActive,
                  ]}
                  onPress={() => updateSetting('reminderDays', days)}
                >
                  <Text
                    style={[
                      styles.reminderDayText,
                      settings.reminderDays === days && styles.reminderDayTextActive,
                    ]}
                  >
                    {days}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="moon" size={20} color={COLORS.textSecondary} />
              <View style={styles.settingText}>
                <Text style={styles.settingLabel}>Horário Silencioso</Text>
                <Text style={styles.settingDescription}>
                  Não receber notificações durante este período
                </Text>
              </View>
            </View>
            <Switch
              value={settings.quietHours.enabled}
              onValueChange={(value) => updateQuietHours('enabled', value)}
              trackColor={{ false: COLORS.border, true: `${COLORS.primary}50` }}
              thumbColor={settings.quietHours.enabled ? COLORS.primary : COLORS.textSecondary}
              disabled={!settings.pushNotifications}
            />
          </View>

          {settings.quietHours.enabled && (
            <View style={styles.quietHoursContainer}>
              <Text style={styles.quietHoursLabel}>
                Das {settings.quietHours.start} às {settings.quietHours.end}
              </Text>
              <Text style={styles.quietHoursDescription}>
                Toque para alterar os horários
              </Text>
            </View>
          )}
        </Card>

        {/* Ações */}
        <Card style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Ações</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={testNotification}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
            <Text style={styles.actionButtonText}>Testar Notificação</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={resetToDefaults}>
            <Ionicons name="refresh" size={20} color={COLORS.warning} />
            <Text style={styles.actionButtonText}>Restaurar Padrões</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </Card>

        {/* Informações */}
        <Card style={styles.infoCard}>
          <View style={styles.infoHeader}>
            <Ionicons name="information-circle" size={20} color={COLORS.info} />
            <Text style={styles.infoTitle}>Sobre as Notificações</Text>
          </View>
          
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>
              • As notificações ajudam você a não perder prazos importantes
            </Text>
            <Text style={styles.infoItem}>
              • Você pode personalizar quais tipos de alertas receber
            </Text>
            <Text style={styles.infoItem}>
              • O horário silencioso evita interrupções durante o descanso
            </Text>
            <Text style={styles.infoItem}>
              • Todas as configurações são salvas automaticamente
            </Text>
          </View>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            title={loading ? "Salvando..." : "Salvar Configurações"}
            onPress={saveSettings}
            variant="primary"
            loading={loading}
            disabled={loading}
            fullWidth
            size="lg"
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
  sectionCard: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  reminderDaysContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  reminderDayButton: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    minWidth: 32,
    alignItems: 'center',
  },
  reminderDayButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  reminderDayText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  reminderDayTextActive: {
    color: 'white',
  },
  quietHoursContainer: {
    paddingLeft: 32,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quietHoursLabel: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  quietHoursDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionButtonText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
    marginLeft: SPACING.sm,
    flex: 1,
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
    marginBottom: SPACING.xl,
  },
});
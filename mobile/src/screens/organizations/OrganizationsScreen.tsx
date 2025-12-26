import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge, Loading, EmptyState } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';
import api from '../../services/api';

interface Organization {
  id: number;
  name: string;
  role: 'owner' | 'admin' | 'member';
  subscription: {
    planType: string;
    status: string;
  };
  memberCount: number;
  isActive: boolean;
}

interface OrganizationsScreenProps {
  navigation?: any;
}

/**
 * OrganizationsScreen - Manage user's organizations
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.5
 * - List all organizations user belongs to
 * - Show role and subscription for each
 * - Highlight active organization
 * - Create new organization
 * - Leave organization (non-owners only)
 */
export const OrganizationsScreen: React.FC<OrganizationsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { activeOrganization, switchOrganization, refreshUser } = useAuth();
  const { showSuccess, showError } = useToast();

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [switchingOrgId, setSwitchingOrgId] = useState<number | null>(null);

  // Create organization modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  // Leave organization state
  const [leavingOrgId, setLeavingOrgId] = useState<number | null>(null);

  // Load organizations
  const loadOrganizations = useCallback(async () => {
    try {
      const response = await api.get('/organizations/my');
      const data = response.data?.data?.organizations || response.data?.organizations || [];
      setOrganizations(data);
    } catch (error: any) {
      console.error('Error loading organizations:', error);
      showError('Erro ao carregar organizações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showError]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  // Handle refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadOrganizations();
  }, [loadOrganizations]);

  // Handle organization switch
  const handleSwitch = async (org: Organization) => {
    if (org.isActive) return;

    setSwitchingOrgId(org.id);
    try {
      await switchOrganization(org.id);
      showSuccess(`Organização alterada para ${org.name}`);
      loadOrganizations();
    } catch (error: any) {
      showError(error.message || 'Erro ao trocar de organização');
    } finally {
      setSwitchingOrgId(null);
    }
  };

  // Handle create organization - Requirements: 2.1, 7.3
  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) {
      showError('Digite um nome para a organização');
      return;
    }

    setCreating(true);
    try {
      await api.post('/organizations', { name: newOrgName.trim() });
      showSuccess('Organização criada com sucesso!');
      setShowCreateModal(false);
      setNewOrgName('');
      loadOrganizations();
      refreshUser();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao criar organização');
    } finally {
      setCreating(false);
    }
  };

  // Handle leave organization - Requirements: 7.5
  const handleLeaveOrganization = (org: Organization) => {
    if (org.role === 'owner') {
      Alert.alert(
        'Não é possível sair',
        'Você é o proprietário desta organização. Transfira a propriedade antes de sair.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Sair da Organização',
      `Tem certeza que deseja sair de "${org.name}"? Você perderá acesso aos dados desta organização.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => confirmLeaveOrganization(org),
        },
      ]
    );
  };

  const confirmLeaveOrganization = async (org: Organization) => {
    setLeavingOrgId(org.id);
    try {
      await api.delete(`/organizations/${org.id}/leave`);
      showSuccess(`Você saiu de "${org.name}"`);
      loadOrganizations();
      refreshUser();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao sair da organização');
    } finally {
      setLeavingOrgId(null);
    }
  };

  // Get role label in Portuguese
  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Admin';
      case 'member': return 'Membro';
      default: return role;
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string): 'primary' | 'info' | 'default' => {
    switch (role) {
      case 'owner': return 'primary';
      case 'admin': return 'info';
      default: return 'default';
    }
  };

  // Get subscription status label
  const getSubscriptionLabel = (status: string): string => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'trialing': return 'Teste';
      case 'expired': return 'Expirado';
      case 'canceled': return 'Cancelado';
      default: return status;
    }
  };

  // Get subscription badge variant
  const getSubscriptionBadgeVariant = (status: string): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active': return 'success';
      case 'trialing': return 'warning';
      case 'expired':
      case 'canceled': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return <Loading message="Carregando organizações..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation?.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Minhas Organizações</Text>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowCreateModal(true)}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {organizations.length === 0 ? (
          <EmptyState
            icon="business-outline"
            title="Nenhuma organização"
            description="Você não pertence a nenhuma organização. Crie uma nova para começar."
            actionLabel="Criar Organização"
            onAction={() => setShowCreateModal(true)}
          />
        ) : (
          <>
            {/* Active Organization Info */}
            <Card variant="default" padding="md" style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="information-circle" size={20} color={colors.info} />
                <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                  Toque em uma organização para alternar. A organização ativa é destacada.
                </Text>
              </View>
            </Card>

            {/* Organizations List */}
            {organizations.map((org) => (
              <TouchableOpacity
                key={org.id}
                activeOpacity={0.7}
                onPress={() => handleSwitch(org)}
                disabled={switchingOrgId !== null || leavingOrgId !== null}
              >
                <Card
                  variant={org.isActive ? 'default' : 'outlined'}
                  padding="md"
                  style={[
                    styles.orgCard,
                    org.isActive && { borderColor: colors.primary, borderWidth: 2 },
                  ]}
                >
                  <View style={styles.orgHeader}>
                    <View style={[
                      styles.orgIcon,
                      { backgroundColor: org.isActive ? colors.primary : colors.surfaceSecondary }
                    ]}>
                      <Ionicons
                        name="business"
                        size={24}
                        color={org.isActive ? '#FFFFFF' : colors.textSecondary}
                      />
                    </View>
                    <View style={styles.orgInfo}>
                      <View style={styles.orgNameRow}>
                        <Text
                          style={[
                            styles.orgName,
                            { color: org.isActive ? colors.primary : colors.text }
                          ]}
                          numberOfLines={1}
                        >
                          {org.name}
                        </Text>
                        {org.isActive && (
                          <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                        )}
                      </View>
                      <View style={styles.orgBadges}>
                        <Badge
                          label={getRoleLabel(org.role)}
                          variant={getRoleBadgeVariant(org.role)}
                          size="sm"
                        />
                        <Badge
                          label={org.subscription.planType?.toUpperCase() || 'BÁSICO'}
                          variant="default"
                          size="sm"
                        />
                        <Badge
                          label={getSubscriptionLabel(org.subscription.status)}
                          variant={getSubscriptionBadgeVariant(org.subscription.status)}
                          size="sm"
                        />
                      </View>
                    </View>
                  </View>

                  <View style={[styles.orgFooter, { borderTopColor: colors.border }]}>
                    <View style={styles.memberCount}>
                      <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
                      <Text style={[styles.memberCountText, { color: colors.textSecondary }]}>
                        {org.memberCount} {org.memberCount === 1 ? 'membro' : 'membros'}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.orgActions}>
                      {switchingOrgId === org.id ? (
                        <Text style={[styles.switchingText, { color: colors.primary }]}>
                          Alternando...
                        </Text>
                      ) : org.role !== 'owner' ? (
                        <TouchableOpacity
                          style={[styles.leaveButton, { borderColor: colors.error }]}
                          onPress={(e) => {
                            e.stopPropagation();
                            handleLeaveOrganization(org);
                          }}
                          disabled={leavingOrgId !== null}
                        >
                          {leavingOrgId === org.id ? (
                            <Text style={[styles.leaveButtonText, { color: colors.error }]}>
                              Saindo...
                            </Text>
                          ) : (
                            <>
                              <Ionicons name="exit-outline" size={14} color={colors.error} />
                              <Text style={[styles.leaveButtonText, { color: colors.error }]}>
                                Sair
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.ownerBadge, { backgroundColor: colors.primaryBackground }]}>
                          <Ionicons name="shield" size={14} color={colors.primary} />
                          <Text style={[styles.ownerBadgeText, { color: colors.primary }]}>
                            Proprietário
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Create Organization Modal */}
      <Modal visible={showCreateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Nova Organização
              </Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Nome da Organização
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={newOrgName}
                onChangeText={setNewOrgName}
                placeholder="Ex: Minha Empresa"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="words"
                autoFocus
              />
              <Text style={[styles.inputHint, { color: colors.textTertiary }]}>
                Você será o proprietário desta organização e poderá convidar membros.
              </Text>
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => {
                  setShowCreateModal(false);
                  setNewOrgName('');
                }}
                style={{ flex: 1, marginRight: SPACING.sm }}
              />
              <Button
                title="Criar"
                onPress={handleCreateOrganization}
                loading={creating}
                disabled={!newOrgName.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  container: {
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: SPACING.md,
  },
  infoCard: {
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 13,
    marginLeft: SPACING.sm,
    flex: 1,
    lineHeight: 18,
  },
  orgCard: {
    marginBottom: SPACING.sm,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  orgInfo: {
    flex: 1,
  },
  orgNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: SPACING.sm,
  },
  orgBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  orgFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  memberCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  memberCountText: {
    fontSize: 13,
    marginLeft: SPACING.xs,
  },
  orgActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    gap: 4,
  },
  leaveButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  ownerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  ownerBadgeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: SPACING.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    marginTop: SPACING.sm,
    lineHeight: 16,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
  },
});

export default OrganizationsScreen;

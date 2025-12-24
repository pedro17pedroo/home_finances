import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button, Card, Badge, Loading, EmptyState, Avatar } from '../../components/ui';
import { SPACING } from '../../constants/config';
import api from '../../services/api';

interface Organization {
  id: number;
  name: string;
  ownerId: number;
  planType: string;
  maxUsers: number;
}

interface OrganizationMember {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role: 'owner' | 'admin' | 'member';
}

interface TeamInvitation {
  id: number;
  email: string;
  role: 'admin' | 'member';
  token: string;
  expiresAt: string;
  status: string;
}

interface TeamScreenProps {
  navigation?: any;
}

export const TeamScreen: React.FC<TeamScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviting, setInviting] = useState(false);

  const isOwner = user?.role === 'owner' || (organization && user?.id === organization.ownerId);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [orgRes, membersRes, invitationsRes] = await Promise.all([
        api.get('/organizations').catch(() => ({ data: null })),
        api.get('/organizations/members').catch(() => ({ data: [] })),
        api.get('/organizations/invitations').catch(() => ({ data: [] })),
      ]);
      
      const orgData = orgRes.data?.data || orgRes.data;
      setOrganization(orgData);
      
      const membersData = membersRes.data?.data || membersRes.data || [];
      setMembers(Array.isArray(membersData) ? membersData : []);
      
      const invitationsData = invitationsRes.data?.data || invitationsRes.data || [];
      setInvitations(Array.isArray(invitationsData) ? invitationsData : []);
    } catch (error: any) {
      console.error('Error loading team data:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showError('Digite um email válido');
      return;
    }

    setInviting(true);
    try {
      await api.post('/organizations/invite', {
        email: inviteEmail,
        role: inviteRole,
      });
      showSuccess('Convite enviado com sucesso!');
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      loadData();
    } catch (error: any) {
      showError(error.response?.data?.message || 'Erro ao enviar convite');
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = (invitation: TeamInvitation) => {
    Alert.alert(
      'Cancelar Convite',
      `Deseja cancelar o convite para ${invitation.email}?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/organizations/invitations/${invitation.id}`);
              showSuccess('Convite cancelado');
              loadData();
            } catch (error) {
              showError('Erro ao cancelar convite');
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = (member: OrganizationMember) => {
    Alert.alert(
      'Remover Membro',
      `Deseja remover ${member.firstName} ${member.lastName} da equipe?`,
      [
        { text: 'Não', style: 'cancel' },
        {
          text: 'Sim, Remover',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/organizations/members/${member.id}`);
              showSuccess('Membro removido');
              loadData();
            } catch (error: any) {
              showError(error.response?.data?.message || 'Erro ao remover membro');
            }
          },
        },
      ]
    );
  };

  const handleUpdateRole = (member: OrganizationMember, newRole: 'admin' | 'member') => {
    const roleLabel = newRole === 'admin' ? 'Administrador' : 'Membro';
    Alert.alert(
      'Alterar Função',
      `Alterar função de ${member.firstName} para ${roleLabel}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await api.put(`/organizations/members/${member.id}/role`, { role: newRole });
              showSuccess('Função atualizada');
              loadData();
            } catch (error: any) {
              showError(error.response?.data?.message || 'Erro ao atualizar função');
            }
          },
        },
      ]
    );
  };

  const copyInviteLink = (token: string) => {
    const link = `https://app.example.com/accept-invitation?token=${token}`;
    Clipboard.setString(link);
    showSuccess('Link copiado!');
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'owner':
        return <Ionicons name="shield" size={16} color={colors.warning} />;
      case 'admin':
        return <Ionicons name="shield-checkmark" size={16} color={colors.primary} />;
      default:
        return <Ionicons name="person" size={16} color={colors.textSecondary} />;
    }
  };

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Administrador';
      default:
        return 'Membro';
    }
  };

  if (loading) {
    return <Loading message="Carregando..." />;
  }

  if (!organization) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={() => navigation?.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Equipe</Text>
          <View style={styles.placeholder} />
        </View>
        <EmptyState
          icon="people-outline"
          title="Nenhuma organização"
          description="Você não pertence a nenhuma organização"
        />
      </SafeAreaView>
    );
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Equipe</Text>
        {isOwner ? (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowInviteModal(true)}
          >
            <Ionicons name="person-add" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Organization Info */}
        <Card variant="default" padding="lg" style={styles.orgCard}>
          <View style={styles.orgHeader}>
            <Ionicons name="people" size={24} color={colors.primary} />
            <Text style={[styles.orgName, { color: colors.text }]}>{organization.name}</Text>
          </View>
          <View style={styles.orgStats}>
            <View style={styles.orgStat}>
              <Text style={[styles.orgStatValue, { color: colors.text }]}>
                {members.length}
              </Text>
              <Text style={[styles.orgStatLabel, { color: colors.textSecondary }]}>
                de {organization.maxUsers === -1 ? '∞' : organization.maxUsers} membros
              </Text>
            </View>
            <Badge
              variant={organization.planType === 'premium' ? 'info' : 'success'}
              label={`Plano ${organization.planType === 'basic' ? 'Base' : 
                     organization.planType === 'premium' ? 'Premium' : 
                     organization.planType.charAt(0).toUpperCase() + organization.planType.slice(1)}`}
            />
          </View>
        </Card>

        {/* Members */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Membros</Text>
        {members.map((member) => (
          <Card key={member.id} variant="default" padding="md" style={styles.memberCard}>
            <View style={styles.memberRow}>
              <View style={styles.memberInfo}>
                <Avatar name={`${member.firstName || ''} ${member.lastName || ''}`} size="md" />
                <View style={styles.memberDetails}>
                  <Text style={[styles.memberName, { color: colors.text }]}>
                    {member.firstName} {member.lastName}
                  </Text>
                  <Text style={[styles.memberContact, { color: colors.textSecondary }]}>
                    {member.email || member.phone}
                  </Text>
                </View>
              </View>
              <View style={styles.memberActions}>
                <View style={[styles.roleTag, { backgroundColor: colors.surfaceSecondary }]}>
                  {getRoleIcon(member.role)}
                  <Text style={[styles.roleText, { color: colors.text }]}>
                    {getRoleLabel(member.role)}
                  </Text>
                </View>
                {member.role !== 'owner' && isOwner && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleUpdateRole(
                        member,
                        member.role === 'admin' ? 'member' : 'admin'
                      )}
                    >
                      <Ionicons name="swap-horizontal" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleRemoveMember(member)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          </Card>
        ))}

        {/* Pending Invitations */}
        {isOwner && invitations.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text, marginTop: SPACING.lg }]}>
              Convites Pendentes
            </Text>
            {invitations.map((invitation) => (
              <Card
                key={invitation.id}
                variant="outlined"
                padding="md"
                style={[styles.invitationCard, { borderColor: colors.warning }]}
              >
                <View style={styles.invitationRow}>
                  <View style={styles.invitationInfo}>
                    <Ionicons name="mail" size={20} color={colors.warning} />
                    <View style={{ marginLeft: SPACING.sm }}>
                      <Text style={[styles.invitationEmail, { color: colors.text }]}>
                        {invitation.email}
                      </Text>
                      <Text style={[styles.invitationMeta, { color: colors.textSecondary }]}>
                        {invitation.role === 'admin' ? 'Administrador' : 'Membro'} •
                        Expira: {new Date(invitation.expiresAt).toLocaleDateString('pt-AO')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.invitationActions}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => copyInviteLink(invitation.token)}
                    >
                      <Ionicons name="copy-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleCancelInvitation(invitation)}
                    >
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Info for non-owners */}
        {!isOwner && (
          <Card variant="outlined" padding="md" style={[styles.infoCard, { borderColor: colors.info }]}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.info} />
              <Text style={[styles.infoText, { color: colors.info }]}>
                Apenas o proprietário pode convidar membros e alterar funções.
              </Text>
            </View>
          </Card>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Invite Modal */}
      <Modal visible={showInviteModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Convidar Membro</Text>
              <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: colors.surfaceSecondary, color: colors.text, borderColor: colors.border },
                ]}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                placeholder="email@exemplo.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: SPACING.md }]}>
                Função
              </Text>
              <View style={styles.roleOptions}>
                {(['member', 'admin'] as const).map((role) => (
                  <TouchableOpacity
                    key={role}
                    style={[
                      styles.roleOption,
                      { borderColor: inviteRole === role ? colors.primary : colors.border },
                      inviteRole === role && { backgroundColor: colors.primaryLight },
                    ]}
                    onPress={() => setInviteRole(role)}
                  >
                    <Text style={[styles.roleOptionText, { color: colors.text }]}>
                      {role === 'member' ? 'Membro' : 'Administrador'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setShowInviteModal(false)}
                style={{ flex: 1, marginRight: SPACING.sm }}
              />
              <Button
                title="Enviar Convite"
                onPress={handleInvite}
                loading={inviting}
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
  placeholder: {
    width: 40,
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
    padding: SPACING.md,
  },
  orgCard: {
    marginBottom: SPACING.lg,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: SPACING.sm,
  },
  orgStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orgStat: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  orgStatValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  orgStatLabel: {
    fontSize: 12,
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  memberCard: {
    marginBottom: SPACING.sm,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  memberInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberDetails: {
    marginLeft: SPACING.sm,
    flex: 1,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
  },
  memberContact: {
    fontSize: 12,
  },
  memberActions: {
    alignItems: 'flex-end',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  roleText: {
    fontSize: 11,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  actionBtn: {
    padding: 6,
  },
  invitationCard: {
    marginBottom: SPACING.sm,
  },
  invitationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invitationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  invitationEmail: {
    fontSize: 14,
    fontWeight: '500',
  },
  invitationMeta: {
    fontSize: 11,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  infoCard: {
    marginTop: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 13,
    marginLeft: SPACING.sm,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalBody: {
    padding: SPACING.md,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: SPACING.xs,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: SPACING.md,
    fontSize: 16,
  },
  roleOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleOption: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  roleOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

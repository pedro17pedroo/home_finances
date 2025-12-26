import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../contexts/AuthContext';
import { Card, Button, Loading } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';
import api from '../../services/api';

interface Invitation {
  id: number;
  organizationId: number;
  organizationName: string;
  email: string | null;
  phone: string | null;
  role: string;
  inviterName: string;
  expiresAt: string;
  createdAt: string;
}

interface ReceivedInvitationsScreenProps {
  navigation: any;
}

export const ReceivedInvitationsScreen: React.FC<ReceivedInvitationsScreenProps> = ({ navigation }) => {
  const { colors } = useTheme();
  const { showSuccess, showError } = useToast();
  const { refreshUser } = useAuth();
  
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadInvitations = useCallback(async () => {
    try {
      const response = await api.get('/organizations/my-invitations');
      const data = response.data?.data || response.data || [];
      setInvitations(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);

  const onRefresh = () => {
    setRefreshing(true);
    loadInvitations();
  };

  const handleAccept = async (invitation: Invitation) => {
    Alert.alert(
      'Aceitar Convite',
      `Deseja juntar-se à organização "${invitation.organizationName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Aceitar',
          onPress: async () => {
            setProcessingId(invitation.id);
            try {
              await api.post(`/organizations/invitations/${invitation.id}/accept`);
              showSuccess('Convite aceite! Você agora é membro da organização.');
              await refreshUser();
              loadInvitations();
            } catch (error: any) {
              showError(error.response?.data?.message || 'Erro ao aceitar convite');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (invitation: Invitation) => {
    Alert.alert(
      'Rejeitar Convite',
      `Tem certeza que deseja rejeitar o convite para "${invitation.organizationName}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Rejeitar',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(invitation.id);
            try {
              await api.post(`/organizations/invitations/${invitation.id}/reject`);
              showSuccess('Convite rejeitado.');
              loadInvitations();
            } catch (error: any) {
              showError(error.response?.data?.message || 'Erro ao rejeitar convite');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-PT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Administrador';
      case 'member': return 'Membro';
      default: return role;
    }
  };

  if (loading) {
    return <Loading message="Carregando convites..." />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Convites Recebidos</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {invitations.length === 0 ? (
          <Card style={styles.emptyCard}>
            <View style={styles.emptyContent}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceSecondary }]}>
                <Ionicons name="mail-open-outline" size={48} color={colors.textTertiary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Nenhum convite pendente
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Quando alguém te convidar para uma organização, o convite aparecerá aqui.
              </Text>
            </View>
          </Card>
        ) : (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {invitations.length} convite{invitations.length !== 1 ? 's' : ''} pendente{invitations.length !== 1 ? 's' : ''}
            </Text>
            
            {invitations.map((invitation) => (
              <Card key={invitation.id} style={styles.invitationCard}>
                <View style={styles.invitationHeader}>
                  <View style={[styles.orgIcon, { backgroundColor: colors.primaryLight }]}>
                    <Ionicons name="business" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.invitationInfo}>
                    <Text style={[styles.orgName, { color: colors.text }]}>
                      {invitation.organizationName}
                    </Text>
                    <Text style={[styles.inviterText, { color: colors.textSecondary }]}>
                      Convidado por {invitation.inviterName}
                    </Text>
                  </View>
                </View>

                <View style={styles.invitationDetails}>
                  <View style={styles.detailRow}>
                    <Ionicons name="shield-outline" size={16} color={colors.textTertiary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Função: <Text style={{ fontWeight: '600' }}>{getRoleLabel(invitation.role)}</Text>
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={16} color={colors.textTertiary} />
                    <Text style={[styles.detailText, { color: colors.textSecondary }]}>
                      Expira em: {formatDate(invitation.expiresAt)}
                    </Text>
                  </View>
                </View>

                <View style={styles.invitationActions}>
                  <Button
                    title="Rejeitar"
                    variant="outline"
                    onPress={() => handleReject(invitation)}
                    disabled={processingId === invitation.id}
                    style={styles.rejectButton}
                    textStyle={{ color: colors.error }}
                  />
                  <Button
                    title="Aceitar"
                    onPress={() => handleAccept(invitation)}
                    loading={processingId === invitation.id}
                    style={styles.acceptButton}
                  />
                </View>
              </Card>
            ))}
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.md,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: SPACING.md,
  },
  emptyCard: {
    marginTop: SPACING.xl,
  },
  emptyContent: {
    alignItems: 'center',
    padding: SPACING.xl,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  invitationCard: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
  },
  invitationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  orgIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  invitationInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  inviterText: {
    fontSize: 13,
  },
  invitationDetails: {
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginVertical: 4,
  },
  detailText: {
    fontSize: 13,
  },
  invitationActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  rejectButton: {
    flex: 1,
    borderColor: 'transparent',
  },
  acceptButton: {
    flex: 1,
  },
});

export default ReceivedInvitationsScreen;

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth, OrganizationMembership, ActiveOrganization } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Badge } from './ui/Badge';
import { SPACING, RADIUS } from '../constants/config';

interface OrganizationSelectorProps {
  /** Whether to show the selector as a compact button (for header) or full card */
  variant?: 'compact' | 'full';
  /** Custom style for the container */
  style?: any;
}

/**
 * OrganizationSelector Component
 * 
 * Displays a dropdown/modal showing all organizations the user belongs to.
 * Allows switching between organizations with visual feedback.
 * 
 * Requirements: 3.4, 3.5
 */
export const OrganizationSelector: React.FC<OrganizationSelectorProps> = ({
  variant = 'compact',
  style,
}) => {
  const { colors } = useTheme();
  const { memberships, activeOrganization, switchOrganization } = useAuth();
  const { showSuccess, showError } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [switchingOrgId, setSwitchingOrgId] = useState<number | null>(null);

  // Get role badge variant based on role
  const getRoleBadgeVariant = (role: string): 'primary' | 'info' | 'default' => {
    switch (role) {
      case 'owner':
        return 'primary';
      case 'admin':
        return 'info';
      default:
        return 'default';
    }
  };

  // Get role label in Portuguese
  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'owner':
        return 'Proprietário';
      case 'admin':
        return 'Admin';
      case 'member':
        return 'Membro';
      default:
        return role;
    }
  };

  // Get subscription status badge variant
  const getSubscriptionBadgeVariant = (status: string | null): 'success' | 'warning' | 'error' | 'default' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'trialing':
        return 'info' as any;
      case 'expired':
      case 'canceled':
        return 'error';
      default:
        return 'default';
    }
  };

  // Get subscription status label in Portuguese
  const getSubscriptionLabel = (status: string | null): string => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'trialing':
        return 'Teste';
      case 'expired':
        return 'Expirado';
      case 'canceled':
        return 'Cancelado';
      default:
        return 'N/A';
    }
  };

  // Handle organization switch
  const handleSwitch = async (organizationId: number) => {
    if (organizationId === activeOrganization?.id) {
      setIsOpen(false);
      return;
    }

    // Find the organization name for the toast message
    const targetOrg = memberships.find(m => m.organizationId === organizationId);

    setIsLoading(true);
    setSwitchingOrgId(organizationId);

    try {
      await switchOrganization(organizationId);
      setIsOpen(false);
      // Show success toast - Requirements: 3.3
      showSuccess(`Organização alterada para ${targetOrg?.organizationName || 'nova organização'}`);
    } catch (error: any) {
      console.error('Error switching organization:', error);
      showError(error.message || 'Erro ao trocar de organização');
    } finally {
      setIsLoading(false);
      setSwitchingOrgId(null);
    }
  };

  // Render organization item in the list
  const renderOrganizationItem = ({ item }: { item: OrganizationMembership }) => {
    const isActive = item.organizationId === activeOrganization?.id;
    const isSwitching = switchingOrgId === item.organizationId;

    return (
      <TouchableOpacity
        style={[
          styles.orgItem,
          isActive && { backgroundColor: colors.primaryBackground },
        ]}
        onPress={() => handleSwitch(item.organizationId)}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.orgItemContent}>
          {/* Organization Icon */}
          <View
            style={[
              styles.orgIcon,
              { backgroundColor: isActive ? colors.primary : colors.surfaceSecondary },
            ]}
          >
            <Ionicons
              name="business"
              size={20}
              color={isActive ? '#FFFFFF' : colors.textSecondary}
            />
          </View>

          {/* Organization Info */}
          <View style={styles.orgInfo}>
            <Text
              style={[
                styles.orgName,
                { color: isActive ? colors.primary : colors.text },
                isActive && styles.orgNameActive,
              ]}
              numberOfLines={1}
            >
              {item.organizationName}
            </Text>
            <View style={styles.orgBadges}>
              <Badge
                label={getRoleLabel(item.role)}
                variant={getRoleBadgeVariant(item.role)}
                size="sm"
              />
            </View>
          </View>

          {/* Active/Loading Indicator */}
          {isSwitching ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : isActive ? (
            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Compact variant - just shows current org with dropdown indicator
  if (variant === 'compact') {
    return (
      <>
        <TouchableOpacity
          style={[
            styles.compactButton,
            { backgroundColor: colors.surfaceSecondary },
            style,
          ]}
          onPress={() => setIsOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="business-outline" size={16} color={colors.primary} />
          <Text
            style={[styles.compactText, { color: colors.text }]}
            numberOfLines={1}
          >
            {activeOrganization?.name || 'Selecionar'}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color={colors.textSecondary}
          />
        </TouchableOpacity>

        {/* Modal */}
        {renderModal()}
      </>
    );
  }

  // Full variant - shows current org as a card
  return (
    <>
      <TouchableOpacity
        style={[
          styles.fullCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.cardBorder,
          },
          style,
        ]}
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.fullCardContent}>
          <View
            style={[styles.fullCardIcon, { backgroundColor: colors.primaryBackground }]}
          >
            <Ionicons name="business" size={24} color={colors.primary} />
          </View>
          <View style={styles.fullCardInfo}>
            <Text style={[styles.fullCardLabel, { color: colors.textSecondary }]}>
              Organização Ativa
            </Text>
            <Text
              style={[styles.fullCardName, { color: colors.text }]}
              numberOfLines={1}
            >
              {activeOrganization?.name || 'Nenhuma selecionada'}
            </Text>
            {activeOrganization && (
              <View style={styles.fullCardBadges}>
                <Badge
                  label={getRoleLabel(activeOrganization.role)}
                  variant={getRoleBadgeVariant(activeOrganization.role)}
                  size="sm"
                />
                {activeOrganization.subscriptionStatus && (
                  <Badge
                    label={getSubscriptionLabel(activeOrganization.subscriptionStatus)}
                    variant={getSubscriptionBadgeVariant(activeOrganization.subscriptionStatus)}
                    size="sm"
                  />
                )}
              </View>
            )}
          </View>
          <Ionicons name="swap-horizontal" size={20} color={colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {/* Modal */}
      {renderModal()}
    </>
  );

  // Render the modal with organization list
  function renderModal() {
    return (
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => !isLoading && setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => !isLoading && setIsOpen(false)}
        >
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Minhas Organizações
              </Text>
              <TouchableOpacity
                onPress={() => !isLoading && setIsOpen(false)}
                disabled={isLoading}
              >
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Organization List */}
            {memberships.length > 0 ? (
              <FlatList
                data={memberships}
                keyExtractor={(item) => String(item.organizationId)}
                renderItem={renderOrganizationItem}
                style={styles.orgList}
                ItemSeparatorComponent={() => (
                  <View style={[styles.separator, { backgroundColor: colors.border }]} />
                )}
              />
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color={colors.textTertiary} />
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Nenhuma organização encontrada
                </Text>
              </View>
            )}

            {/* Loading Overlay */}
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  Trocando organização...
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    );
  }
};

const styles = StyleSheet.create({
  // Compact variant styles
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    maxWidth: 180,
    gap: SPACING.xs,
  },
  compactText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },

  // Full variant styles
  fullCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
  },
  fullCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fullCardIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  fullCardInfo: {
    flex: 1,
  },
  fullCardLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  fullCardName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  fullCardBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalContent: {
    borderRadius: RADIUS.lg,
    maxHeight: '70%',
    borderWidth: 1,
    overflow: 'hidden',
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

  // Organization list styles
  orgList: {
    maxHeight: 400,
  },
  orgItem: {
    padding: SPACING.md,
  },
  orgItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orgIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  orgInfo: {
    flex: 1,
  },
  orgName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  orgNameActive: {
    fontWeight: '600',
  },
  orgBadges: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  separator: {
    height: 1,
    marginHorizontal: SPACING.md,
  },

  // Empty state
  emptyState: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    marginTop: SPACING.md,
    textAlign: 'center',
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
});

export default OrganizationSelector;

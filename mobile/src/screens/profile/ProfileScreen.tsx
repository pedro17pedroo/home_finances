import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Card, Avatar, Badge, Button } from '../../components/ui';
import { SPACING, RADIUS } from '../../constants/config';

interface ProfileScreenProps {
  navigation?: any;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const { colors, isDark, themeMode, setThemeMode, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const { showSuccess } = useToast();
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(
      'Sair da Conta',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            await logout();
            setLoading(false);
          },
        },
      ]
    );
  };

  const getPlanBadgeVariant = () => {
    switch (user?.planType) {
      case 'premium': return 'primary';
      case 'enterprise': return 'warning';
      default: return 'default';
    }
  };

  const menuSections = [
    {
      title: 'Conta',
      items: [
        {
          icon: 'person-outline',
          label: 'Dados Pessoais',
          subtitle: 'Editar informações do perfil',
          onPress: () => navigation?.navigate('EditProfile'),
        },
        {
          icon: 'card-outline',
          label: 'Assinatura',
          subtitle: `Plano ${user?.planType || 'Básico'}`,
          onPress: () => navigation?.navigate('Subscription'),
          badge: user?.planType?.toUpperCase(),
        },
        {
          icon: 'people-outline',
          label: 'Equipe',
          subtitle: 'Gerenciar membros',
          onPress: () => navigation?.navigate('Team'),
        },
      ],
    },
    {
      title: 'Preferências',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Notificações',
          subtitle: 'Configurar alertas',
          onPress: () => navigation?.navigate('NotificationSettings'),
        },
        {
          icon: isDark ? 'sunny-outline' : 'moon-outline',
          label: 'Tema',
          subtitle: themeMode === 'system' ? 'Automático' : isDark ? 'Escuro' : 'Claro',
          onPress: () => {
            Alert.alert(
              'Tema',
              'Escolha o tema da aplicação',
              [
                { text: 'Claro', onPress: () => setThemeMode('light') },
                { text: 'Escuro', onPress: () => setThemeMode('dark') },
                { text: 'Automático', onPress: () => setThemeMode('system') },
                { text: 'Cancelar', style: 'cancel' },
              ]
            );
          },
        },
        {
          icon: 'language-outline',
          label: 'Idioma',
          subtitle: 'Português',
          onPress: () => {},
        },
      ],
    },
    {
      title: 'Segurança',
      items: [
        {
          icon: 'lock-closed-outline',
          label: 'Alterar Senha',
          subtitle: 'Atualizar sua senha',
          onPress: () => navigation?.navigate('ChangePassword'),
        },
        {
          icon: 'finger-print-outline',
          label: 'Biometria',
          subtitle: 'Login com impressão digital',
          onPress: () => {},
          toggle: true,
        },
      ],
    },
    {
      title: 'Suporte',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Ajuda e FAQ',
          subtitle: 'Perguntas frequentes',
          onPress: () => navigation?.navigate('Faq'),
        },
        {
          icon: 'chatbubble-outline',
          label: 'Fale Conosco',
          subtitle: 'Enviar mensagem',
          onPress: () => navigation?.navigate('Contact'),
        },
        {
          icon: 'document-text-outline',
          label: 'Termos de Uso',
          onPress: () => navigation?.navigate('Legal', { type: 'terms' }),
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Política de Privacidade',
          onPress: () => navigation?.navigate('Legal', { type: 'privacy' }),
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <Card variant="default" padding="lg" style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <Avatar
              name={`${user?.firstName || ''} ${user?.lastName || ''}`}
              size="xl"
            />
            <TouchableOpacity
              style={[styles.editAvatarButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          
          <Text style={[styles.userName, { color: colors.text }]}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
            {user?.email || user?.phone}
          </Text>
          
          <View style={styles.badgeContainer}>
            <Badge
              label={user?.planType?.toUpperCase() || 'BÁSICO'}
              variant={getPlanBadgeVariant()}
              size="md"
            />
            <Badge
              label={user?.subscriptionStatus === 'active' ? 'ATIVO' : 'TESTE'}
              variant={user?.subscriptionStatus === 'active' ? 'success' : 'info'}
              size="md"
            />
          </View>
        </Card>

        {/* Menu Sections */}
        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              {section.title}
            </Text>
            <Card variant="default" padding="none">
              {section.items.map((item, itemIndex) => (
                <TouchableOpacity
                  key={itemIndex}
                  style={[
                    styles.menuItem,
                    itemIndex < section.items.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuItemIcon, { backgroundColor: `${colors.primary}15` }]}>
                    <Ionicons name={item.icon as any} size={20} color={colors.primary} />
                  </View>
                  <View style={styles.menuItemContent}>
                    <Text style={[styles.menuItemLabel, { color: colors.text }]}>
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text style={[styles.menuItemSubtitle, { color: colors.textTertiary }]}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                  {'badge' in item && item.badge && (
                    <Badge label={item.badge} variant="primary" size="sm" />
                  )}
                  {'toggle' in item && item.toggle ? (
                    <Switch
                      value={false}
                      onValueChange={() => {}}
                      trackColor={{ false: colors.border, true: colors.primary }}
                    />
                  ) : (
                    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
                  )}
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Logout Button */}
        <View style={styles.logoutContainer}>
          <Button
            title="Sair da Conta"
            onPress={handleLogout}
            variant="outline"
            fullWidth
            loading={loading}
            icon="log-out-outline"
          />
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={[styles.versionText, { color: colors.textTertiary }]}>
            FinanceControl Mobile v1.0.0
          </Text>
          <Text style={[styles.versionSubtext, { color: colors.textTertiary }]}>
            © 2024 FinanceControl. Todos os direitos reservados.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  profileCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  profileHeader: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  menuItemSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  logoutContainer: {
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  versionContainer: {
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    marginBottom: SPACING.xs,
  },
  versionSubtext: {
    fontSize: 10,
    textAlign: 'center',
  },
});

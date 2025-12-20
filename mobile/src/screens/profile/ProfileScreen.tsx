import React, { useState } from 'react';
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
import { useAuth } from '../../contexts/AuthContext';
import { COLORS, SPACING } from '../../constants/config';

export const ProfileScreen: React.FC = () => {
  const { user, logout } = useAuth();
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

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Dados Pessoais',
      subtitle: 'Editar informações do perfil',
      onPress: () => {},
    },
    {
      icon: 'card-outline',
      title: 'Plano Atual',
      subtitle: `Plano ${user?.planType || 'Basic'}`,
      onPress: () => {},
    },
    {
      icon: 'notifications-outline',
      title: 'Notificações',
      subtitle: 'Configurar alertas e lembretes',
      onPress: () => {},
    },
    {
      icon: 'shield-outline',
      title: 'Segurança',
      subtitle: 'Senha e autenticação',
      onPress: () => {},
    },
    {
      icon: 'download-outline',
      title: 'Exportar Dados',
      subtitle: 'Backup das suas informações',
      onPress: () => {},
    },
    {
      icon: 'help-circle-outline',
      title: 'Ajuda e Suporte',
      subtitle: 'FAQ e contato',
      onPress: () => {},
    },
    {
      icon: 'information-circle-outline',
      title: 'Sobre o App',
      subtitle: 'Versão 1.0.0',
      onPress: () => {},
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header do Perfil */}
        <Card style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <Ionicons name="person" size={40} color={COLORS.primary} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.userName}>
                {user?.firstName} {user?.lastName}
              </Text>
              <Text style={styles.userEmail}>
                {user?.email || user?.phone}
              </Text>
              <View style={styles.planBadge}>
                <Text style={styles.planText}>
                  {user?.planType?.toUpperCase() || 'BASIC'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Ionicons name="pencil" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Estatísticas Rápidas */}
        <View style={styles.statsContainer}>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>3</Text>
            <Text style={styles.statLabel}>Contas</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>45</Text>
            <Text style={styles.statLabel}>Transações</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Metas</Text>
          </Card>
        </View>

        {/* Menu de Opções */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <Card key={index} style={styles.menuItem} onPress={item.onPress}>
              <View style={styles.menuItemContent}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Ionicons
                      name={item.icon as any}
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.menuItemText}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </View>
            </Card>
          ))}
        </View>

        {/* Botão de Logout */}
        <View style={styles.logoutContainer}>
          <Button
            title="Sair da Conta"
            onPress={handleLogout}
            variant="outline"
            fullWidth
            loading={loading}
          />
        </View>

        {/* Versão do App */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>
            FinanceControl Mobile v1.0.0
          </Text>
          <Text style={styles.versionSubtext}>
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
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  profileCard: {
    margin: SPACING.lg,
    marginBottom: SPACING.md,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  userEmail: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  planBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  planText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  menuContainer: {
    paddingHorizontal: SPACING.lg,
  },
  menuItem: {
    marginBottom: SPACING.sm,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${COLORS.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  menuItemSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  logoutContainer: {
    padding: SPACING.lg,
  },
  versionContainer: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  versionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  versionSubtext: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
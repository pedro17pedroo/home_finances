import React from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { Loading } from '../components/ui';

// Auth Screens
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { OnboardingScreen } from '../screens/auth/OnboardingScreen';

// Main Screens
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { AddAccountScreen } from '../screens/accounts/AddAccountScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { TransactionDetailsScreen } from '../screens/transactions/TransactionDetailsScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';

// Profile Screens
import { ChangePasswordScreen } from '../screens/profile/ChangePasswordScreen';
import { EditProfileScreen } from '../screens/profile/EditProfileScreen';

// Subscription & Team Screens
import { SubscriptionScreen } from '../screens/subscription/SubscriptionScreen';
import { TeamScreen } from '../screens/team/TeamScreen';
import { ReceivedInvitationsScreen } from '../screens/profile/ReceivedInvitationsScreen';

// Support Screens
import { FaqScreen } from '../screens/support/FaqScreen';
import { ContactScreen } from '../screens/support/ContactScreen';
import { LegalScreen } from '../screens/support/LegalScreen';

// Organizations Screen
import { OrganizationsScreen } from '../screens/organizations/OrganizationsScreen';

// Other Screens
import { AddTransactionScreen } from '../screens/forms/AddTransactionScreen';
import { TransfersScreen } from '../screens/transfers/TransfersScreen';
import { AddTransferScreen } from '../screens/transfers/AddTransferScreen';
import { TransferHistoryScreen } from '../screens/transfers/TransferHistoryScreen';
import { SavingsGoalsScreen } from '../screens/savings/SavingsGoalsScreen';
import { AddSavingsGoalScreen } from '../screens/savings/AddSavingsGoalScreen';
import { LoansScreen } from '../screens/loans/LoansScreen';
import { AddLoanScreen } from '../screens/loans/AddLoanScreen';
import { DebtsScreen } from '../screens/debts/DebtsScreen';
import { AddDebtScreen } from '../screens/debts/AddDebtScreen';
import { NotificationsScreen } from '../screens/notifications/NotificationsScreen';
import { NotificationSettingsScreen } from '../screens/notifications/NotificationSettingsScreen';
import { RecurringTransactionsScreen } from '../screens/recurring/RecurringTransactionsScreen';
import { AddRecurringTransactionScreen } from '../screens/recurring/AddRecurringTransactionScreen';
import { CategoriesScreen } from '../screens/categories/CategoriesScreen';
import { AddCategoryScreen } from '../screens/categories/AddCategoryScreen';
import { ExportScreen } from '../screens/export/ExportScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();
const DashboardStack = createStackNavigator();
const AccountsStack = createStackNavigator();
const TransactionsStack = createStackNavigator();
const ReportsStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Auth Navigator
const AuthNavigator = () => {
  const { isFirstLaunch, completeOnboarding } = useAuth();

  return (
    <AuthStack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={isFirstLaunch ? 'Onboarding' : 'Login'}
    >
      <AuthStack.Screen name="Onboarding">
        {(props) => <OnboardingScreen {...props} onComplete={completeOnboarding} />}
      </AuthStack.Screen>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
};

// Dashboard Stack Navigator
const DashboardStackNavigator = () => {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
      <DashboardStack.Screen name="Loans" component={LoansScreen} />
      <DashboardStack.Screen name="AddLoan" component={AddLoanScreen} />
      <DashboardStack.Screen name="Debts" component={DebtsScreen} />
      <DashboardStack.Screen name="AddDebt" component={AddDebtScreen} />
      <DashboardStack.Screen name="RecurringTransactions" component={RecurringTransactionsScreen} />
      <DashboardStack.Screen name="AddRecurringTransaction" component={AddRecurringTransactionScreen} />
      <DashboardStack.Screen name="Categories" component={CategoriesScreen} />
      <DashboardStack.Screen name="AddCategory" component={AddCategoryScreen} />
      <DashboardStack.Screen name="AddAccount" component={AddAccountScreen} />
      <DashboardStack.Screen name="Export" component={ExportScreen} />
      <DashboardStack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
      <DashboardStack.Screen name="AddSavingsGoal" component={AddSavingsGoalScreen} />
      <DashboardStack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <DashboardStack.Screen name="Transfers" component={TransfersScreen} />
      <DashboardStack.Screen name="AddTransfer" component={AddTransferScreen} />
      <DashboardStack.Screen name="Notifications" component={NotificationsScreen} />
      <DashboardStack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </DashboardStack.Navigator>
  );
};

// Accounts Stack Navigator
const AccountsStackNavigator = () => {
  return (
    <AccountsStack.Navigator screenOptions={{ headerShown: false }}>
      <AccountsStack.Screen name="AccountsMain" component={AccountsScreen} />
      <AccountsStack.Screen name="AddAccount" component={AddAccountScreen} />
      <AccountsStack.Screen name="TransferHistory" component={TransferHistoryScreen} />
      <AccountsStack.Screen name="Transfers" component={TransfersScreen} />
      <AccountsStack.Screen name="AddTransfer" component={AddTransferScreen} />
    </AccountsStack.Navigator>
  );
};

// Transactions Stack Navigator
const TransactionsStackNavigator = () => {
  return (
    <TransactionsStack.Navigator screenOptions={{ headerShown: false }}>
      <TransactionsStack.Screen name="TransactionsMain" component={TransactionsScreen} />
      <TransactionsStack.Screen name="TransactionDetails" component={TransactionDetailsScreen} />
      <TransactionsStack.Screen name="AddTransaction" component={AddTransactionScreen} />
      <TransactionsStack.Screen name="AddAccount" component={AddAccountScreen} />
      <TransactionsStack.Screen name="AddCategory" component={AddCategoryScreen} />
    </TransactionsStack.Navigator>
  );
};

// Reports Stack Navigator
const ReportsStackNavigator = () => {
  return (
    <ReportsStack.Navigator screenOptions={{ headerShown: false }}>
      <ReportsStack.Screen name="ReportsMain" component={ReportsScreen} />
    </ReportsStack.Navigator>
  );
};

// Profile Stack Navigator
const ProfileStackNavigator = () => {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
      <ProfileStack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} />
      <ProfileStack.Screen name="Subscription" component={SubscriptionScreen} />
      <ProfileStack.Screen name="Team" component={TeamScreen} />
      <ProfileStack.Screen name="Organizations" component={OrganizationsScreen} />
      <ProfileStack.Screen name="ReceivedInvitations" component={ReceivedInvitationsScreen} />
      <ProfileStack.Screen name="Faq" component={FaqScreen} />
      <ProfileStack.Screen name="Contact" component={ContactScreen} />
      <ProfileStack.Screen name="Legal" component={LegalScreen} />
    </ProfileStack.Navigator>
  );
};

// Main Tab Navigator
const MainTabs = () => {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Contas':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Transações':
              iconName = focused ? 'list' : 'list-outline';
              break;
            case 'Relatórios':
              iconName = focused ? 'bar-chart' : 'bar-chart-outline';
              break;
            case 'Perfil':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardStackNavigator} />
      <Tab.Screen name="Contas" component={AccountsStackNavigator} />
      <Tab.Screen name="Transações" component={TransactionsStackNavigator} />
      <Tab.Screen name="Relatórios" component={ReportsStackNavigator} />
      <Tab.Screen name="Perfil" component={ProfileStackNavigator} />
    </Tab.Navigator>
  );
};

// Main App Navigator
export const AppNavigator = () => {
  const { colors, isDark } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();

  // Custom navigation theme
  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
    },
  };

  if (isLoading) {
    return <Loading message="Carregando..." />;
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <Stack.Screen name="Main" component={MainTabs} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

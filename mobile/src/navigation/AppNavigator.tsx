import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { TransactionsScreen } from '../screens/transactions/TransactionsScreen';
import { ReportsScreen } from '../screens/reports/ReportsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { AddTransactionScreen } from '../screens/forms/AddTransactionScreen';
import { TransfersScreen } from '../screens/transfers/TransfersScreen';
import { AddTransferScreen } from '../screens/transfers/AddTransferScreen';
import { SavingsGoalsScreen } from '../screens/savings/SavingsGoalsScreen';
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
import { COLORS } from '../constants/config';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Contas') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Transações') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Metas') {
            iconName = focused ? 'flag' : 'flag-outline';
          } else if (route.name === 'Relatórios') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Perfil') {
            iconName = focused ? 'person' : 'person-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Contas" component={AccountsScreen} />
      <Tab.Screen name="Transações" component={TransactionsScreen} />
      <Tab.Screen name="Metas" component={SavingsGoalsScreen} />
      <Tab.Screen name="Relatórios" component={ReportsScreen} />
      <Tab.Screen name="Perfil" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return null;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
            <Stack.Screen name="Transfers" component={TransfersScreen} />
            <Stack.Screen name="AddTransfer" component={AddTransferScreen} />
            <Stack.Screen name="SavingsGoals" component={SavingsGoalsScreen} />
            <Stack.Screen name="Loans" component={LoansScreen} />
            <Stack.Screen name="AddLoan" component={AddLoanScreen} />
            <Stack.Screen name="Debts" component={DebtsScreen} />
            <Stack.Screen name="AddDebt" component={AddDebtScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
            <Stack.Screen name="RecurringTransactions" component={RecurringTransactionsScreen} />
            <Stack.Screen name="AddRecurringTransaction" component={AddRecurringTransactionScreen} />
            <Stack.Screen name="Categories" component={CategoriesScreen} />
            <Stack.Screen name="AddCategory" component={AddCategoryScreen} />
            <Stack.Screen name="Export" component={ExportScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
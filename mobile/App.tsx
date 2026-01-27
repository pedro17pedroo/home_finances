import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, Text } from 'react-native';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { AuthProvider } from './src/contexts/AuthContext';
import { ToastProvider } from './src/contexts/ToastContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { NetworkStatus } from './src/components/NetworkStatus';
import { storageService } from './src/services/storage.service';
import { analytics } from './src/utils/analytics';
import { COLORS } from './src/constants/config';
import { setupZodLocale } from './src/lib/zod-pt';

// Configurar mensagens do Zod em português
setupZodLocale();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Inner component to access theme
const AppContent: React.FC = () => {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NetworkStatus />
      <AppNavigator />
    </>
  );
};

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        await storageService.cleanExpiredCache();
        analytics.track('app_started', {
          timestamp: new Date().toISOString(),
        });
        console.log('✅ App initialized successfully');
      } catch (error) {
        console.error('❌ Error initializing app:', error);
        analytics.trackError('app_initialization_failed', String(error));
      }
    };

    initializeApp();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <AuthProvider>
                <NotificationProvider>
                  <ToastProvider>
                    <AppContent />
                  </ToastProvider>
                </NotificationProvider>
              </AuthProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './src/contexts/AuthContext';
import { AppProvider } from './src/contexts/AppContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { NetworkStatus } from './src/components/NetworkStatus';
import { storageService } from './src/services/storage.service';
import { analytics } from './src/utils/analytics';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1,
    },
  },
});

export default function App() {
  useEffect(() => {
    // Inicialização da aplicação
    const initializeApp = async () => {
      try {
        // Limpa cache expirado
        await storageService.cleanExpiredCache();
        
        // Track app start
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          <AuthProvider>
            <StatusBar style="auto" />
            <NetworkStatus />
            <AppNavigator />
            <Toast />
          </AuthProvider>
        </AppProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
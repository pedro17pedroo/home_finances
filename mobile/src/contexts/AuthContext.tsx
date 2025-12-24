import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

interface User {
  id: number;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  planType: string;
  subscriptionStatus: string;
  role?: string;
  organizationId?: number;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstLaunch: boolean;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

interface RegisterData {
  email?: string;
  phone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ONBOARDING_KEY = '@financecontrol_onboarding_complete';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, userData, onboardingComplete] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
      ]);

      setIsFirstLaunch(onboardingComplete !== 'true');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Optionally refresh user data from server
        try {
          await refreshUser();
        } catch (error) {
          // If refresh fails, keep using stored data
          console.log('Could not refresh user data, using stored data');
        }
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (emailOrPhone: string, password: string) => {
    try {
      console.log('🔐 Attempting login to:', api.defaults.baseURL + '/auth/login');
      console.log('🔐 Payload:', { emailOrPhone, password: '***' });
      
      const response = await api.post('/auth/login', {
        emailOrPhone,
        password,
      });

      console.log('🔐 Login response:', JSON.stringify(response.data, null, 2));

      const { token, refreshToken, user: userData } = response.data.data || response.data;

      // Store auth data
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        refreshToken ? AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken) : Promise.resolve(),
      ]);

      setUser(userData);
    } catch (error: any) {
      console.log('🔐 Login error:', error.response?.data || error.message);
      const message = error.response?.data?.message || 'Erro ao fazer login';
      // Translate common error messages to Portuguese
      const translations: Record<string, string> = {
        'Invalid credentials': 'Credenciais inválidas. Verifique seu email/telefone e senha.',
        'User not found': 'Utilizador não encontrado',
        'Invalid password': 'Senha incorrecta',
        'Account disabled': 'Conta desactivada',
        'Email or phone is required': 'Email ou telefone é obrigatório',
      };
      const translatedMessage = translations[message] || message;
      throw new Error(translatedMessage);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await api.post('/auth/register', data);

      const { token, refreshToken, user: userData } = response.data;

      // Store auth data
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        refreshToken ? AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken) : Promise.resolve(),
      ]);

      setUser(userData);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Erro ao criar conta';
      throw new Error(message);
    }
  };

  const logout = async () => {
    try {
      // Call logout endpoint if needed
      // await api.post('/auth/logout');
    } catch (error) {
      console.error('Error calling logout endpoint:', error);
    } finally {
      // Clear stored data
      await AsyncStorage.multiRemove([AUTH_TOKEN_KEY, USER_DATA_KEY, REFRESH_TOKEN_KEY]);
      setUser(null);
    }
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
    }
  };

  const refreshUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData = response.data.user || response.data;
      setUser(userData);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isFirstLaunch,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    completeOnboarding,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

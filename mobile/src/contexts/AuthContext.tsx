import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

// Organization membership type
export interface OrganizationMembership {
  organizationId: number;
  organizationName: string;
  role: 'owner' | 'admin' | 'member';
}

// Active organization with full details
export interface ActiveOrganization {
  id: number;
  name: string;
  role: string;
  planType: string | null;
  subscriptionStatus: string | null;
}

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
  activeOrganizationId?: number;
  activeOrganization?: ActiveOrganization;
  memberships?: OrganizationMembership[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isFirstLaunch: boolean;
  memberships: OrganizationMembership[];
  activeOrganization: ActiveOrganization | null;
  login: (emailOrPhone: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  switchOrganization: (organizationId: number) => Promise<void>;
}

interface RegisterData {
  email?: string;
  phone?: string;
  password: string;
  firstName?: string;
  lastName?: string;
  invitationToken?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ONBOARDING_KEY = '@financecontrol_onboarding_complete';
const MEMBERSHIPS_KEY = 'user_memberships';
const ACTIVE_ORG_KEY = 'active_organization';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [activeOrganization, setActiveOrganization] = useState<ActiveOrganization | null>(null);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, userData, onboardingComplete, storedMemberships, storedActiveOrg] = await Promise.all([
        AsyncStorage.getItem(AUTH_TOKEN_KEY),
        AsyncStorage.getItem(USER_DATA_KEY),
        AsyncStorage.getItem(ONBOARDING_KEY),
        AsyncStorage.getItem(MEMBERSHIPS_KEY),
        AsyncStorage.getItem(ACTIVE_ORG_KEY),
      ]);

      setIsFirstLaunch(onboardingComplete !== 'true');

      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Load memberships from storage
        if (storedMemberships) {
          setMemberships(JSON.parse(storedMemberships));
        } else if (parsedUser.memberships) {
          setMemberships(parsedUser.memberships);
        }
        
        // Load active organization from storage
        if (storedActiveOrg) {
          setActiveOrganization(JSON.parse(storedActiveOrg));
        } else if (parsedUser.activeOrganization) {
          setActiveOrganization(parsedUser.activeOrganization);
        }
        
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

      // Extract memberships and active organization from response
      // Requirements: 3.2, 3.4
      const userMemberships: OrganizationMembership[] = userData.memberships || [];
      const userActiveOrg: ActiveOrganization | null = userData.activeOrganization || null;

      // Store auth data including memberships
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        AsyncStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(userMemberships)),
        userActiveOrg ? AsyncStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(userActiveOrg)) : Promise.resolve(),
        refreshToken ? AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken) : Promise.resolve(),
      ]);

      setUser(userData);
      setMemberships(userMemberships);
      setActiveOrganization(userActiveOrg);
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

      const { token, refreshToken, user: userData } = response.data.data || response.data;

      // Extract memberships and active organization from response
      // Requirements: 3.2, 3.4
      const userMemberships: OrganizationMembership[] = userData.memberships || [];
      const userActiveOrg: ActiveOrganization | null = userData.activeOrganization || null;

      // Store auth data including memberships
      await Promise.all([
        AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        AsyncStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(userMemberships)),
        userActiveOrg ? AsyncStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(userActiveOrg)) : Promise.resolve(),
        refreshToken ? AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken) : Promise.resolve(),
      ]);

      setUser(userData);
      setMemberships(userMemberships);
      setActiveOrganization(userActiveOrg);
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
      // Clear stored data including memberships
      await AsyncStorage.multiRemove([
        AUTH_TOKEN_KEY, 
        USER_DATA_KEY, 
        REFRESH_TOKEN_KEY,
        MEMBERSHIPS_KEY,
        ACTIVE_ORG_KEY,
      ]);
      setUser(null);
      setMemberships([]);
      setActiveOrganization(null);
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
      // Fetch user data and memberships
      const [userResponse, orgsResponse] = await Promise.all([
        api.get('/auth/me'),
        api.get('/organizations/my').catch(() => ({ data: { organizations: [] } })),
      ]);
      
      const userData = userResponse.data.data?.user || userResponse.data.user || userResponse.data;
      const organizations = orgsResponse.data.data?.organizations || orgsResponse.data.organizations || [];
      
      // Update memberships from organizations response
      const userMemberships: OrganizationMembership[] = organizations.map((org: any) => ({
        organizationId: org.id,
        organizationName: org.name,
        role: org.role,
      }));
      
      // Find active organization
      const activeOrg = organizations.find((org: any) => org.isActive);
      const userActiveOrg: ActiveOrganization | null = activeOrg ? {
        id: activeOrg.id,
        name: activeOrg.name,
        role: activeOrg.role,
        planType: activeOrg.subscription?.planType || null,
        subscriptionStatus: activeOrg.subscription?.status || null,
      } : null;
      
      // Update state
      setUser(userData);
      setMemberships(userMemberships);
      if (userActiveOrg) {
        setActiveOrganization(userActiveOrg);
      }
      
      // Persist to storage
      await Promise.all([
        AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        AsyncStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(userMemberships)),
        userActiveOrg ? AsyncStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(userActiveOrg)) : Promise.resolve(),
      ]);
    } catch (error) {
      console.error('Error refreshing user:', error);
      throw error;
    }
  };

  // Switch active organization
  // Requirements: 3.3
  const switchOrganization = async (organizationId: number) => {
    try {
      // Call API to switch organization
      const response = await api.post('/organizations/switch', { organizationId });
      
      const responseData = response.data.data || response.data;
      const { user: updatedUser, activeOrganization: newActiveOrg } = responseData;
      
      // Update active organization state
      const userActiveOrg: ActiveOrganization | null = newActiveOrg ? {
        id: newActiveOrg.id,
        name: newActiveOrg.name,
        role: newActiveOrg.role,
        planType: newActiveOrg.planType || null,
        subscriptionStatus: newActiveOrg.subscriptionStatus || null,
      } : null;
      
      // Update user with new activeOrganizationId
      if (updatedUser) {
        setUser(updatedUser);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUser));
      } else if (user) {
        const updatedUserData = { 
          ...user, 
          activeOrganizationId: organizationId,
          activeOrganization: userActiveOrg || undefined,
        };
        setUser(updatedUserData);
        await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(updatedUserData));
      }
      
      if (userActiveOrg) {
        setActiveOrganization(userActiveOrg);
        await AsyncStorage.setItem(ACTIVE_ORG_KEY, JSON.stringify(userActiveOrg));
      }
      
      // Refresh all user data after switch to ensure everything is up to date
      await refreshUser();
      
      console.log('🔄 Organization switched to:', organizationId);
    } catch (error: any) {
      console.error('Error switching organization:', error);
      const message = error.response?.data?.message || 'Erro ao trocar de organização';
      const translations: Record<string, string> = {
        'You are not a member of this organization': 'Você não é membro desta organização',
        'Organization not found': 'Organização não encontrada',
      };
      const translatedMessage = translations[message] || message;
      throw new Error(translatedMessage);
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
      setIsFirstLaunch(false);
      // Reload auth data to pick up the user that was registered during onboarding
      await loadStoredAuth();
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    isFirstLaunch,
    memberships,
    activeOrganization,
    login,
    register,
    logout,
    updateUser,
    refreshUser,
    completeOnboarding,
    switchOrganization,
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

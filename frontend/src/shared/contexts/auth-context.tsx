import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { User } from '../types';

interface ActiveOrganization {
  id: number;
  name: string;
  role: string;
  planType?: string;
  subscriptionStatus?: string;
}

interface OrganizationMembership {
  id: number;
  organizationId: number;
  organizationName: string;
  role: string;
  planType: string | null;
  subscriptionStatus: string | null;
  joinedAt: string | null;
  isActive: boolean;
}

interface ExtendedUser extends User {
  activeOrganization?: ActiveOrganization;
  memberships?: OrganizationMembership[];
}

interface AuthContextType {
  user: ExtendedUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: ExtendedUser, token: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for stored auth data on mount
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');

    if (storedUser && storedToken) {
      try {
        setUser(JSON.parse(storedUser));
        // Refresh user data to get latest memberships
        refreshUserData();
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }

    setIsLoading(false);
  }, []);

  const refreshUserData = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data?.status === 'success' && response.data?.data) {
        // Backend returns { status: 'success', data: { user: {...} } }
        const userData = response.data.data.user || response.data.data;
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  const login = (userData: ExtendedUser, token: string) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  };

  const refreshUser = async () => {
    await refreshUserData();
  };

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
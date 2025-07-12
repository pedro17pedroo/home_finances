import { createContext, useContext, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface User {
  id: number;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  subscriptionStatus: string;
  planType: string;
  organizationId: number | null;
  role: string;
}

interface AuthContextType {
  user: User | undefined;
  isLoading: boolean;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const refreshUser = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  // Listen for plan changes and refresh related queries
  useEffect(() => {
    if (user) {
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'plan-changed') {
          refreshUser();
          queryClient.invalidateQueries({ queryKey: ["/api/loans"] });
          queryClient.invalidateQueries({ queryKey: ["/api/debts"] });
          queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
        }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [user, queryClient]);

  return (
    <AuthContext.Provider value={{ user, isLoading, refreshUser }}>
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
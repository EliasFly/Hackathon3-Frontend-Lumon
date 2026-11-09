import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Team, Role, Me } from '../types/lumon';
import { authService } from '../api/services';
import { clearSession, getRefreshToken } from '../api/client';

interface AuthContextType {
  user: User | null;
  team: Team | null;
  role: Role | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (teamName: string, email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<Me | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshMe = useCallback(async (): Promise<Me | null> => {
    try {
      const me = await authService.getMe();
      setUser(me.user);
      setTeam(me.team);
      setRole(me.role);
      return me;
    } catch {
      setUser(null);
      setTeam(null);
      setRole(null);
      return null;
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const rt = getRefreshToken();
      if (rt) {
        await refreshMe();
      }
      setIsLoading(false);
    };

    initAuth();

    const handleSessionCleared = () => {
      setUser(null);
      setTeam(null);
      setRole(null);
    };

    window.addEventListener('lumon:session-cleared', handleSessionCleared);
    return () => {
      window.removeEventListener('lumon:session-cleared', handleSessionCleared);
    };
  }, [refreshMe]);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, pass);
      setUser(data.user);
      setTeam(data.team);
      // Fetch full role info from getMe
      await refreshMe();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (teamName: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const data = await authService.register(teamName, email, pass);
      setUser(data.user);
      setTeam(data.team);
      await refreshMe();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } finally {
      clearSession();
      setUser(null);
      setTeam(null);
      setRole(null);
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        team,
        role,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

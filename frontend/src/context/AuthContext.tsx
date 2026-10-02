import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../api/client';

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingEmail: string | null;
  setPendingEmail: (email: string | null) => void;
  login: (email: string) => Promise<{ requiresOtp: boolean }>;
  register: (data: { fullName: string; email: string; phone: string }) => Promise<{ requiresOtp: boolean }>;
  verifyOtp: (code: string, emailOverride?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const profile = await api.getUserProfile();
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string) => {
    const res = await api.loginUser(email);
    setPendingEmail(res.email);
    return res;
  };

  const register = async (data: { fullName: string; email: string; phone: string }) => {
    const res = await api.registerUser(data);
    setPendingEmail(res.email);
    return res;
  };

  const verifyOtp = async (code: string, emailOverride?: string) => {
    const emailToUse = emailOverride || pendingEmail;
    if (!emailToUse) {
      throw new Error('No pending authentication session. Please start login or registration again.');
    }
    const result = await api.verifyOtp(emailToUse, code);
    setUser(result.user);
    setPendingEmail(null);
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setPendingEmail(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        pendingEmail,
        setPendingEmail,
        login,
        register,
        verifyOtp,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

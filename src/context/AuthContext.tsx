import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { LoadingOverlay } from '../components/LoadingOverlay';

interface User {
  username: string;
  role: string;
  token: string;
}

interface AuthContextType {
  user: User | null;
  login: (token: string, username: string, role: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
  apiFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  setGlobalLoading: (loading: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [globalLoading, setGlobalLoading] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('soap_token');
    const savedUser = localStorage.getItem('soap_username');
    const savedRole = localStorage.getItem('soap_role');

    if (savedToken && savedUser && savedRole) {
      setUser({
        token: savedToken,
        username: savedUser,
        role: savedRole,
      });
    }
    setLoading(false);
  }, []);

  const login = (token: string, username: string, role: string) => {
    localStorage.setItem('soap_token', token);
    localStorage.setItem('soap_username', username);
    localStorage.setItem('soap_role', role);
    setUser({ token, username, role });
  };

  const logout = useCallback(() => {
    localStorage.removeItem('soap_token');
    localStorage.removeItem('soap_username');
    localStorage.removeItem('soap_role');
    setUser(null);
  }, []);

  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const apiFetch = useCallback(async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
    const token = userRef.current?.token;
    const headers = new Headers(init?.headers);
    if (token) headers.set('Authorization', `Bearer ${token}`);
    try {
      const response = await fetch(input, { ...init, headers });
      if (response.status === 401) {
        logout();
        window.location.href = '/login';
      }
      return response;
    } catch {
      throw new Error('Network error. The server is unreachable.');
    }
  }, [logout]);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'Admin';

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0b0f19' }}>
        <div style={{ color: '#3b82f6', fontSize: '1.25rem', fontFamily: 'sans-serif', fontWeight: 600 }}>Loading Session...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated, isAdmin, apiFetch, setGlobalLoading }}>
      {globalLoading && <LoadingOverlay />}
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

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

export interface Tenant {
  id?: number;
  slug: string;
  nombre: string;
  nombre_fantasia?: string | null;
  cuit?: string;
  color_primario: string;
  logo_url: string | null;
  plan: string;
  whatsapp_numero?: string | null;
  whatsapp_activo?: boolean;
  onboarding_completado?: boolean;
  fecha_vencimiento?: string | null;
}

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'SUPERADMIN' | 'ADMINISTRATIVO' | 'VENDEDOR' | 'REPARTIDOR' | 'CLIENTE';
  activo: boolean;
  tenant_id: number | null;
  tenant: Tenant | null;
  debe_cambiar_password?: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: string[]) => boolean;
  isAuthenticated: boolean;
  impersonateToken: (token: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const applyTenantBranding = (color: string | null) => {
  const root = document.documentElement;
  if (color) {
    root.style.setProperty('--color-brand-600', color);
    root.style.setProperty('--color-brand-500', color);
    root.style.setProperty('--color-brand-50', `${color}14`); // ~8% opacity
    root.style.setProperty('--color-brand-100', `${color}25`); // ~15% opacity
    root.style.setProperty('--color-brand-200', `${color}40`); // ~25% opacity
    root.style.setProperty('--color-brand-700', color);
  } else {
    root.style.removeProperty('--color-brand-50');
    root.style.removeProperty('--color-brand-100');
    root.style.removeProperty('--color-brand-200');
    root.style.removeProperty('--color-brand-500');
    root.style.removeProperty('--color-brand-600');
    root.style.removeProperty('--color-brand-700');
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const bootstrapAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const profile = await authAPI.getMe();
          setUser(profile);
        } catch (error) {
          console.error("Error booting authentication:", error);
          localStorage.removeItem('token');
          setUser(null);
        }
      }
      setLoading(false);
    };
    bootstrapAuth();
  }, []);

  useEffect(() => {
    if (user && user.tenant?.color_primario) {
      applyTenantBranding(user.tenant.color_primario);
    } else {
      applyTenantBranding(null);
    }
  }, [user]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const data = await authAPI.login(email, password);
      localStorage.setItem('token', data.access_token);
      
      const profile = await authAPI.getMe();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const impersonateToken = async (token: string) => {
    setLoading(true);
    try {
      localStorage.setItem('token', token);
      const profile = await authAPI.getMe();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      setUser(null);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  };

  const hasRole = (roles: string[]): boolean => {
    if (!user) return false;
    // Map SUPERADMIN and TENANT_ADMIN equivalently for feature visibility
    const userRole = user.rol;
    if (userRole === 'SUPERADMIN' && roles.includes('TENANT_ADMIN')) return true;
    if (userRole === 'TENANT_ADMIN' && roles.includes('SUPERADMIN')) return true;
    return roles.includes(userRole);
  };

  const refreshProfile = async () => {
    try {
      const profile = await authAPI.getMe();
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, isAuthenticated, impersonateToken, refreshProfile }}>
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

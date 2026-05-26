import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import { AdminLayout } from './layouts/AdminLayout';
import { ClienteLayout } from './layouts/ClienteLayout';

// Pages - Auth
import { Login } from './pages/Login';
import { Landing } from './pages/Landing';
import { Signup } from './pages/Signup';

// Pages - Admin
import { Dashboard } from './pages/admin/Dashboard';
import { Clientes } from './pages/admin/Clientes';
import { Productos } from './pages/admin/Productos';
import { ListasPrecios } from './pages/admin/ListasPrecios';
import { WhatsAppAdmin } from './pages/admin/WhatsApp';
import { Configuracion } from './pages/configuracion/Configuracion';
import { OnboardingWizard } from './pages/admin/OnboardingWizard';

// Pages - Sales & Operations
import { Pedidos } from './pages/ventas/Pedidos';
import { Preparacion } from './pages/ventas/Preparacion';
import { Comprobantes } from './pages/ventas/Comprobantes';
import { Despacho } from './pages/ventas/Despacho';

// Pages - Cuentas
import { CuentasCorrientes } from './pages/cuentas/CuentasCorrientes';

// Pages - Cliente Portal
import { MisPedidos } from './pages/cliente/MisPedidos';
import { MiCuenta } from './pages/cliente/MiCuenta';

// Pages - Caja
import { CajaDiaria } from './pages/caja/CajaDiaria';

// Pages - Platform Admin
import { PlatformDashboard } from './pages/platform/PlatformDashboard';
import { TenantsList } from './pages/platform/TenantsList';
import { TenantDetalle } from './pages/platform/TenantDetalle';

// ─── Route Guards ──────────────────────────────────────────────────────────────

const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-slate-950 z-50">
    <div className="flex flex-col items-center space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
      <p className="text-slate-400 text-xs font-semibold animate-pulse">Cargando sistema ERP...</p>
    </div>
  </div>
);

/** Redirect to login if not authenticated */
const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

/** Redirect to app if already logged in */
const RequireGuest: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
};

/** Role-based access: show 403 page if role not allowed */
const RequireRole: React.FC<{ roles: string[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user, loading, logout, hasRole } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user || !hasRole(roles)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-4">
        <div className="text-6xl">🚫</div>
        <h2 className="text-2xl font-extrabold text-white">Acceso Denegado</h2>
        <p className="text-slate-400 text-sm">No tiene permisos para ver esta sección.</p>
        <div className="flex space-x-3">
          <a href="/" className="px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-xl hover:bg-rose-500 transition">
            Volver al inicio
          </a>
          <button 
            onClick={logout}
            className="px-4 py-2 bg-slate-800 text-slate-300 text-sm font-bold rounded-xl hover:bg-slate-700 hover:text-white transition"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
};

// ─── Admin Wrapper ─────────────────────────────────────────────────────────────

const AdminRoute: React.FC<{ children: React.ReactNode; roles?: string[] }> = ({
  children,
  roles = ['SUPERADMIN', 'TENANT_ADMIN', 'PLATFORM_ADMIN', 'ADMINISTRATIVO', 'VENDEDOR', 'REPARTIDOR']
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Redirect to onboarding if not completed and is admin role
  if (user && (user.rol === 'TENANT_ADMIN' || user.rol === 'SUPERADMIN') && user.tenant && user.tenant.onboarding_completado === false) {
    return <Navigate to="/onboarding" replace />;
  }

  return (
    <RequireRole roles={roles}>
      <AdminLayout>{children}</AdminLayout>
    </RequireRole>
  );
};

// ─── Client Portal Wrapper ─────────────────────────────────────────────────────

const ClienteRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <RequireAuth>
    <RequireRole roles={['CLIENTE']}>
      <ClienteLayout>{children}</ClienteLayout>
    </RequireRole>
  </RequireAuth>
);

// ─── Smart Home Redirect ────────────────────────────────────────────────────────

const HomeRedirect: React.FC = () => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;

  // Redirect to onboarding if not completed and is admin role
  if ((user.rol === 'TENANT_ADMIN' || user.rol === 'SUPERADMIN') && user.tenant && user.tenant.onboarding_completado === false) {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.rol === 'CLIENTE') return <Navigate to="/mis-pedidos" replace />;
  if (user.rol === 'REPARTIDOR') return <Navigate to="/despacho" replace />;
  if (user.rol === 'PLATFORM_ADMIN') return <Navigate to="/platform" replace />;
  if (user.rol === 'VENDEDOR') return <Navigate to="/pedidos" replace />;
  return <Navigate to="/dashboard" replace />;
};

// ─── App Router ────────────────────────────────────────────────────────────────

const AppRoutes: React.FC = () => (
  <Routes>
    {/* Landing page — pública */}
    <Route path="/" element={<Landing />} />

    {/* Login */}
    <Route path="/login" element={<RequireGuest><Login /></RequireGuest>} />

    {/* Signup for new Tenants */}
    <Route path="/signup" element={<RequireGuest><Signup /></RequireGuest>} />

    {/* Smart home redirect una vez autenticado */}
    <Route path="/app" element={<RequireAuth><HomeRedirect /></RequireAuth>} />

    {/* Onboarding Wizard for new Tenants */}
    <Route path="/onboarding" element={
      <RequireAuth>
        <OnboardingWizard />
      </RequireAuth>
    } />

    {/* Admin / Staff Routes */}
    <Route path="/dashboard" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO']}>
        <Dashboard />
      </AdminRoute>
    } />

    <Route path="/caja" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO']}>
        <CajaDiaria />
      </AdminRoute>
    } />

    <Route path="/pedidos" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO', 'VENDEDOR']}>
        <Pedidos />
      </AdminRoute>
    } />

    <Route path="/preparacion" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO']}>
        <Preparacion />
      </AdminRoute>
    } />

    <Route path="/comprobantes" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO']}>
        <Comprobantes />
      </AdminRoute>
    } />

    <Route path="/despacho" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO', 'REPARTIDOR']}>
        <Despacho />
      </AdminRoute>
    } />

    <Route path="/cuentas" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO']}>
        <CuentasCorrientes />
      </AdminRoute>
    } />

    <Route path="/clientes" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO', 'VENDEDOR']}>
        <Clientes />
      </AdminRoute>
    } />

    <Route path="/productos" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO']}>
        <Productos />
      </AdminRoute>
    } />

    <Route path="/listas-precios" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN']}>
        <ListasPrecios />
      </AdminRoute>
    } />

    <Route path="/whatsapp" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO', 'VENDEDOR']}>
        <WhatsAppAdmin />
      </AdminRoute>
    } />

    <Route path="/configuracion" element={
      <AdminRoute roles={['SUPERADMIN', 'TENANT_ADMIN']}>
        <Configuracion />
      </AdminRoute>
    } />

    {/* Platform Admin Routes */}
    <Route path="/platform" element={
      <AdminRoute roles={['PLATFORM_ADMIN']}>
        <PlatformDashboard />
      </AdminRoute>
    } />

    <Route path="/platform/tenants" element={
      <AdminRoute roles={['PLATFORM_ADMIN']}>
        <TenantsList />
      </AdminRoute>
    } />

    <Route path="/platform/tenants/:id" element={
      <AdminRoute roles={['PLATFORM_ADMIN']}>
        <TenantDetalle />
      </AdminRoute>
    } />

    {/* Cliente Portal Routes (PWA) */}
    <Route path="/mis-pedidos" element={
      <ClienteRoute>
        <MisPedidos />
      </ClienteRoute>
    } />

    <Route path="/cc" element={
      <ClienteRoute>
        <MiCuenta />
      </ClienteRoute>
    } />

    {/* 404 Fallback */}
    <Route path="*" element={
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center space-y-4">
        <div className="text-8xl font-extrabold text-slate-200">404</div>
        <h2 className="text-2xl font-bold text-slate-900">Página no encontrada</h2>
        <a href="/" className="px-6 py-3 bg-brand-600 text-white text-sm font-bold rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-900/20">
          Volver al inicio
        </a>
      </div>
    } />
  </Routes>
);

// ─── Root App ──────────────────────────────────────────────────────────────────

const App: React.FC = () => (
  <BrowserRouter>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  </BrowserRouter>
);

export default App;

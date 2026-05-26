import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ForcedPasswordChangeOverlay } from '../components/ForcedPasswordChangeOverlay';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Truck, 
  FileText, 
  Coins, 
  Users, 
  Beef, 
  ClipboardList, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  User,
  MessageSquare,
  Package,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface SidebarItem {
  name: string;
  path: string;
  icon: React.ComponentType<any>;
  roles: string[];
}

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const sidebarItems: SidebarItem[] = user.rol === 'PLATFORM_ADMIN'
    ? [
        { name: 'Dashboard SaaS', path: '/platform', icon: LayoutDashboard, roles: ['PLATFORM_ADMIN'] },
        { name: 'Tenants (SaaS)', path: '/platform/tenants', icon: Users, roles: ['PLATFORM_ADMIN'] },
      ]
    : [
        { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO'] },
        { name: 'Caja Diaria', path: '/caja', icon: Coins, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO'] },
        { name: 'Pedidos', path: '/pedidos', icon: ShoppingCart, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO', 'VENDEDOR'] },
        { name: 'Preparación', path: '/preparacion', icon: ClipboardList, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO'] },
        { name: 'Facturas / Remitos', path: '/comprobantes', icon: FileText, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO'] },
        { name: 'Cuentas Corrientes', path: '/cuentas', icon: Coins, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO'] },
        { name: 'Repartos Hoja de Ruta', path: '/despacho', icon: Truck, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO', 'REPARTIDOR'] },
        { name: 'Clientes', path: '/clientes', icon: Users, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO', 'VENDEDOR'] },
        { name: 'Catálogo Productos', path: '/productos', icon: Beef, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO'] },
        { name: 'Listas de Precios', path: '/listas-precios', icon: ClipboardList, roles: ['SUPERADMIN', 'TENANT_ADMIN'] },
        { name: 'WhatsApp', path: '/whatsapp', icon: MessageSquare, roles: ['SUPERADMIN', 'TENANT_ADMIN', 'ADMINISTRATIVO', 'VENDEDOR'] },
        { name: 'Configuración', path: '/configuracion', icon: Settings, roles: ['SUPERADMIN', 'TENANT_ADMIN'] },
      ];

  const visibleItems = sidebarItems.filter(item => hasRole(item.roles));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentTenantName = user.tenant?.nombre_fantasia || user.tenant?.nombre || "ERPERIA";

  // Trial countdown calculation
  const trialDaysLeft = (() => {
    if (!user.tenant?.fecha_vencimiento) return null;
    const exp = new Date(user.tenant.fecha_vencimiento);
    const now = new Date();
    const diffMs = exp.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  })();
  const showTrialBanner = trialDaysLeft !== null && user.tenant?.plan === 'basico';

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {user.debe_cambiar_password && <ForcedPasswordChangeOverlay />}
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-shrink-0 flex-col w-64 bg-white border-r border-slate-200">
        {/* Brand Header */}
        <div className="flex items-center h-16 px-6 bg-white border-b border-slate-200">
          <div className="flex items-center space-x-3 overflow-hidden">
            {user.tenant?.logo_url ? (
              <img src={user.tenant.logo_url} alt={currentTenantName} className="h-9 w-auto max-w-[40px] object-contain rounded-lg" />
            ) : (
              <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl text-white shadow-sm flex-shrink-0">
                <Package className="h-6 w-6" />
              </div>
            )}
            <div className="overflow-hidden">
              <span className="text-sm font-bold tracking-tight text-slate-900 truncate block">
                {currentTenantName}
              </span>
              <p className="text-[9px] text-brand-600 font-bold uppercase tracking-wider">
                {user.rol === 'PLATFORM_ADMIN' ? 'Administración SaaS' : 'Gestión Interna'}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                  isActive 
                    ? 'bg-brand-50 text-brand-700 shadow-sm border border-brand-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-3 mb-4 p-3 bg-white border border-slate-100 rounded-2xl">
            <div className="p-2 bg-slate-100 rounded-full text-slate-400">
              <User className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-slate-900 truncate">{user.nombre}</h4>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest truncate">{user.rol}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center justify-center w-full px-4 py-3 text-xs font-bold text-slate-600 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-xl transition-all duration-200 shadow-sm"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200 lg:px-8">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-500 hover:text-brand-600 rounded-lg lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="hidden lg:block text-slate-400 text-[10px] font-bold tracking-widest uppercase">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>

          <div className="flex items-center space-x-4">
            <span className="inline-flex items-center px-4 py-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100 uppercase tracking-widest">
              <span className="w-2 h-2 mr-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
              En Línea
            </span>
          </div>
        </header>

        {/* Trial Countdown Banner */}
        {showTrialBanner && (
          <div className={`flex items-center justify-between px-6 py-2.5 text-xs font-semibold border-b ${
            trialDaysLeft! <= 5
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}>
            <div className="flex items-center space-x-2">
              {trialDaysLeft! <= 5
                ? <AlertTriangle className="h-4 w-4 text-rose-500 flex-shrink-0 animate-pulse" />
                : <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
              }
              <span>
                <strong>Período de Prueba Activo:</strong>{' '}
                {trialDaysLeft === 0
                  ? '¡Tu período de prueba ha vencido!'
                  : `Te quedan ${trialDaysLeft} día${trialDaysLeft === 1 ? '' : 's'} de acceso gratuito.`
                }
              </span>
            </div>
            <a
              href="/configuracion"
              className={`ml-4 text-[10px] font-bold uppercase tracking-wider underline underline-offset-2 transition hover:opacity-70 flex-shrink-0 ${
                trialDaysLeft! <= 5 ? 'text-rose-600' : 'text-amber-700'
              }`}
            >
              Gestionar suscripción →
            </a>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6 text-slate-800">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)}></div>

          {/* Drawer content */}
          <div className="relative flex flex-col w-80 max-w-xs bg-white border-r border-slate-200 h-full p-6 animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 rounded-lg"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Brand Header */}
            <div className="flex items-center space-x-3 mb-8 overflow-hidden">
              {user.tenant?.logo_url ? (
                <img src={user.tenant.logo_url} alt={currentTenantName} className="h-9 w-auto max-w-[40px] object-contain rounded-lg" />
              ) : (
                <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl text-white shadow-sm flex-shrink-0">
                  <Package className="h-6 w-6" />
                </div>
              )}
              <div className="overflow-hidden">
                <span className="text-sm font-bold tracking-tight text-slate-900 truncate block">
                  {currentTenantName}
                </span>
                <p className="text-[9px] text-brand-600 font-bold uppercase tracking-wider">
                  {user.rol === 'PLATFORM_ADMIN' ? 'Administración SaaS' : 'Gestión Interna'}
                </p>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {visibleItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 group ${
                      isActive 
                        ? 'bg-brand-50 text-brand-700 shadow-sm border border-brand-100' 
                        : 'text-slate-600 hover:bg-slate-50 hover:text-brand-600'
                    }`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-brand-500'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 bg-slate-50 -mx-6 -mb-6 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 shadow-sm">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{user.nombre}</h4>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{user.rol}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center w-full px-4 py-3 text-xs font-bold text-slate-600 bg-white hover:bg-rose-50 hover:text-rose-600 border border-slate-200 rounded-xl transition-all duration-200 shadow-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Landmark, LogOut, PhoneCall, Package } from 'lucide-react';
import { ForcedPasswordChangeOverlay } from '../components/ForcedPasswordChangeOverlay';

export const ClienteLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const currentTenantName = user?.tenant?.nombre_fantasia || user?.tenant?.nombre || "ERPERIA";

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 font-sans">
      {user?.debe_cambiar_password && <ForcedPasswordChangeOverlay />}
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-slate-900/90 backdrop-blur border-b border-slate-800">
        <div className="flex items-center space-x-2">
          {user?.tenant?.logo_url ? (
            <img src={user.tenant.logo_url} alt={currentTenantName} className="h-8 w-auto max-w-[32px] object-contain rounded" />
          ) : (
            <div className="p-1.5 bg-violet-600 rounded text-white shadow-sm flex-shrink-0">
              <Package className="h-5 w-5" />
            </div>
          )}
          <div>
            <span className="text-sm font-extrabold tracking-tight text-white uppercase truncate block max-w-[150px]">
              {currentTenantName}
            </span>
            <p className="text-[8px] text-violet-400 font-bold uppercase tracking-wider">Portal Clientes</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-semibold">{user?.nombre.split(' ')[0]}</span>
          <button 
            onClick={handleLogout}
            className="p-1.5 bg-slate-800 text-violet-400 hover:bg-violet-950/20 rounded-lg transition-colors"
            title="Cerrar sesión"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 pb-20 p-4 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-4">
          {children}
        </div>
      </main>

      {/* Mobile PWA Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 h-16 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-around px-2">
        <NavLink
          to="/mis-pedidos"
          className={({ isActive }) => 
            `flex flex-col items-center justify-center w-20 h-12 rounded-xl transition-all duration-200 ${
              isActive ? 'text-violet-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <ShoppingBag className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mis Pedidos</span>
        </NavLink>

        <NavLink
          to="/cc"
          className={({ isActive }) => 
            `flex flex-col items-center justify-center w-20 h-12 rounded-xl transition-all duration-200 ${
              isActive ? 'text-violet-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Landmark className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mi Cuenta</span>
        </NavLink>

        <a
          href="https://wa.me/5493512345678" // link to factory whatsapp
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col items-center justify-center w-20 h-12 rounded-xl text-slate-400 hover:text-slate-200 transition-all duration-200"
        >
          <PhoneCall className="h-5 w-5 mb-0.5 text-emerald-400" />
          <span className="text-[10px] tracking-tight text-emerald-400">Pedir por WA</span>
        </a>
      </nav>
    </div>
  );
};

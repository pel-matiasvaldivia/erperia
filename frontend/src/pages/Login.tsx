import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, KeyRound, Mail, AlertTriangle } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoadingSubmit(true);
    try {
      await login(email, password);
      // Auth context will populate the user. We navigate to home.
      navigate('/app');
    } catch (err: any) {
      console.error(err);
      setError(
        err.response?.data?.detail || 
        'Error al iniciar sesión. Verifique sus credenciales.'
      );
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 px-4 py-12 relative overflow-hidden font-sans">
      {/* Decorative Brand Accent Line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-600"></div>
      
      {/* Background ambient glowing shapes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl -z-10 animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -z-10"></div>
      
      <div className="w-full max-w-md bg-white border border-slate-200/80 p-8 rounded-3xl shadow-xl relative">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center text-slate-900">
          <div className="p-4 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-2xl shadow-lg shadow-violet-500/20 mb-3 group-hover:scale-105 transition-transform duration-300">
            <Package className="h-10 w-10" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">ERP<span className="text-violet-600">ERIA</span></h2>
          <p className="text-xs text-violet-600 font-bold uppercase tracking-widest mt-1.5">Acceso al Sistema ERP</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-start space-x-3 text-sm">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email field */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="h-5 w-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ejemplo@erperia.com"
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <KeyRound className="h-5 w-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all duration-200"
              />
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loadingSubmit}
            className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all duration-200 shadow-md shadow-violet-500/20 active:scale-[0.98] disabled:opacity-50"
          >
            {loadingSubmit ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Demo Accounts Panel */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-xs text-slate-500 text-center">
          <p className="font-bold text-slate-400 uppercase tracking-wider mb-3">Cuentas de Demostración:</p>
          <div className="grid grid-cols-2 gap-3 text-[10px] text-left max-w-xs mx-auto">
            <div>
              <p className="font-bold text-slate-600">Superadmin:</p>
              <p className="text-slate-500 font-mono truncate">admin@erperia.com.ar</p>
              <p className="font-bold text-violet-600 font-mono">admin123</p>
            </div>
            <div>
              <p className="font-bold text-slate-600">Administrativo:</p>
              <p className="text-slate-500 font-mono truncate">admin_ventas@erperia.com.ar</p>
              <p className="font-bold text-violet-600 font-mono">ventas123</p>
            </div>
            <div className="mt-1">
              <p className="font-bold text-slate-600">Vendedor:</p>
              <p className="text-slate-500 font-mono truncate">vendedor@erperia.com.ar</p>
              <p className="font-bold text-violet-600 font-mono">vendedor123</p>
            </div>
            <div className="mt-1">
              <p className="font-bold text-slate-600">Repartidor:</p>
              <p className="text-slate-500 font-mono truncate">reparto@erperia.com.ar</p>
              <p className="font-bold text-violet-600 font-mono">reparto123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

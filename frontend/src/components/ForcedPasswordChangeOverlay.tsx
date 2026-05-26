import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Key, ShieldAlert, Check, Eye, EyeOff, LogOut, Lock } from 'lucide-react';

export const ForcedPasswordChangeOverlay: React.FC = () => {
  const { logout, refreshProfile } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Password criteria checks
  const hasMinLength = newPassword.length >= 8;
  const matchesConfirm = newPassword === confirmPassword && confirmPassword !== '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasMinLength) {
      setError('La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (!matchesConfirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/change-password', null, {
        params: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      // Success! Refresh user profile in context (which resets debe_cambiar_password to false)
      await refreshProfile();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cambiar la contraseña. Verifique los datos ingresados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-8 duration-300">
        
        {/* Banner */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-md mb-3 border border-white/20">
            <Lock className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-extrabold tracking-tight">Cambio de Contraseña Obligatorio</h2>
          <p className="text-violet-100 text-xs mt-1">Por razones de seguridad, debes actualizar tu clave predeterminada para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 text-xs rounded-2xl flex items-start space-x-2">
              <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Contraseña Temporal Actual</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Ingresa la contraseña inicial (ej. admin123)"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 transition font-mono"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 transition font-mono font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Confirmar Nueva Contraseña</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repite la contraseña"
                className="w-full pl-3 pr-10 py-2.5 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-600 transition font-mono font-semibold"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Validation indicators */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2 text-xs">
            <span className="font-bold text-slate-500 block text-[10px] uppercase tracking-wider">Requisitos de seguridad</span>
            
            <div className="flex items-center space-x-2">
              <div className={`p-0.5 rounded-full ${hasMinLength ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <Check className="h-3 w-3" />
              </div>
              <span className={hasMinLength ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                Al menos 8 caracteres de longitud
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <div className={`p-0.5 rounded-full ${matchesConfirm ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'}`}>
                <Check className="h-3 w-3" />
              </div>
              <span className={matchesConfirm ? 'text-slate-700 font-medium' : 'text-slate-400'}>
                Las contraseñas coinciden exactamente
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:space-x-3 space-y-2 sm:space-y-0 justify-end">
            <button
              type="button"
              onClick={logout}
              className="flex items-center justify-center px-4 py-2.5 border border-slate-200 text-slate-700 rounded-2xl text-xs font-bold hover:bg-slate-50 transition"
            >
              <LogOut className="h-4 w-4 mr-2" /> Salir de la Cuenta
            </button>
            <button
              type="submit"
              disabled={loading || !hasMinLength || !matchesConfirm}
              className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-xs font-bold transition shadow-md shadow-violet-950/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Guardando...' : 'Cambiar y Continuar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

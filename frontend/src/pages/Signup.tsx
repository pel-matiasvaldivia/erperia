import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { 
  Package, ArrowRight, ShieldCheck, CreditCard, Copy, Check,
  Building, MapPin, Phone, Mail, Loader2, Sparkles, CheckCircle, Info
} from 'lucide-react';

export const Signup: React.FC = () => {
  const navigate = useNavigate();

  // Signup Stages: 'form' | 'deploying' | 'billing' | 'success'
  const [stage, setStage] = useState<'form' | 'deploying' | 'billing' | 'success'>('form');

  // Form State
  const [formData, setFormData] = useState({
    razon_social: '',
    nombre_fantasia: '',
    cuit: '',
    direccion: '',
    ciudad: '',
    provincia: '',
    email: '',
    telefono: '',
    condicion_iva: 'Responsable Inscripto',
    color_primario: '#6366f1', // Indigo defaults
    plan: 'profesional',
  });

  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  // Deployment simulator state
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [deployPercent, setDeployPercent] = useState(0);

  // Billing (Card Mockup) state
  const [cardData, setCardData] = useState({
    number: '',
    name: '',
    expiry: '',
    cvv: '',
  });
  const [billingError, setBillingError] = useState('');

  // Result credentials
  const [createdTenant, setCreatedTenant] = useState<any>(null);
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Simple formatting for card details
    if (name === 'number') {
      const formatted = value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
      setCardData(prev => ({ ...prev, number: formatted }));
    } else if (name === 'expiry') {
      const formatted = value.replace(/\D/g, '').replace(/(.{2})/, '$1/').trim().slice(0, 5);
      setCardData(prev => ({ ...prev, expiry: formatted }));
    } else if (name === 'cvv') {
      const formatted = value.replace(/\D/g, '').slice(0, 3);
      setCardData(prev => ({ ...prev, cvv: formatted }));
    } else {
      setCardData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleStartDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setLoading(true);

    // Basic CUIT format check
    const cuitRegex = /^\d{2}-\d{8}-\d{1}$/;
    if (!cuitRegex.test(formData.cuit)) {
      setFormError('El CUIT debe tener el formato válido: XX-XXXXXXXX-X');
      setLoading(false);
      return;
    }

    try {
      // 1. Call Backend to create and seed
      const response = await authAPI.signupTenant(formData);
      setCreatedTenant(response);
      setLoading(false);

      // 2. Trigger simulated deployment logger
      setStage('deploying');
      runDeploymentSimulator();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al procesar el registro. Revise el CUIT y los campos obligatorios.');
      setLoading(false);
    }
  };

  const runDeploymentSimulator = () => {
    const logs = [
      '🚀 Iniciando aprovisionamiento en la nube de ERPERIA...',
      '📡 Reservando subdominio y enrutamiento SSL seguro...',
      '💾 Creando base de datos PostgreSQL aislada para la instancia...',
      '⚙️ Migrando tablas y estructuras operacionales...',
      '👤 Registrando cuenta de Administrador sysadmin...',
      '🛡️ Semillando configuraciones globales de ventas, caja y reparto...',
      '⚡ ¡Despliegue finalizado con éxito! Conectando pasarela de activación...'
    ];

    let currentLogIndex = 0;
    setDeployLogs([logs[0]]);

    const interval = setInterval(() => {
      currentLogIndex++;
      setDeployPercent(prev => {
        const next = prev + 15;
        return next > 100 ? 100 : next;
      });

      if (currentLogIndex < logs.length) {
        setDeployLogs(prev => [...prev, logs[currentLogIndex]]);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setStage('billing');
        }, 800);
      }
    }, 600);
  };

  const handleActivateTrial = (e: React.FormEvent) => {
    e.preventDefault();
    setBillingError('');

    if (cardData.number.length < 19 || cardData.expiry.length < 5 || cardData.cvv.length < 3 || !cardData.name) {
      setBillingError('Por favor complete todos los campos de la tarjeta.');
      return;
    }

    setLoading(true);
    // Simulate payment activation
    setTimeout(() => {
      setLoading(false);
      setStage('success');
    }, 1500);
  };

  const copyToClipboard = (text: string, type: 'user' | 'pass') => {
    navigator.clipboard.writeText(text);
    if (type === 'user') {
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  const getTrialEndDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans antialiased text-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      {/* Header */}
      <div className="relative z-10 flex flex-col items-center">
        <a href="/" className="flex items-center space-x-2.5 group">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25 group-hover:scale-105 transition-transform">
            <Package className="h-5 w-5 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight text-white">
            ERP<span className="text-violet-500">ERIA</span>
          </span>
        </a>
      </div>

      {/* Stage: Form */}
      {stage === 'form' && (
        <div className="relative z-10 max-w-xl w-full mx-auto mt-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-black text-white">Comienza tu Prueba Gratuita</h2>
            <p className="text-slate-400 text-sm mt-1">Crea tu cuenta de ERPERIA en un par de clics y activa tus 30 días.</p>
          </div>

          {formError && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm flex items-start space-x-2.5">
              <Info className="h-5 w-5 flex-shrink-0 text-red-400" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleStartDeployment} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Razón Social *</label>
                <input
                  type="text"
                  name="razon_social"
                  required
                  value={formData.razon_social}
                  onChange={handleInputChange}
                  placeholder="Ej. Distribuidora del Sur S.R.L."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Nombre Fantasía</label>
                <input
                  type="text"
                  name="nombre_fantasia"
                  value={formData.nombre_fantasia}
                  onChange={handleInputChange}
                  placeholder="Ej. Distribuidora del Sur"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">CUIT (Con Guiones) *</label>
                <input
                  type="text"
                  name="cuit"
                  required
                  value={formData.cuit}
                  onChange={handleInputChange}
                  placeholder="Ej. 30-71234567-8"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150 font-mono"
                />
              </div>

              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Dirección Sede Principal *</label>
                <input
                  type="text"
                  name="direccion"
                  required
                  value={formData.direccion}
                  onChange={handleInputChange}
                  placeholder="Ej. Av. Colón 1234"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ciudad</label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad}
                  onChange={handleInputChange}
                  placeholder="Ej. Córdoba"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Provincia</label>
                <input
                  type="text"
                  name="provincia"
                  value={formData.provincia}
                  onChange={handleInputChange}
                  placeholder="Ej. Córdoba"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Email de Contacto *</label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Ej. contacto@empresa.com"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Teléfono</label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleInputChange}
                  placeholder="Ej. 3512345678"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Condición IVA</label>
                <select
                  name="condicion_iva"
                  value={formData.condicion_iva}
                  onChange={handleInputChange}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-slate-300 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition duration-150"
                >
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributista">Monotributista</option>
                  <option value="Exento">Exento</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Color de Branding</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    name="color_primario"
                    value={formData.color_primario}
                    onChange={handleInputChange}
                    className="p-1 h-11 w-14 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer"
                  />
                  <input
                    type="text"
                    name="color_primario"
                    value={formData.color_primario}
                    onChange={handleInputChange}
                    placeholder="#6366f1"
                    className="flex-1 bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35 transition flex items-center justify-center space-x-2 text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Configurando infraestructura...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Despliegue de Instancia</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Stage: Deploying */}
      {stage === 'deploying' && (
        <div className="relative z-10 max-w-xl w-full mx-auto mt-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col items-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/30 flex items-center justify-center animate-pulse">
            <Sparkles className="h-8 w-8 text-violet-500 animate-spin duration-1000" />
          </div>

          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-white">Desplegando tu ERP Inteligente</h3>
            <p className="text-xs text-slate-400">Aprovisionando base de datos y activando microservicios...</p>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-950 border border-slate-800 h-3.5 rounded-full overflow-hidden relative">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${deployPercent}%` }}
            />
          </div>

          {/* Deployment log console */}
          <div className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 font-mono text-[10px] text-slate-450 h-44 overflow-y-auto space-y-2 flex flex-col justify-end shadow-inner">
            {deployLogs.map((log, idx) => (
              <div key={idx} className="flex items-center space-x-2 border-b border-slate-900/40 pb-1.5 last:border-b-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="text-violet-500 font-bold">[{idx + 1}]</span>
                <span className="text-slate-350">{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stage: Billing / Card Mockup */}
      {stage === 'billing' && (
        <div className="relative z-10 max-w-xl w-full mx-auto mt-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black text-white">Activar Suscripción de Prueba</h2>
            <p className="text-slate-400 text-sm mt-1">Configure su tarjeta de crédito o débito para iniciar los 30 días gratuitos.</p>
          </div>

          {billingError && (
            <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-4 rounded-xl text-sm">
              {billingError}
            </div>
          )}

          {/* Simulated Card Preview */}
          <div className="relative w-full h-44 rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-700 to-slate-900 border border-violet-500/30 p-6 flex flex-col justify-between shadow-lg overflow-hidden group select-none">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-[9px] font-extrabold uppercase tracking-widest text-violet-200/75">ERP ACTIVO</p>
                <p className="text-base font-black text-white italic tracking-tight">ERPERIA</p>
              </div>
              <CreditCard className="h-7 w-7 text-violet-300/80" />
            </div>

            <p className="text-lg sm:text-xl font-mono text-white tracking-widest my-2">
              {cardData.number || '•••• •••• •••• ••••'}
            </p>

            <div className="flex justify-between items-end text-xs">
              <div>
                <p className="text-[8px] font-bold text-violet-200/50 uppercase">Titular</p>
                <p className="font-semibold text-white tracking-wide truncate max-w-[180px]">{cardData.name.toUpperCase() || 'NOMBRE APELLIDO'}</p>
              </div>
              <div>
                <p className="text-[8px] font-bold text-violet-200/50 uppercase">Vence</p>
                <p className="font-mono font-semibold text-white">{cardData.expiry || 'MM/YY'}</p>
              </div>
            </div>
          </div>

          {/* Pricing detail box */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs">
            <div className="space-y-1">
              <p className="font-bold text-white text-sm">Prueba Gratuita de 30 Días</p>
              <p className="text-slate-400">Plan Profesional • Acceso ilimitado sin cargos hoy</p>
              <p className="text-violet-400/90 font-semibold">Baja y purga de datos autogestionada en 1-clic.</p>
            </div>
            <div className="text-right sm:border-l sm:border-slate-850 sm:pl-4 space-y-1">
              <p className="text-slate-450 uppercase tracking-widest text-[9px] font-extrabold">PRÓXIMO PAGO</p>
              <p className="text-white font-extrabold text-sm">{getTrialEndDate()}</p>
              <p className="text-emerald-400 font-bold">$29 USD/mes</p>
            </div>
          </div>

          <form onSubmit={handleActivateTrial} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Número de Tarjeta *</label>
              <input
                type="text"
                name="number"
                required
                value={cardData.number}
                onChange={handleCardChange}
                placeholder="4000 1234 5678 9010"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono tracking-widest"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Titular de la Tarjeta *</label>
                <input
                  type="text"
                  name="name"
                  required
                  value={cardData.name}
                  onChange={handleCardChange}
                  placeholder="JUAN PEREZ"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">CVV *</label>
                <input
                  type="password"
                  name="cvv"
                  required
                  value={cardData.cvv}
                  onChange={handleCardChange}
                  placeholder="123"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono text-center tracking-widest"
                />
              </div>

              <div className="space-y-1 col-span-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Vencimiento *</label>
                <input
                  type="text"
                  name="expiry"
                  required
                  value={cardData.expiry}
                  onChange={handleCardChange}
                  placeholder="MM/YY"
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-violet-500 font-mono text-center"
                />
              </div>
            </div>

            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 flex items-start space-x-3 text-xs text-slate-400">
              <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
              <p>ERPERIA almacena sus datos de facturación con encriptación militar. No se aplicarán cargos a su tarjeta durante el período de prueba y puede revocar el servicio eliminando permanentemente sus datos con un solo clic.</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl shadow-lg transition flex items-center justify-center space-x-2 text-base disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Validando tarjeta...</span>
                </>
              ) : (
                <>
                  <span>Activar Prueba de 30 Días</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Stage: Success */}
      {stage === 'success' && (
        <div className="relative z-10 max-w-xl w-full mx-auto mt-8 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-emerald-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white">¡Prueba Activada con Éxito! 🎉</h2>
            <p className="text-slate-400 text-sm">Tu espacio corporativo e infraestructura están activos. Tu cuenta regresiva de 30 días ha comenzado.</p>
          </div>

          {/* Credentials box */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-4 text-left shadow-inner">
            <p className="text-xs font-extrabold uppercase tracking-widest text-violet-400 pb-2 border-b border-slate-900">CREDENTIALES DE ADMINISTRADOR</p>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Usuario (Email)</span>
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200">
                  <span className="font-mono truncate">{createdTenant?.sysadmin_email}</span>
                  <button 
                    onClick={() => copyToClipboard(createdTenant?.sysadmin_email, 'user')}
                    className="text-slate-450 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition"
                  >
                    {copiedUser ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase">Contraseña Inicial</span>
                <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-slate-200">
                  <span className="font-mono tracking-wider font-bold">admin123</span>
                  <button 
                    onClick={() => copyToClipboard('admin123', 'pass')}
                    className="text-slate-450 hover:text-white p-1 hover:bg-slate-800 rounded-lg transition"
                  >
                    {copiedPass ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-violet-950/20 border border-violet-900/30 text-[10px] text-violet-300 p-3 rounded-xl leading-relaxed flex items-start space-x-2">
              <Info className="h-4 w-4 flex-shrink-0 text-violet-400" />
              <span>Por razones de seguridad, se le obligará a configurar una nueva contraseña personal la primera vez que inicie sesión. ¡Recuerde copiar y guardar sus accesos!</span>
            </div>
          </div>

          <button
            onClick={() => navigate(`/login?email=${encodeURIComponent(createdTenant?.sysadmin_email)}`)}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold rounded-2xl shadow-lg shadow-violet-500/20 transition flex items-center justify-center space-x-2 text-base"
          >
            <span>Iniciar Sesión en ERPERIA</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 text-center text-xs text-slate-500 mt-8">
        <p>© 2026 ERPERIA. Aprovisionamiento seguro mediante clústeres multi-tenant de alto rendimiento.</p>
      </div>
    </div>
  );
};

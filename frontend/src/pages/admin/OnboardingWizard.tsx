import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { 
  Building2, Users, Beef, UserCheck, ArrowRight, ArrowLeft, 
  UploadCloud, Check, AlertCircle, Trash2, Download, Sparkles, CheckCircle2 
} from 'lucide-react';

interface TeamMember {
  nombre: string;
  email: string;
  rol: string;
}

export const OnboardingWizard: React.FC = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Empresa Data
  const [empresaData, setEmpresaData] = useState({
    razon_social: user?.tenant?.nombre || '',
    nombre_fantasia: user?.tenant?.nombre_fantasia || '',
    direccion: '',
    ciudad: '',
    provincia: '',
    telefono: '',
    email: '',
    color_primario: user?.tenant?.color_primario || '#dc2626'
  });

  // Step 2: Team Members
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [newMember, setNewMember] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'ADMINISTRATIVO'
  });
  const [addingUser, setAddingUser] = useState(false);

  // Load existing data from signup
  React.useEffect(() => {
    const fetchEmpresaData = async () => {
      try {
        const res = await api.get('/onboarding/empresa');
        setEmpresaData({
          razon_social: res.data.razon_social || '',
          nombre_fantasia: res.data.nombre_fantasia || '',
          direccion: res.data.direccion || '',
          ciudad: res.data.ciudad || '',
          provincia: res.data.provincia || '',
          telefono: res.data.telefono || '',
          email: res.data.email || '',
          color_primario: res.data.color_primario || '#dc2626'
        });
      } catch (err) {
        console.error('Error fetching onboarding data', err);
      }
    };
    fetchEmpresaData();
  }, []);

  // Step 3 & 4: File upload state
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [productsCount, setProductsCount] = useState<number | null>(null);
  
  const [clientsFile, setClientsFile] = useState<File | null>(null);
  const [clientsCount, setClientsCount] = useState<number | null>(null);

  const handleEmpresaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmpresaData({ ...empresaData, [e.target.name]: e.target.value });
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/onboarding/empresa', empresaData);
      setSuccess('Datos de la empresa configurados exitosamente.');
      setTimeout(() => {
        setSuccess('');
        setStep(2);
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar los datos de la empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeamMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingUser(true);
    setError('');
    try {
      const response = await api.post('/onboarding/usuarios', newMember);
      setTeam([...team, { 
        nombre: response.data.nombre, 
        email: response.data.email, 
        rol: response.data.rol 
      }]);
      setNewMember({ nombre: '', email: '', password: '', rol: 'ADMINISTRATIVO' });
      setSuccess('Usuario agregado con éxito.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al agregar miembro del equipo.');
    } finally {
      setAddingUser(false);
    }
  };

  const handleUploadProducts = async () => {
    if (!productsFile) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', productsFile);
    try {
      const res = await api.post('/onboarding/cargar-productos', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setProductsCount(res.data.count);
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar el archivo de productos. Revise el formato.');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadClients = async () => {
    if (!clientsFile) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('file', clientsFile);
    try {
      const res = await api.post('/onboarding/cargar-clientes', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setClientsCount(res.data.count);
      setSuccess(res.data.message);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar el archivo de clientes. Revise el formato.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalize = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/onboarding/finalizar');
      await refreshProfile();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al completar el proceso.');
      setLoading(false);
    }
  };

  // CSV Template download helpers
  const downloadTemplate = (type: 'products' | 'clients') => {
    const csvContent = type === 'products'
      ? 'codigo,descripcion,precio_costo,precio_venta\n001,Bondiola de Cerdo,3500.0,4500.0\n002,Chorizo Colorado,2800.0,3800.0\n003,Milanesa de Cerdo,2400.0,3400.0'
      : 'nombre,razon_social,cuit,celular,domicilio\nCarnicería Pepe,Don Pepe S.H.,20-98765432-1,+5493534123456,Av. San Martin 1500\nSupermercado Chino,Rong Hua S.R.L.,30-88776655-2,+5491155667788,Calle Belgrano 450';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', type === 'products' ? 'plantilla_productos.csv' : 'plantilla_clientes.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* Top Header */}
      <header className="h-16 px-6 bg-white border-b border-slate-200 shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl text-white shadow-lg shadow-violet-500/20">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <span className="font-black text-sm tracking-tight text-slate-900 uppercase">ERPERIA</span>
            <p className="text-[9px] text-violet-600 font-bold uppercase tracking-widest">Asistente de Bienvenida</p>
          </div>
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Espacio: <span className="text-violet-600 font-black">{user?.tenant?.nombre || 'Nuevo Espacio'}</span>
        </div>
      </header>

      {/* Main Wizard Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 max-w-4xl w-full mx-auto space-y-8">
        
        {/* Step Indicator Progress Bar */}
        <div className="w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-xl shadow-slate-200/50">
          <div className="flex justify-between items-center relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-100 -translate-y-1/2 z-0"></div>
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 -translate-y-1/2 z-0 transition-all duration-500" style={{ width: `${((step - 1) / 4) * 100}%` }}></div>
            
            {[
              { num: 1, label: 'Empresa', icon: Building2 },
              { num: 2, label: 'Equipo', icon: Users },
              { num: 3, label: 'Productos', icon: Beef },
              { num: 4, label: 'Clientes', icon: UserCheck },
              { num: 5, label: 'Finalizar', icon: CheckCircle2 }
            ].map((s) => {
              const Icon = s.icon;
              const isCompleted = step > s.num;
              const isActive = step === s.num;
              
              return (
                <div key={s.num} className="flex flex-col items-center z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border transition-all duration-300 ${
                    isCompleted 
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-600 border-violet-500 text-white shadow-lg shadow-violet-500/30' 
                      : isActive 
                        ? 'bg-white border-violet-600 text-violet-600 ring-4 ring-violet-500/10' 
                        : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider mt-2 transition-colors duration-300 ${
                    isActive ? 'text-violet-600' : isCompleted ? 'text-slate-600' : 'text-slate-400'
                  }`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {error && (
          <div className="w-full bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl flex items-start space-x-3 text-sm animate-in fade-in duration-200 shadow-sm">
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-start space-x-3 text-sm animate-in fade-in duration-200 shadow-sm">
            <CheckCircle2 className="h-5 w-5 mt-0.5 flex-shrink-0 text-emerald-500" />
            <span>{success}</span>
          </div>
        )}

        {/* Step Views Card */}
        <div className="w-full bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-slate-200/50 p-6 lg:p-8 relative overflow-hidden min-h-[400px] flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -z-10"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10"></div>

          {/* STEP 1: EMPRESA DATA */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
                  <Building2 className="h-6 w-6 text-violet-600 mr-2" /> Datos Generales de la Empresa
                </h2>
                <p className="text-slate-500 text-xs mt-1">Completa la ficha fiscal y el branding inicial de tu espacio de trabajo.</p>
              </div>

              <form onSubmit={handleSaveEmpresa} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Razón Social *</label>
                    <input
                      type="text"
                      name="razon_social"
                      required
                      value={empresaData.razon_social}
                      onChange={handleEmpresaChange}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Nombre Fantasía</label>
                    <input
                      type="text"
                      name="nombre_fantasia"
                      value={empresaData.nombre_fantasia}
                      onChange={handleEmpresaChange}
                      placeholder="Nombre comercial"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Dirección Fiscal / Sede Principal *</label>
                    <input
                      type="text"
                      name="direccion"
                      required
                      value={empresaData.direccion}
                      onChange={handleEmpresaChange}
                      placeholder="Calle y altura"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Ciudad</label>
                    <input
                      type="text"
                      name="ciudad"
                      value={empresaData.ciudad}
                      onChange={handleEmpresaChange}
                      placeholder="Ej. Córdoba"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Provincia</label>
                    <input
                      type="text"
                      name="provincia"
                      value={empresaData.provincia}
                      onChange={handleEmpresaChange}
                      placeholder="Ej. Córdoba"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Teléfono Comercial</label>
                    <input
                      type="text"
                      name="telefono"
                      value={empresaData.telefono}
                      onChange={handleEmpresaChange}
                      placeholder="Prefijo + Número"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Email Comercial</label>
                    <input
                      type="email"
                      name="email"
                      value={empresaData.email}
                      onChange={handleEmpresaChange}
                      placeholder="contacto@empresa.com"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Color de Marca (Branding Hex)</label>
                    <div className="flex space-x-3">
                      <input
                        type="color"
                        name="color_primario"
                        value={empresaData.color_primario}
                        onChange={handleEmpresaChange}
                        className="p-1 h-10 w-16 bg-white border border-slate-200 rounded-xl cursor-pointer"
                      />
                      <input
                        type="text"
                        name="color_primario"
                        value={empresaData.color_primario}
                        onChange={handleEmpresaChange}
                        className="flex-1 p-2.5 bg-slate-50 border border-slate-200 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl text-sm text-slate-900 outline-none transition font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-violet-500/20 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Siguiente Paso'} <ArrowRight className="h-4 w-4 ml-2" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: MI EQUIPO */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
                  <Users className="h-6 w-6 text-violet-600 mr-2" /> Dar de Alta a Mi Equipo
                </h2>
                <p className="text-slate-500 text-xs mt-1">Registra las cuentas para tus colaboradores. Podrás asignarles roles comerciales específicos.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Form to add user */}
                <form onSubmit={handleAddTeamMember} className="space-y-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-sm">
                  <span className="text-[10px] font-bold text-violet-600 uppercase tracking-widest block">Nuevo Integrante</span>
                  
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Nombre Completo *</label>
                    <input
                      type="text"
                      required
                      value={newMember.nombre}
                      onChange={(e) => setNewMember({ ...newMember, nombre: e.target.value })}
                      placeholder="Ej. Matías Valdivia"
                      className="w-full p-2 bg-white border border-slate-200 focus:border-violet-500 rounded-xl text-xs text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Email de Acceso *</label>
                    <input
                      type="email"
                      required
                      value={newMember.email}
                      onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                      placeholder="matias@erperia.com.ar"
                      className="w-full p-2 bg-white border border-slate-200 focus:border-violet-500 rounded-xl text-xs text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Contraseña Temporal *</label>
                    <input
                      type="password"
                      required
                      value={newMember.password}
                      onChange={(e) => setNewMember({ ...newMember, password: e.target.value })}
                      placeholder="Min. 8 caracteres"
                      className="w-full p-2 bg-white border border-slate-200 focus:border-violet-500 rounded-xl text-xs text-slate-900 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Rol / Función</label>
                    <select
                      value={newMember.rol}
                      onChange={(e) => setNewMember({ ...newMember, rol: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 focus:border-violet-500 rounded-xl text-xs text-slate-700 outline-none transition"
                    >
                      <option value="ADMINISTRATIVO">Administrativo (Ventas y Control)</option>
                      <option value="VENDEDOR">Vendedor (Toma de pedidos en calle)</option>
                      <option value="REPARTIDOR">Repartidor (Reparto con Hoja de Ruta)</option>
                      <option value="DESPACHANTE">Despachante (Preparación y Logística)</option>
                      <option value="PRODUCCION">Producción (Elaboración y Stock)</option>
                      <option value="TENANT_ADMIN">Co-Administrador</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={addingUser}
                    className="w-full flex items-center justify-center py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-violet-500/20 disabled:opacity-50"
                  >
                    {addingUser ? 'Registrando...' : '+ Registrar Miembro'}
                  </button>
                </form>

                {/* Team member list */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Miembros Cargados ({team.length})</span>
                  
                  {team.length === 0 ? (
                    <div className="h-48 border-2 border-dashed border-slate-200 bg-slate-50 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs">
                      <span>Aún no registras colaboradores.</span>
                      <p className="text-[10px] text-slate-500 mt-1">Puedes saltear si operas solo.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {team.map((m, idx) => (
                        <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center shadow-sm">
                          <div className="overflow-hidden">
                            <span className="font-bold text-xs block text-slate-900 truncate">{m.nombre}</span>
                            <span className="text-[10px] text-slate-500 block truncate">{m.email}</span>
                          </div>
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-violet-50 text-violet-700 border border-violet-100 rounded uppercase">
                            {m.rol}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Step Navigation */}
              <div className="pt-6 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center text-slate-500 hover:text-slate-900 text-xs font-bold transition"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-violet-500/20"
                >
                  Siguiente Paso <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: CATÁLOGO DE PRODUCTOS (CSV) */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
                  <Beef className="h-6 w-6 text-violet-600 mr-2" /> Catálogo e Inventario Inicial
                </h2>
                <p className="text-slate-500 text-xs mt-1">Carga tu lista de artículos con sus respectivos precios de costo y de venta al público en un solo paso.</p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Subir Archivo de Catálogo (CSV)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">El archivo debe tener los campos: <code className="text-violet-600 font-mono">codigo, descripcion, precio_costo, precio_venta</code>.</p>
                  </div>
                  <button
                    onClick={() => downloadTemplate('products')}
                    className="flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-violet-600 text-[10px] font-bold rounded-xl transition shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar Plantilla CSV
                  </button>
                </div>

                {/* Drag and drop field */}
                <div className="border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8 flex flex-col items-center justify-center space-y-3 hover:border-violet-500 transition relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setProductsFile(e.target.files[0]);
                        setProductsCount(null);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-10 w-10 text-slate-300" />
                  <div className="text-center text-xs">
                    {productsFile ? (
                      <span className="text-slate-900 font-bold">{productsFile.name} ({(productsFile.size / 1024).toFixed(1)} KB)</span>
                    ) : (
                      <span className="text-slate-400">Arrastra tu archivo CSV aquí o <span className="text-violet-600 font-semibold underline">haz clic para explorar</span></span>
                    )}
                  </div>
                </div>

                {/* File Upload Button */}
                {productsFile && !productsCount && (
                  <button
                    onClick={handleUploadProducts}
                    disabled={loading}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-violet-500/20 disabled:opacity-50 flex justify-center items-center"
                  >
                    {loading ? 'Procesando Archivo...' : 'Procesar e Importar Artículos'}
                  </button>
                )}

                {/* Success details */}
                {productsCount !== null && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Se importó el catálogo inicial con <strong className="text-slate-900">{productsCount}</strong> productos listos para vender.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Navigation */}
              <div className="pt-6 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center text-slate-500 hover:text-slate-900 text-xs font-bold transition"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-violet-500/20 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Siguiente Paso <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: CARTERA DE CLIENTES (CSV) */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center">
                  <UserCheck className="h-6 w-6 text-violet-600 mr-2" /> Cartera de Clientes Activos
                </h2>
                <p className="text-slate-500 text-xs mt-1">Carga tu listado de comercios y clientes recurrentes. Se les habilitará automáticamente su cuenta corriente en pesos.</p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Subir Archivo de Clientes (CSV)</span>
                    <p className="text-[10px] text-slate-500 mt-0.5">El archivo debe tener los campos: <code className="text-violet-600 font-mono">nombre, razon_social, cuit, celular, domicilio</code>.</p>
                  </div>
                  <button
                    onClick={() => downloadTemplate('clients')}
                    className="flex items-center px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-violet-600 text-[10px] font-bold rounded-xl transition shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" /> Descargar Plantilla CSV
                  </button>
                </div>

                {/* Drag and drop field */}
                <div className="border-2 border-dashed border-slate-200 bg-white rounded-2xl p-8 flex flex-col items-center justify-center space-y-3 hover:border-violet-500 transition relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setClientsFile(e.target.files[0]);
                        setClientsCount(null);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <UploadCloud className="h-10 w-10 text-slate-300" />
                  <div className="text-center text-xs">
                    {clientsFile ? (
                      <span className="text-slate-900 font-bold">{clientsFile.name} ({(clientsFile.size / 1024).toFixed(1)} KB)</span>
                    ) : (
                      <span className="text-slate-400">Arrastra tu archivo CSV aquí o <span className="text-violet-600 font-semibold underline">haz clic para explorar</span></span>
                    )}
                  </div>
                </div>

                {/* File Upload Button */}
                {clientsFile && !clientsCount && (
                  <button
                    onClick={handleUploadClients}
                    disabled={loading}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-violet-500/20 disabled:opacity-50 flex justify-center items-center"
                  >
                    {loading ? 'Procesando Archivo...' : 'Procesar e Importar Clientes'}
                  </button>
                )}

                {/* Success details */}
                {clientsCount !== null && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs text-emerald-800">
                    <div className="flex items-center space-x-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span>Se importó la base de clientes inicial con <strong className="text-slate-900">{clientsCount}</strong> clientes listos para ventas.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Navigation */}
              <div className="pt-6 border-t border-slate-100 flex justify-between">
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center text-slate-500 hover:text-slate-900 text-xs font-bold transition"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </button>
                <button
                  onClick={() => setStep(5)}
                  className="flex items-center justify-center px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-violet-500/20"
                >
                  Siguiente Paso <ArrowRight className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: FINALIZAR */}
          {step === 5 && (
            <div className="space-y-8 flex flex-col justify-between h-full py-4 text-center">
              <div className="space-y-4">
                <div className="inline-flex p-4 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl text-white shadow-lg shadow-violet-500/30 mb-2 animate-bounce">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">¡Todo Listo para Despegar!</h2>
                <p className="text-slate-500 text-sm max-w-md mx-auto">
                  Has configurado el perfil de tu empresa, tu equipo de colaboradores, tu catálogo de productos y tu cartera comercial de clientes.
                </p>
                
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl max-w-xs mx-auto text-left space-y-1.5 text-xs text-slate-600 shadow-sm">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest block">Resumen del Espacio</span>
                  <div className="flex justify-between">
                    <span>Branding / Empresa:</span>
                    <strong className="text-slate-900">Cargado</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Colaboradores:</span>
                    <strong className="text-slate-900">{team.length + 1} usuarios</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Productos Creados:</span>
                    <strong className="text-slate-900">{productsCount || 0} ítems</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Clientes Habilitados:</span>
                    <strong className="text-slate-900">{clientsCount || 0} cuentas</strong>
                  </div>
                </div>
              </div>

              {/* Step Navigation */}
              <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between items-center gap-4">
                <button
                  onClick={() => setStep(4)}
                  className="flex items-center text-slate-500 hover:text-slate-900 text-xs font-bold transition"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" /> Atrás
                </button>
                <button
                  onClick={handleFinalize}
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center px-8 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl text-sm font-extrabold transition shadow-lg shadow-violet-500/40"
                >
                  {loading ? 'Finalizando...' : 'Comenzar a Operar en ERPERIA'} <Sparkles className="h-4 w-4 ml-2" />
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

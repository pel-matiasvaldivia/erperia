import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { platformAdminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  ArrowLeft, Save, Upload, Shield, Users, 
  ToggleLeft, ToggleRight, Sparkles, Key, CheckCircle, AlertCircle, Trash2
} from 'lucide-react';

interface Tenant {
  id: number;
  slug: string;
  razon_social: string;
  nombre_fantasia: string | null;
  cuit: string;
  direccion: string;
  ciudad: string | null;
  provincia: string | null;
  pais: string;
  codigo_postal: string | null;
  telefono: string | null;
  email: string | null;
  condicion_iva: string;
  plan: string;
  activo: boolean;
  color_primario: string;
  logo_url: string | null;
  whatsapp_numero: string | null;
  whatsapp_activo: boolean;
  punto_venta: string;
}

interface TenantStats {
  tenant_id: number;
  total_usuarios: number;
  total_clientes: number;
  total_clientes_geolocalizados: number;
  pedidos_este_mes: number;
  pedidos_total: number;
  ultimo_pedido: string | null;
}

interface TenantUser {
  id: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
}

export const TenantDetalle: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const tenantId = Number(id);
  const navigate = useNavigate();
  const { impersonateToken } = useAuth();

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Edit Form State
  const [formData, setFormData] = useState<Partial<Tenant>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // New User Form State
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserSubmitting, setNewUserSubmitting] = useState(false);
  const [newUserError, setNewUserError] = useState('');
  const [newUserData, setNewUserData] = useState({
    nombre: '',
    email: '',
    password: '',
    rol: 'TENANT_ADMIN',
    activo: true
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tenantData, statsData, usersData] = await Promise.all([
        platformAdminAPI.getTenant(tenantId),
        platformAdminAPI.getStats(tenantId),
        platformAdminAPI.listUsers(tenantId),
      ]);
      setTenant(tenantData);
      setFormData(tenantData);
      setStats(statsData);
      setUsers(usersData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar los detalles del tenant');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: val }));
  };

  const handleSaveTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError('');
    try {
      const updated = await platformAdminAPI.updateTenant(tenantId, formData);
      setTenant(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleUploadLogo = async () => {
    if (!logoFile) return;
    setUploadingLogo(true);
    setError('');
    try {
      const result = await platformAdminAPI.uploadLogo(tenantId, logoFile);
      if (tenant) {
        setTenant({ ...tenant, logo_url: result.logo_url });
        setFormData(prev => ({ ...prev, logo_url: result.logo_url }));
      }
      setLogoFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al subir el logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleToggleUser = async (userId: number) => {
    try {
      await platformAdminAPI.toggleUser(tenantId, userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, activo: !u.activo } : u));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al cambiar estado del usuario');
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    if (!window.confirm(`¿Está seguro de que desea eliminar permanentemente al usuario "${userName}"?`)) {
      return;
    }
    try {
      await platformAdminAPI.deleteUser(tenantId, userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar el usuario');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewUserSubmitting(true);
    setNewUserError('');
    try {
      const newUser = await platformAdminAPI.createUser(tenantId, newUserData);
      setUsers(prev => [...prev, newUser]);
      setNewUserModalOpen(false);
      setNewUserData({
        nombre: '',
        email: '',
        password: '',
        rol: 'TENANT_ADMIN',
        activo: true
      });
    } catch (err: any) {
      setNewUserError(err.response?.data?.detail || 'Error al crear el usuario');
    } finally {
      setNewUserSubmitting(false);
    }
  };

  const handleImpersonate = async () => {
    if (!window.confirm('¿Está seguro de que desea impersonar al administrador de este tenant? Se le redirigirá a su sesión de soporte.')) {
      return;
    }
    try {
      const data = await platformAdminAPI.impersonate(tenantId);
      // Impersonate inside client auth context
      await impersonateToken(data.access_token);
      // Redirect to main panel
      navigate('/app');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al impersonar. Asegúrese de que el tenant tenga al menos un usuario con rol TENANT_ADMIN.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link to="/platform/tenants" className="p-2 border border-slate-200 hover:bg-slate-50 rounded-xl transition">
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{tenant?.razon_social}</h1>
            <p className="text-slate-500 text-sm">Configuración y estado comercial del tenant</p>
          </div>
        </div>

        <button
          onClick={handleImpersonate}
          className="flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition shadow-md shadow-indigo-900/10"
        >
          <Sparkles className="h-4 w-4 mr-2" /> Impersonar (Soporte Técnico)
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" /> Datos del tenant actualizados exitosamente.
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" /> {error}
        </div>
      )}

      {/* Stats Summary Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Usuarios</span>
          <p className="text-xl font-bold text-slate-800">{stats?.total_usuarios || 0}</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Clientes</span>
          <p className="text-xl font-bold text-slate-800">{stats?.total_clientes || 0}</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Clientes Geoloc.</span>
          <p className="text-xl font-bold text-slate-800">
            {stats?.total_clientes_geolocalizados || 0} (
            {stats?.total_clientes ? Math.round((stats.total_clientes_geolocalizados / stats.total_clientes) * 100) : 0}%)
          </p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Pedidos Mes</span>
          <p className="text-xl font-bold text-slate-800">{stats?.pedidos_este_mes || 0}</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Pedidos Histór.</span>
          <p className="text-xl font-bold text-slate-800">{stats?.pedidos_total || 0}</p>
        </div>
        <div className="bg-white p-4 border border-slate-200 rounded-2xl shadow-sm text-center">
          <span className="text-[10px] uppercase font-bold text-slate-400">Último Pedido</span>
          <p className="text-xs font-bold text-slate-700 truncate mt-1">
            {stats?.ultimo_pedido ? new Date(stats.ultimo_pedido).toLocaleDateString() : 'Ninguno'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configurations Form */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:col-span-2 space-y-6">
          <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Editar Ficha Comercial</h3>
          
          <form onSubmit={handleSaveTenant} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Razón Social *</label>
                <input
                  type="text"
                  name="razon_social"
                  required
                  value={formData.razon_social || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Nombre Fantasía</label>
                <input
                  type="text"
                  name="nombre_fantasia"
                  value={formData.nombre_fantasia || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">CUIT *</label>
                <input
                  type="text"
                  name="cuit"
                  required
                  disabled
                  value={formData.cuit || ''}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-500 cursor-not-allowed outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Condición IVA</label>
                <select
                  name="condicion_iva"
                  value={formData.condicion_iva || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="Responsable Inscripto">Responsable Inscripto</option>
                  <option value="Monotributo">Monotributo</option>
                  <option value="Exento">Exento</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-bold text-slate-600 uppercase">Dirección Sede *</label>
                <input
                  type="text"
                  name="direccion"
                  required
                  value={formData.direccion || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Ciudad Sede</label>
                <input
                  type="text"
                  name="ciudad"
                  value={formData.ciudad || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Provincia</label>
                <input
                  type="text"
                  name="provincia"
                  value={formData.provincia || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Email de Contacto</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Teléfono Comercial</label>
                <input
                  type="text"
                  name="telefono"
                  value={formData.telefono || ''}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Plan de Suscripción</label>
                <select
                  name="plan"
                  value={formData.plan || 'basico'}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="basico">Básico</option>
                  <option value="profesional">Profesional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Punto de Venta (Prefijo Factura)</label>
                <input
                  type="text"
                  name="punto_venta"
                  required
                  maxLength={4}
                  value={formData.punto_venta || ''}
                  onChange={handleInputChange}
                  placeholder="0001"
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 outline-none font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Color de Marca (Branding Hex)</label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    name="color_primario"
                    value={formData.color_primario || '#dc2626'}
                    onChange={handleInputChange}
                    className="p-1 h-9 w-12 border border-slate-200 rounded-lg cursor-pointer bg-white"
                  />
                  <input
                    type="text"
                    name="color_primario"
                    value={formData.color_primario || ''}
                    onChange={handleInputChange}
                    className="flex-1 p-2 border border-slate-200 rounded-xl text-sm uppercase focus:ring-2 focus:ring-slate-900 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4 h-full pt-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="activo"
                    checked={formData.activo || false}
                    onChange={handleInputChange}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-slate-700">Cuenta Activa (Acceso Habilitado)</span>
                </label>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition disabled:opacity-50"
              >
                <Save className="h-4 w-4 mr-2" /> {saving ? 'Guardando...' : 'Guardar Ficha'}
              </button>
            </div>
          </form>
        </div>

        {/* Logo and Users sidebar column */}
        <div className="space-y-6 lg:col-span-1">
          {/* Logo Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-lg border-b border-slate-100 pb-3">Logo Corporativo</h3>
            
            <div className="flex flex-col items-center space-y-3">
              {tenant?.logo_url ? (
                <div className="p-2 border border-slate-100 bg-slate-50 rounded-xl w-full h-32 flex justify-center items-center">
                  <img src={tenant.logo_url} alt="Logo" className="max-h-full max-w-full object-contain" />
                </div>
              ) : (
                <div className="border border-dashed border-slate-200 bg-slate-50/50 rounded-xl w-full h-32 flex flex-col justify-center items-center text-slate-400 text-xs">
                  <span>Sin Logo Configurado</span>
                </div>
              )}

              <div className="w-full space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100"
                />
                {logoFile && (
                  <button
                    onClick={handleUploadLogo}
                    disabled={uploadingLogo}
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                  >
                    <Upload className="h-3.5 w-3.5 mr-2" />
                    {uploadingLogo ? 'Subiendo...' : 'Subir Imagen'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* User accounts for this tenant */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Cuentas de Usuarios</h3>
              <button
                onClick={() => setNewUserModalOpen(true)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                + Crear
              </button>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {users.map(u => (
                <div key={u.id} className="py-2.5 flex justify-between items-center">
                  <div className="overflow-hidden pr-2">
                    <span className="font-bold text-sm text-slate-900 block truncate">{u.nombre}</span>
                    <span className="text-xs text-slate-500 block truncate">{u.email}</span>
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[8px] font-bold bg-slate-100 text-slate-600 rounded uppercase tracking-wider">
                      {u.rol}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={() => handleToggleUser(u.id)}
                      className={`p-1 rounded-lg ${u.activo ? 'text-emerald-600 hover:text-emerald-700' : 'text-slate-400 hover:text-slate-600'}`}
                      title={u.activo ? 'Desactivar Cuenta' : 'Activar Cuenta'}
                    >
                      {u.activo ? (
                        <ToggleRight className="h-6 w-6" />
                      ) : (
                        <ToggleLeft className="h-6 w-6" />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteUser(u.id, u.nombre)}
                      className="p-1 text-rose-500 hover:text-rose-700 rounded-lg transition"
                      title="Eliminar Usuario"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New User Modal */}
      {newUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">Nuevo Usuario del Tenant</h3>
              <button 
                onClick={() => setNewUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {newUserError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 text-sm rounded-xl">
                  {newUserError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={newUserData.nombre}
                  onChange={(e) => setNewUserData({ ...newUserData, nombre: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Email *</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="Ej. juan@empresa.com"
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Contraseña Acceso *</label>
                <input
                  type="password"
                  required
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Min. 8 caracteres"
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Rol / Permisos</label>
                <select
                  value={newUserData.rol}
                  onChange={(e) => setNewUserData({ ...newUserData, rol: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="TENANT_ADMIN">Administrador de Tenant (TENANT_ADMIN)</option>
                  <option value="ADMINISTRATIVO">Administrativo</option>
                  <option value="VENDEDOR">Vendedor</option>
                  <option value="REPARTIDOR">Repartidor</option>
                  <option value="CLIENTE">Cliente (Portal PWA)</option>
                </select>
              </div>

              <div className="border-t border-slate-200 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setNewUserModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={newUserSubmitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {newUserSubmitting ? 'Creando...' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const XCircle = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    fill="none" 
    viewBox="0 0 24 24" 
    strokeWidth={1.5} 
    stroke="currentColor" 
    className={className}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

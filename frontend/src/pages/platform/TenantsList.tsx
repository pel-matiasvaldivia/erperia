import React, { useState, useEffect } from 'react';
import { platformAdminAPI } from '../../services/api';
import { Search, Plus, Filter, Globe, Landmark, Layout, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Tenant {
  id: number;
  slug: string;
  razon_social: string;
  nombre_fantasia: string | null;
  cuit: string;
  direccion: string;
  email: string | null;
  telefono: string | null;
  plan: string;
  activo: boolean;
  color_primario: string;
}

export const TenantsList: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
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
    plan: 'basico',
    color_primario: '#dc2626',
  });

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const data = await platformAdminAPI.listTenants();
      setTenants(data);
      setFilteredTenants(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar los tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  useEffect(() => {
    let result = tenants;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => 
        t.razon_social.toLowerCase().includes(q) || 
        (t.nombre_fantasia && t.nombre_fantasia.toLowerCase().includes(q)) ||
        t.cuit.includes(q) || 
        t.slug.toLowerCase().includes(q)
      );
    }

    if (filterPlan !== 'all') {
      result = result.filter(t => t.plan === filterPlan);
    }

    if (filterStatus !== 'all') {
      const activeBool = filterStatus === 'active';
      result = result.filter(t => t.activo === activeBool);
    }

    setFilteredTenants(result);
  }, [searchQuery, filterPlan, filterStatus, tenants]);

  const handleDeleteTenant = async (tenantId: number, razonSocial: string) => {
    if (tenantId === 1) {
      alert("No se puede eliminar el tenant de demostración.");
      return;
    }

    const confirmFirst = window.confirm(
      `¡ADVERTENCIA CRÍTICA!\n\n¿Está seguro de que desea eliminar permanentemente el tenant "${razonSocial}"?\n\nEsta acción es COMPLETAMENTE IRREVERSIBLE y purgará todos los datos relacionados: usuarios, clientes, productos, pedidos, cuentas corrientes, cajas diarias y configuraciones. ¡No quedará ningún rastro en la base de datos!`
    );

    if (!confirmFirst) return;

    const confirmSecond = window.prompt(
      `Para confirmar la eliminación definitiva, escriba el nombre de la Razón Social exactamente como aparece:\n"${razonSocial}"`
    );

    if (confirmSecond !== razonSocial) {
      alert("Confirmación incorrecta. La eliminación ha sido cancelada.");
      return;
    }

    try {
      setLoading(true);
      await platformAdminAPI.deleteTenant(tenantId);
      alert("El tenant y todos sus datos relacionados han sido eliminados correctamente.");
      fetchTenants();
    } catch (err: any) {
      const errMsg = err.response?.data?.detail || 'Error al eliminar el tenant';
      alert(`Error: ${errMsg}`);
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await platformAdminAPI.createTenant(formData);
      setModalOpen(false);
      setFormData({
        razon_social: '',
        nombre_fantasia: '',
        cuit: '',
        direccion: '',
        ciudad: '',
        provincia: '',
        email: '',
        telefono: '',
        condicion_iva: 'Responsable Inscripto',
        plan: 'basico',
        color_primario: '#dc2626',
      });
      fetchTenants();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al crear el tenant. Verifique el CUIT o los campos obligatorios.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tenants (Clientes SaaS)</h1>
          <p className="text-slate-500 text-sm">Administre las cuentas de empresas, límites, branding y suscripciones</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all duration-200 shadow-sm"
        >
          <Plus className="h-4 w-4 mr-2" /> Registrar Nuevo Tenant
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por Razón Social, Fantasía, CUIT o Slug..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">Todos los Planes</option>
              <option value="basico">Básico</option>
              <option value="profesional">Profesional</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">Todos los Estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
          No se encontraron tenants con los criterios seleccionados.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs font-bold uppercase border-b border-slate-200">
                  <th className="px-6 py-4">Empresa</th>
                  <th className="px-6 py-4">CUIT</th>
                  <th className="px-6 py-4">Contacto</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full border border-slate-200 flex-shrink-0"
                          style={{ backgroundColor: tenant.color_primario }}
                        ></div>
                        <div>
                          <span className="font-bold text-slate-900">{tenant.razon_social}</span>
                          {tenant.nombre_fantasia && (
                            <p className="text-xs text-slate-500">{tenant.nombre_fantasia}</p>
                          )}
                          <p className="text-[10px] font-mono text-slate-400">/{tenant.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-600">{tenant.cuit}</td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900">{tenant.email || 'N/D'}</p>
                      <p className="text-xs text-slate-500">{tenant.telefono || 'N/D'}</p>
                    </td>
                    <td className="px-6 py-4 uppercase font-semibold text-slate-700">{tenant.plan}</td>
                    <td className="px-6 py-4">
                      {tenant.activo ? (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Activo
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 text-xs font-bold text-slate-500 bg-slate-50 rounded-full border border-slate-100">
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/platform/tenants/${tenant.id}`}
                          className="inline-flex items-center justify-center px-3 py-1.5 border border-slate-200 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-lg transition"
                        >
                          Configurar
                        </Link>
                        <button
                          onClick={() => handleDeleteTenant(tenant.id, tenant.razon_social)}
                          disabled={tenant.id === 1}
                          className={`inline-flex items-center justify-center p-1.5 border rounded-lg transition ${
                            tenant.id === 1
                              ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50'
                              : 'border-rose-200 text-rose-600 bg-white hover:bg-rose-50 hover:border-rose-300'
                          }`}
                          title={tenant.id === 1 ? 'El tenant demo no se puede eliminar' : 'Eliminar Tenant'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* New Tenant Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Registrar Nuevo Tenant</h3>
                <p className="text-xs text-slate-500">Complete los datos comerciales y de branding para habilitar la instancia.</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 rounded-lg p-1.5 hover:bg-slate-100"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleCreateTenant} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 text-sm rounded-xl">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Razón Social *</label>
                  <input
                    type="text"
                    name="razon_social"
                    required
                    value={formData.razon_social}
                    onChange={handleInputChange}
                    placeholder="Ej. Distribuidora ERPERIA SRL"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Nombre Fantasía</label>
                  <input
                    type="text"
                    name="nombre_fantasia"
                    value={formData.nombre_fantasia}
                    onChange={handleInputChange}
                    placeholder="Ej. ERPERIA Alimentos"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">CUIT *</label>
                  <input
                    type="text"
                    name="cuit"
                    required
                    value={formData.cuit}
                    onChange={handleInputChange}
                    placeholder="Ej. 30-71543210-9"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Dirección Sede Principal *</label>
                  <input
                    type="text"
                    name="direccion"
                    required
                    value={formData.direccion}
                    onChange={handleInputChange}
                    placeholder="Ej. Av. Circunvalación N° 4500"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Ciudad</label>
                  <input
                    type="text"
                    name="ciudad"
                    value={formData.ciudad}
                    onChange={handleInputChange}
                    placeholder="Ej. Córdoba"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Provincia</label>
                  <input
                    type="text"
                    name="provincia"
                    value={formData.provincia}
                    onChange={handleInputChange}
                    placeholder="Ej. Córdoba"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Email de Contacto</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Ej. contacto@empresa.com"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Teléfono</label>
                  <input
                    type="text"
                    name="telefono"
                    value={formData.telefono}
                    onChange={handleInputChange}
                    placeholder="Ej. 3512345678"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Condición IVA</label>
                  <select
                    name="condicion_iva"
                    value={formData.condicion_iva}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributo">Monotributo</option>
                    <option value="Exento">Exento</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Plan de Suscripción</label>
                  <select
                    name="plan"
                    value={formData.plan}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="basico">Básico</option>
                    <option value="profesional">Profesional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600 uppercase">Color Primario (Branding)</label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      name="color_primario"
                      value={formData.color_primario}
                      onChange={handleInputChange}
                      className="p-1 h-9 w-12 border border-slate-200 rounded-lg cursor-pointer bg-white"
                    />
                    <input
                      type="text"
                      name="color_primario"
                      value={formData.color_primario}
                      onChange={handleInputChange}
                      placeholder="#dc2626"
                      className="flex-1 p-2 border border-slate-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-slate-900 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">Nota sobre la Creación de Tenants:</p>
                <p>Al guardar, el sistema generará automáticamente un slug único basado en la Razón Social y creará los datos por defecto para la base de datos (seeding de tablas, listas de precios, productos de prueba y el usuario administrador inicial con credenciales autogeneradas basadas en el slug, ej: admin_slug@erperia.com.ar con contraseña admin123).</p>
              </div>

              <div className="border-t border-slate-200 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {submitting ? 'Creando...' : 'Crear e Inicializar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

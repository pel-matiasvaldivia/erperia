import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

export const authAPI = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login-json', { email, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  register: async (userData: Record<string, unknown>) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  signupTenant: async (data: Record<string, unknown>) => {
    const response = await api.post('/auth/signup-tenant', data);
    return response.data;
  },
};

export const clientesAPI = {
  list: async () => (await api.get('/clientes/')).data,
  get: async (id: number) => (await api.get(`/clientes/${id}`)).data,
  create: async (data: Record<string, unknown>) => (await api.post('/clientes/', data)).data,
  update: async (id: number, data: Record<string, unknown>) => (await api.put(`/clientes/${id}`, data)).data,
  delete: async (id: number) => (await api.delete(`/clientes/${id}`)).data,
};

export const productosAPI = {
  list: async () => (await api.get('/productos/')).data,
  get: async (id: number) => (await api.get(`/productos/${id}`)).data,
  create: async (data: Record<string, unknown>) => (await api.post('/productos/', data)).data,
  update: async (id: number, data: Record<string, unknown>) => (await api.put(`/productos/${id}`, data)).data,
  delete: async (id: number) => (await api.delete(`/productos/${id}`)).data,
};

export const listasPreciosAPI = {
  list: async () => (await api.get('/listas-precios/')).data,
  getDetalles: async (id: number) => (await api.get(`/listas-precios/${id}/detalles`)).data,
  create: async (data: Record<string, unknown>) => (await api.post('/listas-precios/', data)).data,
  update: async (id: number, data: Record<string, unknown>) => (await api.put(`/listas-precios/${id}`, data)).data,
  delete: async (id: number) => (await api.delete(`/listas-precios/${id}`)).data,
  updateDetalle: async (listaId: number, detalleId: number, data: Record<string, unknown>) =>
    (await api.put(`/listas-precios/${listaId}/detalle/${detalleId}`, data)).data,
  importarExcel: async (listaId: number, file: File) => {
    const formData = new FormData();
    formData.append('lista_id', listaId.toString());
    formData.append('file', file);
    return (await api.post('/listas-precios/importar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
  exportarExcel: async (listaId: number) => (await api.get(`/listas-precios/${listaId}/exportar`)).data,
  actualizarMasivo: async (data: Record<string, unknown>) =>
    (await api.post('/listas-precios/actualizar-masivo', data)).data,
};

export const pedidosAPI = {
  list: async (filters: Record<string, unknown> = {}) => (await api.get('/pedidos/', { params: filters })).data,
  get: async (id: number) => (await api.get(`/pedidos/${id}`)).data,
  create: async (data: Record<string, unknown>) => (await api.post('/pedidos/', data)).data,
  update: async (id: number, data: Record<string, unknown>) => (await api.put(`/pedidos/${id}`, data)).data,
};

export const preparacionAPI = {
  list: async (filters: Record<string, unknown> = {}) => (await api.get('/preparacion/', { params: filters })).data,
  get: async (id: number) => (await api.get(`/preparacion/${id}`)).data,
  update: async (id: number, data: Record<string, unknown>) => (await api.put(`/preparacion/${id}`, data)).data,
  getEtiquetas: async (id: number) => (await api.get(`/preparacion/${id}/labels`)).data,
  getBulto: async (uuid: string) => (await api.get(`/preparacion/bulto/${uuid}`)).data,
  escanearBulto: async (uuid: string, action: 'CARGA' | 'ENTREGA') => 
    (await api.post(`/preparacion/scan/${uuid}`, null, { params: { action } })).data,
};

export const comprobantesAPI = {
  list: async () => (await api.get('/comprobantes/')).data,
  get: async (id: number) => (await api.get(`/comprobantes/${id}`)).data,
  create: async (data: Record<string, unknown>) => (await api.post('/comprobantes/', data)).data,
};

export const despachoAPI = {
  getHojaRuta: async () => (await api.get('/despacho/hoja-ruta')).data,
  entregar: async (comprobanteId: number, data: Record<string, unknown>) =>
    (await api.post(`/despacho/comprobante/${comprobanteId}/entregar`, data)).data,
};

export const cuentasCorrientesAPI = {
  list: async () => (await api.get('/cuentas-corrientes/')).data,
  getCliente: async (clienteId: number) => (await api.get(`/cuentas-corrientes/cliente/${clienteId}`)).data,
  pagar: async (clienteId: number, data: Record<string, unknown>) =>
    (await api.post(`/cuentas-corrientes/cliente/${clienteId}/pagar`, data)).data,
  updateLimiteCredito: async (clienteId: number, nuevoLimite: number) =>
    (await api.patch(`/cuentas-corrientes/cliente/${clienteId}/limite-credito`, null, { params: { nuevo_limite: nuevoLimite } })).data,
};

export const rutasAPI = {
  list: async () => (await api.get('/rutas/')).data,
  get: async (id: number) => (await api.get(`/rutas/${id}`)).data,
  create: async (data: Record<string, unknown>) => (await api.post('/rutas/', data)).data,
  update: async (id: number, data: Record<string, unknown>) => (await api.put(`/rutas/${id}`, data)).data,
  delete: async (id: number) => (await api.delete(`/rutas/${id}`)).data,
};

export const dashboardAPI = {
  getKpis: async () => (await api.get('/dashboard/kpis')).data,
  getReporteVentas: async (periodo = 'mes') =>
    (await api.get('/dashboard/reporte-ventas', { params: { periodo } })).data,
};

export const configuracionAPI = {
  list: async () => (await api.get('/configuracion/')).data,
  update: async (clave: string, valor: string) => (await api.put(`/configuracion/${clave}`, { valor })).data,
  getEmpresa: async () => (await api.get('/configuracion/empresa')).data,
  purgeSelf: async () => (await api.delete('/configuracion/tenant/purge-self')).data,
  activarSuscripcion: async (plan: string) => (await api.post('/configuracion/suscripcion/activar', null, { params: { plan } })).data,
};

export const platformAdminAPI = {
  listTenants: async () => (await api.get('/platform/tenants')).data,
  getTenant: async (id: number) => (await api.get(`/platform/tenants/${id}`)).data,
  createTenant: async (data: Record<string, unknown>) => (await api.post('/platform/tenants', data)).data,
  updateTenant: async (id: number, data: Record<string, unknown>) => (await api.put(`/platform/tenants/${id}`, data)).data,
  deleteTenant: async (id: number) => (await api.delete(`/platform/tenants/${id}`)).data,
  uploadLogo: async (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return (await api.post(`/platform/tenants/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })).data;
  },
  getStats: async (id: number) => (await api.get(`/platform/tenants/${id}/stats`)).data,
  listUsers: async (id: number) => (await api.get(`/platform/tenants/${id}/usuarios`)).data,
  createUser: async (id: number, data: Record<string, unknown>) => (await api.post(`/platform/tenants/${id}/usuarios`, data)).data,
  toggleUser: async (tenantId: number, userId: number) => (await api.patch(`/platform/tenants/${tenantId}/usuarios/${userId}/toggle`)).data,
  deleteUser: async (tenantId: number, userId: number) => (await api.delete(`/platform/tenants/${tenantId}/usuarios/${userId}`)).data,
  impersonate: async (id: number) => (await api.post(`/platform/tenants/${id}/impersonate`)).data,
};

export const cajaAPI = {
  getStatus: async () => (await api.get('/caja/status')).data,
  abrirCaja: async (data: { monto_apertura: number; observaciones_apertura?: string }) => 
    (await api.post('/caja/abrir', data)).data,
  cerrarCaja: async (data: { monto_cierre: number; observaciones_cierre?: string }) => 
    (await api.post('/caja/cerrar', data)).data,
  registrarMovimiento: async (data: { tipo: string; monto: number; descripcion: string; empleado_id?: number | null; proveedor_nombre?: string | null }) => 
    (await api.post('/caja/movimientos', data)).data,
  getMovimientos: async () => (await api.get('/caja/movimientos')).data,
  getHistorial: async () => (await api.get('/caja/historial')).data,
  getEmpleados: async () => (await api.get('/caja/empleados')).data,
  getDetalle: async (id: number) => (await api.get(`/caja/${id}`)).data,
};


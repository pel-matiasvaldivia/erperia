import React, { useState, useEffect } from 'react';
import { platformAdminAPI } from '../../services/api';
import { Users, Server, ShieldCheck, CreditCard, Activity, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Tenant {
  id: number;
  slug: string;
  razon_social: string;
  cuit: string;
  plan: string;
  activo: boolean;
}

export const PlatformDashboard: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await platformAdminAPI.listTenants();
        setTenants(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Error al cargar los datos del dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl">
        {error}
      </div>
    );
  }

  const activeTenants = tenants.filter(t => t.activo).length;
  const planCounts = tenants.reduce((acc: any, t) => {
    acc[t.plan] = (acc[t.plan] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Panel de Control Global</h1>
        <p className="text-slate-500 text-sm">Resumen de la plataforma multi-tenant ERPERIA</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-700">
            <Server className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Tenants Registrados</p>
            <h3 className="text-2xl font-bold text-slate-900">{tenants.length}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Tenants Activos</p>
            <h3 className="text-2xl font-bold text-slate-900">{activeTenants}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Plan Profesional / Ent.</p>
            <h3 className="text-2xl font-bold text-slate-900">
              {(planCounts['profesional'] || 0) + (planCounts['enterprise'] || 0)}
            </h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase">Rol Actual</p>
            <h3 className="text-lg font-bold text-slate-900">Platform Admin</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Plan Breakdown */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-1">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Planes Activos</h2>
          <div className="space-y-4">
            {['basico', 'profesional', 'enterprise'].map((plan) => {
              const count = planCounts[plan] || 0;
              const percentage = tenants.length > 0 ? (count / tenants.length) * 100 : 0;
              return (
                <div key={plan} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize font-medium text-slate-600">{plan}</span>
                    <span className="font-bold text-slate-900">{count} ({percentage.toFixed(0)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        plan === 'enterprise' ? 'bg-indigo-600' : plan === 'profesional' ? 'bg-blue-600' : 'bg-slate-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent tenants */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-900">Últimos Tenants Creados</h2>
            <Link to="/platform/tenants" className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center">
              Ver Todos <ArrowRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
          <div className="divide-y divide-slate-100">
            {tenants.slice(0, 5).map((tenant) => (
              <div key={tenant.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{tenant.razon_social}</h4>
                  <p className="text-xs text-slate-500">CUIT: {tenant.cuit} • Slug: {tenant.slug}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full tracking-wider ${
                    tenant.activo ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-slate-50 text-slate-700 border border-slate-100'
                  }`}>
                    {tenant.activo ? 'Activo' : 'Inactivo'}
                  </span>
                  <span className="text-xs font-semibold uppercase text-slate-400">{tenant.plan}</span>
                  <Link 
                    to={`/platform/tenants/${tenant.id}`}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-50"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

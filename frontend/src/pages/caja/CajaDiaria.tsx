import React, { useState, useEffect } from 'react';
import { cajaAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Coins, ArrowDownRight, ArrowUpRight, Plus, 
  Unlock, Lock, Calendar, ClipboardList, AlertCircle, FileText, UserPlus
} from 'lucide-react';

interface CajaDiaria {
  id: number;
  fecha_apertura: string;
  fecha_cierre: string | null;
  monto_apertura: number;
  monto_cierre: number | null;
  estado: 'ABIERTA' | 'CERRADA';
  observaciones_apertura: string | null;
  observaciones_cierre: string | null;
  total_ingresos: number;
  total_egresos: number;
  total_gastos: number;
  saldo_calculado: number;
}

interface Movimiento {
  id: number;
  fecha: string;
  tipo: 'INGRESO' | 'EGRESO' | 'GASTO' | 'PAGO_PROVEEDOR' | 'PAGO_EMPLEADO' | 'ADELANTO_EMPLEADO';
  monto: number;
  descripcion: string;
  proveedor_nombre: string | null;
  empleado_id: number | null;
}

interface Empleado {
  id: number;
  nombre: string;
  rol: string;
}

export const CajaDiaria: React.FC = () => {
  const { user } = useAuth();
  const [activeCaja, setActiveCaja] = useState<CajaDiaria | null>(null);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [historial, setHistorial] = useState<CajaDiaria[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'activa' | 'historial'>('activa');
  const [error, setError] = useState('');

  // Modals state
  const [openModalOpen, setOpenModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [movimientoModalOpen, setMovimientoModalOpen] = useState(false);

  // Form inputs
  const [aperturaData, setAperturaData] = useState({ monto_apertura: 0, observaciones_apertura: '' });
  const [cierreData, setCierreData] = useState({ monto_cierre: 0, observaciones_cierre: '' });
  const [movimientoData, setMovimientoData] = useState({
    tipo: 'INGRESO',
    monto: 0,
    descripcion: '',
    empleado_id: '' as string | number,
    proveedor_nombre: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const fetchCajaData = async () => {
    try {
      setLoading(true);
      setError('');
      const status = await cajaAPI.getStatus();
      setActiveCaja(status);
      
      if (status) {
        const movs = await cajaAPI.getMovimientos();
        setMovimientos(movs);
        const emps = await cajaAPI.getEmpleados();
        setEmpleados(emps);
      }
      
      const hist = await cajaAPI.getHistorial();
      setHistorial(hist);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al obtener datos de caja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCajaData();
  }, []);

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await cajaAPI.abrirCaja(aperturaData);
      setOpenModalOpen(false);
      setAperturaData({ monto_apertura: 0, observaciones_apertura: '' });
      await fetchCajaData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al abrir caja');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCerrarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await cajaAPI.cerrarCaja(cierreData);
      setCloseModalOpen(false);
      setCierreData({ monto_cierre: 0, observaciones_cierre: '' });
      await fetchCajaData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al cerrar caja');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        tipo: movimientoData.tipo,
        monto: Number(movimientoData.monto),
        descripcion: movimientoData.descripcion,
        empleado_id: ['PAGO_EMPLEADO', 'ADELANTO_EMPLEADO'].includes(movimientoData.tipo) ? Number(movimientoData.empleado_id) : null,
        proveedor_nombre: movimientoData.tipo === 'PAGO_PROVEEDOR' ? movimientoData.proveedor_nombre : null
      };

      await cajaAPI.registrarMovimiento(payload);
      setMovimientoModalOpen(false);
      setMovimientoData({
        tipo: 'INGRESO',
        monto: 0,
        descripcion: '',
        empleado_id: '',
        proveedor_nombre: ''
      });
      await fetchCajaData();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al registrar movimiento');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (value === null) return '$0.00';
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(value);
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'INGRESO':
        return <span className="px-2 py-0.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-full">Ingreso</span>;
      case 'EGRESO':
        return <span className="px-2 py-0.5 text-xs font-bold text-rose-700 bg-rose-50 rounded-full">Egreso</span>;
      case 'GASTO':
        return <span className="px-2 py-0.5 text-xs font-bold text-amber-700 bg-amber-50 rounded-full">Gasto</span>;
      case 'PAGO_PROVEEDOR':
        return <span className="px-2 py-0.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-full">Proveedor</span>;
      case 'PAGO_EMPLEADO':
        return <span className="px-2 py-0.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-full">Sueldo</span>;
      case 'ADELANTO_EMPLEADO':
        return <span className="px-2 py-0.5 text-xs font-bold text-violet-700 bg-violet-50 rounded-full">Adelanto</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-bold text-slate-700 bg-slate-50 rounded-full">{tipo}</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Caja Diaria</h1>
          <p className="text-slate-500 text-sm">Control de arqueos, gastos de caja chica, ingresos de cobros y egresos comerciales</p>
        </div>

        <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
          <button
            onClick={() => setActiveTab('activa')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'activa' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Caja del Día
          </button>
          <button
            onClick={() => setActiveTab('historial')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'historial' ? 'bg-brand-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historial
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" /> {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900"></div>
        </div>
      ) : activeTab === 'activa' ? (
        // ACTIVE CAJA TAB
        !activeCaja ? (
          // NO CAJA OPEN
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center max-w-xl mx-auto space-y-6 shadow-sm">
            <div className="mx-auto w-16 h-16 bg-slate-50 border border-slate-200 rounded-2xl flex justify-center items-center text-slate-400">
              <Lock className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Caja Cerrada</h2>
              <p className="text-slate-500 text-sm">
                No hay ninguna caja abierta en este momento. Debe realizar la apertura indicando el saldo inicial físico en la caja de seguridad.
              </p>
            </div>
            <button
              onClick={() => setOpenModalOpen(true)}
              className="inline-flex items-center justify-center px-5 py-3 bg-brand-600 text-white font-bold text-sm rounded-xl hover:bg-brand-700 transition shadow-lg shadow-brand-900/10"
            >
              <Unlock className="h-4 w-4 mr-2" /> Abrir Caja del Día
            </button>
          </div>
        ) : (
          // CAJA IS OPEN
          <div className="space-y-6">
            {/* Arqueo Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Monto de Apertura</span>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(activeCaja.monto_apertura)}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Abierta: {new Date(activeCaja.fecha_apertura).toLocaleTimeString()}
                </span>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Ingresos (+)</span>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(activeCaja.total_ingresos)}</p>
                </div>
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Egresos & Gastos (-)</span>
                  <p className="text-2xl font-bold text-rose-600">{formatCurrency(activeCaja.total_egresos + activeCaja.total_gastos)}</p>
                </div>
                <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
                  <ArrowDownRight className="h-6 w-6" />
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm bg-slate-900 text-white border-transparent">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Saldo en Caja (Estimado)</span>
                <p className="text-2xl font-extrabold">{formatCurrency(activeCaja.saldo_calculado)}</p>
                <span className="text-[10px] text-slate-300 mt-1 block font-medium">Fondo de comercio móvil</span>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setMovimientoModalOpen(true)}
                className="flex items-center px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" /> Registrar Movimiento
              </button>
              <button
                onClick={() => setCloseModalOpen(true)}
                className="flex items-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-sm"
              >
                <Lock className="h-4 w-4 mr-2" /> Cerrar Caja
              </button>
            </div>

            {/* Today's Transactions Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Movimientos de la Jornada</h3>
                <span className="text-xs text-slate-500 font-semibold">{movimientos.length} transacciones registradas</span>
              </div>

              {movimientos.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  Aún no se registraron movimientos en esta sesión de caja.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                        <th className="px-6 py-3">Hora</th>
                        <th className="px-6 py-3">Tipo</th>
                        <th className="px-6 py-3">Descripción</th>
                        <th className="px-6 py-3">Referencia</th>
                        <th className="px-6 py-3 text-right">Monto</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                      {movimientos.map((m) => {
                        const isIncome = m.tipo === 'INGRESO';
                        return (
                          <tr key={m.id} className="hover:bg-slate-50/30">
                            <td className="px-6 py-3.5 text-slate-500 font-mono text-xs">
                              {new Date(m.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-6 py-3.5">{getTipoBadge(m.tipo)}</td>
                            <td className="px-6 py-3.5 text-slate-900 font-semibold">{m.descripcion}</td>
                            <td className="px-6 py-3.5 text-xs text-slate-600 font-medium">
                              {m.proveedor_nombre && `Proveedor: ${m.proveedor_nombre}`}
                              {m.empleado_id && `Empleado: ${empleados.find(e => e.id === m.empleado_id)?.nombre || m.empleado_id}`}
                              {!m.proveedor_nombre && !m.empleado_id && 'General'}
                            </td>
                            <td className={`px-6 py-3.5 text-right font-bold ${isIncome ? 'text-emerald-600' : 'text-slate-800'}`}>
                              {isIncome ? '+' : '-'} {formatCurrency(m.monto)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        // HISTORICAL LOGS TAB
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-900">Historial de Cierre de Cajas</h3>
            <span className="text-xs text-slate-500 font-semibold">{historial.length} cierres registrados</span>
          </div>

          {historial.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              No hay registros de cajas cerradas anteriormente.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600 uppercase">
                    <th className="px-6 py-3">Fecha Apertura</th>
                    <th className="px-6 py-3">Fecha Cierre</th>
                    <th className="px-6 py-3 text-right">Saldo Apertura</th>
                    <th className="px-6 py-3 text-right">Saldo Sistema</th>
                    <th className="px-6 py-3 text-right">Cierre Físico</th>
                    <th className="px-6 py-3 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-sm">
                  {historial.map((c) => {
                    const diff = (c.monto_cierre || 0) - c.saldo_calculado;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/30">
                        <td className="px-6 py-4 text-slate-600">
                          {new Date(c.fecha_apertura).toLocaleDateString()} {new Date(c.fecha_apertura).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          {c.fecha_cierre ? `${new Date(c.fecha_cierre).toLocaleDateString()} ${new Date(c.fecha_cierre).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-700">{formatCurrency(c.monto_apertura)}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(c.saldo_calculado)}</td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">{formatCurrency(c.monto_cierre)}</td>
                        <td className={`px-6 py-4 text-right font-bold ${diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-rose-600'}`}>
                          {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── MODALS ─── */}

      {/* 1. Open Caja Modal */}
      {openModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">Apertura de Caja</h3>
              <button onClick={() => setOpenModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleAbrirCaja} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Monto Inicial Apertura (Efectivo) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={aperturaData.monto_apertura}
                  onChange={(e) => setAperturaData({ ...aperturaData, monto_apertura: Number(e.target.value) })}
                  placeholder="Ej. 10000.00"
                  className="w-full p-3 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Observaciones</label>
                <textarea
                  value={aperturaData.observaciones_apertura}
                  onChange={(e) => setAperturaData({ ...aperturaData, observaciones_apertura: e.target.value })}
                  placeholder="Ej. Caja chica chica para gastos menores e inicio."
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 h-20"
                />
              </div>

              <div className="border-t border-slate-200 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setOpenModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition"
                >
                  Confirmar Apertura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Close Caja Modal */}
      {closeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">Cierre de Caja (Arqueo Físico)</h3>
              <button onClick={() => setCloseModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleCerrarCaja} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1 text-xs">
                <p className="font-bold text-slate-700">Balance del Sistema:</p>
                <div className="flex justify-between">
                  <span>Saldo Calculado:</span>
                  <span className="font-bold text-slate-900">{formatCurrency(activeCaja?.saldo_calculado || 0)}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Monto Físico al Cierre *</label>
                <input
                  type="number"
                  required
                  min={0}
                  step="0.01"
                  value={cierreData.monto_cierre}
                  onChange={(e) => setCierreData({ ...cierreData, monto_cierre: Number(e.target.value) })}
                  placeholder="Ej. 15400.00"
                  className="w-full p-3 border border-slate-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Observaciones / Diferencias</label>
                <textarea
                  value={cierreData.observaciones_cierre}
                  onChange={(e) => setCierreData({ ...cierreData, observaciones_cierre: e.target.value })}
                  placeholder="Detalle cualquier faltante o excedente..."
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 h-20"
                />
              </div>

              <div className="border-t border-slate-200 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setCloseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold transition"
                >
                  Cerrar Caja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. New Movimiento Modal */}
      {movimientoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-slate-900 text-lg">Registrar Movimiento de Caja</h3>
              <button onClick={() => setMovimientoModalOpen(false)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <form onSubmit={handleRegistrarMovimiento} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Tipo de Movimiento</label>
                <select
                  value={movimientoData.tipo}
                  onChange={(e) => setMovimientoData({ ...movimientoData, tipo: e.target.value })}
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  <option value="INGRESO">Ingreso (Cobro, Venta Externa, etc.)</option>
                  <option value="EGRESO">Egreso de Caja (Retiro, Banco, etc.)</option>
                  <option value="GASTO">Gasto de Caja Chica (Combustible, Insumos, etc.)</option>
                  <option value="PAGO_PROVEEDOR">Pago a Proveedor</option>
                  <option value="PAGO_EMPLEADO">Pago de Sueldo a Empleado</option>
                  <option value="ADELANTO_EMPLEADO">Adelanto de Sueldo a Empleado</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Monto *</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  step="0.01"
                  value={movimientoData.monto || ''}
                  onChange={(e) => setMovimientoData({ ...movimientoData, monto: Number(e.target.value) })}
                  placeholder="Ej. 1500.00"
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Descripción / Concepto *</label>
                <input
                  type="text"
                  required
                  value={movimientoData.descripcion}
                  onChange={(e) => setMovimientoData({ ...movimientoData, descripcion: e.target.value })}
                  placeholder="Ej. Combustible para reparto sur"
                  className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Conditional Supplier field */}
              {movimientoData.tipo === 'PAGO_PROVEEDOR' && (
                <div className="space-y-1 animate-in slide-in-from-top duration-200">
                  <label className="text-xs font-bold text-slate-600 uppercase">Nombre del Proveedor *</label>
                  <input
                    type="text"
                    required
                    value={movimientoData.proveedor_nombre}
                    onChange={(e) => setMovimientoData({ ...movimientoData, proveedor_nombre: e.target.value })}
                    placeholder="Ej. Distribuidora del Centro"
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              )}

              {/* Conditional Employee selection */}
              {['PAGO_EMPLEADO', 'ADELANTO_EMPLEADO'].includes(movimientoData.tipo) && (
                <div className="space-y-1 animate-in slide-in-from-top duration-200">
                  <label className="text-xs font-bold text-slate-600 uppercase">Seleccione Empleado *</label>
                  <select
                    required
                    value={movimientoData.empleado_id}
                    onChange={(e) => setMovimientoData({ ...movimientoData, empleado_id: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="">-- Seleccionar Empleado --</option>
                    {empleados.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.nombre} ({emp.rol})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setMovimientoModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition"
                >
                  {submitting ? 'Guardando...' : 'Registrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

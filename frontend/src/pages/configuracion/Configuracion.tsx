import React, { useEffect, useState } from 'react';
import { listasPreciosAPI, rutasAPI, authAPI, configuracionAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Settings, 
  Upload, 
  TrendingUp, 
  Truck, 
  FileSpreadsheet, 
  UserCheck, 
  Wrench, 
  RefreshCw,
  AlertTriangle,
  Trash2,
  X,
  CreditCard,
  CheckCircle,
  Plus
} from 'lucide-react';

export const Configuracion: React.FC = () => {
  const { user, refreshProfile, logout } = useAuth();
  const [listas, setListas] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Billing & Trial State
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });

  // Trial Days Left Logic
  const getTrialDaysLeft = () => {
    if (!user?.tenant?.fecha_vencimiento) return null;
    const now = new Date();
    const expiry = new Date(user.tenant.fecha_vencimiento);
    const diffTime = expiry.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };
  const diasRestantes = getTrialDaysLeft();
  const showWarningBanner = diasRestantes !== null && diasRestantes <= 5;

  // Self-purge state
  const [purging, setPurging] = useState(false);

  // Excel Upload State
  const [selectedListId, setSelectedListId] = useState<number | ''>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Bulk Updates State
  const [bulkListId, setBulkListId] = useState<number | ''>('');
  const [bulkType, setBulkType] = useState<'porcentaje' | 'fijo'>('porcentaje');
  const [bulkVal, setBulkVal] = useState<number>(0);
  const [bulkDept, setBulkDept] = useState('');
  const [updatingBulk, setUpdatingBulk] = useState(false);

  // Routes Management
  const [rutaNombre, setRutaNombre] = useState('');
  const [rutaZona, setRutaZona] = useState('');
  const [rutaDias, setRutaDias] = useState('Lunes, Miércoles, Viernes');
  const [repartidores, setRepartidores] = useState<any[]>([]);
  const [rutaRepartidorId, setRutaRepartidorId] = useState<number | ''>('');

  // General Settings Serial Updates
  const [nextFC, setNextFC] = useState('');
  const [nextRM, setNextRM] = useState('');

  useEffect(() => {
    fetchConfigData();
  }, []);

  const fetchConfigData = async () => {
    setLoading(true);
    try {
      const listasRes = await listasPreciosAPI.list();
      setListas(listasRes);
      
      const rutasRes = await rutasAPI.list();
      setRutas(rutasRes);
      
      const confs = await configuracionAPI.list();
      setConfigs(confs);
      
      // Filter next numbers
      const fc = confs.find(c => c.clave === 'NUM_FACTURA_SIGUIENTE');
      const rm = confs.find(c => c.clave === 'NUM_REMITO_SIGUIENTE');
      if (fc) setNextFC(fc.valor);
      if (rm) setNextRM(rm.valor);
      
      // Load repartidores from database seed
      // For this prototype, we'll hardcode or mock the drivers listing as we didn't write a full Users endpoint.
      // We can mock some driver accounts.
      setRepartidores([
        { id: 4, nombre: "Juan Repartidor" },
        { id: 5, nombre: "Carlos Repartidor" }
      ]);
    } catch (err) {
      console.error("Error loading config metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUploadExcel = async () => {
    if (!selectedListId || !selectedFile) {
      alert("Por favor seleccione una lista de precios y un archivo Excel.");
      return;
    }
    setUploading(true);
    try {
      await listasPreciosAPI.importarExcel(Number(selectedListId), selectedFile);
      alert("¡Importación de lista de precios completada exitosamente!");
      setSelectedFile(null);
      fetchConfigData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al subir archivo Excel.");
    } finally {
      setUploading(false);
    }
  };

  const handleBulkUpdate = async () => {
    if (!bulkListId || bulkVal === 0) {
      alert("Por favor seleccione la lista y un valor de incremento distinto de 0.");
      return;
    }
    setUpdatingBulk(true);
    try {
      await listasPreciosAPI.actualizarMasivo({
        lista_id: Number(bulkListId),
        tipo_ajuste: bulkType,
        valor: bulkVal,
        departamento: bulkDept || null
      });
      alert("¡Actualización masiva de precios completada!");
      setBulkVal(0);
      setBulkDept('');
      fetchConfigData();
    } catch (err) {
      alert("Error en la actualización de precios.");
    } finally {
      setUpdatingBulk(false);
    }
  };

  const handleCreateRuta = async () => {
    if (!rutaNombre || !rutaZona) {
      alert("Por favor ingrese el nombre y zona de la ruta");
      return;
    }
    try {
      await rutasAPI.create({
        nombre: rutaNombre,
        zona: rutaZona,
        dias_reparto: rutaDias,
        repartidor_id: rutaRepartidorId ? Number(rutaRepartidorId) : null
      });
      alert("¡Nueva ruta creada con éxito!");
      setRutaNombre('');
      setRutaZona('');
      setRutaRepartidorId('');
      fetchConfigData();
    } catch (err) {
      alert("Error al crear ruta de reparto");
    }
  };

  const handleSaveSerials = async () => {
    try {
      await configuracionAPI.update('NUM_FACTURA_SIGUIENTE', nextFC);
      await configuracionAPI.update('NUM_REMITO_SIGUIENTE', nextRM);
      alert('¡Secuencias guardadas!');
      fetchConfigData();
    } catch (err) {
      alert('Error al actualizar secuencias');
    }
  };

  const handlePurgeSelf = async () => {
    const confirm1 = window.confirm(
      '⚠️ ZONA DE PELIGRO\n\nEsta acción eliminará PERMANENTEMENTE tu empresa y TODOS sus datos del sistema (pedidos, clientes, productos, cuentas, comprobantes, rutas, etc.)\n\n¿Deseas continuar?'
    );
    if (!confirm1) return;

    const confirmText = window.prompt(
      'Para confirmar la eliminación irreversible, escribe exactamente: ELIMINAR MI EMPRESA'
    );
    if (confirmText?.trim() !== 'ELIMINAR MI EMPRESA') {
      alert('Texto de confirmación incorrecto. Operación cancelada.');
      return;
    }

    setPurging(true);
    try {
      await configuracionAPI.purgeSelf();
      alert('✅ Tu empresa y todos sus datos han sido eliminados exitosamente. Serás redirigido.');
      logout();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al eliminar los datos. Contacta soporte.');
    } finally {
      setPurging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in bg-slate-50/50 p-6 rounded-[2.5rem]">
      {/* Trial Header Banner */}
      {diasRestantes !== null && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between ${showWarningBanner ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-amber-50/50 border-amber-100 text-amber-700'}`}>
          <div className="flex items-center space-x-3">
             <AlertTriangle className={`h-5 w-5 ${showWarningBanner ? 'text-rose-500 animate-pulse' : 'text-amber-500'}`} />
             <p className="text-[11px] font-black uppercase tracking-widest">
               {showWarningBanner 
                 ? `⚠️ TU PRUEBA GRATUITA VENCE EN ${diasRestantes} DÍAS. REGISTRE SU PAGO PARA CONTINUAR.`
                 : `Periodo de Prueba Activo: Te quedan ${diasRestantes} días de acceso gratuito.`
               }
             </p>
          </div>
          <button 
            onClick={() => setShowBillingModal(true)}
            className="text-[10px] font-black underline uppercase tracking-widest hover:text-brand-600 transition-colors"
          >
            Gestionar Suscripción →
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">Configuración del Sistema</h1>
          <p className="text-slate-500 text-[11px] font-bold uppercase tracking-widest mt-1">Opciones exclusivas de Superadmin para actualizar catálogos, importar costos y coordinar rutas.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Tab 1: Excel Pricing Importer */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <Upload className="h-6 w-6 text-brand-600" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Importador de Precios (Excel)</h3>
          </div>

          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
            Actualice masivamente descripciones, costos, precios, existencias y familias desde una planilla Excel. El sistema limpiará los prefijos numéricos de los códigos automáticamente.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Lista de Precios Destino</label>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Seleccione...</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre} (Prefijo: {l.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Archivo .xlsx</label>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full text-[10px] font-black text-slate-400 file:mr-4 file:py-3 file:px-6 file:rounded-2xl file:border file:border-slate-200 file:text-[10px] file:font-black file:uppercase file:bg-slate-50 file:text-brand-600 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>

            <button
              onClick={handleUploadExcel}
              disabled={uploading || !selectedListId || !selectedFile}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-900/10 transition disabled:opacity-50 flex items-center justify-center space-x-2 active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>{uploading ? 'Importando...' : 'Iniciar Importación'}</span>
            </button>
          </div>
        </div>

        {/* Tab 2: Bulk Pricing Editor */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <TrendingUp className="h-6 w-6 text-brand-600" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Actualización Masiva</h3>
          </div>

          <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-relaxed">
            Incremente o decremente precios de venta y mayoreo en pesos o por porcentaje. Filtre opcionalmente por departamento.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Lista a Afectar</label>
              <select
                value={bulkListId}
                onChange={(e) => setBulkListId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Seleccione...</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Categoría (Opcional)</label>
              <select
                value={bulkDept}
                onChange={(e) => setBulkDept(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="">Todas</option>
                <option value="Cortes frescos">Cortes frescos</option>
                <option value="Chacinados">Chacinados</option>
                <option value="Salazones">Salazones</option>
                <option value="Embutidos">Embutidos</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Tipo Ajuste</label>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value as any)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="fijo">Monto Fijo ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Valor de Ajuste (+/-)</label>
              <input
                type="number"
                value={bulkVal}
                onChange={(e) => setBulkVal(Number(e.target.value))}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <button
            onClick={handleBulkUpdate}
            disabled={updatingBulk || !bulkListId || bulkVal === 0}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-900/10 transition disabled:opacity-50 active:scale-95"
          >
            {updatingBulk ? 'Ajustando Precios...' : 'Aplicar Ajuste de Precios'}
          </button>
        </div>

        {/* Tab 3: Delivery Routes CRUD */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <Truck className="h-6 w-6 text-brand-600" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Rutas y Logística</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Nombre de Ruta</label>
              <input
                type="text"
                placeholder="Ruta Sur, Córdoba Centro..."
                value={rutaNombre}
                onChange={(e) => setRutaNombre(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Zona Cobertura</label>
              <input
                type="text"
                placeholder="Zona Sur / CPC Villa Libertador"
                value={rutaZona}
                onChange={(e) => setRutaZona(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Días Reparto</label>
              <input
                type="text"
                value={rutaDias}
                onChange={(e) => setRutaDias(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Chofer Asignado</label>
              <select
                value={rutaRepartidorId}
                onChange={(e) => setRutaRepartidorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 shadow-sm"
              >
                <option value="">Sin Asignar</option>
                {repartidores.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={handleCreateRuta}
            className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-900/10 transition active:scale-95"
          >
            Registrar Nueva Ruta
          </button>

          {/* List of active routes */}
          <div className="pt-2">
            <h4 className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] mb-3 px-1">Rutas Registradas</h4>
            <div className="border border-slate-100 rounded-3xl divide-y divide-slate-100 bg-slate-50/30 max-h-[200px] overflow-y-auto custom-scrollbar">
              {rutas.map(r => (
                <div key={r.id} className="p-4 flex justify-between items-center hover:bg-white transition-colors">
                  <div>
                    <span className="font-black text-slate-900 uppercase tracking-tight text-xs">{r.nombre}</span>
                    <span className="text-slate-400 block text-[9px] font-bold uppercase tracking-widest mt-1">{r.zona} • Reparto: {r.dias_reparto}</span>
                  </div>
                  <span className="px-2 py-1 bg-white text-slate-400 border border-slate-200 rounded-lg text-[8px] font-black uppercase tracking-widest">
                     {r.repartidor?.nombre || 'Sin Chofer'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 4: System Parameters & Serials */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm hover:shadow-xl transition-all duration-300">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100">
            <Wrench className="h-6 w-6 text-brand-600" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Parámetros del Sistema</h3>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Próximo Nro. Correlativo Factura</label>
              <input
                type="text"
                value={nextFC}
                onChange={(e) => setNextFC(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono shadow-sm"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">Próximo Nro. Correlativo Remito</label>
              <input
                type="text"
                value={nextRM}
                onChange={(e) => setNextRM(e.target.value)}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-mono shadow-sm"
              />
            </div>

            <button
              onClick={handleSaveSerials}
              className="w-full py-4 bg-brand-600 hover:bg-brand-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-900/10 transition active:scale-95"
            >
              Guardar Cambios de Secuencias
            </button>
          </div>
        </div>

      </div>

      {/* Danger Zone: Self Purge */}
      <div className="border border-red-900/50 rounded-2xl bg-red-950/10 p-6 space-y-4 mt-4">
        <div className="flex items-center space-x-2 pb-2 border-b border-red-900/40">
          <AlertTriangle className="h-5 w-5 text-red-500 animate-pulse" />
          <h3 className="text-lg font-bold text-red-400">Zona de Peligro — Baja y Purga de Datos</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <div className="space-y-2">
            <p className="text-xs text-slate-400 leading-relaxed">
              Puedes cancelar tu suscripción y solicitar la <strong className="text-red-400">eliminación permanente e irreversible</strong> de todos tus datos del sistema en cualquier momento durante el período de prueba (o posterior).
            </p>
            <ul className="text-xs text-slate-500 space-y-1 list-none">
              {[
                'Pedidos, remitos y comprobantes',
                'Clientes, productos y listas de precios',
                'Rutas de reparto y choferes',
                'Cuentas corrientes y movimientos de caja',
                'Usuarios y configuraciones del sistema',
                'La empresa completa (este tenant)',
              ].map((item) => (
                <li key={item} className="flex items-center space-x-2">
                  <Trash2 className="h-3 w-3 text-red-700 flex-shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="text-[10px] text-red-400/80 font-semibold mt-2">
              ⚠️ Esta operación NO tiene marcha atrás. Requiere doble confirmación explícita.
            </p>
          </div>

          <div className="flex flex-col justify-center space-y-3">
            <div className="bg-red-950/20 border border-red-900/30 rounded-xl p-4 text-xs text-red-300/80 leading-relaxed">
              Al confirmar la baja, tu sesión se cerrará automáticamente y tus datos serán purgados del servidor de forma inmediata. No podrás recuperar ninguna información.
            </div>
            <button
              onClick={handlePurgeSelf}
              disabled={purging}
              className="w-full py-3 bg-red-700/20 hover:bg-red-700/40 border border-red-700/50 hover:border-red-500 text-red-400 hover:text-red-300 font-bold text-sm rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <Trash2 className="h-4 w-4" />
              <span>{purging ? 'Eliminando datos...' : 'Eliminar empresa y purgar todos los datos'}</span>
            </button>
          </div>
        </div>
      </div>
      {/* Subscription / Billing Modal */}
      {showBillingModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowBillingModal(false)} />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Suscripción</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active un plan profesional para desbloquear todas las funciones.</p>
              </div>
              <button 
                onClick={() => setShowBillingModal(false)}
                className="p-2 hover:bg-white rounded-full transition-colors text-slate-400 hover:text-slate-900"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-8 space-y-8">
              {/* Plan Selection */}
              <div className="grid grid-cols-2 gap-4">
                {['profesional', 'enterprise'].map((p) => (
                  <button
                    key={p}
                    onClick={() => console.log("Plan selected:", p)}
                    className={`p-6 rounded-[2rem] border-2 transition-all text-left relative overflow-hidden group ${
                      user?.tenant?.plan === p 
                      ? 'border-brand-600 bg-brand-50/10' 
                      : 'border-slate-100 bg-slate-50/50 hover:border-brand-200'
                    }`}
                  >
                    {user?.tenant?.plan === p && (
                      <div className="absolute top-4 right-4 bg-brand-600 text-white rounded-full p-1">
                        <CheckCircle className="h-3 w-3" />
                      </div>
                    )}
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{p}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                      {p === 'profesional' ? '$150.000 / mes' : 'Consultar Precio'}
                    </p>
                  </button>
                ))}
              </div>

              {/* Mock Payment Form */}
              <div className="space-y-4">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Detalles de Pago</h4>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                       <input 
                         type="text" 
                         placeholder="NÚMERO DE TARJETA"
                         className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900"
                         value={cardData.number}
                         onChange={(e) => setCardData({...cardData, number: e.target.value})}
                       />
                    </div>
                    <input 
                       type="text" 
                       placeholder="EXP (MM/YY)"
                       className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900"
                       value={cardData.expiry}
                       onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                    />
                    <input 
                       type="text" 
                       placeholder="CVV"
                       className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-900"
                       value={cardData.cvv}
                       onChange={(e) => setCardData({...cardData, cvv: e.target.value})}
                    />
                 </div>
              </div>
            </div>

            <div className="p-8 bg-slate-50/50 border-t border-slate-100">
               <button
                 onClick={async () => {
                   setIsActivating(true);
                   try {
                     await configuracionAPI.activarSuscripcion('profesional');
                     await refreshProfile();
                     setShowBillingModal(false);
                     alert("¡Suscripción activada con éxito!");
                   } catch (err) {
                     alert("Error al procesar el pago.");
                   } finally {
                     setIsActivating(false);
                   }
                 }}
                 disabled={isActivating || !cardData.number}
                 className="w-full py-5 bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-[0.2em] rounded-3xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-3"
               >
                 <CreditCard className="h-5 w-5" />
                 <span>{isActivating ? 'PROCESANDO...' : 'ACTIVAR SUSCRIPCIÓN'}</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Extreme Section: Danger Zone (Purge) - Cleaner Light Theme */}
      <div className="mt-12 p-8 border border-rose-100 bg-white rounded-[2.5rem] flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-rose-50 rounded-2xl">
            <Trash2 className="h-6 w-6 text-rose-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Zona de Peligro</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Eliminación permanente de todos los datos del tenant.</p>
          </div>
        </div>
        <button
          onClick={handlePurgeSelf}
          disabled={purging}
          className="px-8 py-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 font-black text-[10px] uppercase tracking-widest rounded-2xl transition disabled:opacity-50"
        >
          {purging ? 'Eliminando...' : 'Eliminar Empresa Definitivamente'}
        </button>
      </div>
    </div>
  );
};

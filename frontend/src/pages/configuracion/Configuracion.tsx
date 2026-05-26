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
  Trash2
} from 'lucide-react';

export const Configuracion: React.FC = () => {
  const { logout } = useAuth();
  const [listas, setListas] = useState<any[]>([]);
  const [rutas, setRutas] = useState<any[]>([]);
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-rose-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white">Configuración del Sistema</h1>
        <p className="text-slate-400 text-sm mt-1">Opciones exclusivas de Superadmin para actualizar catálogos, importar costos y coordinar rutas.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Tab 1: Excel Pricing Importer */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Upload className="h-5 w-5 text-rose-500" />
            <h3 className="text-lg font-bold text-white">Importador de Precios (Excel)</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Actualice masivamente descripciones, costos, precios, existencias y familias desde una planilla Excel. El sistema limpiará los prefijos numéricos de los códigos automáticamente.
          </p>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Lista de Precios Destino</label>
              <select
                value={selectedListId}
                onChange={(e) => setSelectedListId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="">Seleccione...</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre} (Prefijo: {l.id})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Archivo .xlsx</label>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileChange}
                className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-rose-450 hover:file:bg-slate-750"
              />
            </div>

            <button
              onClick={handleUploadExcel}
              disabled={uploading || !selectedListId || !selectedFile}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50 flex items-center justify-center"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {uploading ? 'Importando...' : 'Iniciar Importación'}
            </button>
          </div>
        </div>

        {/* Tab 2: Bulk Pricing Editor */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <TrendingUp className="h-5 w-5 text-rose-500" />
            <h3 className="text-lg font-bold text-white">Actualización Masiva de Precios</h3>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Incremente o decremente precios de venta y mayoreo en pesos o por porcentaje. Filtre opcionalmente por departamento.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Lista a Afectar</label>
              <select
                value={bulkListId}
                onChange={(e) => setBulkListId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="">Seleccione...</option>
                {listas.map(l => (
                  <option key={l.id} value={l.id}>{l.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Categoría (Opcional)</label>
              <select
                value={bulkDept}
                onChange={(e) => setBulkDept(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="">Todas</option>
                <option value="Cortes frescos">Cortes frescos</option>
                <option value="Chacinados">Chacinados</option>
                <option value="Salazones">Salazones</option>
                <option value="Embutidos">Embutidos</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Tipo Ajuste</label>
              <select
                value={bulkType}
                onChange={(e) => setBulkType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
              >
                <option value="porcentaje">Porcentaje (%)</option>
                <option value="fijo">Monto Fijo ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Valor de Ajuste (+/-)</label>
              <input
                type="number"
                value={bulkVal}
                onChange={(e) => setBulkVal(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
              />
            </div>
          </div>

          <button
            onClick={handleBulkUpdate}
            disabled={updatingBulk || !bulkListId || bulkVal === 0}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition disabled:opacity-50"
          >
            {updatingBulk ? 'Ajustando Precios...' : 'Aplicar Ajuste de Precios'}
          </button>
        </div>

        {/* Tab 3: Delivery Routes CRUD */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Truck className="h-5 w-5 text-rose-500" />
            <h3 className="text-lg font-bold text-white">Rutas y Logística de Reparto</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Nombre de Ruta</label>
              <input
                type="text"
                placeholder="Ruta Sur, Córdoba Centro..."
                value={rutaNombre}
                onChange={(e) => setRutaNombre(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Zona Cobertura</label>
              <input
                type="text"
                placeholder="Zona Sur / CPC Villa Libertador"
                value={rutaZona}
                onChange={(e) => setRutaZona(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Días Reparto</label>
              <input
                type="text"
                value={rutaDias}
                onChange={(e) => setRutaDias(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Chofer Asignado</label>
              <select
                value={rutaRepartidorId}
                onChange={(e) => setRutaRepartidorId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none"
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
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
          >
            Registrar Nueva Ruta
          </button>

          {/* List of active routes */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Rutas Registradas</h4>
            <div className="border border-slate-800 rounded-xl divide-y divide-slate-800 bg-slate-950/20 max-h-[200px] overflow-y-auto">
              {rutas.map(r => (
                <div key={r.id} className="p-3 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-white">{r.nombre}</span>
                    <span className="text-slate-450 block text-[10px]">{r.zona} • Reparto: {r.dias_reparto}</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">
                    Chofer: {r.repartidor?.nombre || 'Ninguno'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tab 4: System Parameters & Serials */}
        <div className="border border-slate-800 rounded-2xl bg-slate-900/40 p-6 space-y-4">
          <div className="flex items-center space-x-2 pb-2 border-b border-slate-800">
            <Wrench className="h-5 w-5 text-rose-500" />
            <h3 className="text-lg font-bold text-white">Parámetros del Sistema</h3>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Próximo Nro. Correlativo Factura</label>
              <input
                type="text"
                value={nextFC}
                onChange={(e) => setNextFC(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-405 uppercase tracking-wider mb-2">Próximo Nro. Correlativo Remito</label>
              <input
                type="text"
                value={nextRM}
                onChange={(e) => setNextRM(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm font-mono text-white focus:outline-none"
              />
            </div>

            <button
              onClick={handleSaveSerials}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow transition"
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
    </div>
  );
};

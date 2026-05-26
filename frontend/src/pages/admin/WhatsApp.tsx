import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, QrCode, CheckCircle2, XCircle, 
  RefreshCw, Smartphone, ShieldCheck, AlertCircle,
  ExternalLink, ArrowRight, Pencil, Trash2, Plus, ShoppingCart
} from 'lucide-react';
import { pedidosAPI, clientesAPI, listasPreciosAPI, productosAPI } from '../../services/api';
// Assuming we'll add whatsappAPI to services/api.ts. For now we use the general api structure.
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { SearchableSelect } from '../../components/SearchableSelect';

export const WhatsAppAdmin: React.FC = () => {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'loading' | 'connecting' | 'qr_ready'>('loading');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Edit States
  const [editingPedido, setEditingPedido] = useState<any | null>(null);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [clientPriceList, setClientPriceList] = useState<any | null>(null);
  const [allProductos, setAllProductos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [editClienteId, setEditClienteId] = useState<number | ''>('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Item to Edit states
  const [addProductId, setAddProductId] = useState<number | ''>('');
  const [addUnits, setAddUnits] = useState(1);
  const [addWeight, setAddWeight] = useState(10);

  const { user } = useAuth();
  const tenantSlug = user?.tenant?.slug;

  useEffect(() => {
    fetchStatus();
    fetchPendingOrders();
    loadInitialData();
    
    // Poll status every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [tenantSlug]);

  const loadInitialData = async () => {
    try {
      const [prods, clients] = await Promise.all([
        productosAPI.list(),
        clientesAPI.list()
      ]);
      setAllProductos(prods || []);
      setClientes(clients || []);
    } catch (err) {
      console.error("Error loading initial data in WhatsApp:", err);
    }
  };

  const fetchStatus = async () => {
    if (!tenantSlug) return;
    try {
      const res = await api.get(`/whatsapp/status/${tenantSlug}`);
      setStatus(res.data.status);
      setQrCode(res.data.qr);
    } catch (err) {
      console.error("Error fetching WhatsApp status:", err);
      setStatus('disconnected');
    }
  };

  const handleLogoutSession = async () => {
    if (!tenantSlug) return;
    if (!confirm("¿Está seguro de cerrar la sesión de WhatsApp? Su bot dejará de recibir pedidos hasta que vuelva a escanear el QR.")) return;
    try {
      await api.post(`/whatsapp/logout/${tenantSlug}`);
      fetchStatus();
    } catch (err) {
      console.error("Error disconnecting WhatsApp session:", err);
      alert("No se pudo desconectar la sesión de WhatsApp.");
    }
  };

  const fetchPendingOrders = async () => {
    setLoadingOrders(true);
    try {
      // Filter orders by specific status we created
      const res = await api.get('/pedidos/?estado=Pendiente de Validación');
      setPendingOrders(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleValidate = async (pedidoId: number) => {
    try {
      await api.put(`/pedidos/${pedidoId}`, { estado: 'Pendiente de preparación' });
      fetchPendingOrders();
    } catch (err) {
      console.error("Error al validar pedido:", err);
      alert("No se pudo validar el pedido");
    }
  };

  const handleDiscard = async (pedidoId: number) => {
    if (!confirm("¿Está seguro de descartar este pedido?")) return;
    try {
      await api.delete(`/pedidos/${pedidoId}`);
      fetchPendingOrders();
    } catch (err) {
      console.error("Error al descartar pedido:", err);
      alert("No se pudo descartar el pedido");
    }
  };

  const handleEditClick = async (pedido: any) => {
    setEditingPedido(pedido);
    setEditItems(pedido.items || []);
    setEditClienteId(pedido.cliente_id || '');
    
    // Load client price list
    if (pedido.cliente?.lista_precios_id) {
       try {
         const res = await listasPreciosAPI.getDetalles(pedido.cliente.lista_precios_id);
         setClientPriceList(res);
       } catch (err) {
         console.error(err);
       }
    } else {
       setClientPriceList(null);
    }
  };

  const handleClientChange = async (clientId: number | '') => {
    setEditClienteId(clientId);
    if (clientId === '') {
      setClientPriceList(null);
      return;
    }
    const client = clientes.find(c => c.id === clientId);
    if (client && client.lista_precios_id) {
      try {
        const listDetails = await listasPreciosAPI.getDetalles(client.lista_precios_id);
        setClientPriceList(listDetails);
        
        // Update items prices or remove if not in price list
        const updatedItems = editItems.map(item => {
          const detail = listDetails.detalles.find((d: any) => d.producto_id === item.producto_id);
          if (detail) {
            return {
              ...item,
              precio_unitario: detail.precio_venta
            };
          }
          return null;
        }).filter(Boolean);
        setEditItems(updatedItems);
      } catch (err) {
        console.error(err);
        alert("Error al cargar la lista de precios del nuevo cliente");
        setClientPriceList(null);
      }
    } else {
      setClientPriceList(null);
      setEditItems([]);
    }
  };

  const handleAddItemToEdit = () => {
    if (!addProductId || !clientPriceList) return;
    const priceDetail = clientPriceList.detalles.find((d: any) => d.producto_id === addProductId);
    if (!priceDetail) {
      alert("El producto no está en la lista de precios del cliente");
      return;
    }
    const product = allProductos.find(p => p.id === addProductId);
    
    const newItem = {
      producto_id: addProductId,
      cantidad_unidades: addUnits,
      peso_estimado_kg: addWeight,
      producto: product, // For display
      precio_unitario: priceDetail.precio_venta
    };
    
    setEditItems([...editItems, newItem]);
    setAddProductId('');
    setAddUnits(1);
    setAddWeight(10);
  };

  const handleSaveEdit = async () => {
    if (!editingPedido) return;
    setSavingEdit(true);
    try {
      await api.put(`/pedidos/${editingPedido.id}`, {
        cliente_id: editClienteId || undefined,
        items: editItems.map(it => ({
          producto_id: it.producto_id,
          cantidad_unidades: it.cantidad_unidades,
          peso_estimado_kg: it.peso_estimado_kg
        }))
      });
      setEditingPedido(null);
      fetchPendingOrders();
    } catch (err) {
      console.error(err);
      alert("Error al guardar cambios");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">WhatsApp Business</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium italic">Automatización de pedidos mediante OpenWA e Inteligencia Artificial.</p>
        </div>
        <div className={`flex items-center space-x-2 px-4 py-2 rounded-2xl border ${
          status === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${status === 'connected' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          <span className="text-xs font-bold uppercase tracking-widest">{status === 'connected' ? 'Servicio Activo' : 'Esperando Conexión'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connection Management */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                <QrCode className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">Vincular Celular</h2>
            </div>

            {status !== 'connected' ? (
              <div className="space-y-6">
                <div className="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center p-8 text-center">
                  {status === 'loading' ? (
                    <div className="flex flex-col items-center justify-center">
                      <RefreshCw className="h-12 w-12 text-slate-300 mb-4 animate-spin" />
                      <p className="text-xs text-slate-400 font-medium px-4">Cargando estado de la sesión...</p>
                    </div>
                  ) : qrCode ? (
                    <img src={qrCode} alt="QR Code" className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <Smartphone className="h-12 w-12 text-slate-300 mb-4 animate-pulse" />
                      <p className="text-xs text-slate-400 font-medium px-4 font-semibold text-slate-500">
                        {status === 'connecting' ? 'Conectando con WhatsApp...' : 'Iniciando sesión en WhatsApp Web...'}
                      </p>
                    </>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3 text-xs text-slate-500 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>Abra WhatsApp en su teléfono</span>
                  </div>
                  <div className="flex items-start space-x-3 text-xs text-slate-500 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5" />
                    <span>Toque Menú o Configuración y seleccione Dispositivos vinculados</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center space-y-4">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                  <ShieldCheck className="h-10 w-10" />
                </div>
                <div>
                  <p className="text-slate-900 font-bold uppercase tracking-tight">Sesión Vinculada</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Bot operando normalmente</p>
                </div>
                <button 
                  onClick={handleLogoutSession}
                  className="text-[10px] font-bold text-red-500 uppercase tracking-widest border border-red-100 px-4 py-2 rounded-xl hover:bg-red-50 transition-all"
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>

          <div className="bg-slate-900 rounded-[2rem] p-8 text-white space-y-4">
            <div className="flex items-center space-x-2 text-brand-400">
              <AlertCircle className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Estado del Motor AI</span>
            </div>
            <p className="text-sm font-medium leading-relaxed opacity-80">
              Utilizando <span className="text-brand-400 font-bold">GPT-4o</span> para el procesamiento de lenguaje natural. Precisión estimada: 94%.
            </p>
          </div>
        </div>

        {/* Orders List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-brand-50 rounded-xl text-brand-600">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pedidos Detectados</h2>
              </div>
              <button 
                onClick={fetchPendingOrders}
                className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-all"
              >
                <RefreshCw className={`h-5 w-5 ${loadingOrders ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="space-y-4">
              {loadingOrders ? (
                <div className="py-20 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
                </div>
              ) : pendingOrders.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-sm text-slate-300 font-medium italic">No hay nuevos pedidos de WhatsApp</p>
                </div>
              ) : (
                pendingOrders.map((pedido) => (
                  <div key={pedido.id} className="p-6 border border-slate-100 bg-slate-50/50 rounded-3xl hover:border-brand-200 transition-all group">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center space-x-3">
                          <span className="text-lg font-bold text-slate-900 uppercase">{pedido.cliente?.razon_social}</span>
                          <span className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            {new Date(pedido.fecha).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Via WhatsApp: {pedido.cliente?.telefono_whatsapp}</p>
                      </div>
                      <div className="text-right flex items-start space-x-4">
                        <div>
                           <span className="block text-xl font-black text-brand-600 leading-none">${pedido.total.toLocaleString('es-AR')}</span>
                           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Monto Estimado</span>
                        </div>
                        <button 
                          onClick={() => handleEditClick(pedido)}
                          className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-brand-600 transition-all shadow-sm"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white/80 border border-slate-100 rounded-2xl p-4 mb-4">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1.5" /> Mensaje Original
                      </p>
                      <p className="text-xs text-slate-700 italic font-medium">"{pedido.observaciones?.replace('WhatsApp: ', '') || 'Sin observaciones'}"</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex -space-x-1">
                        {pedido.items?.map((item: any) => (
                          <div key={item.id} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 shadow-sm" title={`${item.producto?.descripcion} (${item.cantidad_unidades}u)`}>
                            {item.producto?.descripcion?.substring(0, 2).toUpperCase() || '??'}
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-3">
                        <button 
                          onClick={() => handleDiscard(pedido.id)}
                          className="flex items-center space-x-2 px-4 py-2 text-slate-400 hover:text-red-500 font-bold text-[10px] uppercase tracking-widest transition-all"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Descartar</span>
                        </button>
                        <button 
                          onClick={() => handleValidate(pedido.id)}
                          className="flex items-center space-x-2 px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-brand-900/10"
                        >
                          <span>Validar Pedido</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Refinement Modal */}
      {editingPedido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-[2.5rem] p-10 space-y-8 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-brand-50 rounded-2xl text-brand-600">
                  <Pencil className="h-6 w-6" />
                </div>
                <div>
                   <h3 className="text-2xl font-bold text-slate-900 tracking-tight">Refinar Pedido</h3>
                   <p className="text-slate-400 text-xs font-medium">Corrija errores de transcripción antes de validar.</p>
                </div>
              </div>
              <button onClick={() => setEditingPedido(null)} className="text-slate-300 hover:text-slate-900"><XCircle className="h-7 w-7" /></button>
            </div>

            <div className="space-y-6">
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 italic text-xs text-slate-600 leading-relaxed">
                  "{editingPedido.observaciones?.replace('WhatsApp: ', '')}"
               </div>

               {/* Client Selection */}
               <div className="space-y-2">
                 <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   Cliente Asignado *
                 </label>
                 <SearchableSelect
                   options={clientes}
                   value={editClienteId}
                   onChange={(id) => handleClientChange(id)}
                   placeholder="Buscar cliente por razón social o CUIT..."
                   searchFields={['razon_social', 'cuit', 'codigo']}
                   getOptionLabel={(c) => c.razon_social}
                   getOptionSublabel={(c) => `CUIT: ${c.cuit || '—'}  |  Lista: ${c.lista_precios?.nombre || 'General'}`}
                 />
               </div>

               {/* Add product Inline */}
               <div className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                    <Plus className="h-3 w-3 mr-2 text-brand-600" /> Añadir producto
                  </h4>
                  <SearchableSelect
                    options={(clientPriceList?.detalles || []).map((d: any) => ({
                      id: d.producto_id,
                      ...d.producto,
                      precio_venta: d.precio_venta,
                    }))}
                    value={addProductId}
                    onChange={(id) => setAddProductId(id)}
                    placeholder="Buscar por código o descripción..."
                    searchFields={['codigo', 'descripcion']}
                    getOptionLabel={(p) => p.descripcion}
                    getOptionSublabel={(p) => `Cód: ${p.codigo}  |  $${p.precio_venta}/kg`}
                    disabled={!clientPriceList}
                  />
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Cant.</label>
                      <input 
                        type="number" value={addUnits} min="1" onChange={(e) => setAddUnits(Number(e.target.value))}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold text-center bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 font-bold mb-1 uppercase tracking-widest">Kg Est.</label>
                      <input 
                        type="number" value={addWeight} min="0.1" step="0.5" onChange={(e) => setAddWeight(Number(e.target.value))}
                        className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold text-center bg-slate-50 font-mono focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                    <button 
                      onClick={handleAddItemToEdit}
                      className="flex items-center justify-center bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-black transition-all mt-5"
                    >
                      <Plus className="h-4 w-4 mr-1" /> Añadir
                    </button>
                  </div>
               </div>

               {/* Items List */}
               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 flex items-center">
                    <ShoppingCart className="h-3 w-3 mr-2" /> Detalle a Validar
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-3xl overflow-hidden bg-white shadow-sm">
                    {editItems.map((item, idx) => (
                      <div key={idx} className="p-4 flex items-center justify-between group">
                        <div className="flex-1">
                          <div className="font-bold text-slate-900 text-sm">{item.producto?.descripcion || 'Producto'}</div>
                          <div className="flex items-center space-x-3 mt-1">
                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] text-slate-400 font-bold">Cant:</span>
                              <input 
                                type="number" 
                                value={item.cantidad_unidades} 
                                onChange={(e) => {
                                  const updated = [...editItems];
                                  updated[idx].cantidad_unidades = Number(e.target.value);
                                  setEditItems(updated);
                                }}
                                className="w-12 text-xs font-bold bg-slate-50 border border-slate-200 rounded px-1"
                              />
                            </div>
                            <div className="flex items-center space-x-1">
                              <span className="text-[10px] text-slate-400 font-bold">Kg Est:</span>
                              <input 
                                type="number" 
                                value={item.peso_estimado_kg} 
                                onChange={(e) => {
                                  const updated = [...editItems];
                                  updated[idx].peso_estimado_kg = Number(e.target.value);
                                  setEditItems(updated);
                                }}
                                className="w-12 text-xs font-bold bg-slate-50 border border-slate-200 rounded px-1"
                              />
                            </div>
                          </div>
                        </div>
                        <button 
                          onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    {editItems.length === 0 && (
                      <div className="p-10 text-center text-slate-300 text-xs italic">No hay productos en el pedido</div>
                    )}
                  </div>
               </div>
            </div>

            <div className="flex space-x-4 pt-6 border-t border-slate-100">
               <button 
                onClick={() => setEditingPedido(null)}
                className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-2xl transition-all uppercase tracking-widest"
               >
                 Cancelar
               </button>
               <button 
                onClick={handleSaveEdit}
                disabled={savingEdit || editItems.length === 0}
                className="flex-1 py-4 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-2xl transition-all shadow-xl shadow-brand-900/10 uppercase tracking-widest disabled:opacity-50"
               >
                 {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

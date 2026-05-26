import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package, Truck, FileText, Users, MessageSquare,
  BarChart3, CheckCircle2, ArrowRight, Menu, X,
  Smartphone, Zap, Shield, Globe, Star, ChevronDown,
  ClipboardList, Coins, MapPin, TrendingUp, Store, Factory
} from 'lucide-react';

// ── Navbar ────────────────────────────────────────────────────────────────────
const Navbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-xl shadow-md border-b border-slate-100' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="#hero" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform">
            <Package className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900">
            ERP<span className="text-violet-600">ERIA</span>
          </span>
        </a>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
          <a href="#features" className="hover:text-violet-600 transition-colors">Funcionalidades</a>
          <a href="#sectores" className="hover:text-violet-600 transition-colors">Sectores</a>
          <a href="#how" className="hover:text-violet-600 transition-colors">Cómo funciona</a>
          <a href="#planes" className="hover:text-violet-600 transition-colors">Planes</a>
          <a href="#contacto" className="hover:text-violet-600 transition-colors">Contacto</a>
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center space-x-3">
          <Link to="/login" className="text-sm font-bold text-slate-700 hover:text-violet-600 transition-colors px-4 py-2">
            Ingresar
          </Link>
          <Link to="/signup" className="px-5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl hover:from-violet-500 hover:to-indigo-500 transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/35">
            Comenzar gratis →
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button onClick={() => setOpen(!open)} className="md:hidden text-slate-600 hover:text-slate-900 p-2 rounded-lg">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-slate-100 px-6 py-6 space-y-4 shadow-xl">
          {['#features', '#sectores', '#how', '#planes', '#contacto'].map((href, i) => (
            <a key={i} href={href} onClick={() => setOpen(false)} className="block text-slate-700 hover:text-violet-600 font-semibold py-2 transition-colors">
              {['Funcionalidades', 'Sectores', 'Cómo funciona', 'Planes', 'Contacto'][i]}
            </a>
          ))}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <Link to="/login" className="block text-center text-slate-700 font-bold py-2">Ingresar</Link>
            <Link to="/signup" className="block text-center px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl shadow-md shadow-violet-500/25">
              Comenzar gratis →
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

// ── Hero ──────────────────────────────────────────────────────────────────────
const Hero: React.FC = () => (
  <section id="hero" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-white px-6 pt-24 pb-20">
    {/* Background elements */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-violet-100/40 rounded-full blur-[120px]" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px]" />
      {/* Tens geometric pattern */}
      <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>

    {/* Badge */}
    <div className="relative mb-6 flex items-center space-x-2 bg-violet-50 border border-violet-100 text-violet-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full">
      <Zap className="h-3 w-3 text-violet-600" />
      <span>ERP en la nube para PyMEs — Sin instalaciones</span>
    </div>

    {/* Heading */}
    <h1 className="relative text-center text-4xl md:text-7xl font-black text-slate-900 leading-[1.05] tracking-tight max-w-5xl">
      Tu operación comercial,<br />
      <span className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
        completamente online.
      </span>
    </h1>

    <p className="relative mt-6 text-center text-base md:text-xl text-slate-600 max-w-2xl leading-relaxed">
      <strong className="text-slate-900 font-bold">ERPERIA</strong> centraliza tus pedidos, stock, rutas de reparto, facturación y cuentas corrientes en una sola plataforma. Diseñada para distribuidoras, comercios y empresas de producción que quieren crecer con orden y control.
    </p>

    {/* CTAs */}
    <div className="relative mt-10 flex flex-col sm:flex-row items-center gap-4">
      <Link to="/signup" className="group px-8 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-2xl text-base hover:from-violet-500 hover:to-indigo-500 transition-all shadow-xl shadow-violet-500/20 hover:shadow-violet-500/35 flex items-center space-x-2">
        <span>Empezar 30 días gratis</span>
        <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
      </Link>
      <a href="#how" className="px-8 py-4 bg-slate-50 border border-slate-200 text-slate-700 font-semibold rounded-2xl text-base hover:bg-slate-100 transition-all flex items-center space-x-2">
        <span>Ver cómo funciona</span>
        <ChevronDown className="h-5 w-5" />
      </a>
    </div>

    {/* Trust badges */}
    <div className="relative mt-16 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
      {['Sin tarjeta de crédito', 'Configuración en minutos', 'Soporte en español', 'Multi-empresa (SaaS)'].map((text) => (
        <div key={text} className="flex items-center space-x-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span className="font-semibold">{text}</span>
        </div>
      ))}
    </div>

    {/* App Preview mockup */}
    <div className="relative mt-20 w-full max-w-5xl">
      <div className="absolute -inset-1 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 rounded-3xl blur-2xl" />
      <div className="relative bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Browser chrome */}
        <div className="flex items-center space-x-2 px-4 py-3 bg-slate-800/80 border-b border-slate-800/50">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <div className="flex-1 mx-4 bg-slate-700/30 rounded-md h-6 text-[10px] text-slate-400 flex items-center px-3">
            app.erperia.com/dashboard
          </div>
        </div>
        {/* Mock dashboard */}
        <div className="p-6 bg-slate-900 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pedidos Hoy', value: '48', color: 'from-violet-500 to-indigo-500', icon: Package },
            { label: 'Facturado Hoy', value: '$284.500', color: 'from-emerald-500 to-teal-500', icon: Coins },
            { label: 'Rutas Activas', value: '6', color: 'from-amber-500 to-orange-500', icon: MapPin },
            { label: 'Clientes', value: '312', color: 'from-pink-500 to-rose-500', icon: Users },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} className="bg-slate-800/40 border border-slate-800/50 rounded-xl p-4">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center mb-3`}>
                <Icon className="h-4 w-4 text-white" />
              </div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{label}</p>
              <p className="text-xl font-black text-white mt-1">{value}</p>
            </div>
          ))}
          {/* Mini chart placeholder */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3 bg-slate-800/40 border border-slate-800/50 rounded-xl p-4">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Ventas por Cliente — Este Mes</p>
            <div className="space-y-2">
              {[['Distribuidora El Sur', 85], ['Carnes & Co.', 67], ['Don Pepe RRHH', 52], ['Frigorífico Norte', 41]].map(([name, pct]) => (
                <div key={name as string} className="flex items-center space-x-3">
                  <span className="text-xs text-slate-400 w-32 truncate">{name}</span>
                  <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="col-span-1 bg-slate-800/40 border border-slate-800/50 rounded-xl p-4 flex flex-col justify-between">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Despachos</p>
            <div className="space-y-2 mt-2">
              {[['Ruta Norte', '●'], ['Ruta Sur', '●'], ['Ruta Centro', '◐']].map(([ruta, dot]) => (
                <div key={ruta as string} className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">{ruta}</span>
                  <span className={`text-xs ${dot === '●' ? 'text-emerald-400' : 'text-amber-400'}`}>{dot}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── Sectores ──────────────────────────────────────────────────────────────────
const Sectores: React.FC = () => (
  <section id="sectores" className="py-24 bg-slate-50 px-6 border-y border-slate-100">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 mb-4 bg-violet-100/50 border border-violet-100 px-4 py-1.5 rounded-full">Sectores Optimizados</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
          Diseñado para las necesidades de<br />
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">cada tipo de empresa</span>
        </h2>
        <p className="mt-4 text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
          ERPERIA se adapta a tu flujo operativo. Descubre cómo ayudamos a transformar tu industria.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {[
          {
            title: 'Sector Comercio',
            desc: 'Para distribuidoras, mayoristas y comercios medianos. Controla tu facturación rápida, carga remitos al instante y mantén la cuenta corriente de tus clientes al día sin complicaciones.',
            icon: Store,
            img: '/commerce.png',
            tag: 'Comercio & Distribución'
          },
          {
            title: 'Sector Producción',
            desc: 'Especial para fábricas, frigoríficos, y envasadoras. Realiza el seguimiento de lotes de producción, controla tus existencias de materia prima y maneja múltiples listas de precios de forma dinámica.',
            icon: Factory,
            img: '/production.png',
            tag: 'Manufactura & Alimentos'
          },
          {
            title: 'Sector Despacho y Logística',
            desc: 'Diseñado para optimizar rutas de entrega. Los repartidores gestionan las entregas y cobranzas en la calle a través del portal móvil, geolocalizando las rutas en tiempo real.',
            icon: Truck,
            img: '/delivery.png',
            tag: 'Logística & Entregas'
          }
        ].map((sec) => (
          <div key={sec.title} className="bg-white rounded-3xl border border-slate-200/60 overflow-hidden shadow-sm hover:shadow-xl hover:border-violet-200 transition-all duration-300 group flex flex-col">
            {/* Visual Header */}
            <div className="relative h-56 w-full overflow-hidden bg-slate-100">
              <img 
                src={sec.img} 
                alt={sec.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm border border-slate-200/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-700 px-3 py-1.5 rounded-full shadow-sm">
                {sec.tag}
              </span>
            </div>
            {/* Body */}
            <div className="p-6 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                    <sec.icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-xl">{sec.title}</h3>
                </div>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  {sec.desc}
                </p>
              </div>
              <a href="#planes" className="inline-flex items-center text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors group-hover:translate-x-1 duration-200">
                Ver planes para este sector <ArrowRight className="h-4 w-4 ml-1.5" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── Features ──────────────────────────────────────────────────────────────────
const features = [
  { icon: Package, title: 'Gestión de Pedidos', desc: 'Carga pedidos desde cualquier dispositivo. Tus vendedores en campo, la oficina y los clientes desde su portal propio — todo sincronizado en tiempo real.', color: 'from-violet-500 to-indigo-600' },
  { icon: ClipboardList, title: 'Preparación de Bultos (Picking)', desc: 'Genera órdenes de preparación por repartidor, controla el estado de cada bulto con QR y asegúrate de que nada salga sin chequear.', color: 'from-indigo-500 to-blue-600' },
  { icon: Truck, title: 'Hojas de Ruta y Despacho', desc: 'Asignación automática de pedidos a rutas y repartidores. Seguimiento del estado de cada entrega y geolocalización de clientes integrada.', color: 'from-blue-500 to-cyan-600' },
  { icon: FileText, title: 'Facturas y Remitos PDF', desc: 'Genera comprobantes profesionales al instante. Envialos por WhatsApp o email con un solo clic. Todo con tus datos y logo corporativo.', color: 'from-cyan-500 to-teal-600' },
  { icon: Coins, title: 'Cuentas Corrientes', desc: 'Control total de saldos, crédito y deuda de cada cliente. Registra cobros, emite resúmenes y gestiona límites de crédito sin planillas.', color: 'from-teal-500 to-emerald-600' },
  { icon: BarChart3, title: 'Listas de Precios', desc: 'Administra múltiples listas de precios por tipo de cliente: minorista, mayorista, especial. Actualiza masivamente con Excel o por porcentaje.', color: 'from-emerald-500 to-green-600' },
  { icon: MessageSquare, title: 'WhatsApp Integrado', desc: 'Envío automático de pedidos, facturas y notificaciones a tus clientes por WhatsApp. Sin apps de terceros, directo desde ERPERIA.', color: 'from-green-500 to-lime-600' },
  { icon: Smartphone, title: 'Portal de Clientes (PWA)', desc: 'Tus clientes tienen su propia app instalable en el celular para ver pedidos, facturas, cuenta corriente y hacer nuevos pedidos de forma directa.', color: 'from-fuchsia-500 to-violet-600' },
  { icon: TrendingUp, title: 'Dashboard y Reportes', desc: 'KPIs de ventas en tiempo real: facturación diaria, pedidos por cliente, rendimiento de repartidores y ventas por ruta, siempre a la vista.', color: 'from-rose-500 to-pink-600' },
];

const Features: React.FC = () => (
  <section id="features" className="py-24 bg-white px-6">
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 mb-4 bg-violet-50 border border-violet-100 px-4 py-1.5 rounded-full">Todo lo que tu empresa necesita</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900 leading-tight">
          Una plataforma integrada,<br />
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">múltiples soluciones en línea</span>
        </h2>
        <p className="mt-4 text-slate-600 text-base md:text-lg max-w-2xl mx-auto">
          ERPERIA cubre el ciclo completo de tu operación: desde que el cliente hace un pedido hasta que cobra el repartidor.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map(({ icon: Icon, title, desc, color }) => (
          <div key={title} className="group relative bg-slate-50/50 border border-slate-200/50 rounded-3xl p-6 hover:border-violet-300 hover:bg-white hover:shadow-xl transition-all duration-300 cursor-default">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center mb-4 shadow-md shadow-violet-500/10`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
            <h3 className="font-extrabold text-slate-900 text-lg mb-2">{title}</h3>
            <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── How It Works ──────────────────────────────────────────────────────────────
const steps = [
  { num: '01', title: 'Registra tu empresa', desc: 'Crea tu cuenta en minutos. Configura tu razón social, CUIT, logo y colores de marca. Sin instalaciones, sin servidores.', icon: Shield },
  { num: '02', title: 'Carga tus datos', desc: 'Importa tus clientes, productos y listas de precios desde Excel o desde cero. Tu equipo empieza a operar el mismo día.', icon: Globe },
  { num: '03', title: 'Opera y crece', desc: 'Gestiona pedidos, preparación, despachos y cobranzas desde cualquier dispositivo. Tus reportes te muestran dónde está el dinero.', icon: TrendingUp },
];

const HowItWorks: React.FC = () => (
  <section id="how" className="py-24 px-6 bg-slate-50 border-t border-slate-100">
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 mb-4 bg-violet-100/50 border border-violet-100 px-4 py-1.5 rounded-full">Tan simple como 1, 2, 3</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900">Cómo funciona ERPERIA</h2>
        <p className="mt-4 text-slate-600 text-base md:text-lg max-w-xl mx-auto">Sin consultores de software, sin meses de implementación. En un día tu equipo ya está operando.</p>
      </div>
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute hidden lg:block top-16 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-violet-500/0 via-violet-300 to-violet-500/0" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {steps.map(({ num, title, desc, icon: Icon }) => (
            <div key={num} className="relative text-center">
              <div className="flex flex-col items-center">
                <div className="relative w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-violet-500/20">
                  <Icon className="h-7 w-7 text-white" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 bg-white border border-violet-500 rounded-full text-[10px] font-black text-violet-600 flex items-center justify-center shadow-sm">{num.slice(1)}</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-3">{title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed max-w-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
);

// ── Pricing ───────────────────────────────────────────────────────────────────
const planes = [
  {
    name: 'Básico', price: 'Gratis', period: '30 días de prueba', highlight: false,
    desc: 'Ideal para empezar a conocer ERPERIA.',
    features: ['1 empresa (tenant)', 'Hasta 3 usuarios', 'Pedidos y Clientes', 'Facturas y Remitos PDF', 'Portal de Clientes PWA', 'Soporte por correo electrónico'],
    cta: 'Comenzar gratis',
  },
  {
    name: 'Profesional', price: '$29', period: '/ mes por empresa', highlight: true,
    desc: 'Para PyMEs en crecimiento que necesitan todo el potencial.',
    features: ['1 empresa (tenant)', 'Usuarios ilimitados', 'Todo del plan básico', 'Hojas de ruta y Despacho', 'Cuentas Corrientes', 'WhatsApp integrado', 'Dashboard y Reportes avanzados', 'Soporte prioritario'],
    cta: 'Comenzar ahora',
  },
  {
    name: 'Empresarial', price: 'A medida', period: 'consultar', highlight: false,
    desc: 'Para distribuidoras con múltiples sucursales o franquicias.',
    features: ['Multi-empresa (multi-tenant)', 'Panel de administración SaaS', 'Branding por sucursal', 'Integración API REST', 'Soporte dedicado 24/7', 'Onboarding personalizado'],
    cta: 'Hablar con ventas',
  },
];

const Pricing: React.FC = () => (
  <section id="planes" className="py-24 px-6 bg-white">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 mb-4 bg-violet-50 border border-violet-100 px-4 py-1.5 rounded-full">Precios transparentes</span>
        <h2 className="text-3xl md:text-5xl font-black text-slate-900">Planes para cada etapa comercial</h2>
        <p className="mt-4 text-slate-600 text-base md:text-lg max-w-xl mx-auto">Sin cláusulas ocultas ni contratos a largo plazo. Puedes cancelar cuando quieras.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {planes.map((plan) => (
          <div key={plan.name} className={`relative rounded-3xl p-8 flex flex-col ${plan.highlight ? 'bg-gradient-to-b from-violet-600 to-indigo-700 shadow-xl shadow-violet-500/25 scale-105 border-0 text-white' : 'bg-slate-50 border border-slate-200/80 text-slate-800'}`}>
            {plan.highlight && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-md">
                ⚡ Más popular
              </div>
            )}
            <div className="mb-6">
              <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${plan.highlight ? 'text-violet-200' : 'text-slate-500'}`}>{plan.name}</p>
              <div className="flex items-end space-x-2">
                <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>{plan.price}</span>
                {plan.price !== 'A medida' && <span className={`text-xs font-medium mb-1 ${plan.highlight ? 'text-violet-200' : 'text-slate-500'}`}>{plan.period}</span>}
              </div>
              <p className={`text-sm mt-3 leading-relaxed ${plan.highlight ? 'text-violet-100' : 'text-slate-600'}`}>{plan.desc}</p>
            </div>
            <ul className="space-y-3 flex-1 mb-8">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start space-x-3">
                  <CheckCircle2 className={`h-4 w-4 mt-0.5 flex-shrink-0 ${plan.highlight ? 'text-violet-300' : 'text-violet-600'}`} />
                  <span className={`text-sm ${plan.highlight ? 'text-violet-100' : 'text-slate-600'}`}>{f}</span>
                </li>
              ))}
            </ul>
            {plan.name === 'Empresarial' ? (
              <a
                href="#contacto"
                className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all ${plan.highlight ? 'bg-white text-violet-700 hover:bg-violet-50 shadow-md' : 'bg-violet-600 text-white hover:bg-violet-500 shadow-sm shadow-violet-500/10'}`}
              >
                {plan.cta}
              </a>
            ) : (
              <Link
                to="/signup"
                className={`block text-center py-3.5 rounded-xl font-bold text-sm transition-all ${plan.highlight ? 'bg-white text-violet-700 hover:bg-violet-50 shadow-md' : 'bg-violet-600 text-white hover:bg-violet-500 shadow-sm shadow-violet-500/10'}`}
              >
                {plan.cta}
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── Testimonials ──────────────────────────────────────────────────────────────
const testimonials = [
  { name: 'Hernán Díaz', role: 'Dueño · Distribuidora del Sur', stars: 5, text: 'Antes llevábamos todo en planillas. Con ERPERIA, el repartidor carga el despacho desde el celular y yo veo todo en tiempo real. Nos ahorró 3 horas de trabajo administrativo por día.' },
  { name: 'Claudia Moreno', role: 'Administradora · Alimentos Regionales', stars: 5, text: 'El módulo de cuentas corrientes es brillante. Ahora los clientes se auto-gestionan desde su portal PWA y nosotros cobramos más rápido. Recomendable 100%.' },
  { name: 'Martín Gómez', role: 'Gerente Comercial · Distribuidora Norte', stars: 5, text: 'Lo que más me sorprendió fue la integración nativa con WhatsApp. Los clientes reciben la factura y remito automáticamente. Ahorramos decenas de llamadas al día.' },
];

const Testimonials: React.FC = () => (
  <section className="py-24 px-6 bg-slate-50 border-t border-slate-100">
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-16">
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 mb-4 bg-violet-100/50 border border-violet-100 px-4 py-1.5 rounded-full">Casos de Éxito</span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900">PyMEs que ya operan y crecen con ERPERIA</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {testimonials.map(({ name, role, stars, text }) => (
          <div key={name} className="bg-white border border-slate-200/60 rounded-3xl p-6 shadow-sm hover:border-violet-200 transition-all">
            <div className="flex space-x-1 mb-4">
              {Array(stars).fill(0).map((_, i) => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
            </div>
            <p className="text-slate-600 text-sm leading-relaxed mb-6">"{text}"</p>
            <div>
              <p className="font-extrabold text-slate-900 text-sm">{name}</p>
              <p className="text-slate-500 text-xs mt-0.5 font-medium">{role}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

// ── CTA Final ─────────────────────────────────────────────────────────────────
const FinalCTA: React.FC = () => (
  <section id="contacto" className="py-24 bg-white px-6">
    <div className="max-w-4xl mx-auto text-center">
      <div className="relative bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-12 md:p-16 overflow-hidden shadow-xl shadow-violet-500/20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3 blur-3xl" />
        </div>
        <div className="relative">
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            ¿Listo para digitalizar tu negocio?
          </h2>
          <p className="text-violet-100 text-base md:text-lg mb-10 max-w-xl mx-auto">
            Únete a las PyMEs que ya optimizaron su comercio, su producción y sus despachos. 30 días de prueba sin compromisos.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/login" className="w-full sm:w-auto px-8 py-4 bg-white text-violet-700 font-extrabold rounded-2xl text-base hover:bg-violet-50 transition-all shadow-md shadow-black/10">
              Ingresar ahora →
            </Link>
            <a href="mailto:hola@erperia.com" className="w-full sm:w-auto px-8 py-4 bg-white/10 border border-white/20 text-white font-semibold rounded-2xl text-base hover:bg-white/20 transition-all">
              Hablar con ventas
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>
);

// ── Footer ────────────────────────────────────────────────────────────────────
const Footer: React.FC = () => (
  <footer className="bg-slate-950 border-t border-slate-900 py-12 px-6">
    <div className="max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        <div>
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <Package className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-lg font-black text-white">ERP<span className="text-violet-400">ERIA</span></span>
          </div>
          <p className="text-slate-400 text-sm leading-relaxed">ERP inteligente en la nube para comercios, fábricas y empresas de despacho. Sencillo, potente, sin descargas.</p>
        </div>
        {[
          { title: 'Producto', links: ['Funcionalidades', 'Planes y Precios', 'Integraciones', 'Actualizaciones'] },
          { title: 'Empresa', links: ['Acerca de', 'Blog', 'Casos de éxito', 'Trabaja con nosotros'] },
          { title: 'Soporte', links: ['Centro de ayuda', 'Documentación API', 'Estado del sistema', 'Contacto'] },
        ].map(({ title, links }) => (
          <div key={title}>
            <h4 className="text-white font-bold text-sm mb-4">{title}</h4>
            <ul className="space-y-2">
              {links.map((l) => <li key={l}><a href="#" className="text-slate-400 text-sm hover:text-white transition-colors">{l}</a></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-900 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-slate-500 text-xs">© 2026 ERPERIA. Todos los derechos reservados.</p>
        <div className="flex space-x-6 text-xs text-slate-500">
          <a href="#" className="hover:text-slate-400 transition-colors">Términos de uso</a>
          <a href="#" className="hover:text-slate-400 transition-colors">Privacidad</a>
          <a href="#" className="hover:text-slate-400 transition-colors">Cookies</a>
        </div>
      </div>
    </div>
  </footer>
);

// ── Main Landing ──────────────────────────────────────────────────────────────
export const Landing: React.FC = () => (
  <div className="font-sans antialiased bg-white text-slate-800">
    <Navbar />
    <Hero />
    <Sectores />
    <Features />
    <HowItWorks />
    <Pricing />
    <Testimonials />
    <FinalCTA />
    <Footer />
  </div>
);

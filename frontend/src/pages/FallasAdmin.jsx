import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';
import { USAR_MOCK, obtenerInventario } from '../services/estadisticasService';
import {
  TIPOS_FALLA, SEVERIDADES, ESTADOS_FALLA,
  obtenerFallas, registrarFalla, actualizarEstadoFalla, reiniciarFallasMock,
} from '../services/fallasService';

const FORMULARIO_VACIO = {
  materialId: '', cantidad: 1, tipo: TIPOS_FALLA[0], severidad: 'Moderada',
  pedido: '', matricula: '', descripcion: '', reportadoPor: 'Almacenista',
};

const estiloSeveridad = {
  Leve: 'bg-amber-50 text-amber-700 border-amber-200',
  Moderada: 'bg-orange-50 text-orange-700 border-orange-200',
  Grave: 'bg-red-50 text-red-700 border-red-200',
};

const estiloEstado = {
  'Pendiente': 'bg-slate-100 text-slate-600 border-slate-200',
  'En reparación': 'bg-blue-50 text-blue-700 border-blue-200',
  'Reparado': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Dado de baja': 'bg-[#1a1f2e] text-white border-[#1a1f2e]',
};

const claseCampo = "w-full border-2 border-slate-200 p-3.5 rounded-xl outline-none focus:border-blue-500 text-sm font-bold bg-white";
const claseEtiqueta = "text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2";

const FallasAdmin = () => {
  const [inventario, setInventario] = useState([]);
  const [fallas, setFallas] = useState([]);
  const [formulario, setFormulario] = useState(FORMULARIO_VACIO);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');

  // --- 1. CARGAR MATERIALES E HISTORIAL ---
  const cargarFallas = async () => {
    try {
      setFallas(await obtenerFallas());
    } catch (err) {
      console.error("Error al cargar fallas:", err);
    }
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [materiales, reportes] = await Promise.all([obtenerInventario(), obtenerFallas()]);
        setInventario(materiales);
        setFallas(reportes);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los datos. Verifica la conexión con el servidor.' });
      }
    };
    cargarDatos();
  }, []);

  const cambiarCampo = (e) => setFormulario({ ...formulario, [e.target.name]: e.target.value });

  // --- 2. REGISTRAR NUEVO REPORTE ---
  const enviarReporte = async (e) => {
    e.preventDefault();
    const material = inventario.find((m) => String(m.ID_Material) === String(formulario.materialId));
    if (!material) return setMensaje({ tipo: 'error', texto: 'Selecciona el equipo dañado.' });

    setProcesando(true);
    try {
      await registrarFalla({
        ...formulario,
        materialId: material.ID_Material,
        materialNombre: material.Nombre,
        categoria: material.Nombre_Categoria,
        cantidad: parseInt(formulario.cantidad, 10) || 1,
      });
      setMensaje({ tipo: 'exito', texto: `Reporte de falla de "${material.Nombre}" registrado correctamente.` });
      setFormulario(FORMULARIO_VACIO);
      cargarFallas();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    } finally {
      setProcesando(false);
    }
  };

  // --- 3. CAMBIAR ESTADO (Pendiente -> En reparación -> Reparado / Dado de baja) ---
  const cambiarEstado = async (id, estado) => {
    try {
      await actualizarEstadoFalla(id, estado);
      cargarFallas();
    } catch (err) {
      setMensaje({ tipo: 'error', texto: err.message });
    }
  };

  const restablecerPrueba = () => {
    reiniciarFallasMock();
    cargarFallas();
    setMensaje({ tipo: 'exito', texto: 'Se restablecieron los reportes de prueba.' });
  };

  const fallasFiltradas = fallas.filter((f) => {
    const coincideEstado = filtroEstado === 'Todos' || f.estado === filtroEstado;
    const texto = `${f.materialNombre} ${f.pedido} ${f.matricula} ${f.tipo}`.toLowerCase();
    return coincideEstado && texto.includes(busqueda.toLowerCase());
  });

  const contadores = ESTADOS_FALLA.map((estado) => ({ estado, total: fallas.filter((f) => f.estado === estado).length }));

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />
        <div className="max-w-6xl mx-auto px-6 pt-12">

          <header className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-[#1a1f2e] tracking-tight mb-2 uppercase italic">Reporte de Fallas</h1>
              <p className="text-slate-500 font-medium">Registra el equipo dañado para dar seguimiento a su reparación y saber cuál falla más.</p>
              {USAR_MOCK && (
                <p className="inline-block mt-3 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1 uppercase tracking-widest">
                  ⚠️ Modo prueba: los reportes se guardan en este navegador
                </p>
              )}
            </div>

            <div className="flex gap-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              {contadores.map((c) => (
                <div key={c.estado} className="text-center px-2">
                  <p className="font-black text-xl text-[#1a1f2e]">{c.total}</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{c.estado}</p>
                </div>
              ))}
            </div>
          </header>

          <AnimatePresence>
            {mensaje && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                className={`mb-6 rounded-xl p-4 flex justify-between items-center gap-4 text-sm font-bold border ${mensaje.tipo === 'exito' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}
              >
                <span>{mensaje.tipo === 'exito' ? '✅' : '⚠️'} {mensaje.texto}</span>
                <button onClick={() => setMensaje(null)} className="font-black hover:opacity-60 cursor-pointer">✕</button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">

            {/* FORMULARIO */}
            <form onSubmit={enviarReporte} className="lg:col-span-2 bg-white p-8 rounded-4xl shadow-sm border border-slate-200 text-left lg:sticky lg:top-28">
              <h2 className="font-black text-xl text-[#1a1f2e] uppercase italic tracking-tight mb-6">Nuevo reporte</h2>

              <div className="mb-4">
                <label className={claseEtiqueta}>Equipo dañado *</label>
                <select name="materialId" value={formulario.materialId} onChange={cambiarCampo} required className={`${claseCampo} cursor-pointer`}>
                  <option value="">Selecciona un material...</option>
                  {inventario.map((m) => (
                    <option key={m.ID_Material} value={m.ID_Material}>{m.Nombre} · {m.ID_Material}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={claseEtiqueta}>Tipo de falla *</label>
                  <select name="tipo" value={formulario.tipo} onChange={cambiarCampo} className={`${claseCampo} cursor-pointer`}>
                    {TIPOS_FALLA.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={claseEtiqueta}>Unidades *</label>
                  <input type="number" name="cantidad" min="1" value={formulario.cantidad} onChange={cambiarCampo} required className={claseCampo} />
                </div>
              </div>

              <div className="mb-4">
                <label className={claseEtiqueta}>Gravedad *</label>
                <div className="grid grid-cols-3 gap-2">
                  {SEVERIDADES.map((s) => (
                    <button
                      key={s} type="button" onClick={() => setFormulario({ ...formulario, severidad: s })}
                      className={`py-3 rounded-xl text-xs font-black uppercase border-2 transition-colors cursor-pointer ${formulario.severidad === s ? estiloSeveridad[s] : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={claseEtiqueta}>Folio de pedido</label>
                  <input type="text" name="pedido" value={formulario.pedido} onChange={cambiarCampo} placeholder="Opcional" className={claseCampo} />
                </div>
                <div>
                  <label className={claseEtiqueta}>Matrícula del alumno</label>
                  <input type="text" name="matricula" value={formulario.matricula} onChange={cambiarCampo} placeholder="Opcional" className={claseCampo} />
                </div>
              </div>

              <div className="mb-4">
                <label className={claseEtiqueta}>Descripción de la falla *</label>
                <textarea name="descripcion" value={formulario.descripcion} onChange={cambiarCampo} required rows="3" placeholder="¿Qué le pasó al equipo?" className={`${claseCampo} resize-none font-medium`} />
              </div>

              <div className="mb-6">
                <label className={claseEtiqueta}>Reportado por *</label>
                <input type="text" name="reportadoPor" value={formulario.reportadoPor} onChange={cambiarCampo} required className={claseCampo} />
              </div>

              <button type="submit" disabled={procesando} className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-black py-4 rounded-xl uppercase tracking-tight text-xs transition-transform active:scale-[0.98] disabled:bg-slate-300 cursor-pointer">
                {procesando ? 'Guardando...' : 'Registrar Reporte'}
              </button>
            </form>

            {/* HISTORIAL */}
            <div className="lg:col-span-3 bg-white p-8 rounded-4xl shadow-sm border border-slate-200 text-left">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h2 className="font-black text-xl text-[#1a1f2e] uppercase italic tracking-tight">Historial</h2>
                {USAR_MOCK && (
                  <button onClick={restablecerPrueba} className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest cursor-pointer">
                    ↺ Restablecer datos de prueba
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <input
                  type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar equipo, pedido o matrícula..." className={`${claseCampo} flex-1`}
                />
                <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} className={`${claseCampo} sm:w-48 cursor-pointer`}>
                  <option value="Todos">Todos los estados</option>
                  {ESTADOS_FALLA.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-4">
                {fallasFiltradas.length === 0 ? (
                  <p className="text-center text-slate-400 font-bold py-10">No hay reportes que coincidan.</p>
                ) : (
                  fallasFiltradas.map((f) => (
                    <div key={f.id} className="border border-slate-100 bg-slate-50/60 rounded-2xl p-5">
                      <div className="flex flex-col sm:flex-row justify-between gap-3 mb-3">
                        <div>
                          <p className="font-black text-[#1a1f2e]">{f.materialNombre} {f.cantidad > 1 && <span className="text-slate-400 font-bold">× {f.cantidad}</span>}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(f.fecha).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })} · {f.tipo}
                          </p>
                        </div>
                        <div className="flex gap-2 items-start shrink-0">
                          <span className={`text-[10px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1 border ${estiloSeveridad[f.severidad] || estiloSeveridad.Leve}`}>{f.severidad}</span>
                          <span className={`text-[10px] font-black uppercase tracking-widest rounded-lg px-2.5 py-1 border ${estiloEstado[f.estado] || estiloEstado.Pendiente}`}>{f.estado}</span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 font-medium mb-3">{f.descripcion}</p>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                        <p className="text-[10px] font-bold text-slate-400">
                          {f.pedido && <>Pedido <span className="text-slate-600">{f.pedido}</span> · </>}
                          {f.matricula && <>Alumno <span className="text-slate-600">{f.matricula}</span> · </>}
                          Reportó <span className="text-slate-600">{f.reportadoPor}</span>
                        </p>
                        <select
                          value={f.estado} onChange={(e) => cambiarEstado(f.id, e.target.value)}
                          className="border-2 border-slate-200 py-1.5 px-2 rounded-lg outline-none focus:border-blue-500 text-xs font-bold bg-white cursor-pointer"
                        >
                          {ESTADOS_FALLA.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default FallasAdmin;

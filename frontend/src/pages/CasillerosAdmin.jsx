import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';
import { mostrarToast } from '../components/notificaciones';

const CasillerosAdmin = () => {
  const [casilleros, setCasilleros] = useState([]);
  
  // Estados para el Modal
  const [modalAbierto, setModalAbierto] = useState(false);
  const [casilleroSeleccionado, setCasilleroSeleccionado] = useState(null);
  const [nuevoEstado, setNuevoEstado] = useState(1);
  const [procesando, setProcesando] = useState(false);
  
  // Estado nuevo para guardar los datos del alumno ocupante
  const [pedidoActivo, setPedidoActivo] = useState(null);

  // --- 1. CARGAR MAPA ---
  const obtenerCasilleros = async () => {
    try {
      const respuesta = await fetch('/backend/api/casilleros');
      const data = await respuesta.json();

      const mapaCasilleros = data.map((celda) => {
        let estadoNumerico = 1; 
        if (celda.Fk_Estado === 2) estadoNumerico = 2; 
        if (celda.Fk_Estado === 3) estadoNumerico = 3; 

        return {
          id: celda.ID_Casillero,
          nombre: celda.Identificador || `Celda ${String(celda.ID_Casillero).padStart(2, '0')}`, 
          estado: estadoNumerico
        };
      });
      setCasilleros(mapaCasilleros);
    } catch (error) {
      console.error("Error al cargar mapa:", error);
    }
  };

  useEffect(() => {
    obtenerCasilleros();
  }, []);

  // --- 2. ABRIR MODAL INTELIGENTE ---
  const abrirModal = async (casillero) => {
    setCasilleroSeleccionado(casillero);
    setNuevoEstado(casillero.estado);
    setPedidoActivo(null); // Limpiamos por si acaso

    // SI ESTÁ OCUPADO (2), buscamos quién está adentro
    if (casillero.estado === 2) {
      try {
        const res = await fetch(`/backend/api/admin/casilleros/${casillero.id}/pedido`);
        const data = await res.json();
        if (data) setPedidoActivo(data);
      } catch (error) {
        console.error("Error buscando pedido:", error);
      }
    }
    
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCasilleroSeleccionado(null);
  };

  // --- 3. GUARDAR ESTADO NORMAL (Libre / Mantenimiento) ---
  const guardarEstadoNormal = async (e) => {
    e.preventDefault();
    setProcesando(true);
    try {
      const respuesta = await fetch(`/backend/api/admin/casilleros/${casilleroSeleccionado.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nuevo_estado: parseInt(nuevoEstado) })
      });
      const resultado = await respuesta.json().catch(() => ({}));
      if (respuesta.ok) {
        mostrarToast(`${casilleroSeleccionado.nombre} actualizada.`);
        obtenerCasilleros();
        cerrarModal();
      } else {
        mostrarToast(resultado.message || 'No se pudo actualizar el casillero.', 'error');
        obtenerCasilleros();
      }
    } catch {
      mostrarToast("Error de conexión.", 'error');
    } finally {
      setProcesando(false);
    }
  };

  // --- 4. FORZAR DEVOLUCIÓN (Restaurar Inventario) ---
  const forzarDevolucion = async () => {
    if (!window.confirm("¿Seguro que deseas liberar esta celda? Los materiales del pedido serán devueltos al inventario automáticamente.")) return;
    
    setProcesando(true);
    try {
      const respuesta = await fetch(`/backend/api/admin/casilleros/${casilleroSeleccionado.id}/liberar`, {
        method: 'PUT'
      });
      const resultado = await respuesta.json();
      
      if (respuesta.ok) {
        alert(resultado.message);
        obtenerCasilleros();
        cerrarModal();
      } else {
        alert("Error: " + resultado.message);
      }
    } catch (error) {
      alert("Error crítico conectando con el servidor.");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />
        <div className="max-w-6xl mx-auto px-6 pt-12">
          
          <header className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-[#1a1f2e] tracking-tight mb-2 uppercase italic">Control de Casilleros</h1>
              <p className="text-slate-500 font-medium">Supervisa y modifica manualmente el estado físico de los lockers del almacén.</p>
            </div>
            
            <div className="flex gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-slate-50 border border-slate-200"></div>
                <span className="text-xs font-bold text-slate-500 uppercase">Libre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-[#1a1f2e]"></div>
                <span className="text-xs font-bold text-slate-500 uppercase">Ocupado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-amber-50 border border-amber-200"></div>
                <span className="text-xs font-bold text-slate-500 uppercase">Mtto</span>
              </div>
            </div>
          </header>

          <div className="bg-white p-10 rounded-4xl shadow-sm border border-slate-200 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {casilleros.length === 0 ? (
                <div className="col-span-full text-center text-slate-400 font-bold py-10 animate-pulse">Cargando celdas físicas...</div>
              ) : (
                casilleros.map((celda) => (
                  <motion.button
                    key={celda.id}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => abrirModal(celda)}
                    className={`
                      aspect-square rounded-3xl flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md
                      ${celda.estado === 2 ? 'bg-[#1a1f2e] border-[#1a1f2e] text-white opacity-95' : ''}
                      ${celda.estado === 3 ? 'bg-amber-50 border-amber-200 text-amber-600' : ''}
                      ${celda.estado === 1 ? 'bg-slate-50 border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600' : ''}
                    `}
                  >
                    <span className="text-3xl mb-2">{celda.estado === 2 ? '🔒' : celda.estado === 3 ? '🚧' : '📦'}</span>
                    <span className="font-black text-lg">{celda.nombre.split(' ')[1] || celda.id}</span>
                  </motion.button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* MODAL INTELIGENTE (BIFURCADO) */}
        <AnimatePresence>
          {modalAbierto && casilleroSeleccionado && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl text-left"
              >
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-black text-[#1a1f2e] text-lg uppercase italic tracking-tight">{casilleroSeleccionado.nombre}</h3>
                  <button onClick={cerrarModal} className="text-slate-400 hover:text-red-500 text-xl font-black transition-colors">✕</button>
                </div>
                
                <div className="p-6">
                  {/* SI ESTÁ OCUPADO: VISTA DE DEVOLUCIÓN */}
                  {casilleroSeleccionado.estado === 2 ? (
                    <div>
                      {pedidoActivo ? (
                        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-left">
                          <p className="text-[10px] font-black text-blue-800 uppercase tracking-widest mb-2">📦 Pedido en curso</p>
                          <p className="font-bold text-sm text-[#1a1f2e] mb-1">{pedidoActivo.ID_Pedido}</p>
                          <p className="text-xs font-medium text-slate-600 mb-2">Por: <span className="font-bold">{pedidoActivo.Solicitante}</span></p>
                          <p className="text-[10px] text-slate-500 italic">Propósito: {pedidoActivo.Proposito}</p>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-600 font-bold bg-amber-50 p-3 rounded-lg mb-6">Buscando datos del alumno...</p>
                      )}

                      <p className="text-[10px] text-slate-400 mb-4 font-bold text-center">Al liberar este casillero, el pedido se marcará como finalizado y el stock regresará al inventario.</p>
                      
                      <button 
                        onClick={forzarDevolucion} disabled={procesando}
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-xl uppercase tracking-tight text-xs transition-transform active:scale-[0.98] disabled:bg-slate-300 shadow-lg shadow-red-500/20"
                      >
                        {procesando ? 'Procesando...' : 'Finalizar Pedido y Liberar'}
                      </button>
                    </div>
                  ) : (
                    /* SI ESTÁ LIBRE O MANTENIMIENTO: VISTA NORMAL DE EDICIÓN */
                    <form onSubmit={guardarEstadoNormal}>
                      <div className="mb-6">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Mantenimiento de Celda</label>
                        <select 
                          value={nuevoEstado} onChange={(e) => setNuevoEstado(e.target.value)} 
                          className="w-full border-2 border-slate-200 p-3.5 rounded-xl outline-none focus:border-blue-500 text-sm font-bold bg-white cursor-pointer"
                        >
                          <option value={1}>📦 Libre / Disponible</option>
                          <option value={3}>🚧 En Mantenimiento</option>
                        </select>
                        
                        {nuevoEstado == 3 && (
                          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-3 items-start">
                            <span className="text-amber-500">⚠️</span>
                            <p className="text-[10px] text-amber-700 font-bold leading-relaxed">Bloqueará esta celda para nuevas asignaciones automáticas.</p>
                          </div>
                        )}
                      </div>

                      <button type="submit" disabled={procesando} className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-black py-4 rounded-xl uppercase tracking-tight text-xs transition-transform active:scale-[0.98] disabled:bg-slate-300">
                        {procesando ? 'Guardando...' : 'Actualizar Estado'}
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </AnimatedPage>
  );
};

export default CasillerosAdmin;
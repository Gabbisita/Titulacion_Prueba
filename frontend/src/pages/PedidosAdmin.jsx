import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';

const PedidosAdmin = () => {
  const navigate = useNavigate();

  // Modal de Rechazo
  const [modalAbierto, setModalAbierto] = useState(false);
  const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Estados para los datos reales
  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Efecto para buscar los datos reales al entrar a la página
  useEffect(() => {
    const obtenerPedidos = async () => {
      try {
        const respuesta = await fetch('http://localhost:5000/api/admin/pedidos');
        const data = await respuesta.json();

        console.log("Lo que mandó Express:", data);

        if (respuesta.ok) {
          setPedidos(data);
        }
      } catch (error) {
        console.error("Error al cargar los pedidos reales:", error);
      } finally {
        setCargando(false);
      }
    };

    obtenerPedidos();
  }, []);

  // Funciones de Acción
  const handleAceptar = (id) => {
    // Mandamos al admin a la página de casilleros, pasándole el ID del pedido
    navigate('/admin/asignar-casillero', { state: { pedidoId: id } });
  };

  const abrirModalRechazo = (id) => {
    setPedidoSeleccionado(id);
    setMotivoRechazo('');
    setModalAbierto(true);
  };

  const confirmarRechazo = () => {
    if (!motivoRechazo.trim()) {
      alert("Debes escribir un motivo para rechazar el pedido.");
      return;
    }
    // Aquí iría la petición POST al backend para actualizar el estado a "Rechazado" (Futura implementación)
    setPedidos(pedidos.filter(p => p.id !== pedidoSeleccionado));
    setModalAbierto(false);
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />

        <div className="max-w-6xl mx-auto px-6 md:px-10 pt-12">
          <header className="mb-10 text-left">
            <h1 className="text-4xl font-black text-[#1a1f2e] tracking-tight mb-2 uppercase italic">Solicitudes Pendientes</h1>
            <p className="text-slate-500 font-medium">Revisa y gestiona los vales de material solicitados por los alumnos.</p>
          </header>

          <div className="space-y-8">
            {cargando ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm animate-pulse">
                <h3 className="text-xl font-black text-slate-400">Conectando con el almacén...</h3>
              </div>
            ) : pedidos.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-100 shadow-sm">
                <span className="text-6xl mb-4 block">☕</span>
                <h3 className="text-xl font-black text-slate-800">Todo al día</h3>
                <p className="text-slate-400">No hay pedidos pendientes por revisar.</p>
              </div>
            ) : (
              pedidos.map((pedido) => (
                <motion.div 
                  key={pedido.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col md:flex-row"
                >
                  {/* Columna Izquierda: Info del Pedido */}
                  <div className="p-8 flex-1 border-b md:border-b-0 md:border-r border-slate-100 text-left">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 font-black text-[10px] uppercase tracking-widest rounded-lg mb-2">
                          {pedido.fecha_recogida}
                        </span>
                        <h2 className="text-sm font-bold text-slate-400 font-mono">Folio: {pedido.id}</h2>
                      </div>
                      
                      {pedido.esEquipo ? (
                        <div className="flex items-center gap-2 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                          <span className="text-lg">👥</span>
                          <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Equipo</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                          <span className="text-lg">👤</span>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-wider">Individual</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-6">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Solicitante(s)</h3>
                      <div className="bg-[#f8f9fc] rounded-2xl p-4 border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <p className="font-bold text-[#1a1f2e] text-sm flex items-center gap-2">
                            👑 {pedido.solicitante.nombre}
                          </p>
                          <span className="font-mono text-xs text-slate-400">{pedido.solicitante.matricula}</span>
                        </div>
                        
                        {pedido.esEquipo && pedido.equipo.map((miembro, idx) => (
                          <div key={idx} className="flex justify-between items-center pt-3 border-t border-slate-200/60">
                            <p className="font-bold text-slate-600 text-sm flex items-center gap-2">
                              ▪️ {miembro.nombre}
                            </p>
                            <span className="font-mono text-xs text-slate-400">{miembro.matricula}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Propósito / Proyecto</h3>
                      <p className="text-sm font-medium text-slate-700 bg-amber-50/50 p-4 rounded-xl border border-amber-100">
                        "{pedido.proposito}"
                      </p>
                    </div>
                  </div>

                  {/* Columna Derecha: Materiales y Botones */}
                  <div className="w-full md:w-80 bg-slate-50 p-8 flex flex-col justify-between text-left">
                    <div>
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Materiales Solicitados</h3>
                      <ul className="space-y-3 mb-8">
                        {pedido.materiales.map((mat, idx) => (
                          <li key={idx} className="flex justify-between items-start border-b border-slate-200 pb-3 last:border-0">
                            <span className="text-xs font-bold text-[#1a1f2e] leading-tight pr-4">{mat.nombre}</span>
                            <span className="text-xs font-black text-blue-600 bg-blue-100 px-2 py-0.5 rounded">x{mat.cantidad}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex gap-3 mt-auto">
                      <button 
                        onClick={() => abrirModalRechazo(pedido.id)}
                        className="flex-1 py-3 bg-white border-2 border-red-100 text-red-600 font-black text-xs uppercase rounded-xl hover:bg-red-50 hover:border-red-200 transition-colors"
                      >
                        Rechazar
                      </button>
                      <button 
                        onClick={() => handleAceptar(pedido.id)}
                        className="flex-1 py-3 bg-[#2563eb] text-white font-black text-xs uppercase rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                      >
                        Aceptar
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* MODAL DE RECHAZO */}
      <AnimatePresence>
        {modalAbierto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 text-left">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setModalAbierto(false)}
              className="absolute inset-0 bg-[#0a0f1d]/80 backdrop-blur-sm"
            ></motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl border border-slate-100"
            >
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mb-6">
                ⚠️
              </div>
              <h2 className="text-2xl font-black text-[#1a1f2e] mb-2">Rechazar Pedido</h2>
              <p className="text-sm text-slate-500 mb-6">
                Estás a punto de cancelar el folio <span className="font-mono font-bold text-slate-800">{pedidoSeleccionado}</span>. Por favor, indica el motivo para notificar al alumno.
              </p>

              <textarea 
                placeholder="Ej. Material en mantenimiento, propósito no válido, etc."
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                className="w-full h-32 p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 resize-none mb-6"
              ></textarea>

              <div className="flex gap-3 justify-end">
                <button 
                  onClick={() => setModalAbierto(false)}
                  className="px-6 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button 
                  onClick={confirmarRechazo}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl shadow-lg shadow-red-600/30 transition-colors text-sm uppercase tracking-wider"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AnimatedPage>
  );
};

export default PedidosAdmin;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';

const Pedidos = () => {
  const navigate = useNavigate();
  const [pedidosReales, setPedidosReales] = useState([]);

  useEffect(() => {
    const guardados = localStorage.getItem('historial_pedidos_safe');
    if (guardados) {
      setPedidosReales(JSON.parse(guardados));
    }
  }, []);

  const pasosTimeline = ['Solicitado', 'Aceptado', 'En preparación', 'En casillero', 'Devuelto', 'Cerrado OK'];

  const cambiarEstadoAdmin = (pedidoId, nuevoEstado) => {
    const historialActualizado = pedidosReales.map(pedido => {
      if (pedido.id === pedidoId) {
        return { ...pedido, estado: nuevoEstado };
      }
      return pedido;
    });
    
    setPedidosReales(historialActualizado);
    localStorage.setItem('historial_pedidos_safe', JSON.stringify(historialActualizado));
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
      <Navbar />
      <div className="max-w-325 mx-auto px-6 md:px-10 pt-12 text-left">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-[#1a1f2e] tracking-tight mb-2">Mis pedidos</h1>
          <p className="text-slate-400 font-medium text-sm">Seguimiento en tiempo real de tus solicitudes de préstamo</p>
        </header>

        {pedidosReales.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 rounded-4xl p-16 text-center max-w-2xl mx-auto shadow-sm">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-black text-[#1a1f2e] uppercase italic tracking-tight mb-2">No tienes solicitudes activas</h2>
            <p className="text-slate-400 text-sm font-medium mb-8 max-w-sm mx-auto">Aquí aparecerá el estado de tus herramientas una vez que envíes tu solicitud.</p>
            <button onClick={() => navigate('/inventario')} className="bg-[#2563eb] text-white font-black px-8 py-3.5 rounded-xl uppercase italic text-xs">Ir al Inventario Ahora</button>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-8">
            {pedidosReales.map((pedido) => {
              const indiceActual = pasosTimeline.indexOf(pedido.estado || 'Solicitado');
              return (
                <motion.div key={pedido.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-slate-100 rounded-4xl p-6 md:p-8 shadow-sm relative">
                  <div className="absolute top-6 right-6 z-20 bg-slate-50 border border-slate-200 p-2 rounded-xl flex items-center gap-2 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider pl-1">⚙ Simulador Admin:</span>
                    <select 
                      value={pedido.estado || 'Solicitado'} 
                      onChange={(e) => cambiarEstadoAdmin(pedido.id, e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg p-1 text-xs font-bold text-blue-600 outline-none cursor-pointer"
                    >
                      {pasosTimeline.map(paso => (
                        <option key={paso} value={paso}>{paso}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6 pr-44 text-left">
                    <div>
                      <span className="text-xs font-mono font-black text-blue-600 block">{pedido.id}</span>
                      <p className="text-slate-400 text-xs font-bold mt-0.5">Entrega: <span className="text-slate-600">{pedido.fecha}</span> · {pedido.solicitante}</p>
                    </div>
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                        pedido.estado === 'Cerrado OK' ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-700'
                      }`}>
                        {pedido.estado}
                      </span>
                    </div>
                  </div>

                  <div className="mb-8 text-left">
                    <p className="text-slate-800 font-black text-sm uppercase italic tracking-tight">{pedido.detalles}</p>
                    <p className="text-slate-400 text-xs mt-1 font-medium">Proyecto: <span className="italic">"{pedido.proposito}"</span></p>
                  </div>

                  <div className="relative flex flex-col md:flex-row justify-between items-center gap-6 md:gap-2 px-4 mb-6">
                    <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-slate-100 hidden md:block z-0"></div>

                    {pasosTimeline.map((paso, index) => {
                      const esPasadoOActivo = index <= indiceActual;
                      const esPasoActual = index === indiceActual;
                      
                      return (
                        <div key={index} className="flex md:flex-col items-center gap-4 md:gap-2 z-10 w-full md:w-auto relative">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border-2 transition-all duration-300 ${
                            esPasoActual
                              ? 'bg-blue-600 border-blue-600 text-white scale-110 shadow-lg'
                              : esPasadoOActivo
                              ? 'bg-blue-500 border-blue-500 text-white'
                              : 'bg-white border-slate-200 text-slate-300'
                          }`}>
                            {paso === 'En casillero' && esPasoActual ? '📦' : '✓'}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tight ${esPasoActual ? 'text-blue-600 font-black' : esPasadoOActivo ? 'text-slate-700' : 'text-slate-400'}`}>
                            {paso}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
                    <div className="flex items-center gap-3 text-left">
                      <span className="text-xl">
                        {pedido.estado === 'Solicitado' && '⏳'}
                        {pedido.estado === 'Aceptado' && '👍'}
                        {pedido.estado === 'En preparación' && '🔧'}
                        {pedido.estado === 'En casillero' && '📱'}
                        {pedido.estado === 'Devuelto' && '🔄'}
                        {pedido.estado === 'Cerrado OK' && '✅'}
                      </span>
                      <div>
                        <p className="text-slate-800 font-black text-xs uppercase tracking-tight">Estado actual: {pedido.estado}</p>
                        <p className="text-slate-500 text-[11px] font-medium mt-0.5">
                          {pedido.estado === 'Solicitado' && 'Tu vale fue registrado con éxito. Esperando la validación del personal de almacén.'}
                          {pedido.estado === 'Aceptado' && '¡Tu solicitud fue aprobada! El vale digital ya está disponible para descargar.'}
                          {pedido.estado === 'En preparación' && 'El almacenista está reuniendo tus herramientas y calibrando los componentes.'}
                          {pedido.estado === 'En casillero' && '¡Listo! Los materiales están resguardados en el Casillero Inteligente.'}
                          {pedido.estado === 'Devuelto' && 'Las herramientas han sido entregadas de vuelta en ventanilla bajo revisión física.'}
                          {pedido.estado === 'Cerrado OK' && 'Vale concluido. El equipo se devolvió a tiempo y en perfectas condiciones operativas.'}
                        </p>
                      </div>
                    </div>

                    {pedido.estado !== 'Solicitado' && pedido.estado !== 'Devuelto' && pedido.estado !== 'Cerrado OK' && (
                      <button 
                        type="button"
                        onClick={() => navigate(`/pedido/${pedido.id}`)}
                        className="w-full sm:w-auto bg-[#2563eb] hover:bg-blue-700 text-white font-black px-4 py-2.5 rounded-xl uppercase italic text-[11px] tracking-tight transition-colors shadow-md shrink-0"
                      >
                        Generar Vale & PDF →
                      </button>
                    )}
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      </div>
    </AnimatedPage>
  );
};

export default Pedidos;
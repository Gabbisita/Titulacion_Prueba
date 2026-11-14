import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';

const Pedidos = () => {
  const navigate = useNavigate();
  const [pedidosReales, setPedidosReales] = useState([]);

  // 1. Leemos quién está usando la computadora
  const sesion = localStorage.getItem('usuario_safestock');
  const alumnoActual = sesion ? JSON.parse(sesion) : null;
  const matricula = alumnoActual ? (alumnoActual.Registro_Alu || alumnoActual.id) : null;

  useEffect(() => {
    if (!matricula) {
      navigate('/');
      return;
    }

    // 2. Traemos los datos reales de TiDB
    const buscarPedidos = async () => {
      try {
        const respuesta = await fetch(`/backend/api/mis-pedidos/${matricula}`);
        const datos = await respuesta.json();

        if (datos.status === "success") {
          const pedidosAdaptados = datos.pedidos.map(bd => ({
            id: bd.ID_Pedido,
            fecha: bd.Fecha_Recogida,
            solicitante: `Mi Rol: ${bd.Rol}`, 
            estado: bd.Estado,
            proposito: bd.Proposito,
            motivo: bd.Motivo_Rechazo,
            detalles: bd.ListaMateriales ? bd.ListaMateriales.split('|') : ["Sin materiales registrados"] 
          }));
          
          setPedidosReales(pedidosAdaptados);
        }
      } catch (error) {
        console.error("Error al traer historial:", error);
      }
    };

    buscarPedidos();
  }, [matricula, navigate]);

  // Lo que ve el alumno según el estado REAL del pedido.
  // El administrador solo acepta (asignando casillero) o rechaza; al liberar el casillero queda "Devuelto".
  const ESTADOS = {
    Solicitado: {
      icono: '⏳', insignia: 'bg-amber-100 text-amber-700', caja: 'bg-amber-50 border-amber-400', titulo: 'text-amber-800', texto: 'text-amber-700/80',
      encabezado: 'Esperando revisión',
      descripcion: 'El administrador del almacén revisará tu solicitud y la aceptará o rechazará. Te avisaremos por correo.',
    },
    Aprobado: {
      icono: '🔐', insignia: 'bg-blue-100 text-blue-700', caja: 'bg-blue-50 border-blue-500', titulo: 'text-blue-800', texto: 'text-blue-700/80',
      encabezado: 'Aprobado · Listo en tu casillero',
      descripcion: 'Tus materiales están resguardados. Presenta tu código QR en el lector del casillero (también te llegó por correo).',
      boton: 'Ver código QR y vale →',
    },
    Rechazado: {
      icono: '✕', insignia: 'bg-red-100 text-red-700', caja: 'bg-red-50 border-red-500', titulo: 'text-red-800', texto: 'text-red-700/80',
      encabezado: 'Rechazado',
      descripcion: 'No se generó vale. Puedes hacer una nueva solicitud tomando en cuenta el motivo.',
      boton: 'Ver detalle →',
    },
    Devuelto: {
      icono: '✅', insignia: 'bg-green-100 text-green-700', caja: 'bg-green-50 border-green-500', titulo: 'text-green-800', texto: 'text-green-700/80',
      encabezado: 'Devuelto · Préstamo concluido',
      descripcion: 'El material regresó al almacén y el casillero quedó libre. ¡Gracias!',
    },
  };
  const estadoGenerico = {
    icono: '📋', insignia: 'bg-slate-100 text-slate-600', caja: 'bg-slate-50 border-slate-300', titulo: 'text-slate-700', texto: 'text-slate-500',
    descripcion: 'Este pedido ya no está activo.',
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 md:px-10 pt-12 text-left">
        <header className="mb-10">
          <h1 className="text-4xl font-black text-[#1a1f2e] tracking-tight mb-2">Mis pedidos</h1>
          <p className="text-slate-400 font-medium text-sm">Consulta el estado de tus solicitudes de préstamo</p>
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
              const info = ESTADOS[pedido.estado] || { ...estadoGenerico, encabezado: pedido.estado };
              return (
                <motion.div key={pedido.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="bg-white border border-slate-100 rounded-4xl p-6 md:p-8 shadow-sm relative">
                  

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-6 text-left">
                    <div>
                      <span className="text-xs font-mono font-black text-blue-600 block">{pedido.id}</span>
                      <p className="text-slate-400 text-xs font-bold mt-0.5">Entrega: <span className="text-slate-600">{pedido.fecha}</span> · {pedido.solicitante}</p>
                    </div>
                    <div>
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                        info.insignia
                      }`}>
                        {pedido.estado}
                      </span>
                    </div>
                  </div>

                  <div className="mb-8 text-left">
                    <ul className="list-disc pl-5 text-slate-800 font-black text-sm uppercase italic tracking-tight space-y-1">
                      {Array.isArray(pedido.detalles) ? (
                        pedido.detalles.map((articulo, index) => (
                          <li key={index}>{articulo}</li>
                        ))
                      ) : (
                        <li>{pedido.detalles}</li>
                      )}
                    </ul>
                    <p className="text-slate-400 text-xs mt-3 font-medium">Proyecto: <span className="italic">"{pedido.proposito}"</span></p>
                  </div>

                  <div className={`border-l-4 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-left ${info.caja}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5">{info.icono}</span>
                      <div>
                        <p className={`text-xs font-black uppercase tracking-tight ${info.titulo}`}>{info.encabezado}</p>
                        {pedido.estado === 'Rechazado' && (
                          <p className="text-sm font-bold text-red-900 mt-1">
                            Motivo: {pedido.motivo || 'el administrador no especificó un motivo.'}
                          </p>
                        )}
                        <p className={`text-[11px] font-medium mt-1 ${info.texto}`}>{info.descripcion}</p>
                      </div>
                    </div>
                    {info.boton && (
                      <button
                        type="button"
                        onClick={() => navigate(`/pedido/${pedido.id}`)}
                        className={`w-full sm:w-auto font-black px-4 py-2.5 rounded-xl uppercase text-[11px] tracking-tight transition-colors shrink-0 ${
                          pedido.estado === 'Aprobado'
                            ? 'bg-[#2563eb] hover:bg-blue-700 text-white shadow-md'
                            : 'bg-white border border-red-200 text-red-700 hover:bg-red-100'
                        }`}
                      >
                        {info.boton}
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
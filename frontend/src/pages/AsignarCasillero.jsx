import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';
import { mostrarToast } from '../components/notificaciones';

const AsignarCasillero = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const pedidoId = location.state?.pedidoId || 'FOLIO-DESCONOCIDO';

  const [casilleroSeleccionado, setCasilleroSeleccionado] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [casilleros, setCasilleros] = useState([]); // Inicia vacío mientras carga de la BD

  // --- 1. LEER LOS CASILLEROS DESDE LA BASE DE DATOS ---
  const obtenerCasilleros = async () => {
      try {
        const respuesta = await fetch('/backend/api/casilleros');
        const data = await respuesta.json();

        const mapaCasilleros = data.map((celda) => {
          let estadoNumerico = 1; // Por defecto: Libre
          
          // ¡AQUÍ ESTÁ LA MAGIA! Leemos exactamente tu columna Fk_Estado
          const estadoBD = celda.Fk_Estado; 
          
          if (estadoBD === 2) estadoNumerico = 2; // Ocupado
          if (estadoBD === 3) estadoNumerico = 3; // Mantenimiento

          return {
            id: celda.ID_Casillero,
            nombre: celda.Identificador || `Celda ${String(celda.ID_Casillero).padStart(2, '0')}`, 
            estado: estadoNumerico
          };
        });

        setCasilleros(mapaCasilleros);
      } catch (error) {
        console.error("Error al cargar el mapa de casilleros:", error);
      }
    };

  useEffect(() => {
    obtenerCasilleros();
  }, []);

  // --- 2. ENVIAR LA CONFIRMACIÓN AL SERVIDOR ---
  const confirmarAsignacion = async () => {
    if (!casilleroSeleccionado) {
      mostrarToast("Por favor, selecciona un casillero libre primero.", 'error');
      return;
    }

    setProcesando(true);
    
    try {
      const response = await fetch(`/backend/api/admin/pedidos/${pedidoId}/aprobar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        // IMPORTANTE: id_casillero en minúsculas para que Node.js lo detecte correctamente
        body: JSON.stringify({ id_casillero: casilleroSeleccionado })
      });

      const resultado = await response.json();

      if (response.ok) {
        const nombreCasillero = casilleros.find(c => c.id === casilleroSeleccionado).nombre;
        mostrarToast(`¡Éxito! Pedido asignado a la ${nombreCasillero}. El inventario se ha descontado.`);
        navigate('/pedidosadmin');
      } else {
        mostrarToast(`Ocurrió un problema: ${resultado.message}`, 'error');
        // Si alguien ocupó ese casillero mientras tanto, recargamos el mapa real
        setCasilleroSeleccionado(null);
        obtenerCasilleros();
        setProcesando(false);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      mostrarToast("Error crítico conectando con el servidor del almacén.", 'error');
      setProcesando(false);
    }
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />

        <div className="max-w-5xl mx-auto px-6 pt-12">
          <button 
            onClick={() => navigate('/pedidosadmin')} 
            className="text-slate-400 hover:text-blue-600 text-xs font-black uppercase mb-8 block transition-colors"
          >
            ← Volver a solicitudes
          </button>

          <header className="mb-10 text-left">
            <h1 className="text-4xl font-black text-[#1a1f2e] tracking-tight mb-2 uppercase italic">Asignar Casillero</h1>
            <p className="text-slate-500 font-medium">Selecciona un compartimento disponible para resguardar los materiales del folio <span className="font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{pedidoId}</span>.</p>
          </header>

          <div className="flex flex-col lg:flex-row gap-10 items-start">
            
            {/* MAPA DE CASILLEROS */}
            <div className="bg-white p-10 rounded-4xl shadow-sm border border-slate-200 flex-1 w-full">
              
              <div className="flex justify-center gap-6 mb-10 border-b border-slate-100 pb-8">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-slate-100 border border-slate-200"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Libre</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-[#1a1f2e]"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Ocupado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-amber-100 border border-amber-300"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Mantenimiento</span>
                </div>
              </div>

              {/* GRID INTERACTIVO */}
              <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
                {casilleros.length === 0 ? (
                  <div className="col-span-3 text-center text-slate-400 font-bold py-10 animate-pulse">
                    Cargando celdas físicas...
                  </div>
                ) : (
                  casilleros.map((celda) => (
                    <motion.button
                      key={celda.id}
                      whileHover={celda.estado === 1 ? { scale: 1.05 } : {}}
                      whileTap={celda.estado === 1 ? { scale: 0.95 } : {}}
                      onClick={() => celda.estado === 1 && setCasilleroSeleccionado(celda.id)}
                      disabled={celda.estado !== 1}
                      className={`
                        aspect-square rounded-2xl flex flex-col items-center justify-center border-2 transition-all relative overflow-hidden
                        ${celda.estado === 2 ? 'bg-[#1a1f2e] border-[#1a1f2e] text-white opacity-90 cursor-not-allowed' : ''}
                        ${celda.estado === 3 ? 'bg-amber-50 border-amber-200 text-amber-600 cursor-not-allowed' : ''}
                        ${celda.estado === 1 && casilleroSeleccionado !== celda.id ? 'bg-slate-50 border-slate-200 text-slate-400 hover:border-blue-300 hover:bg-blue-50 cursor-pointer' : ''}
                        ${celda.estado === 1 && casilleroSeleccionado === celda.id ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-600/30' : ''}
                      `}
                    >
                      <span className="text-2xl mb-1">
                        {celda.estado === 2 ? '🔒' : celda.estado === 3 ? '🚧' : casilleroSeleccionado === celda.id ? '✅' : '📦'}
                      </span>
                      <span className="font-black text-sm">{celda.nombre.split(' ')[1]}</span>
                    </motion.button>
                  ))
                )}
              </div>
            </div>

            {/* PANEL DE CONFIRMACIÓN */}
            <div className="w-full lg:w-80 bg-white p-8 rounded-4xl shadow-sm border border-slate-200 sticky top-24 text-left">
              <h3 className="text-sm font-black text-[#1a1f2e] uppercase tracking-tight mb-6">Resumen de Asignación</h3>
              
              <div className="mb-8">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Casillero Seleccionado</p>
                {casilleroSeleccionado ? (
                  <div className="text-2xl font-black text-blue-600 flex items-center gap-2">
                    {casilleros.find(c => c.id === casilleroSeleccionado)?.nombre}
                  </div>
                ) : (
                  <p className="text-sm font-bold text-amber-500 bg-amber-50 p-3 rounded-xl border border-amber-100">
                    Esperando selección...
                  </p>
                )}
              </div>

              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 mb-8">
                <p className="text-[10px] text-blue-600 font-bold leading-relaxed">
                  Al confirmar, el sistema descontará los materiales del inventario de forma permanente y bloqueará la celda.
                </p>
              </div>

              <button 
                onClick={confirmarAsignacion}
                disabled={!casilleroSeleccionado || procesando}
                className={`w-full py-4 font-black text-sm uppercase tracking-tight rounded-xl transition-all
                  ${!casilleroSeleccionado || procesando
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                    : 'bg-[#2563eb] text-white hover:bg-blue-700 shadow-xl shadow-blue-600/20 active:scale-95'
                  }
                `}
              >
                {procesando ? 'Procesando...' : 'Confirmar y Descontar'}
              </button>
            </div>

          </div>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default AsignarCasillero;
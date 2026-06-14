import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, interpolate } from 'framer-motion';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';

const Solicitud = () => {
  const navigate = useNavigate();

// --- 1. CALCULADORA DE FECHAS DINÁMICAS (CON FILTRO DE FIN DE SEMANA) ---
  const generarFechas = () => {
    const listaFechas = [];
    const diasCortos = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const diasCompletos = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    let diasAgregados = 0; // Cuántos días hábiles hemos guardado
    let diasAAvanzar = 0;  // Cuántos días nos hemos movido en el calendario real

    // Queremos generar 10 días hábiles en total (2 semanas de Lunes a Viernes)
    while (diasAgregados < 15) {
      const d = new Date();
      d.setDate(d.getDate() + diasAAvanzar);
      
      const numeroDia = d.getDay(); // 0 es Domingo, 6 es Sábado
      
      // FILTRO: Solo guardamos el día si NO es Domingo (0) y NO es Sábado (6)
      if (numeroDia !== 0 && numeroDia !== 6) {
        listaFechas.push({
          id: diasAAvanzar,
          esHoy: diasAAvanzar === 0, // Bloqueamos el día de hoy por regla del almacén
          valorLargo: `${diasCompletos[numeroDia]} ${d.getDate()} de ${meses[d.getMonth()]}, ${d.getFullYear()}`,
          etiquetaBoton: `${diasCortos[numeroDia]} ${d.getDate()}`
        });
        
        diasAgregados++; // Sumamos uno a nuestra cuenta de días hábiles
      }
      
      diasAAvanzar++; // Avanzamos un día en el calendario de todas formas
    }
    
    return listaFechas;
  };

  // Guardamos las fechas generadas en una constante para usarlas en los botones
  const opcionesFechas = generarFechas();
  
  // ESTADO INICIAL DINÁMICO: Por regla del CETI, se selecciona "mañana" por defecto (índice 1)
  const [fecha, setFecha] = useState(opcionesFechas[1].valorLargo);
  
  const [esEquipo, setEsEquipo] = useState(true);
  const [proposito, setProposito] = useState('...');
  const [matriculaNueva, setMatriculaNueva] = useState('');
  const [mostrarInputMatricula, setMostrarInputMatricula] = useState(false);
  
  const [integrantes, setIntegrantes] = useState(() => {
    const sesion = localStorage.getItem('usuario_safestock');

    const alumnoReal = sesion ? JSON.parse(sesion) : null;

    return [
      {
        id: 1,
        nombre: alumnoReal ? alumnoReal.nombre : 'Solicitante',
        matricula: alumnoReal ? alumnoReal.Registro_Alu : '00000000',
        rol: 'Lider'
      }

    ];


});

  // Leer materiales agregados
  const [materiales, setMateriales] = useState(() => {
    const guardados = localStorage.getItem('solicitud_materiales_safe');
    return guardados ? JSON.parse(guardados) : [
      { id: 1, n: 'Multímetro Digital', codigo: 'EL-002', cantidad: 2 },
      { id: 2, n: 'Fuente variadora 24V', codigo: 'EL-008', cantidad: 1 },
      { id: 3, n: 'Arduino Uno', codigo: 'EL-015', cantidad: 1 }
    ];
  });

  useEffect(() => {
    localStorage.setItem('solicitud_materiales_safe', JSON.stringify(materiales));
  }, [materiales]);

  const eliminarMaterial = (id) => {
    setMateriales(materiales.filter(m => m.id !== id));
  };

  const eliminarIntegrante = (id) => {
    if (id === 1) return;
    setIntegrantes(integrantes.filter(i => i.id !== id));
  };

  const agregarIntegrante = (e) => {
    e.preventDefault();
    if (!matriculaNueva.trim()) return;
    setIntegrantes([...integrantes, { id: Date.now(), nombre: 'Integrante Añadido', matricula: matriculaNueva.toUpperCase(), rol: 'Colaborador' }]);
    setMatriculaNueva('');
    setMostrarInputMatricula(false);
  };

    // Agregamos 'async' porque el mensajero tarda unos milisegundos en ir y venir a la BD
  const enviarSolicitud = async () => {
    // CANDADO 1: Que no vaya vacío el propósito (Quitando espacios en blanco)
    if (!proposito || !proposito.trim()) {
      alert("Por favor, escribe el propósito del proyecto antes de enviar la solicitud.");
      return;
    }

    // CANDADO 2: Que haya materiales en el carrito
    if (materiales.length === 0) {
      alert("No hay materiales en tu resumen para solicitar.");
      return;
    }
    

    // 1. Empaquetamos los datos EXACTAMENTE como los pide tu server.js
    const paqueteDatos = {
      id_pedido: `PED-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      fecha_recogida: fecha, // El estado que creamos con el carrusel
      proposito: proposito,
      solicitante: integrantes[0].matricula, // El líder del equipo (el primer elemento)
      integrantes: integrantes,
      materiales: materiales
    };

    try {
      // 2. Lanzamos el paquete hacia la ventanilla 4 de Node.js
      const respuesta = await fetch('http://localhost:5000/api/pedidos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paqueteDatos)
      });

      const datosServidor = await respuesta.json();

      // 3. Revisamos si la base de datos nos dio luz verde
      if (datosServidor.status === "success") {
        alert("¡Solicitud registrada oficialmente en SafeStock!");
        localStorage.removeItem('solicitud_materiales_safe'); // Limpiamos el carrito
        navigate('/pedidos'); // Lo mandamos a la pantalla de historial
      } else {
        // Si el backend se queja por algo
        alert("Hubo un problema: " + datosServidor.message);
      }

    } catch (error) {
      console.error("Error de conexión:", error);
      alert("Error al conectar con el servidor. Revisa que Node.js esté encendido.");
    }
  };
  

  const totalUnidades = materiales.reduce((acc, curr) => acc + curr.cantidad, 0);

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
      <Navbar />
      
      <div className="max-w-350 mx-auto px-4 md:px-10 pt-12 flex flex-col lg:flex-row gap-10">
        <div className="grow bg-white rounded-4xl p-6 md:p-12 shadow-sm border border-slate-100 text-left lg:w-2/3">
          <header className="mb-8">
            <h1 className="text-3xl font-black text-[#1a1f2e] tracking-tight mb-1">Solicitud de préstamo</h1>
            <p className="text-slate-400 font-medium text-xs">Completa los datos para formalizar tu pedido</p>
          </header>

          <div className="bg-red-50 border border-red-100 rounded-2xl p-5 flex items-start gap-4 mb-8">
            <span className="text-red-500 text-lg mt-0.5">📋</span>
            <p className="text-red-900 text-xs leading-relaxed">
              <span className="font-bold">Solicitud con un día de anticipación obligatoria</span><br />
              Las solicitudes deben realizarse <span className="font-bold">antes de las 11:59 p.m. del día anterior</span> a la fecha de recogida. No es posible solicitar materiales para el mismo día.
            </p>
          </div>

          {/* --- SECCIÓN DE FECHA MODIFICADA --- */}
          <section className="mb-8">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Fecha de recogida *</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input 
                type="text" 
                value={fecha} 
                readOnly // Evitamos que escriban cosas raras, solo lectura
                className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none shadow-inner" 
              />
              
              {/* RENDERIZADO DINÁMICO DE BOTONES (AHORA CON SCROLL HORIZONTAL) */}
              <div className="flex gap-2 text-[10px] font-black overflow-x-auto pb-2 w-full scroll-smooth">
                {opcionesFechas.map((f) => (
                  <button 
                    key={f.id}
                    type="button" 
                    disabled={f.esHoy} 
                    onClick={() => setFecha(f.valorLargo)} 
                    // shrink-0 es la magia que evita que el botón se aplaste al haber muchos
                    className={`shrink-0 px-4 py-2 rounded-xl transition-all ${
                      f.esHoy 
                        ? 'text-slate-300 bg-slate-50 cursor-not-allowed border border-slate-100' 
                        : fecha === f.valorLargo 
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.esHoy ? `Hoy` : f.etiquetaBoton} {fecha === f.valorLargo && !f.esHoy && '✓'}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">¿Es un trabajo en equipo? *</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button type="button" onClick={() => setEsEquipo(false)} className={`p-4 rounded-xl border-2 flex items-center gap-4 text-left ${!esEquipo ? 'border-blue-500 bg-blue-50/10' : 'border-slate-100'}`}>
                <div className="text-xl">👤</div>
                <div>
                  <p className="font-bold text-[#1a1f2e] text-xs">Individual</p>
                  <p className="text-[10px] text-slate-400">Solo yo utilizaré estos materiales</p>
                </div>
              </button>
              <button type="button" onClick={() => setEsEquipo(true)} className={`p-4 rounded-xl border-2 flex items-center justify-between ${esEquipo ? 'border-blue-500 bg-blue-50/10' : 'border-slate-100'}`}>
                <div className="flex items-center gap-4 text-left">
                  <div className="text-xl">👥</div>
                  <div>
                    <p className="font-bold text-[#1a1f2e] text-xs">En equipo</p>
                    <p className="text-[10px] text-slate-400">Varias personas del mismo equipo</p>
                  </div>
                </div>
                {esEquipo && <span className="text-blue-500 text-xs font-black">✓</span>}
              </button>
            </div>
          </section>

          {/* Integrantes */}
          <AnimatePresence>
            {esEquipo && (
              <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Integrantes del equipo *</h3>
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  {integrantes.map((integ) => (
                    <div key={integ.id} className="flex items-center justify-between p-3.5 border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">{integrantes.nombre ? integrantes.nombre.substring(0, 2).toUpperCase() : 'XX'}</div>
                        <div>
                          <p className="font-bold text-[#1a1f2e]">{integ.nombre} {integ.id === 1 && <span className="text-[10px] text-slate-400 font-normal">· Tú (solicitante)</span>}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{integ.matricula}</p>
                        </div>
                      </div>
                      {integ.rol === 'Líder' ? <span className="text-[9px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase">Líder</span> : <button type="button" onClick={() => eliminarIntegrante(integ.id)} className="text-slate-300 hover:text-red-500 px-2">✕</button>}
                    </div>
                  ))}
                  {!mostrarInputMatricula ? (
                    <button type="button" onClick={() => setMostrarInputMatricula(true)} className="w-full p-3 bg-slate-50 text-blue-600 font-bold text-[11px] uppercase border-t border-slate-100">+ Agregar integrante por matrícula</button>
                  ) : (
                    <form onSubmit={agregarIntegrante} className="p-2 bg-slate-50 border-t border-slate-100 flex gap-2">
                      <input type="text" placeholder="Matrícula" value={matriculaNueva} onChange={(e) => setMatriculaNueva(e.target.value)} className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none uppercase" autoFocus />
                      <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black uppercase">Añadir</button>
                    </form>
                  )}
                </div>
                <p className="mt-3 text-blue-500 text-[10px] bg-blue-50/40 p-3 rounded-xl border border-blue-100/30">💡 <span className="font-bold">Los pedidos del equipo se fusionarán automáticamente.</span> Si algún integrante ya agregó cosas, se unirán en una sola lista.</p>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="mb-8">
             <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Propósito / Proyecto *</h3>
             <input type="text" value={proposito} onChange={(e) => setProposito(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium outline-none text-slate-800" />
          </section>

          <button type="button" onClick={enviarSolicitud} className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-black py-4 rounded-xl uppercase tracking-tight text-sm transition-transform active:scale-[0.99]">
            Enviar solicitud de préstamo →
          </button>
          <p className="w-full text-center text-[10px] text-slate-400 mt-2">Al enviar, el almacenista revisará y confirmará tu pedido</p>
        </div>

        <aside className="w-full lg:w-95 text-left shrink-0">
          <div className="bg-white rounded-4xl p-6 border border-slate-100 sticky top-24 shadow-sm">
            <h2 className="text-sm font-black text-[#1a1f2e] uppercase tracking-tight mb-6">Resumen del pedido</h2>
            
            <div className="flex flex-col gap-4 mb-6">
              {materiales.map((m) => (
                <div key={m.id} className="flex items-center justify-between group p-1 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-xl shadow-inner">🛠</div>
                    <div>
                      <h4 className="font-bold text-xs text-[#1a1f2e]">{m.n}</h4>
                      <p className="text-[10px] text-slate-400 font-mono">Cód. {m.codigo}</p>
                      <p className="text-[10px] font-bold text-slate-500">Cantidad: {m.cantidad}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => eliminarMaterial(m.id)} className="text-slate-300 hover:text-red-500 text-xs px-2">✕</button>
                </div>
              ))}
            </div>

            <div className="bg-green-50/60 border border-green-100 rounded-xl p-3.5 mb-4 text-xs text-left">
              <p className="text-green-800 font-black uppercase text-[9px] tracking-wider">📅 Fecha de recogida confirmada</p>
              <p className="text-green-700 font-bold mt-0.5">{fecha}</p>
              <p className="text-green-600/70 text-[10px]">A partir de las 8:00 a.m.</p>
            </div>

            {esEquipo && (
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 mb-6 text-xs text-left">
                <p className="text-blue-800 font-black uppercase text-[9px] tracking-wider">👥 Pedido en equipo</p>
                <div className="flex gap-1 my-2">
                  <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-black text-[8px] flex items-center justify-center">AL</div>
                  <div className="w-5 h-5 rounded-full bg-purple-600 text-white font-black text-[8px] flex items-center justify-center">MG</div>
                </div>
                <p className="text-blue-600 text-[10px] font-bold">{integrantes.length} integrantes · pedidos fusionados</p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs">
              <span className="text-slate-400 font-bold">Total de materiales</span>
              <span className="font-black text-[#1a1f2e] text-sm">{totalUnidades} unidades · {materiales.length} tipos</span>
            </div>
          </div>
        </aside>

      </div>
      </div>
    </AnimatedPage>
  );
};

export default Solicitud;
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';

const Solicitud = () => {
  const navigate = useNavigate();
  
  const [fecha, setFecha] = useState('Miércoles 19 de marzo, 2025');
  const [esEquipo, setEsEquipo] = useState(true);
  const [proposito, setProposito] = useState('...');
  const [matriculaNueva, setMatriculaNueva] = useState('');
  const [mostrarInputMatricula, setMostrarInputMatricula] = useState(false);
  
  const [integrantes, setIntegrantes] = useState([
    { id: 1, nombre: 'Leo', matricula: '23110177', rol: 'Colaborador' }
  ]);

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

  const enviarSolicitud = () => {
    if (materiales.length === 0) {
      alert("No hay materiales en tu resumen para solicitar.");
      return;
    }

    const nuevoPedido = {
      id: `PED-2024-${Math.floor(1000 + Math.random() * 9000)}`,
      fecha: '19 mar 2025',
      solicitante: esEquipo ? 'A. López · 23110178' : 'Kenya Gabriela Frutos González',
      detalles: materiales.map(m => `${m.cantidad}× ${m.n}`).join(' · '),
      estado: 'Solicitado',
      proposito: proposito
    };

    const historial = JSON.parse(localStorage.getItem('historial_pedidos_safe')) || [];
    localStorage.setItem('historial_pedidos_safe', JSON.stringify([nuevoPedido, ...historial]));

    alert("¡Solicitud enviada de forma exitosa!");
    localStorage.removeItem('solicitud_materiales_safe');
    navigate('/pedidos');
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


          <section className="mb-8">
            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Fecha de recogida *</h3>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <input type="text" value={fecha} onChange={(e) => setFecha(e.target.value)} className="w-full max-w-md bg-white border border-slate-200 rounded-xl py-2.5 px-4 text-xs font-bold text-slate-800 outline-none shadow-sm focus:border-blue-500" />
              <div className="flex gap-1.5 text-[10px] font-black">
                <button type="button" className="px-3 py-1.5 text-slate-300 bg-slate-50 rounded-xl cursor-not-allowed">Hoy (mar 18)</button>
                <button type="button" onClick={() => setFecha('Miércoles 19 de marzo, 2025')} className={`px-4 py-1.5 rounded-xl transition-colors ${fecha === 'Miércoles 19 de marzo, 2025' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Mié 19 ✓</button>
                <button type="button" onClick={() => setFecha('Jueves 20 de marzo, 2025')} className={`px-4 py-1.5 rounded-xl transition-colors ${fecha === 'Jueves 20 de marzo, 2025' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Jue 20</button>
                <button type="button" onClick={() => setFecha('Viernes 21 de marzo, 2025')} className={`px-4 py-1.5 rounded-xl transition-colors ${fecha === 'Viernes 21 de marzo, 2025' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>Vie 21</button>
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
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-[10px]">{integ.nombre.substring(0,2).toUpperCase()}</div>
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

          {/* Propósito */}
          <section className="mb-8">
             <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-3">Propósito / Proyecto *</h3>
             <input type="text" value={proposito} onChange={(e) => setProposito(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-medium outline-none text-slate-800" />
          </section>

          <button type="button" onClick={enviarSolicitud} className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-black py-4 rounded-xl uppercase tracking-tight text-sm transition-transform active:scale-[0.99]">
            Enviar solicitud de préstamo →
          </button>
          <p className="w-full text-center text-[10px] text-slate-400 mt-2">Al enviar, el almacenista revisará y confirmará tu pedido</p>
        </div>

        {/* COLUMNA DERECHA: RESUMEN EXACTO DE TU FOTO */}
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
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';

const Carrito = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(() => {
    const guardados = localStorage.getItem('solicitud_materiales_safe');
    return guardados ? JSON.parse(guardados) : [];
  });

  useEffect(() => {
    localStorage.setItem('solicitud_materiales_safe', JSON.stringify(items));
  }, [items]);

  const cambiarCantidad = (id, incremento) => {
    setItems(prev => prev.map(m => m.id === id ? { ...m, cantidad: Math.max(1, m.cantidad + incremento) } : m));
  };

  const eliminarItem = (id) => {
    setItems(items.filter(m => m.id !== id));
  };

  const totalUnidades = items.reduce((acc, curr) => acc + curr.cantidad, 0);

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans text-[#1a1f2e]">
        <Navbar />
        <div className="py-12 px-6 md:px-20 max-w-5xl mx-auto text-left">
        <h1 className="text-4xl font-black italic uppercase tracking-tight mb-8">Mi Carrito de Materiales</h1>
        
        {items.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
            <span className="text-6xl block mb-4">🛒</span>
            <p className="text-slate-400 font-bold mb-6">Tu carrito está completamente vacío.</p>
            <button onClick={() => navigate('/inventario')} className="bg-[#2563eb] text-white font-black px-6 py-3 rounded-xl uppercase italic text-xs">Explorar Catálogo</button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            <AnimatePresence mode="popLayout">
              {items.map(m => (
                <motion.div key={m.id} layout exit={{ opacity: 0, x: 30 }} className="bg-white border border-slate-100 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
                      {typeof m.i === 'string' && m.i.length > 5 ? <img src={m.i} className="w-full h-full object-cover" /> : m.i}
                    </div>
                    <div>
                      <h3 className="font-black text-lg text-slate-800 uppercase italic">{m.n}</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{m.c}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl">
                      <button onClick={() => cambiarCantidad(m.id, -1)} className="w-8 h-8 bg-white font-bold rounded-lg shadow-sm">-</button>
                      <span className="w-6 text-center font-black">{m.cantidad}</span>
                      <button onClick={() => cambiarCantidad(m.id, 1)} className="w-8 h-8 bg-white font-bold rounded-lg shadow-sm">+</button>
                    </div>
                    <button onClick={() => eliminarItem(m.id)} className="text-slate-300 hover:text-red-500 text-xl px-2">🗑️</button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="bg-white border border-slate-100 rounded-3xl p-6 mt-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-sm">
              <div>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Acumulado</p>
                <p className="text-2xl font-black text-[#1a1f2e] italic">{totalUnidades} unidades seleccionadas</p>
              </div>
              
              {/* ESTE BOTÓN ES EL QUE ABRE EL FORMULARIO DE SOLICITUD */}
              <button 
                onClick={() => navigate('/solicitud')} 
                className="bg-[#2563eb] hover:bg-blue-700 text-white font-black px-10 py-4 rounded-xl uppercase italic tracking-tight text-sm shadow-lg shadow-blue-500/20"
              >
                Realizar Solicitud de Préstamo →
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </AnimatedPage>
  );
};

export default Carrito;
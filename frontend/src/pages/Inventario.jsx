import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';

import osciloscopio from '../assets/osciloscopio.jpg';

const Inventario = () => {
  const navigate = useNavigate();
  const [cat, setCat] = useState('Todas');
  const [est, setEst] = useState('Todos');

  const materiales = [
    { id: 1, n: 'Fuente variadora', d: 24, e: 'EN STOCK', c: 'Electrónica', i: '🔬' }, 
    { id: 2, n: 'Multímetro Digital', d: 11, e: 'EN STOCK', c: 'Electrónica', i: '🔬' },
    { id: 3, n: 'Osciloscopio', d: 0, e: 'AGOTADO', c: 'Electrónica', i: osciloscopio }, 
    { id: 4, n: 'Arduino Uno R3', d: 15, e: 'EN STOCK', c: 'Electrónica', i: '🤖' },
    { id: 5, n: 'Destornillador set', d: 3, e: 'PRESTADO', c: 'Herramientas', i: '🔧' },
    { id: 6, n: 'Generador de señales', d: 2, e: 'EN STOCK', c: 'Electrónica', i: '📟' },
    { id: 7, n: 'Kit tornillería', d: 8, e: 'EN STOCK', c: 'Herramientas', i: '🔩' },
    { id: 8, n: 'Martillo', d: 7, e: 'EN STOCK', c: 'Herramientas', i: '🔨' },
  ];

  const filtrados = materiales.filter(m => 
    (cat === 'Todas' || m.c === cat) && (est === 'Todos' || m.e === est)
  );

  const renderVisual = (src) => {
    if (typeof src !== 'string' || src.includes('/') || src.includes('static')) {
      return <img src={src} alt="material" className="w-full h-full object-cover" />;
    }
    return src;
  };

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] pb-20 font-sans">
      <Navbar />
      <div className="p-16 max-w-7xl mx-auto flex flex-col">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="text-left">
            <h1 className="text-6xl font-black text-[#1a1f2e] italic tracking-tighter mb-4 uppercase leading-none">INVENTARIO</h1>
            <p className="text-slate-500 font-bold text-lg">{filtrados.length} resultados encontrados</p>
          </div>
          
          <div className="flex gap-4">
            <select value={cat} onChange={(e) => setCat(e.target.value)} className="bg-white border-2 border-slate-100 p-4 rounded-2xl text-sm font-bold text-slate-600 outline-none shadow-sm cursor-pointer hover:border-blue-300 transition-all">
              <option value="Todas">Todas las categorías</option>
              <option value="Electrónica">Electrónica</option>
              <option value="Herramientas">Herramientas</option>
            </select>
            <select value={est} onChange={(e) => setEst(e.target.value)} className="bg-white border-2 border-slate-100 p-4 rounded-2xl text-sm font-bold text-slate-600 outline-none shadow-sm cursor-pointer hover:border-blue-300 transition-all">
              <option value="Todos">Todos los estados</option>
              <option value="EN STOCK">En Stock</option>
              <option value="PRESTADO">Prestados</option>
              <option value="AGOTADO">Agotados</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <AnimatePresence mode="popLayout">
            {filtrados.map((m) => (
              <motion.div 
                key={m.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                transition={{ duration: 0.3 }}
                onClick={() => navigate(`/material/${m.id}`)}
                className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group transition-all cursor-pointer"
              >
                <div className="bg-slate-50 w-full aspect-square rounded-[2.5rem] flex items-center justify-center text-6xl mb-8 shadow-inner group-hover:bg-blue-50 transition-colors overflow-hidden">
                  {renderVisual(m.i)}
                </div>
                <div className="flex-1 w-full text-center">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 block">
                    {m.c}
                  </span>
                  <h3 className="text-[#1a1f2e] font-black text-xl mb-2 uppercase tracking-tight italic leading-tight min-h-12 flex items-center justify-center">
                    {m.n}
                  </h3>
                  <p className="text-slate-400 font-bold text-xs mb-6">{m.d} disponibles</p>
                </div>
                <span className={`px-6 py-2 rounded-full text-[10px] font-black tracking-widest ${
                  m.e === 'EN STOCK' ? 'bg-green-100 text-green-700' : 
                  m.e === 'AGOTADO' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-800'
                }`}>{m.e}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      </div>
    </AnimatedPage>
  );
};

export default Inventario;
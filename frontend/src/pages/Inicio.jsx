import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';

import osciloscopio from '../assets/osciloscopio.jpg';

const Inicio = () => {
  const navigate = useNavigate(); 

  const recientes = [
    { id: 1, n: 'Fuente variadora', i: '🔬' , d: 24, e: 'EN STOCK' }, 
    { id: 2, n: 'Multímetro Digital', i: '🔬', d: 11, e: 'EN STOCK' },
    { id: 3, n: 'Osciloscopio', i: osciloscopio, d: 0, e: 'AGOTADO' },
    { id: 4, n: 'Martillo', i: '🔨', d: 7, e: 'EN STOCK' }
  ];

  const renderVisual = (src) => {
    if (typeof src !== 'string' || src.includes('/') || src.includes('static')) {
      return (
        <img 
          src={src} 
          alt="material" 
          className="w-full h-full object-cover" 
        />
      );
    }
    return src;
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="min-h-screen bg-[#f8f9fc] font-sans"
    >
      <Navbar />
      
      {/* Banner Principal */}
      <section className="bg-[#0a0f1d] h-[65vh] relative flex items-center px-20 text-white overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] -top-20 -left-20"></div>
        <div className="relative z-10 text-left"> 
          <h1 className="text-8xl font-black italic tracking-tighter mb-6 leading-none uppercase">SAFE STOCK</h1>
          <p className="text-slate-400 text-xl max-w-md mb-10 italic">División de Ingeniería Mecatrónica</p>
          <Link to="/inventario" className="bg-white text-[#0a0f1d] px-10 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform inline-block">
            Explorar catálogo →
          </Link>
        </div>
      </section>

      {/* Sección Recién Agregados */}
      <section className="py-20 px-20 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div className="text-left">
            <h2 className="text-3xl font-black text-[#1a1f2e] italic uppercase tracking-tighter">Recién agregados</h2>
            <p className="text-slate-400 font-bold">Materiales disponibles para préstamo</p>
          </div>
        
          <Link 
            to="/inventario" 
            className="text-blue-600 font-black hover:text-blue-800 transition-colors flex items-center gap-2 group text-sm"
          >
            VER INVENTARIO COMPLETO 
            <span className="group-hover:translate-x-1 transition-transform">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {recientes.map((m) => (
            <motion.div 
              key={m.id} 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/material/${m.id}`)}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col items-center text-center cursor-pointer transition-shadow hover:shadow-xl"
            >
              <div className="bg-slate-50 w-full aspect-square rounded-[2rem] flex items-center justify-center text-5xl mb-6 shadow-inner italic overflow-hidden">
                {renderVisual(m.i)}
              </div>
              <h3 className="font-black text-lg text-[#1a1f2e] uppercase italic mb-4 leading-tight min-h-[3rem] flex items-center">
                {m.n}
              </h3>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest ${
                m.e === 'EN STOCK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {m.e}
              </span>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
};

export default Inicio;
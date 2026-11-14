import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';
import Logo from '../components/Logo';

const Inicio = () => {
  const navigate = useNavigate(); 
  const [populares, setPopulares] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);

  // Los 4 materiales que más se han pedido (según la base de datos)
  useEffect(() => {
    fetch('/backend/api/materiales-populares?limite=4')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) =>
        setPopulares(
          data.map((item) => ({
            id: item.ID_Material,
            n: item.Nombre,
            d: item.Cantidad,
            veces: item.Veces_Solicitado,
            e: item.Cantidad > 0 ? 'EN STOCK' : 'AGOTADO',
            i: `/images/${item.ID_Material}.jpg`,
          }))
        )
      )
      .catch(() => setError(true))
      .finally(() => setCargando(false));
  }, []);

  const renderVisual = (src) => (
    <img
      src={src}
      alt="material"
      className="w-full h-full object-cover"
      onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement.textContent = '📦'; }}
    />
  );

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans">
      <Navbar />
      
      <section className="bg-[#0a0f1d] h-[65vh] relative flex items-center px-20 text-white overflow-hidden">
        <div className="absolute w-125 h-125 bg-blue-600/10 rounded-full blur-[120px] -top-20 -left-20"></div>
        <div className="relative z-10 text-left"> 
          <h1 className="text-8xl font-black italic tracking-tighter mb-6 leading-none uppercase">SAFE STOCK</h1>
          <p className="text-slate-400 text-xl max-w-md mb-10 italic">División de Ingeniería Mecatrónica</p>
          <Link to="/inventario" className="bg-white text-[#0a0f1d] px-10 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform inline-block">
            Explorar catálogo →
          </Link>
        </div>
        <div className="hidden lg:block absolute right-20 top-1/2 -translate-y-1/2 z-10">
          <Logo tamano="xl" className="drop-shadow-2xl" />
        </div>
      </section>

      <section className="py-20 px-20 max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div className="text-left">
            <h2 className="text-3xl font-black text-[#1a1f2e] italic uppercase tracking-tighter">Más solicitados</h2>
            <p className="text-slate-400 font-bold">Los materiales que más piden tus compañeros</p>
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
          {cargando && [0, 1, 2, 3].map((k) => (
            <div key={k} className="bg-white p-8 rounded-4xl border border-slate-100 h-80 animate-pulse" />
          ))}
          {error && (
            <p className="col-span-full text-center text-slate-400 font-bold py-10">No se pudieron cargar los materiales. Intenta recargar la página.</p>
          )}
          {populares.map((m) => (
            <motion.div 
              key={m.id} 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate(`/material/${m.id}`)}
              className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex flex-col items-center text-center cursor-pointer transition-shadow hover:shadow-xl"
            >
              <div className="bg-slate-50 w-full aspect-square rounded-4xl flex items-center justify-center text-5xl mb-6 shadow-inner italic overflow-hidden">
                {renderVisual(m.i)}
              </div>
              <h3 className="font-black text-lg text-[#1a1f2e] uppercase italic mb-4 leading-tight min-h-12 flex items-center">
                {m.n}
              </h3>
              <p className="text-slate-400 font-bold text-xs mb-3">
                {m.veces > 0 ? `Pedido ${m.veces} ${m.veces === 1 ? 'vez' : 'veces'}` : 'Aún sin pedidos'} · {m.d} disponibles
              </p>
              <span className={`px-4 py-1.5 rounded-full text-[9px] font-black tracking-widest ${
                m.e === 'EN STOCK' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {m.e}
              </span>
            </motion.div>
          ))}
        </div>
      </section>
      </div>
    </AnimatedPage>
  );
};

export default Inicio;
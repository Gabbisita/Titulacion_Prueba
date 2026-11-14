import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';
import { mostrarToast } from '../components/notificaciones';

const Inventario = () => {
  const navigate = useNavigate();
  const [cat, setCat] = useState('Todas');
  const [est, setEst] = useState('Todos');
  
  const [materiales, setMateriales] = useState([]);

  useEffect(() => {
    const obtenerMateriales = async () => {
      try {
        const response = await fetch('/backend/api/materiales');
        const data = await response.json();

        const inventarioReal = data.map((item) => {
          let categoriaTexto = 'Otros';
          if (item.FK_No_Categoria === 1) categoriaTexto = 'Electrónica';
          if (item.FK_No_Categoria === 2) categoriaTexto = 'Mecánica';
          if (item.FK_No_Categoria === 3) categoriaTexto = 'Consumibles';
          if (item.FK_No_Categoria === 4) categoriaTexto = 'Equipos';

          return {
            id: item.ID_Material,
            n: item.Nombre, 
            d: item.Cantidad, 
            c: categoriaTexto, 
            e: item.Cantidad > 0 ? 'EN STOCK' : 'AGOTADO', 
            i: `/images/${item.ID_Material}.jpg` 
          };
        });

        setMateriales(inventarioReal);

      } catch (error) {
        console.error("Error conectando con el servidor:", error);
      }
    };

    obtenerMateriales(); 
  }, []); 

  // --- NUEVA FUNCIÓN: Agregar rápido sin salir de la página ---
  const agregarRapidoAlCarrito = (e, m) => {
    e.stopPropagation(); // Evita que se abra la página de detalles
    e.preventDefault();

    const guardados = localStorage.getItem('solicitud_materiales_safe');
    let carrito = guardados ? JSON.parse(guardados) : [];
    const index = carrito.findIndex(item => item.id === m.id);

    if (index !== -1) {
      if (carrito[index].cantidad < m.d){
        carrito[index].cantidad += 1;
      }else{
        mostrarToast(`Solo hay ${m.d} unidades disponibles de ${m.n}.`, 'error');
        return;
      }
    } else {
      carrito.push({
        id: m.id,
        n: m.n,
        codigo: `EL-00${m.id}`,
        cantidad: 1
      });
    }

    localStorage.setItem('solicitud_materiales_safe', JSON.stringify(carrito));
    mostrarToast(`Se agregó 1 × ${m.n} al carrito`);
  };

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
              <option value="Mecánica">Mecánica</option> 
              <option value="Consumibles">Consumibles</option>
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
                className="bg-white p-6 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center text-center group transition-all cursor-pointer"
              >
                <div className="bg-slate-50 w-full aspect-square rounded-[2.5rem] flex items-center justify-center text-6xl mb-6 shadow-inner group-hover:bg-blue-50 transition-colors overflow-hidden">
                  {renderVisual(m.i)}
                </div>
                
                <div className="flex-1 w-full text-center">
                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-2 block">
                    {m.c}
                  </span>
                  <h3 className="text-[#1a1f2e] font-black text-xl mb-2 uppercase tracking-tight italic leading-tight min-h-12 flex items-center justify-center">
                    {m.n}
                  </h3>
                  <p className="text-slate-400 font-bold text-xs mb-4">{m.d} disponibles</p>
                </div>
                
                {/* --- SECCIÓN INFERIOR MODIFICADA (Letrero + Botón Carrito) --- */}
                <div className="flex items-center justify-between w-full mt-auto px-2">
                  <span className={`px-4 py-2 rounded-full text-[10px] font-black tracking-widest ${
                    m.e === 'EN STOCK' ? 'bg-green-100 text-green-700' : 
                    m.e === 'AGOTADO' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {m.e}
                  </span>

                  {/* Solo mostramos el carrito si hay stock */}
                  {m.e === 'EN STOCK' && (
                    <button 
                      onClick={(e) => agregarRapidoAlCarrito(e, m)}
                      className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center text-lg shadow-md hover:scale-110 active:scale-95 transition-all"
                      title="Agregar 1 unidad al carrito"
                    >
                      🛒
                    </button>
                  )}
                </div>
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
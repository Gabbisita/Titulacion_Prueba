import { useState, useEffect } from 'react'; // <-- IMPORTANTE: Agregar useEffect
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import AnimatedPage from '../components/AnimatedPage';

const Inventario = () => {
  const navigate = useNavigate();
  const [cat, setCat] = useState('Todas');
  const [est, setEst] = useState('Todos');
  
  // 1. Iniciamos el inventario como un arreglo vacío
  const [materiales, setMateriales] = useState([]);

  // 2. Usamos useEffect para ir a buscar los datos a tu servidor Node.js
  useEffect(() => {
    const obtenerMateriales = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/materiales');
        const data = await response.json();

        // 3. Traducimos los datos de tu Base de Datos al formato de Kenya
        const inventarioReal = data.map((item) => {
          
          // Calculamos la categoría basada en tu número (FK)
          let categoriaTexto = 'Otros';
          if (item.FK_No_Categoria === 1) categoriaTexto = 'Electrónica';
          if (item.FK_No_Categoria === 2) categoriaTexto = 'Mecánica';
          if (item.FK_No_Categoria === 3) categoriaTexto = 'Consumibles';
          if (item.FK_No_Categoria === 4) categoriaTexto = 'Equipos';

          return {
            id: item.ID_Material,
            n: item.Nombre, // El nombre del material
            d: item.Cantidad, // El stock disponible
            c: categoriaTexto, // La categoría en texto
            e: item.Cantidad > 0 ? 'EN STOCK' : 'AGOTADO', // Calculamos el estado en vivo
            i: `/images/${item.ID_Material}.jpg` // Opción A: La ruta de la imagen local
          };
        });

        // 4. Guardamos los datos reales en el estado para que React dibuje la página
        setMateriales(inventarioReal);

      } catch (error) {
        console.error("Error conectando con el servidor:", error);
      }
    };

    obtenerMateriales(); // Ejecutamos la función
  }, []); // Los corchetes vacíos significan que solo se ejecuta 1 vez al abrir la página

  // --- De aquí para abajo el código de Kenya se queda EXACTAMENTE IGUAL ---

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
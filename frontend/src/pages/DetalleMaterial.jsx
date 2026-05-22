import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';


import heroImg from '../assets/hero.png';
import osciloscopio from '../assets/osciloscopio.jpg';

const DetalleMaterial = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const [cantidad, setCantidad] = useState(1);
  const [material, setMaterial] = useState(null);

  const materialesDB = [
    { id: 1, n: 'Fuente variadora', d: 24, e: 'EN STOCK', c: 'Electrónica', i: heroImg, desc: 'Fuente de poder regulable ideal para proyectos de circuitos integrados.' },
    { id: 2, n: 'Multímetro Digital', d: 11, e: 'EN STOCK', c: 'Electrónica', i: '🔬', desc: 'Herramienta de medición de alta precisión para voltaje, corriente y resistencia.' },
    { id: 3, n: 'Osciloscopio', d: 0, e: 'AGOTADO', c: 'Electrónica', i: osciloscopio, desc: 'Equipo avanzado para visualización de señales de frecuencia de hasta 100MHz.' },
    { id: 4, n: 'Arduino Uno R3', d: 15, e: 'EN STOCK', c: 'Electrónica', i: '🤖', desc: 'Placa de desarrollo microcontrolada para prototipado rápido de proyectos.' },
    { id: 5, n: 'Destornillador set', d: 3, e: 'PRESTADO', c: 'Herramientas', i: '🔧', desc: 'Set completo de destornilladores de precisión con puntas intercambiables.' },
    { id: 6, n: 'Generador de señales', d: 2, e: 'EN STOCK', c: 'Electrónica', i: '📟', desc: 'Generador de funciones para pruebas de laboratorio y análisis de circuitos.' },
    { id: 7, n: 'Kit tornillería', d: 8, e: 'EN STOCK', c: 'Herramientas', i: '🔩', desc: 'Kit de diversos tamaños y métricas para ensambles mecánicos generales.' },
    { id: 8, n: 'Martillo', d: 7, e: 'EN STOCK', c: 'Herramientas', i: '🔨', desc: 'Herramienta básica de impacto con mango ergonómico para taller mecánico.' },
  ];

  useEffect(() => {
    const encontrado = materialesDB.find(m => m.id === parseInt(id));
    setMaterial(encontrado);
  }, [id]);

  const agregarASolicitudDirecta = () => {
    if (!material) return;

    const actuales = JSON.parse(localStorage.getItem('solicitud_materiales_safe')) || [];
    const existeIndex = actuales.findIndex(item => item.id === material.id);

    if (existeIndex >= 0) {
      actuales[existeIndex].cantidad += cantidad;
    } else {
      actuales.push({
        id: material.id,
        n: material.n,
        cantidad: cantidad,
        codigo: `EL-00${material.id}`
      });
    }

    localStorage.setItem('solicitud_materiales_safe', JSON.stringify(actuales));
    navigate('/solicitud'); 
  };

  if (!material) return <div className="text-white p-20 font-black italic uppercase">Cargando material...</div>;

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#0a0f1d] font-sans text-white p-6 md:p-12">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-slate-400 hover:text-blue-500 mb-10 font-bold uppercase text-xs tracking-widest transition-colors"
      >
        <span>←</span> Volver al Inventario
      </button>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative group">
          <div className="absolute -inset-1 bg-linear-to-r from-blue-600 to-cyan-500 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000"></div>
          <div className="relative bg-[#111827] border border-white/10 rounded-3xl overflow-hidden flex items-center justify-center h-125">
            {typeof material.i !== 'string' || material.i.length > 5 ? (
              <img src={material.i} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={material.n} />
            ) : (
              <div className="text-9xl drop-shadow-2xl">{material.i}</div>
            )}
            <div className="absolute bottom-6 right-6 bg-blue-600 px-4 py-2 rounded-xl font-black italic text-sm uppercase">
                {material.e === 'AGOTADO' ? 'Vista Previa' : 'Disponible'}
            </div>
          </div>
        </div>

        <div className="flex flex-col text-left">
          <span className="text-blue-500 font-black uppercase tracking-[0.2em] text-xs mb-4">{material.c}</span>
          <h1 className="text-6xl font-bold italic tracking-tighter leading-none mb-4 uppercase">{material.n}</h1>
          <p className="text-slate-400 text-lg mb-8 max-w-md leading-relaxed">{material.desc}</p>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 flex justify-between items-center shadow-inner">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">Estado en sistema</p>
              <p className={`text-3xl font-bold uppercase italic ${material.e === 'AGOTADO' ? 'text-red-500' : 'text-white'}`}>
                {material.e}
              </p>
              <p className="text-slate-400 text-sm font-bold mt-1">{material.d} unidades físicas</p>
            </div>
            <div className={`w-4 h-4 rounded-full animate-pulse shadow-lg ${material.e === 'EN STOCK' ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 shadow-red-500/50'}`}></div>
          </div>


          <div className="flex gap-4">
            {material.e === 'EN STOCK' && (
              <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-2 shadow-lg">
                <button onClick={() => cantidad > 1 && setCantidad(cantidad - 1)} className="w-12 h-12 hover:bg-white/10 rounded-xl transition-all font-bold text-xl">-</button>
                <span className="w-12 text-center font-bold text-xl">{cantidad}</span>
                <button onClick={() => cantidad < material.d && setCantidad(cantidad + 1)} className="w-12 h-12 hover:bg-white/10 rounded-xl transition-all font-bold text-xl">+</button>
              </div>
            )}

            <button 
              disabled={material.e === 'AGOTADO'}
              onClick={agregarASolicitudDirecta}
              className={`flex-1 font-black py-5 rounded-2xl transition-all transform active:scale-95 uppercase tracking-tight italic text-lg ${
                material.e === 'AGOTADO' 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                : 'bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-blue-900/40 shadow-2xl'
              }`}
            >
              {material.e === 'AGOTADO' ? 'No disponible para préstamo' : 'Solicitar Préstamo Ahora'}
            </button>
          </div>
          
          <p className="mt-8 text-slate-500 text-[11px] text-center italic border-t border-white/5 pt-6">
            * Se requiere credencial vigente para procesar la solicitud en el mostrador.
          </p>
        </div>
      </div>
      </div>
    </AnimatedPage>
  );
};

export default DetalleMaterial;
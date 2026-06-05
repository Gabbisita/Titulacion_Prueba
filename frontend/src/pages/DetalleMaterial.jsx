import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AnimatedPage from '../components/AnimatedPage';

// Eliminamos los imports de imágenes locales porque ahora usaremos las de la carpeta public/images

const DetalleMaterial = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 
  const [cantidad, setCantidad] = useState(1);
  const [material, setMaterial] = useState(null);
  
  // NUEVO: Estado para saber si seguimos esperando al servidor
  const [cargando, setCargando] = useState(true);

  // NUEVO: El Efecto que va al backend por los datos reales
  useEffect(() => {
    const obtenerMaterial = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/materiales/${id}`);
        
        if (response.ok) {
          const item = await response.json();
          
          // Calculamos la categoría de texto según tu llave foránea
          let categoriaTexto = 'Otros';
          if (item.FK_No_Categoria === 1) categoriaTexto = 'Electrónica';
          if (item.FK_No_Categoria === 2) categoriaTexto = 'Mecánica';
          if (item.FK_No_Categoria === 3) categoriaTexto = 'Consumibles';
          if (item.FK_No_Categoria === 4) categoriaTexto = 'Equipos';

          // EL TRADUCTOR: Transformamos los datos de TiDB al formato de Kenya
          const materialTraducido = {
            id: item.ID_Material,
            n: item.Nombre,
            d: item.Cantidad,
            e: item.Cantidad > 0 ? 'EN STOCK' : 'AGOTADO',
            c: categoriaTexto,
            i: `/images/${item.ID_Material}.jpg`, // Ruta a la imagen local
            desc: item.Descripcion || 'Equipo disponible en los laboratorios de mecatrónica.'
          };

          setMaterial(materialTraducido);
        } else {
          console.error("Material no encontrado en la base de datos");
        }
      } catch (error) {
        console.error("Error conectando con el servidor de Node:", error);
      } finally {
        setCargando(false); // Apagamos la pantalla de carga
      }
    };

    obtenerMaterial();
  }, [id]);

  // Esta función se queda idéntica, la lógica del carrito de Kenya es excelente
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
        codigo: `EL-00${material.id}` // Esto generará códigos como EL-0030001
      });
    }

    localStorage.setItem('solicitud_materiales_safe', JSON.stringify(actuales));
    navigate('/solicitud'); 
  };

  // NUEVO: Pantalla de carga mientras responde el servidor
  if (cargando) {
    return (
      <div className="min-h-screen bg-[#0a0f1d] flex items-center justify-center">
        <div className="text-blue-500 text-2xl font-black italic uppercase animate-pulse">
          Conectando con Almacén...
        </div>
      </div>
    );
  }

  // Si se puso un ID inválido en la URL
  if (!material) return <div className="text-red-500 p-20 font-black italic uppercase text-center bg-[#0a0f1d] min-h-screen">Material no encontrado</div>;

  // --- DE AQUÍ HACIA ABAJO EL DISEÑO DE KENYA QUEDA INTACTO ---
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
              <img src={material.i} className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-110" alt={material.n} />
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
            * Se requiere credencial vigente de CETI para procesar la solicitud en el mostrador.
          </p>
        </div>
      </div>
      </div>
    </AnimatedPage>
  );
};

export default DetalleMaterial;
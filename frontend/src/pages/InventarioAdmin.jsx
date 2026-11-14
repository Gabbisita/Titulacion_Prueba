import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';

const InventarioAdmin = () => {
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);
  
  const [formData, setFormData] = useState({
    ID_Material: '',
    Nombre: '',
    FK_No_Categoria: '',
    Cantidad: 0,
    Descripcion: ''
  });

  const [materiales, setMateriales] = useState([]);
  
  // Estados para manejar la imagen
  const [imagenNueva, setImagenNueva] = useState(null);
  const [previewImagen, setPreviewImagen] = useState(null); // Para mostrar cómo quedó

  // --- 1. LECTURA (GET): Cargar datos al entrar ---
  const obtenerMateriales = async () => {
    try {
      const respuesta = await fetch('/backend/api/admin/materiales');
      const data = await respuesta.json();
      setMateriales(data);
    } catch (error) {
      console.error("Error cargando inventario:", error);
    }
  };

  useEffect(() => {
    obtenerMateriales();
  }, []);

  // --- FUNCIONES DE CONTROL DEL MODAL ---
  const abrirModalAgregar = () => {
    setModoEdicion(false);
    setFormData({ ID_Material: '', Nombre: '', FK_No_Categoria: '', Cantidad: 0, Descripcion: '' });
    setImagenNueva(null);
    setPreviewImagen(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (material) => {
    setModoEdicion(true);
    setFormData({
      ID_Material: material.ID_Material,
      Nombre: material.Nombre,
      FK_No_Categoria: material.FK_No_Categoria,
      Cantidad: material.Cantidad,
      Descripcion: material.Descripcion || ''
    });
    setImagenNueva(null);
    // Mostramos la imagen actual que ya existe en la carpeta
    setPreviewImagen(`/images/${material.ID_Material}.jpg`); 
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
  };

  const manejarCambioInput = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- LÓGICA DE CONVERSIÓN DE IMAGEN (TU CÓDIGO INTEGRADO) ---
  const manejarCambioImagen = (e) => {
    const archivo = e.target.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(evento) {
      const imgTemp = new Image();
      imgTemp.onload = function() {
        // Creamos el lienzo invisible
        const canvas = document.createElement('canvas');
        canvas.width = 500;
        canvas.height = 500;
        const ctx = canvas.getContext('2d');

        // 1. Rellenamos el fondo gris claro
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 2. Calculamos proporciones para no deformar
        const ratio = Math.min(canvas.width / imgTemp.width, canvas.height / imgTemp.height);
        const nuevoAncho = imgTemp.width * ratio;
        const nuevoAlto = imgTemp.height * ratio;
        const posicionX = (canvas.width - nuevoAncho) / 2;
        const posicionY = (canvas.height - nuevoAlto) / 2;

        // 3. Dibujamos la imagen centrada
        ctx.drawImage(imgTemp, posicionX, posicionY, nuevoAncho, nuevoAlto);

        // 4. Convertimos el canvas a un archivo JPG (Blob)
        canvas.toBlob((blob) => {
          // Creamos un archivo real a partir del resultado para enviarlo al servidor
          const archivoConvertido = new File([blob], 'imagen_optimizada.jpg', { type: 'image/jpeg' });
          setImagenNueva(archivoConvertido);
          
          // Creamos una URL temporal para mostrar la vista previa en el modal
          setPreviewImagen(URL.createObjectURL(archivoConvertido));
        }, 'image/jpeg', 0.9); // 0.9 es la calidad del JPG
      };
      
      imgTemp.src = evento.target.result;
    };
    
    lector.readAsDataURL(archivo);
  };

  // --- 2. CREAR (POST) y ACTUALIZAR (PUT) ---
  const guardarMaterial = async (e) => {
    e.preventDefault();
    
    const datosAEnviar = new FormData();
    datosAEnviar.append('ID_Material', formData.ID_Material);
    datosAEnviar.append('Nombre', formData.Nombre);
    datosAEnviar.append('Cantidad', formData.Cantidad);
    datosAEnviar.append('FK_No_Categoria', formData.FK_No_Categoria);
    datosAEnviar.append('Descripcion', formData.Descripcion);
    
    if (imagenNueva) {
      datosAEnviar.append('imagen', imagenNueva);
    }

    try {
      let url = '/backend/api/admin/materiales';
      let metodo = 'POST';

      if (modoEdicion) {
        url = `/backend/api/admin/materiales/${formData.ID_Material}`;
        metodo = 'PUT'; 
      }

      const respuesta = await fetch(url, {
        method: metodo,
        body: datosAEnviar
      });

      const resultado = await respuesta.json();

      if (resultado.status === 'success') {
        obtenerMateriales(); 
        cerrarModal();
      } else {
        alert("Hubo un error al guardar: " + resultado.error);
      }
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  // --- 3. ELIMINAR (DELETE) ---
  const eliminarMaterial = async (id) => {
    if (window.confirm('¿Estás seguro de que deseas dar de baja este material del inventario? Esta acción no se puede deshacer.')) {
      try {
        const respuesta = await fetch(`/backend/api/admin/materiales/${id}`, { method: 'DELETE' });
        const resultado = await respuesta.json();
        
        if (resultado.status === 'success') {
          obtenerMateriales();
        } else {
          alert("Error al eliminar.");
        }
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  };

  const materialesFiltrados = materiales.filter(m => 
    m.Nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    m.ID_Material.toString().includes(busqueda)
  );

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />
        
        <div className="max-w-7xl mx-auto px-4 md:px-10 pt-12">
          {/* ENCABEZADO */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-[#1a1f2e] tracking-tight">Gestión de Inventario</h1>
              <p className="text-slate-400 font-medium text-sm mt-1">Administra las existencias de la base de datos MySQL en tiempo real.</p>
            </div>
            <button onClick={abrirModalAgregar} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl uppercase tracking-tight text-xs transition-transform active:scale-[0.98] shadow-md shadow-blue-500/20 flex items-center gap-2">
              <span className="text-lg">+</span> Agregar Material
            </button>
          </div>

          {/* BARRA DE BÚSQUEDA */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <input type="text" placeholder="Buscar por nombre o ID (ej. 30001)..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500 transition-colors" />
          </div>

          {/* TABLA DE INVENTARIO */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="p-4 font-black">ID Material</th>
                    <th className="p-4 font-black">Nombre del Material</th>
                    <th className="p-4 font-black">Categoría</th>
                    <th className="p-4 font-black text-center">Existencias</th>
                    <th className="p-4 font-black text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {materialesFiltrados.map((item) => (
                    <tr key={item.ID_Material} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono text-xs font-bold text-slate-600">{item.ID_Material}</td>
                      <td className="p-4 flex items-center gap-3">
                        <img src={`/images/${item.ID_Material}.jpg`} alt={item.Nombre} className="w-10 h-10 object-cover rounded-lg border border-slate-200 bg-white" onError={(e) => { e.target.src = "https://via.placeholder.com/500x500?text=Sin+Imagen" }} />
                        <div>
                          <p className="font-bold text-sm text-[#1a1f2e]">{item.Nombre}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-xs">{item.Descripcion || 'Sin descripción'}</p>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-medium text-slate-500">
                        <span className="bg-slate-100 px-2 py-1 rounded-md">{item.Nombre_Categoria}</span>
                      </td>
                      <td className="p-4 text-center font-black text-blue-600">{item.Cantidad}</td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => abrirModalEditar(item)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors" title="Editar">✏️</button>
                          <button onClick={() => eliminarMaterial(item.ID_Material)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* MODAL DE AGREGAR/EDITAR */}
        <AnimatePresence>
          {modalAbierto && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="font-black text-[#1a1f2e] text-lg">{modoEdicion ? 'Editar Material' : 'Nuevo Material'}</h3>
                  <button type="button" onClick={cerrarModal} className="text-slate-400 hover:text-red-500 text-xl font-black">✕</button>
                </div>
                
                <form onSubmit={guardarMaterial} className="p-6 flex flex-col gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">ID Material</label>
                      <input required type="number" name="ID_Material" value={formData.ID_Material} onChange={manejarCambioInput} disabled={modoEdicion} className={`w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 text-xs font-bold ${modoEdicion ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''}`} placeholder="Ej. 30012"/>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Cantidad</label>
                      <input required type="number" min="0" name="Cantidad" value={formData.Cantidad} onChange={manejarCambioInput} className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 text-xs font-bold" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Nombre</label>
                    <input required type="text" name="Nombre" value={formData.Nombre} onChange={manejarCambioInput} className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 text-xs font-medium" placeholder="Ej. Arduino Uno"/>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Categoría</label>
                    <select required name="FK_No_Categoria" value={formData.FK_No_Categoria} onChange={manejarCambioInput} className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 text-xs font-medium bg-white">
                      <option value="">Selecciona una...</option>
                      <option value="1">1 - Electrónica</option>
                      <option value="2">2 - Mecánica</option>
                      <option value="3">3 - Consumible</option>
                    </select>
                  </div>

                  {/* ZONA DE IMAGEN CON VISTA PREVIA */}
                  <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">
                        Fotografía (Auto-ajuste)
                      </label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={manejarCambioImagen}
                        className="w-full text-xs font-medium file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                      />
                    </div>
                    {/* Cuadro de vista previa de la foto */}
                    {previewImagen && (
                      <div className="shrink-0 w-16 h-16 border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-white flex items-center justify-center">
                        <img src={previewImagen} alt="Vista previa" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Descripción</label>
                    <textarea name="Descripcion" value={formData.Descripcion} onChange={manejarCambioInput} rows="2" className="w-full border-2 border-slate-200 p-2.5 rounded-xl outline-none focus:border-blue-500 text-xs font-medium resize-none" placeholder="Opcional..."></textarea>
                  </div>

                  <button type="submit" className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 rounded-xl uppercase tracking-tight text-xs transition-transform active:scale-[0.98]">
                    {modoEdicion ? 'Guardar Cambios' : 'Agregar al inventario'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatedPage>
  );
};

export default InventarioAdmin;
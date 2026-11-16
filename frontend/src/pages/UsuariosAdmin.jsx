import { useState, useEffect } from 'react';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';
import { mostrarToast, confirmar } from '../components/notificaciones';

const UsuariosAdmin = () => {
  const [busqueda, setBusqueda] = useState('');
  const [usuarios, setUsuarios] = useState([]);

  // --- OBTENER USUARIOS DE MYSQL ---
  const obtenerUsuarios = async () => {
    try {
      const respuesta = await fetch('/backend/api/admin/usuarios');
      const data = await respuesta.json();
      
      const dataLimpia = data.map(user => ({
        ...user,
        NombreCompleto: user.NombreCompleto.trim()
      }));
      setUsuarios(dataLimpia);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  // --- ELIMINAR USUARIO ---
  const eliminarUsuario = async (registro, nombre) => {
    if (await confirmar(`ATENCIÓN: ¿Estás seguro de que deseas dar de baja permanentemente al alumno ${nombre} (${registro})?`)) {
      try {
        const respuesta = await fetch(`/backend/api/admin/usuarios/${registro}`, {
          method: 'DELETE'
        });
        
        const resultado = await respuesta.json();
        
        if (resultado.status === 'success') {
          obtenerUsuarios(); 
        } else {
          mostrarToast("Error: " + resultado.message, 'error');
        }
      } catch (error) {
        console.error("Error al eliminar:", error);
        mostrarToast("Ocurrió un error al intentar conectar con el servidor.", 'error');
      }
    }
  };

  const usuariosFiltrados = usuarios.filter(u => 
    u.NombreCompleto.toLowerCase().includes(busqueda.toLowerCase()) || 
    u.Registro_Alu.toString().includes(busqueda)
  );

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />
        
        <div className="max-w-7xl mx-auto px-4 md:px-10 pt-12">
          {/* ENCABEZADO */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-black text-[#1a1f2e] tracking-tight">Gestión de Usuarios</h1>
              <p className="text-slate-400 font-medium text-sm mt-1">Consulta y administra las cuentas de los alumnos registrados en el sistema.</p>
            </div>
          </div>

          {/* BARRA DE BÚSQUEDA */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-6">
            <input 
              type="text" 
              placeholder="Buscar alumno por nombre o registro (ej. 23110186)..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* TABLA DE USUARIOS */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="p-4 font-black">Registro</th>
                    <th className="p-4 font-black">Alumno</th>
                    <th className="p-4 font-black">Contacto</th>
                    <th className="p-4 font-black">Carrera</th>
                    <th className="p-4 font-black text-center">Semestre</th>
                    <th className="p-4 font-black text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuariosFiltrados.map((user) => (
                    <tr key={user.Registro_Alu} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      
                      {/* Registro */}
                      <td className="p-4 font-mono text-xs font-bold text-blue-600">
                        {user.Registro_Alu}
                      </td>
                      
                      {/* Nombre y Avatar */}
                      <td className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 font-black flex items-center justify-center text-xs border border-slate-200 shrink-0">
                          {user.NombreCompleto.charAt(0).toUpperCase()}
                        </div>
                        <p className="font-bold text-sm text-[#1a1f2e] truncate max-w-[200px] md:max-w-xs">
                          {user.NombreCompleto}
                        </p>
                      </td>
                      
                      {/* Contacto (Email y Teléfono) */}
                      <td className="p-4">
                        <p className="text-xs font-medium text-slate-600">{user.Email}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{user.Telefono || 'Sin teléfono'}</p>
                      </td>

                      {/* Carrera (NUEVO) */}
                      <td className="p-4">
                        <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wide border border-slate-200">
                          {user.Nombre_Carrera || 'Sin asignar'}
                        </span>
                      </td>
                      
                      {/* Semestre */}
                      <td className="p-4 text-center">
                        <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-md text-xs font-black">
                          {user.FK_Semestre ? `${user.FK_Semestre}°` : 'N/A'}
                        </span>
                      </td>
                      
                      {/* Acciones */}
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => eliminarUsuario(user.Registro_Alu, user.NombreCompleto)} 
                          className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors" 
                          title="Dar de baja al alumno"
                        >
                          🗑️
                        </button>
                      </td>
                      
                    </tr>
                  ))}
                  
                  {usuariosFiltrados.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 text-sm font-medium">
                        No se encontraron alumnos registrados con esa búsqueda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default UsuariosAdmin;
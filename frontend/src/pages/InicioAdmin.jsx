import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';

const InicioAdmin = () => {
  const navigate = useNavigate(); 

  // Mapeamos los módulos principales del administrador. Por ahora empezamos con Pedidos.
  const modulosAdmin = [
    { 
      id: 'pedidos', 
      titulo: 'Pedidos Solicitados', 
      icono: '📥', 
      descripcion: 'Revisa, aprueba o rechaza los vales de herramientas filtrados por día.',
      ruta: '/pedidosadmin'
    }
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans">
        {/* Usamos el navbar especial de administración */}
        <NavbarAdmin />
        
        {/* Banner idéntico al del alumno pero con enfoque de control */}
        <section className="bg-[#0a0f1d] h-[65vh] relative flex items-center px-20 text-white overflow-hidden">
          <div className="absolute w-125 h-125 bg-blue-600/10 rounded-full blur-[120px] -top-20 -left-20"></div>
          <div className="relative z-10 text-left"> 
            <h1 className="text-8xl font-black italic tracking-tighter mb-6 leading-none uppercase">SAFE STOCK</h1>
            <p className="text-slate-400 text-xl max-w-md mb-10 italic">Panel de Control General · Almacenista</p>
            <Link to="/pedidosadmin" className="bg-white text-[#0a0f1d] px-10 py-4 rounded-2xl font-black text-lg hover:scale-105 transition-transform inline-block uppercase italic">
              Gestionar solicitudes →
            </Link>
          </div>
        </section>

        {/* Sección de herramientas del Administrador */}
        <section className="py-20 px-20 max-w-7xl mx-auto">
          <div className="text-left mb-12">
            <h2 className="text-3xl font-black text-[#1a1f2e] italic uppercase tracking-tighter">Módulos de Gestión</h2>
            <p className="text-slate-400 font-bold">Selecciona una herramienta para administrar el sistema</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {modulosAdmin.map((mod) => (
              <motion.div 
                key={mod.id} 
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(mod.ruta)}
                className="bg-white p-8 rounded-4xl border border-slate-100 shadow-sm flex flex-col text-left cursor-pointer transition-shadow hover:shadow-xl group"
              >
                <div className="bg-slate-50 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner border border-slate-100/50">
                  {mod.icono}
                </div>
                <h3 className="font-black text-xl text-[#1a1f2e] uppercase italic mb-2 tracking-tight group-hover:text-blue-600 transition-colors">
                  {mod.titulo}
                </h3>
                <p className="text-slate-400 text-sm font-medium leading-relaxed">
                  {mod.descripcion}
                </p>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </AnimatedPage>
  );
};

export default InicioAdmin;
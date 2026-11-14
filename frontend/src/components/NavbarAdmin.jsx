import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cerrarSesion } from '../auth/sesion';
import Logo from './Logo';

const NavbarAdmin = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    cerrarSesion();
    navigate('/', { replace: true });
  };

  const linkClass = (path) => {
    const baseClass = "text-sm font-bold uppercase tracking-wider transition-colors pb-2 ";
    // Si la ruta actual coincide, pinta la línea azul y el texto blanco
    if (location.pathname === path) return baseClass + "text-white border-b-2 border-blue-500 font-black";
    return baseClass + "text-slate-400 hover:text-white";
  };

  return (
    <nav className="bg-[#0a0f1d] border-b border-white/10 px-6 py-4 md:px-12 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/inicioadmin" aria-label="Inicio"><Logo /></Link>
        <div className="hidden md:block text-left">
          <p className="text-white font-black text-xs uppercase">SafeStock Administrador</p>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">CETI Mecatrónica</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <Link to="/inicioadmin" className={linkClass('/inicioadmin')}>Inicio</Link>
        <Link to="/pedidosadmin" className={linkClass('/pedidosadmin')}>Pedidos</Link>
        <Link to="/admin/inventario" className={linkClass('/admin/inventario')}>Inventario</Link>
      </div>

      <div className="flex items-center gap-5">
        <button 
          onClick={handleLogout}
          className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-400 hover:text-white bg-white/5 hover:bg-red-500/80 rounded-xl transition-all cursor-pointer"
        >
          Cerrar Sesión
        </button>
        {/* Cambiamos las iniciales AL por AD de Administrador */}
        <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-xs text-blue-400">
          AD
        </div>
      </div>
    </nav>
  );
};

export default NavbarAdmin;
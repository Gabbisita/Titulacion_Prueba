import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  const [cantidadCarrito, setCantidadCarrito] = useState(0);

  useEffect(() => {
    const actualizarContador = () => {
      const guardados = localStorage.getItem('solicitud_materiales_safe');
      if (guardados) {
        const productos = JSON.parse(guardados);
        const total = productos.reduce((acc, curr) => acc + curr.cantidad, 0);
        setCantidadCarrito(total);
      } else {
        setCantidadCarrito(0);
      }
    };

    actualizarContador();
    const intervalo = setInterval(actualizarContador, 800);
    return () => clearInterval(intervalo);
  }, [location]);

  const linkClass = (path) => {
    const baseClass = "text-sm font-bold uppercase tracking-wider transition-colors pb-2 ";
    if (location.pathname === path) return baseClass + "text-white border-b-2 border-blue-500 font-black";
    return baseClass + "text-slate-400 hover:text-white";
  };

  return (
    <nav className="bg-[#0a0f1d] border-b border-white/10 px-6 py-4 md:px-12 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <Link to="/inicio" className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">C</Link>
        <div className="hidden md:block text-left">
          <p className="text-white font-black text-xs uppercase">CETI División de Ingeniería</p>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-0.5">Mecatrónica</p>
        </div>
      </div>

      <div className="flex items-center gap-8">
        <Link to="/inicio" className={linkClass('/inicio')}>Inicio</Link>
        <Link to="/inventario" className={linkClass('/inventario')}>Inventario</Link>
        <Link to="/pedidos" className={linkClass('/pedidos')}>Pedidos</Link>
      </div>

      <div className="flex items-center gap-5">
        <Link to="/carrito" className="relative p-2.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl flex items-center justify-center group">
          <span className="text-xl group-hover:scale-110 transition-transform">🛒</span>
          {cantidadCarrito > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border border-[#0a0f1d]">
              {cantidadCarrito}
            </span>
          )}
        </Link>
        <div className="w-9 h-9 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center font-black text-xs text-blue-400">AL</div>
      </div>
    </nav>
  );
};

export default Navbar;
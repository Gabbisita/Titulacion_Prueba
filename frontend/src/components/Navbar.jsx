import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEffect } from 'react';

const Navbar = () => {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  const links = [
    { name: 'Inicio', path: '/inicio' },
    { name: 'Inventario', path: '/inventario' },
    { name: 'Solicitud', path: '#' },
    { name: 'Pedidos', path: '#' },
  ];

  return (
    <nav className="bg-[#0a0f1d] text-white p-6 flex justify-between items-center px-12 border-b border-white/5 sticky top-0 z-50">
      <div className="flex gap-10">
        {links.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`relative text-sm font-medium pb-2 transition-colors ${
              location.pathname === link.path ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {link.name}
            {location.pathname === link.path && (
              <motion.div
                layoutId="nav-line"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-600"
                transition={{ type: "tween", duration: 0.3 }}
              />
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;
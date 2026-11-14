import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

let siguienteId = 0;

export default function Toaster() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const manejar = (e) => {
      const id = ++siguienteId;
      setToasts((prev) => [...prev, { id, ...e.detail }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    };
    window.addEventListener('safestock:toast', manejar);
    return () => window.removeEventListener('safestock:toast', manejar);
  }, []);

  const cerrar = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.2 }}
            role="status"
            className={`pointer-events-auto flex items-center gap-3 min-w-[260px] max-w-sm px-5 py-4 rounded-2xl shadow-2xl border text-sm font-bold text-white
              ${t.tipo === 'error' ? 'bg-red-600 border-red-400/40' : 'bg-[#2563eb] border-blue-300/30'}`}
          >
            {t.tipo === 'error' ? <AlertTriangle size={20} /> : <CheckCircle2 size={20} />}
            <span className="flex-1">{t.mensaje}</span>
            <button onClick={() => cerrar(t.id)} className="opacity-70 hover:opacity-100" aria-label="Cerrar">
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

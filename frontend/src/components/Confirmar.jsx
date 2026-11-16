import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, HelpCircle } from 'lucide-react';

// Diálogo global de confirmación (se monta una sola vez en App.jsx).
// Se abre con confirmar() de ./notificaciones.
export default function Confirmar() {
  const [peticion, setPeticion] = useState(null);
  const botonConfirmar = useRef(null);

  useEffect(() => {
    const abrir = (e) => setPeticion(e.detail);
    window.addEventListener('safestock:confirmar', abrir);
    return () => window.removeEventListener('safestock:confirmar', abrir);
  }, []);

  const responder = (valor) => {
    peticion?.resolver(valor);
    setPeticion(null);
  };

  useEffect(() => {
    if (!peticion) return undefined;
    botonConfirmar.current?.focus();
    const alTeclear = (e) => { if (e.key === 'Escape') { peticion.resolver(false); setPeticion(null); } };
    window.addEventListener('keydown', alTeclear);
    return () => window.removeEventListener('keydown', alTeclear);
  }, [peticion]);

  return (
    <AnimatePresence>
      {peticion && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] bg-[#0a0f1d]/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => responder(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            role="alertdialog" aria-modal="true" aria-labelledby="confirmar-titulo" aria-describedby="confirmar-mensaje"
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-left"
          >
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${peticion.peligro ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
              {peticion.peligro ? <AlertTriangle size={24} /> : <HelpCircle size={24} />}
            </div>
            <h2 id="confirmar-titulo" className="text-xl font-black text-[#1a1f2e] tracking-tight mb-2">{peticion.titulo || '¿Confirmas esta acción?'}</h2>
            <p id="confirmar-mensaje" className="text-slate-500 text-sm font-medium mb-6">{peticion.mensaje}</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => responder(false)} className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-black uppercase tracking-wider transition-all cursor-pointer">
                Cancelar
              </button>
              <button type="button" ref={botonConfirmar} onClick={() => responder(true)} className={`flex-1 py-3 rounded-xl text-white text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${peticion.peligro ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2563eb] hover:bg-blue-700'}`}>
                {peticion.textoConfirmar || 'Confirmar'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

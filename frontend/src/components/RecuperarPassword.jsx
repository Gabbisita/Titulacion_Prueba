import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import api from '../api/axios';
import { mostrarToast } from './notificaciones';

const inputClase =
  'w-full p-4 rounded-2xl bg-[#f8f9fc] border border-slate-100 text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all';
const labelClase = 'block text-[11px] font-black text-slate-800 uppercase tracking-[0.15em] mb-2';

const mensajeDe = (err) =>
  err.response?.data?.message || err.response?.data?.error || 'Error de conexión. Intenta más tarde.';

export default function RecuperarPassword({ abierto, onCerrar, emailInicial = '' }) {
  const [paso, setPaso] = useState(1);
  const [email, setEmail] = useState(emailInicial);
  const [codigo, setCodigo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const cerrar = () => {
    setPaso(1);
    setCodigo('');
    setPassword('');
    setConfirmar('');
    setError('');
    setAviso('');
    onCerrar();
  };

  const solicitarCodigo = async (e) => {
    e?.preventDefault();
    setError('');
    setCargando(true);
    try {
      const { data } = await api.post('/api/recuperar/solicitar', { email: email.trim() });
      setAviso(data.message);
      setPaso(2);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setCargando(false);
    }
  };

  const confirmarCambio = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirmar) return setError('Las contraseñas no coinciden.');
    if (password.length < 8 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(password) || !/\d/.test(password)) {
      return setError('La contraseña debe tener al menos 8 caracteres, con letras y números.');
    }
    setCargando(true);
    try {
      const { data } = await api.post('/api/recuperar/confirmar', { email: email.trim(), codigo, password });
      mostrarToast(data.message);
      cerrar();
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <AnimatePresence>
      {abierto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={cerrar}
        >
          <motion.div
            className="relative w-full max-w-md bg-white rounded-3xl p-8 md:p-10 shadow-2xl text-left"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={cerrar} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700" aria-label="Cerrar">
              <X size={22} />
            </button>

            <h3 className="text-[#1a1f2e] text-2xl font-black mb-2">Recuperar contraseña</h3>
            <p className="text-slate-500 mb-6">
              {paso === 1
                ? 'Escribe tu correo y te enviaremos un código de 6 dígitos.'
                : aviso || 'Revisa tu correo (también la carpeta de spam).'}
            </p>

            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-600 rounded-2xl text-sm font-bold text-center">
                {error}
              </div>
            )}

            {paso === 1 ? (
              <form onSubmit={solicitarCodigo} className="space-y-5">
                <div>
                  <label className={labelClase}>Correo</label>
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="ej. 19100412@ceti.mx"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClase}
                  />
                </div>
                <button
                  type="submit"
                  disabled={cargando}
                  className={`w-full py-4 text-white font-bold rounded-2xl transition-all ${cargando ? 'bg-slate-400' : 'bg-[#2563eb] hover:bg-[#1d4ed8]'}`}
                >
                  {cargando ? 'Enviando...' : 'Enviar código'}
                </button>
              </form>
            ) : (
              <form onSubmit={confirmarCambio} className="space-y-5">
                <div>
                  <label className={labelClase}>Código</label>
                  <input
                    inputMode="numeric"
                    required
                    autoFocus
                    maxLength={6}
                    placeholder="000000"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    className={`${inputClase} text-center text-2xl font-black tracking-[0.5em]`}
                  />
                </div>
                <div>
                  <label className={labelClase}>Nueva contraseña</label>
                  <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClase} />
                </div>
                <div>
                  <label className={labelClase}>Confirmar contraseña</label>
                  <input type="password" required placeholder="••••••••" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} className={inputClase} />
                </div>
                <button
                  type="submit"
                  disabled={cargando || codigo.length !== 6}
                  className={`w-full py-4 text-white font-bold rounded-2xl transition-all ${cargando || codigo.length !== 6 ? 'bg-slate-400' : 'bg-[#2563eb] hover:bg-[#1d4ed8]'}`}
                >
                  {cargando ? 'Guardando...' : 'Cambiar contraseña'}
                </button>
                <button type="button" onClick={solicitarCodigo} disabled={cargando} className="w-full text-sm font-bold text-blue-600 hover:text-blue-700">
                  No me llegó, reenviar código
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

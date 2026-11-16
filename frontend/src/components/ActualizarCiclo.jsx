import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { obtenerSesion, actualizarUsuario } from '../auth/sesion';
import { mostrarToast } from './notificaciones';

const SEMESTRES = [1, 2, 3, 4, 5, 6, 7, 8];

// Al inicio de cada ciclo escolar (cada 6 meses) el alumno confirma su semestre.
// El sistema ya le propone el que le toca (el anterior + 1); solo lo corrige si
// repite o estuvo de baja. Se monta una sola vez en App.jsx.
export default function ActualizarCiclo() {
  useLocation(); // vuelve a revisar la sesión en cada cambio de página
  const sesion = obtenerSesion();
  const usuario = sesion?.usuario;
  const pendiente = sesion?.rol === 'alumno' && usuario?.Requiere_Actualizar === true;

  const [semestre, setSemestre] = useState(null);
  const [telefono, setTelefono] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [, refrescar] = useState(0);

  if (!pendiente) return null;

  const semestreElegido = semestre ?? usuario.Semestre_Sugerido ?? usuario.FK_Semestre ?? 1;
  const telefonoEscrito = telefono ?? usuario.Telefono ?? '';

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const respuesta = await fetch('/backend/api/mi-perfil/ciclo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ semestre: Number(semestreElegido), telefono: telefonoEscrito.trim() }),
      });
      const datos = await respuesta.json();
      if (respuesta.ok) {
        actualizarUsuario(datos.user);
        mostrarToast(datos.message || 'Datos actualizados.');
      } else if (respuesta.status === 409) {
        // Ya lo había confirmado (por ejemplo, desde otro dispositivo)
        actualizarUsuario({ ...usuario, Requiere_Actualizar: false });
      } else {
        setError(datos.message || 'No se pudieron guardar tus datos.');
      }
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setEnviando(false);
      refrescar((n) => n + 1);
    }
  };

  const campo = 'w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none text-slate-800 focus:border-blue-500 focus:bg-white transition-all';
  const etiqueta = 'block text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1.5';

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0f1d]/70 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="titulo-ciclo">
      <form onSubmit={guardar} className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-left">
        <p className="text-blue-600 text-[10px] font-black uppercase tracking-widest mb-2">Nuevo ciclo escolar {usuario.Ciclo_Actual}</p>
        <h2 id="titulo-ciclo" className="text-2xl font-black text-[#1a1f2e] tracking-tight mb-2">Confirma tus datos</h2>
        <p className="text-slate-500 text-sm font-medium mb-6">
          Cada inicio de semestre te pedimos confirmar en qué semestre estás. Ya seleccionamos el que te corresponde; cámbialo solo si no es correcto.
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="ciclo-semestre" className={etiqueta}>Semestre que cursas</label>
            <select id="ciclo-semestre" value={semestreElegido} onChange={(e) => setSemestre(e.target.value)} className={campo}>
              {SEMESTRES.map((n) => <option key={n} value={n}>{n}° Semestre</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="ciclo-telefono" className={etiqueta}>Teléfono de contacto</label>
            <input id="ciclo-telefono" type="tel" value={telefonoEscrito} onChange={(e) => setTelefono(e.target.value)} maxLength={20} placeholder="ej. 33 1234 5678" className={campo} />
          </div>
        </div>

        {error && <p className="mt-4 text-red-600 text-xs font-bold" role="alert">{error}</p>}

        <button type="submit" disabled={enviando} className={`mt-6 w-full py-3.5 rounded-xl text-white text-xs font-black uppercase tracking-tight transition-all ${enviando ? 'bg-slate-400' : 'bg-[#2563eb] hover:bg-blue-700'}`}>
          {enviando ? 'Guardando…' : `Confirmar ${semestreElegido}° semestre`}
        </button>
      </form>
    </div>
  );
}

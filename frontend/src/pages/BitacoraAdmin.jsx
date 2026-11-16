import { useState, useEffect, useCallback } from 'react';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';

const NIVELES = [
  { valor: '', texto: 'Todos' },
  { valor: 'critico', texto: 'Críticos' },
  { valor: 'alerta', texto: 'Alertas' },
  { valor: 'info', texto: 'Normales' },
];

const ESTILO_NIVEL = {
  critico: 'bg-red-100 text-red-700',
  alerta: 'bg-amber-100 text-amber-800',
  info: 'bg-slate-100 text-slate-600',
};
const NOMBRE_NIVEL = { critico: 'Crítico', alerta: 'Alerta', info: 'Normal' };

// "LOGIN_FALLIDO" → "Login fallido"
const legible = (evento) => {
  const t = String(evento || '').replace(/_/g, ' ').toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const BitacoraAdmin = () => {
  const [nivel, setNivel] = useState('');
  const [eventos, setEventos] = useState([]);
  const [resumen, setResumen] = useState({});
  const [estado, setEstado] = useState('cargando'); // cargando | listo | error

  const cargar = useCallback(async () => {
    setEstado('cargando');
    try {
      const respuesta = await fetch(`/backend/api/admin/bitacora?limite=200${nivel ? `&nivel=${nivel}` : ''}`);
      if (!respuesta.ok) throw new Error();
      const datos = await respuesta.json();
      setEventos(datos.eventos || []);
      setResumen(datos.ultimas24h || {});
      setEstado('listo');
    } catch {
      setEstado('error');
    }
  }, [nivel]);

  useEffect(() => { cargar(); }, [cargar]);

  const tarjetas = [
    { titulo: 'Críticos (24 h)', valor: resumen.critico || 0, clase: 'text-red-600' },
    { titulo: 'Alertas (24 h)', valor: resumen.alerta || 0, clase: 'text-amber-600' },
    { titulo: 'Eventos normales (24 h)', valor: resumen.info || 0, clase: 'text-[#1a1f2e]' },
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />

        <div className="max-w-7xl mx-auto px-4 md:px-10 pt-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="text-left">
              <h1 className="text-3xl font-black text-[#1a1f2e] tracking-tight">Bitácora de seguridad</h1>
              <p className="text-slate-400 font-medium text-sm mt-1">Inicios de sesión, accesos negados, intentos sospechosos y acciones del administrador.</p>
            </div>
            <button onClick={cargar} className="px-5 py-2.5 bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer">
              Actualizar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {tarjetas.map((t) => (
              <div key={t.titulo} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t.titulo}</p>
                <p className={`text-3xl font-black mt-1 ${t.clase}`}>{t.valor}</p>
              </div>
            ))}
          </div>

          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 mb-6 flex flex-wrap gap-2">
            {NIVELES.map((n) => (
              <button
                key={n.valor}
                onClick={() => setNivel(n.valor)}
                aria-pressed={nivel === n.valor}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${nivel === n.valor ? 'bg-[#0a0f1d] text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {n.texto}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-500">
                    <th className="p-4 font-black">Fecha</th>
                    <th className="p-4 font-black">Nivel</th>
                    <th className="p-4 font-black">Evento</th>
                    <th className="p-4 font-black">Usuario</th>
                    <th className="p-4 font-black">IP</th>
                    <th className="p-4 font-black">Detalle</th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors align-top">
                      <td className="p-4 font-mono text-xs text-slate-500 whitespace-nowrap">{String(e.fecha || '').replace('T', ' ')}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${ESTILO_NIVEL[e.nivel] || ESTILO_NIVEL.info}`}>
                          {NOMBRE_NIVEL[e.nivel] || e.nivel}
                        </span>
                      </td>
                      <td className="p-4 text-xs font-bold text-[#1a1f2e]">
                        {legible(e.evento)}
                        <span className="block font-mono font-medium text-[10px] text-slate-400 mt-0.5">{e.metodo} {e.ruta}</span>
                      </td>
                      <td className="p-4 text-xs font-medium break-all">{e.usuario || '—'}{e.rol ? <span className="text-slate-400"> ({e.rol})</span> : null}</td>
                      <td className="p-4 font-mono text-xs text-slate-500">{e.ip || '—'}</td>
                      <td className="p-4 text-xs text-slate-600 max-w-xs break-words">{e.detalle || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {estado === 'cargando' && <p className="p-8 text-center text-sm font-medium text-slate-400">Cargando bitácora…</p>}
            {estado === 'error' && <p className="p-8 text-center text-sm font-bold text-red-600" role="alert">No se pudo cargar la bitácora. Verifica que se haya ejecutado «npm run migrar» en el backend.</p>}
            {estado === 'listo' && eventos.length === 0 && <p className="p-8 text-center text-sm font-medium text-slate-400">No hay eventos registrados con este filtro.</p>}
          </div>
          <p className="text-left text-[11px] text-slate-400 font-medium mt-3">Se muestran los 200 eventos más recientes. Las horas corresponden al reloj de la base de datos.</p>
        </div>
      </div>
    </AnimatedPage>
  );
};

export default BitacoraAdmin;

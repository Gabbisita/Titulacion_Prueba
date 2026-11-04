import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavbarAdmin from '../components/NavbarAdmin';
import AnimatedPage from '../components/AnimatedPage';
import { BarraHorizontal, Columnas, Dona } from '../components/Graficas';
import {
  USAR_MOCK, obtenerEstadisticas, obtenerInventario, nombreMes, mesAnterior, ultimosMeses, fallasDelMes,
  obtenerHoraPico, obtenerSemestresTop, obtenerTasaAprobacion, obtenerVariacion, obtenerResumenFallas,
} from '../services/estadisticasService';
import { obtenerFallas } from '../services/fallasService';
import { generarReporteCoordinacion } from '../utils/reportePDF';
import { TEXTO } from '../utils/paletaGraficas';

// Tarjeta blanca con título, igual a las demás del panel
const Tarjeta = ({ titulo, subtitulo, children, className = '' }) => (
  <div className={`bg-white p-8 rounded-4xl shadow-sm border border-slate-200 text-left ${className}`}>
    <h2 className="font-black text-xl text-[#1a1f2e] uppercase italic tracking-tight mb-1">{titulo}</h2>
    <p className="text-xs font-medium text-slate-400 mb-6">{subtitulo}</p>
    {children}
  </div>
);

const TituloSeccion = ({ titulo, descripcion }) => (
  <div className="text-left mt-14 mb-6">
    <h2 className="text-2xl font-black text-[#1a1f2e] italic uppercase tracking-tighter">{titulo}</h2>
    <p className="text-slate-400 font-bold text-sm">{descripcion}</p>
  </div>
);

const EstadisticasAdmin = () => {
  const navigate = useNavigate();
  const [mes, setMes] = useState(mesAnterior());
  const [estadisticas, setEstadisticas] = useState(null);
  const [inventario, setInventario] = useState([]);
  const [fallas, setFallas] = useState([]);
  const [error, setError] = useState(false);
  const [generando, setGenerando] = useState(false);

  // --- 1. CARGAR INVENTARIO Y FALLAS (una sola vez) ---
  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const [materiales, reportes] = await Promise.all([obtenerInventario(), obtenerFallas()]);
        setInventario(materiales);
        setFallas(reportes);
      } catch (err) {
        console.error("Error al cargar inventario o fallas:", err);
        setError(true);
      }
    };
    cargarDatos();
  }, []);

  // --- 2. CARGAR ESTADÍSTICAS DEL MES SELECCIONADO ---
  useEffect(() => {
    const cargarEstadisticas = async () => {
      try {
        setEstadisticas(await obtenerEstadisticas(mes));
      } catch (err) {
        console.error("Error al cargar estadísticas:", err);
        setError(true);
      }
    };
    cargarEstadisticas();
  }, [mes]);

  const fallasMes = fallasDelMes(fallas, mes);

  // --- 3. DESCARGAR PDF ---
  const descargarReporte = () => {
    setGenerando(true);
    try {
      generarReporteCoordinacion(estadisticas, inventario, fallasMes);
    } catch (err) {
      console.error("Error al generar el PDF:", err);
      alert("No se pudo generar el reporte.");
    } finally {
      setGenerando(false);
    }
  };

  if (error || !estadisticas) {
    return (
      <AnimatedPage>
        <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
          <NavbarAdmin />
          <div className={`text-center font-bold py-20 ${error ? 'text-red-500' : 'text-slate-400 animate-pulse'}`}>
            {error ? 'No se pudieron cargar las estadísticas. Verifica la conexión con el servidor.' : 'Cargando estadísticas...'}
          </div>
        </div>
      </AnimatedPage>
    );
  }

  const {
    totalPrestamos, totalMesAnterior, prestamosPorEstado = [], porSemana = [], topHerramientas = [],
    porCategoria = [], horasPico = [], porDiaSemana = [], semestres = [],
  } = estadisticas;

  const horaPico = obtenerHoraPico(horasPico);
  const semestresTop = obtenerSemestresTop(semestres);
  const tasaAprobacion = obtenerTasaAprobacion(totalPrestamos, prestamosPorEstado);
  const variacion = obtenerVariacion(totalPrestamos, totalMesAnterior);
  const resumenFallas = obtenerResumenFallas(fallasMes, topHerramientas);

  const maxHerramienta = Math.max(1, ...topHerramientas.map((h) => h.prestamos));
  const maxSemestre = Math.max(1, ...semestres.map((s) => s.solicitudes));
  const maxFallas = Math.max(1, ...resumenFallas.porMaterial.map((m) => m.reportes));

  const indicadores = [
    { titulo: 'Total de préstamos', valor: totalPrestamos, detalle: variacion === null ? 'Pedidos otorgados en el mes' : `${variacion >= 0 ? '▲' : '▼'} ${Math.abs(variacion)}% vs. mes anterior`, icono: '📦' },
    { titulo: 'Tasa de aprobación', valor: `${tasaAprobacion}%`, detalle: 'Préstamos vs. rechazados', icono: '✅' },
    { titulo: 'Herramienta #1', valor: topHerramientas[0]?.nombre || '—', detalle: topHerramientas[0] ? `${topHerramientas[0].prestamos} préstamos` : 'Sin datos', icono: '🏆' },
    { titulo: 'Hora pico', valor: horaPico ? `${horaPico.hora} hrs` : '—', detalle: horaPico ? `${horaPico.solicitudes} solicitudes` : 'Sin datos', icono: '⏰' },
    { titulo: 'Semestre que más pide', valor: semestresTop[0]?.semestre || '—', detalle: semestresTop[0] ? `${semestresTop[0].solicitudes} solicitudes` : 'Sin datos', icono: '🎓' },
    { titulo: 'Reportes de falla', valor: resumenFallas.totalReportes, detalle: `${resumenFallas.abiertas} sin resolver`, icono: '🛠️' },
  ];

  return (
    <AnimatedPage>
      <div className="min-h-screen bg-[#f8f9fc] font-sans pb-20 text-slate-700">
        <NavbarAdmin />
        <div className="max-w-6xl mx-auto px-6 pt-12">

          <header className="mb-10 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-[#1a1f2e] tracking-tight mb-2 uppercase italic">Estadísticas de Almacén</h1>
              <p className="text-slate-500 font-medium">Reporte mensual de uso del material, horarios, semestres y fallas del equipo.</p>
              {USAR_MOCK && (
                <p className="inline-block mt-3 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1 uppercase tracking-widest">
                  ⚠️ Mostrando datos de prueba
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-3 justify-center items-end">
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Periodo</label>
                <select
                  value={mes} onChange={(e) => setMes(e.target.value)}
                  className="border-2 border-slate-200 p-3.5 rounded-xl outline-none focus:border-blue-500 text-sm font-bold bg-white cursor-pointer"
                >
                  {ultimosMeses().map((m) => <option key={m.valor} value={m.valor}>{m.etiqueta}</option>)}
                </select>
              </div>
              <button
                onClick={() => navigate('/admin/fallas')}
                className="bg-white hover:bg-slate-50 text-[#1a1f2e] border-2 border-slate-200 font-black py-4 px-6 rounded-xl uppercase tracking-tight text-xs transition-transform active:scale-[0.98] cursor-pointer"
              >
                🛠️ Reportar Falla
              </button>
              <button
                onClick={descargarReporte} disabled={generando}
                className="bg-[#2563eb] hover:bg-blue-700 text-white font-black py-4 px-6 rounded-xl uppercase tracking-tight text-xs transition-transform active:scale-[0.98] disabled:bg-slate-300 shadow-lg shadow-blue-500/20 cursor-pointer"
              >
                {generando ? 'Generando...' : '📄 Descargar Reporte PDF'}
              </button>
            </div>
          </header>

          {/* INDICADORES CLAVE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {indicadores.map((ind) => (
              <div key={ind.titulo} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{ind.icono}</span>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{ind.titulo}</p>
                </div>
                <p className="text-2xl font-black text-[#1a1f2e] tracking-tight leading-tight">{ind.valor}</p>
                <p className="text-xs font-medium text-slate-400 mt-1">{ind.detalle}</p>
              </div>
            ))}
          </div>

          {/* ===== USO DEL ALMACÉN ===== */}
          <TituloSeccion titulo="Uso del almacén" descripcion={`Demanda de material en ${nombreMes(mes)}`} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <Tarjeta titulo="Préstamos por semana" subtitulo="Cómo se distribuyó la demanda durante el mes">
              <Columnas datos={porSemana.map((s) => ({ etiqueta: `Semana ${s.semana}`, valor: s.prestamos }))} unidad="préstamos" />
            </Tarjeta>
            <Tarjeta titulo="Estado de pedidos" subtitulo="Todas las solicitudes recibidas en el mes">
              <Dona datos={prestamosPorEstado.map((e) => ({ etiqueta: e.estado, valor: Number(e.total) }))} unidad="pedidos" />
            </Tarjeta>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Tarjeta titulo="Herramientas más solicitadas" subtitulo="Préstamos por material">
              <div className="flex flex-col gap-4">
                {topHerramientas.map((h) => (
                  <BarraHorizontal key={h.id} etiqueta={h.nombre} subetiqueta={h.categoria} valor={h.prestamos} maximo={maxHerramienta} unidad="préstamos" />
                ))}
              </div>
            </Tarjeta>
            <Tarjeta titulo="Préstamos por categoría" subtitulo="Qué tipo de material se usa más">
              <Dona datos={porCategoria.map((c) => ({ etiqueta: c.categoria, valor: Number(c.prestamos) }))} unidad="préstamos" />
            </Tarjeta>
          </div>

          {/* ===== HORARIO Y ALUMNOS ===== */}
          <TituloSeccion titulo="Horario y alumnos" descripcion="Cuándo y quién solicita el material" />

          <Tarjeta titulo="Hora pico de pedidos" subtitulo="Solicitudes según la hora de recogida" className="mb-8">
            <Columnas datos={horasPico.map((h) => ({ etiqueta: h.hora, valor: h.solicitudes }))} unidad="solicitudes" />
          </Tarjeta>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Tarjeta titulo="Semestres que más piden equipo" subtitulo="Solicitudes por semestre del alumno solicitante">
              <div className="flex flex-col gap-4">
                {semestres.map((s) => (
                  <BarraHorizontal key={s.semestre} etiqueta={s.semestre} valor={s.solicitudes} maximo={maxSemestre} unidad="solicitudes" />
                ))}
              </div>
            </Tarjeta>
            <Tarjeta titulo="Días con más demanda" subtitulo="Solicitudes por día de la semana">
              <Columnas datos={porDiaSemana.map((d) => ({ etiqueta: d.dia, valor: d.solicitudes }))} unidad="solicitudes" alto="h-72" />
            </Tarjeta>
          </div>

          {/* ===== FALLAS Y MANTENIMIENTO ===== */}
          <TituloSeccion titulo="Fallas y mantenimiento" descripcion={`Equipos reportados como dañados en ${nombreMes(mes)}`} />

          {resumenFallas.totalReportes === 0 ? (
            <div className="bg-white p-10 rounded-4xl shadow-sm border border-slate-200 text-center text-slate-400 font-bold">
              No hay reportes de falla registrados en este mes.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <Tarjeta titulo="Equipos más dañados" subtitulo="Número de reportes de falla por material">
                  <div className="flex flex-col gap-4">
                    {resumenFallas.porMaterial.slice(0, 8).map((m) => (
                      <BarraHorizontal key={m.id} etiqueta={m.nombre} subetiqueta={m.categoria} valor={m.reportes} maximo={maxFallas} unidad="reportes" color={TEXTO} />
                    ))}
                  </div>
                </Tarjeta>
                <Tarjeta titulo="Causas de falla" subtitulo="Tipo de falla reportada">
                  <Dona datos={resumenFallas.porTipo.map((t) => ({ etiqueta: t.etiqueta, valor: t.total }))} unidad="reportes" />
                </Tarjeta>
              </div>

              <Tarjeta titulo="Detalle por equipo" subtitulo="Fallas por cada 100 préstamos: entre más alto, más frágil es el equipo">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                        <th className="text-left py-3 pr-4">Equipo</th>
                        <th className="text-center py-3 px-2">Reportes</th>
                        <th className="text-center py-3 px-2">Graves</th>
                        <th className="text-center py-3 px-2">Unidades dadas de baja</th>
                        <th className="text-center py-3 pl-2">Fallas / 100 préstamos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumenFallas.porMaterial.map((m) => (
                        <tr key={m.id} className="border-b border-slate-100 last:border-0">
                          <td className="py-3 pr-4 font-bold text-[#1a1f2e]">{m.nombre}<span className="block text-[10px] text-slate-400 uppercase tracking-widest">{m.categoria}</span></td>
                          <td className="text-center font-black text-[#1a1f2e]">{m.reportes}</td>
                          <td className="text-center font-bold">{m.graves > 0 ? <span className="text-red-600">{m.graves}</span> : <span className="text-slate-400">0</span>}</td>
                          <td className="text-center font-bold">{m.bajas}</td>
                          <td className="text-center font-bold">{m.tasa === null ? <span className="text-slate-400">—</span> : m.tasa}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Tarjeta>
            </>
          )}

        </div>
      </div>
    </AnimatedPage>
  );
};

export default EstadisticasAdmin;

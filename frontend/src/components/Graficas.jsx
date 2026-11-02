import { motion } from 'framer-motion';
import { AZUL, AZUL_CLARO, agruparOtros } from '../utils/paletaGraficas';

// --- BARRA HORIZONTAL (rankings: herramientas, semestres, fallas) ---
export const BarraHorizontal = ({ etiqueta, subetiqueta, valor, maximo, unidad, color = AZUL }) => (
  <div className="group" title={`${etiqueta}: ${valor} ${unidad}`}>
    <div className="flex justify-between items-baseline mb-1.5 gap-3">
      <p className="text-sm font-bold text-[#1a1f2e] truncate">
        {etiqueta}
        {subetiqueta && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-2">{subetiqueta}</span>}
      </p>
      <span className="text-sm font-black text-[#1a1f2e] shrink-0">{valor}</span>
    </div>
    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${(valor / maximo) * 100}%` }}
        transition={{ duration: 0.6 }}
        className="h-full rounded-full group-hover:opacity-80 transition-opacity"
        style={{ backgroundColor: color }}
      />
    </div>
  </div>
);

// --- COLUMNAS VERTICALES (hora pico, días de la semana) ---
// datos: [{ etiqueta, valor }] · se resalta la columna más alta
export const Columnas = ({ datos, unidad, alto = 'h-56' }) => {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <div className="overflow-x-auto">
      <div className={`flex items-end gap-2 ${alto} min-w-[420px] border-b border-slate-200`}>
        {datos.map((d) => {
          const esPico = d.valor === maximo;
          return (
            <div key={d.etiqueta} className="flex-1 h-full flex flex-col justify-end items-center group" title={`${d.etiqueta}: ${d.valor} ${unidad}`}>
              <span className={`text-xs font-black mb-1 transition-opacity ${esPico ? 'text-[#1a1f2e]' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`}>
                {d.valor}
              </span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${(d.valor / maximo) * 85}%` }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-10 rounded-t-md transition-colors"
                style={{ backgroundColor: esPico ? AZUL : AZUL_CLARO }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 min-w-[420px] mt-2">
        {datos.map((d) => (
          <span key={d.etiqueta} className="flex-1 text-center text-[10px] font-bold text-slate-400">{d.etiqueta}</span>
        ))}
      </div>
    </div>
  );
};

// --- DONA (proporciones por categoría) ---
// datos: [{ etiqueta, valor }] · máximo 5 colores, el resto se agrupa en "Otros"
export const Dona = ({ datos, unidad }) => {
  const segmentos = agruparOtros(datos);
  const total = segmentos.reduce((suma, s) => suma + s.valor, 0);
  const radio = 60, grosor = 22, circunferencia = 2 * Math.PI * radio;
  const largos = segmentos.map((s) => (total ? (s.valor / total) * circunferencia : 0));
  const desfases = largos.map((_, i) => -largos.slice(0, i).reduce((suma, l) => suma + l, 0));

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 160 160" className="w-40 h-40 shrink-0 -rotate-90">
        {segmentos.map((s, i) => (
          <circle
            key={s.etiqueta} cx="80" cy="80" r={radio} fill="none"
            stroke={s.color} strokeWidth={grosor}
            strokeDasharray={`${Math.max(0, largos[i] - 2)} ${circunferencia}`}
            strokeDashoffset={desfases[i]}
          >
            <title>{`${s.etiqueta}: ${s.valor} ${unidad}`}</title>
          </circle>
        ))}
      </svg>
      <ul className="flex flex-col gap-2 w-full">
        {segmentos.map((s) => (
          <li key={s.etiqueta} className="flex items-center gap-2 text-sm">
            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }}></span>
            <span className="font-bold text-[#1a1f2e] flex-1 truncate">{s.etiqueta}</span>
            <span className="font-black text-[#1a1f2e]">{s.valor}</span>
            <span className="text-xs font-bold text-slate-400 w-10 text-right">{total ? Math.round((s.valor / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

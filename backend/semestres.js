// =======================================================
// SEMESTRES Y CICLOS ESCOLARES
// =======================================================
// Un semestre dura 6 meses. Hay dos ciclos por año:
//   A: febrero – julio          B: agosto – enero (del año siguiente)
// Cada alumno guarda el ciclo en el que confirmó su semestre (alumno.Ciclo_Semestre).
// Cuando empieza un ciclo nuevo, al entrar se le propone su semestre + 1 por cada
// ciclo transcurrido y él lo confirma o lo corrige (por si repite o estuvo de baja).
const SEMESTRE_MIN = 1;
const SEMESTRE_MAX = 8;
const MES_INICIO_A = 2; // febrero
const MES_INICIO_B = 8; // agosto

function cicloActual(fecha = new Date()) {
  const [anio, mes] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit' })
    .format(fecha).split('-').map(Number);
  if (mes >= MES_INICIO_B) return `${anio}-B`;
  if (mes >= MES_INICIO_A) return `${anio}-A`;
  return `${anio - 1}-B`; // enero todavía pertenece al ciclo B del año anterior
}

const indice = (ciclo) => {
  const m = /^(\d{4})-([AB])$/.exec(String(ciclo || ''));
  return m ? Number(m[1]) * 2 + (m[2] === 'B' ? 1 : 0) : null;
};

// Semestre que le tocaría hoy a un alumno según cuándo lo confirmó por última vez.
function semestreSugerido(semestreGuardado, cicloGuardado, actual = cicloActual()) {
  const base = Math.min(Math.max(Number(semestreGuardado) || SEMESTRE_MIN, SEMESTRE_MIN), SEMESTRE_MAX);
  const desde = indice(cicloGuardado);
  if (desde === null) return base;
  return Math.min(SEMESTRE_MAX, base + Math.max(0, indice(actual) - desde));
}

module.exports = { SEMESTRE_MIN, SEMESTRE_MAX, cicloActual, semestreSugerido };

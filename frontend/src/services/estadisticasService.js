import { mockEstadisticas, mockInventario } from '../data/mockEstadisticas';

// =======================================================
// INTERRUPTOR DE DATOS
// true  -> usa los datos de prueba (no necesita base de datos)
// false -> consulta el backend real (estadísticas, materiales y fallas)
// =======================================================
export const USAR_MOCK = false;

export const API_URL = '/backend';

// mes: 'AAAA-MM' · el reporte siempre cubre un solo mes
export const obtenerEstadisticas = async (mes) => {
  if (USAR_MOCK) return { ...mockEstadisticas, mes };

  const respuesta = await fetch(`${API_URL}/api/admin/estadisticas?mes=${mes}`);
  if (!respuesta.ok) throw new Error('Error al cargar estadísticas');
  return respuesta.json();
};

export const obtenerInventario = async () => {
  if (USAR_MOCK) return mockInventario;

  const respuesta = await fetch(`${API_URL}/api/admin/materiales`);
  if (!respuesta.ok) throw new Error('Error al cargar inventario');
  return respuesta.json();
};

// =======================================================
// PERIODO MENSUAL
// =======================================================

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const aClaveMes = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

// '2026-10' -> 'Octubre 2026'
export const nombreMes = (mes = '') => {
  const [anio, numero] = mes.split('-');
  return `${MESES[parseInt(numero, 10) - 1] || mes} ${anio || ''}`.trim();
};

// Mes en curso (lo que se muestra al entrar a Estadísticas)
export const mesActual = () => aClaveMes(new Date());

// Último mes cerrado
export const mesAnterior = () => {
  const fecha = new Date();
  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() - 1);
  return aClaveMes(fecha);
};

// Opciones del selector: mes en curso y los 11 anteriores
export const ultimosMeses = (cantidad = 12) => {
  const actual = aClaveMes(new Date());
  return Array.from({ length: cantidad }, (_, i) => {
    const fecha = new Date();
    fecha.setDate(1);
    fecha.setMonth(fecha.getMonth() - i);
    const valor = aClaveMes(fecha);
    return { valor, etiqueta: `${nombreMes(valor)}${valor === actual ? ' (en curso)' : ''}` };
  });
};

export const fallasDelMes = (fallas = [], mes) => fallas.filter((f) => String(f.fecha).startsWith(mes));

// =======================================================
// CÁLCULOS DERIVADOS (se usan en pantalla y en el PDF)
// =======================================================

export const porcentaje = (parte, total) => (total > 0 ? Math.round((parte / total) * 100) : 0);

export const obtenerHoraPico = (horasPico = []) => {
  if (horasPico.length === 0) return null;
  return horasPico.reduce((max, h) => (h.solicitudes > max.solicitudes ? h : max));
};

export const obtenerSemestresTop = (semestres = [], cantidad = 2) =>
  [...semestres].sort((a, b) => b.solicitudes - a.solicitudes).slice(0, cantidad);

// Tasa de aprobación = préstamos otorgados / (préstamos + rechazados)
export const obtenerTasaAprobacion = (totalPrestamos = 0, prestamosPorEstado = []) => {
  const rechazados = prestamosPorEstado
    .filter((e) => /rechaz/i.test(e.estado))
    .reduce((suma, e) => suma + Number(e.total), 0);
  return porcentaje(totalPrestamos, totalPrestamos + rechazados);
};

// Variación contra el mes anterior en %
export const obtenerVariacion = (actual, anterior) => {
  if (!anterior) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
};

const contarPor = (lista, campo) => {
  const conteo = {};
  lista.forEach((item) => {
    const clave = item[campo] || 'Sin dato';
    conteo[clave] = (conteo[clave] || 0) + 1;
  });
  return Object.entries(conteo)
    .map(([etiqueta, total]) => ({ etiqueta, total }))
    .sort((a, b) => b.total - a.total);
};

export const ESTADOS_ABIERTOS = ['Pendiente', 'En reparación'];

// Resumen de los reportes de falla: qué equipos fallan más, por qué y qué tan grave
export const obtenerResumenFallas = (fallas = [], topHerramientas = []) => {
  const materiales = {};
  fallas.forEach((f) => {
    if (!materiales[f.materialId]) {
      materiales[f.materialId] = {
        id: f.materialId, nombre: f.materialNombre, categoria: f.categoria,
        reportes: 0, unidades: 0, graves: 0, bajas: 0,
      };
    }
    const m = materiales[f.materialId];
    m.reportes += 1;
    m.unidades += Number(f.cantidad) || 1;
    if (f.severidad === 'Grave') m.graves += 1;
    if (f.estado === 'Dado de baja') m.bajas += Number(f.cantidad) || 1;
  });

  const porMaterial = Object.values(materiales)
    .map((m) => {
      const prestamos = topHerramientas.find((h) => h.id === m.id)?.prestamos || 0;
      // Fallas por cada 100 préstamos (solo si conocemos los préstamos)
      const tasa = prestamos ? Math.round((m.reportes / prestamos) * 1000) / 10 : null;
      return { ...m, prestamos, tasa };
    })
    .sort((a, b) => b.reportes - a.reportes || b.graves - a.graves);

  return {
    totalReportes: fallas.length,
    unidadesAfectadas: fallas.reduce((suma, f) => suma + (Number(f.cantidad) || 1), 0),
    abiertas: fallas.filter((f) => ESTADOS_ABIERTOS.includes(f.estado)).length,
    unidadesBaja: porMaterial.reduce((suma, m) => suma + m.bajas, 0),
    porMaterial,
    porTipo: contarPor(fallas, 'tipo'),
    porSeveridad: contarPor(fallas, 'severidad'),
    porEstado: contarPor(fallas, 'estado'),
  };
};

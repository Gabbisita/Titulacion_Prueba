import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import {
  nombreMes, porcentaje, obtenerHoraPico, obtenerSemestresTop, obtenerTasaAprobacion,
  obtenerVariacion, obtenerResumenFallas,
} from '../services/estadisticasService';

// =======================================================
// REPORTE EJECUTIVO MENSUAL PARA LA COORDINACIÓN ACADÉMICA
// generarReporteCoordinacion(datosEstadisticas, listaInventario, listaFallas)
// - datosEstadisticas: estadísticas de UN mes (incluye el campo "mes": 'AAAA-MM')
// - listaFallas: reportes de falla de ese mismo mes
// =======================================================

// Paleta sobria en escala de grises
const NEGRO = [30, 30, 30];
const GRIS_TEXTO = [100, 100, 100];
const GRIS_LINEA = [190, 190, 190];
const GRIS_FONDO = [238, 238, 238];
const BARRA = [70, 70, 70];
const BARRA_SUAVE = [175, 175, 175];

export const generarReporteCoordinacion = (datosEstadisticas, listaInventario = [], listaFallas = []) => {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const anchoPagina = doc.internal.pageSize.getWidth();
  const altoPagina = doc.internal.pageSize.getHeight();
  const margen = 20;
  const ancho = anchoPagina - margen * 2;
  const separacion = 10;
  const anchoColumna = (ancho - separacion) / 2;
  let y = 0;

  const {
    mes = '', totalPrestamos = 0, totalMesAnterior, prestamosPorEstado = [], porSemana = [], topHerramientas = [],
    porCategoria = [], horasPico = [], porDiaSemana = [], semestres = [],
  } = datosEstadisticas;

  // --- CÁLCULOS ---
  const periodo = nombreMes(mes);
  const horaPico = obtenerHoraPico(horasPico);
  const semestresTop = obtenerSemestresTop(semestres);
  const tasaAprobacion = obtenerTasaAprobacion(totalPrestamos, prestamosPorEstado);
  const variacion = obtenerVariacion(totalPrestamos, totalMesAnterior);
  const resumenFallas = obtenerResumenFallas(listaFallas, topHerramientas);
  const diaPico = [...porDiaSemana].sort((a, b) => b.solicitudes - a.solicitudes)[0];
  const categoriaPico = [...porCategoria].sort((a, b) => b.prestamos - a.prestamos)[0];
  const totalSolicitudes = prestamosPorEstado.reduce((suma, e) => suma + Number(e.total), 0);
  const top1 = topHerramientas[0];
  const masDanado = resumenFallas.porMaterial[0];

  const fechaEmision = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });

  // =======================================================
  // AYUDANTES DE DIBUJO
  // =======================================================
  const escribir = (str, x, yy, { size = 10, bold = false, color = NEGRO, align = 'left' } = {}) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(String(str), x, yy, { align });
  };

  // Recorta un texto para que quepa en el ancho dado
  const recortar = (str, anchoMax, size) => {
    doc.setFontSize(size);
    const lineas = doc.splitTextToSize(String(str), anchoMax);
    return lineas.length > 1 ? `${lineas[0].replace(/\s+\S*$/, '')}...` : lineas[0];
  };

  const asegurarEspacio = (alto) => {
    if (y + alto > altoPagina - 22) {
      doc.addPage();
      y = 28;
    }
  };

  const tituloSeccion = (texto, altoSiguiente = 40) => {
    asegurarEspacio(14 + altoSiguiente);
    escribir(texto.toUpperCase(), margen, y, { size: 10.5, bold: true });
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.4);
    doc.line(margen, y + 2, margen + ancho, y + 2);
    y += 9;
  };

  const subtitulo = (texto, x, yy) => escribir(texto, x, yy, { size: 8.5, bold: true, color: GRIS_TEXTO });

  const parrafo = (texto) => {
    doc.setFontSize(9.5);
    const lineas = doc.splitTextToSize(texto, ancho);
    asegurarEspacio(lineas.length * 4.8 + 2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...NEGRO);
    doc.text(lineas, margen, y, { align: 'justify', maxWidth: ancho });
    y += lineas.length * 4.8 + 4;
  };

  // Barras horizontales: datos [{ etiqueta, valor, texto? }]
  const ALTO_FILA = 7;
  const barrasHorizontales = (x, y0, w, datos) => {
    const anchoEtiqueta = w * 0.4;
    const anchoValor = 18;
    const inicio = x + anchoEtiqueta;
    const anchoBarra = w - anchoEtiqueta - anchoValor;
    const maximo = Math.max(1, ...datos.map((d) => d.valor));
    datos.forEach((d, i) => {
      const fila = y0 + i * ALTO_FILA;
      escribir(recortar(d.etiqueta, anchoEtiqueta - 2, 8), x, fila + 3.4, { size: 8 });
      doc.setFillColor(...GRIS_FONDO);
      doc.rect(inicio, fila + 0.9, anchoBarra, 3.2, 'F');
      doc.setFillColor(...BARRA);
      doc.rect(inicio, fila + 0.9, Math.max(0.8, (d.valor / maximo) * anchoBarra), 3.2, 'F');
      escribir(d.texto ?? d.valor, x + w, fila + 3.4, { size: 8, align: 'right' });
    });
    return datos.length * ALTO_FILA;
  };

  // Columnas verticales; se resalta la más alta
  const columnas = (x, y0, w, h, datos) => {
    const maximo = Math.max(1, ...datos.map((d) => d.valor));
    const base = y0 + h - 6;
    const altoUtil = h - 12;
    const paso = w / datos.length;
    datos.forEach((d, i) => {
      const altoBarra = (d.valor / maximo) * altoUtil;
      const centro = x + paso * i + paso / 2;
      const anchoBarra = Math.min(10, paso * 0.55);
      const esPico = d.valor === maximo;
      doc.setFillColor(...(esPico ? BARRA : BARRA_SUAVE));
      doc.rect(centro - anchoBarra / 2, base - altoBarra, anchoBarra, altoBarra, 'F');
      escribir(d.valor, centro, base - altoBarra - 1.5, { size: 7, bold: esPico, align: 'center' });
      escribir(d.etiqueta, centro, base + 4, { size: 7, color: GRIS_TEXTO, align: 'center' });
    });
    doc.setDrawColor(...NEGRO);
    doc.setLineWidth(0.3);
    doc.line(x, base, x + w, base);
    return h;
  };

  // Distribución con porcentaje: [{ etiqueta, valor }] -> barras con "n (x%)"
  const conPorcentaje = (datos) => {
    const total = datos.reduce((suma, d) => suma + d.valor, 0);
    return datos.map((d) => ({ ...d, texto: `${d.valor} (${porcentaje(d.valor, total)}%)` }));
  };

  const estiloTabla = {
    theme: 'grid',
    margin: { left: margen, right: margen, top: 28 },
    headStyles: { fillColor: GRIS_FONDO, textColor: NEGRO, fontStyle: 'bold', fontSize: 8.5, lineWidth: 0.2, lineColor: GRIS_LINEA },
    styles: { fontSize: 8.5, cellPadding: 2.2, textColor: NEGRO, lineWidth: 0.2, lineColor: GRIS_LINEA },
  };

  const tabla = (opciones) => {
    autoTable(doc, { ...estiloTabla, startY: y, ...opciones });
    y = doc.lastAutoTable.finalY + 10;
  };

  // =======================================================
  // ENCABEZADO INSTITUCIONAL
  // =======================================================
  escribir('SafeStock - Reporte Ejecutivo de Almacén', margen, 22, { size: 16, bold: true });
  escribir('División de Ingeniería Mecatrónica', margen, 29, { size: 10.5, color: GRIS_TEXTO });
  escribir(`Periodo: ${periodo}`, margen + ancho, 22, { size: 9.5, bold: true, align: 'right' });
  escribir(`Fecha de emisión: ${fechaEmision}`, margen + ancho, 29, { size: 8.5, color: GRIS_TEXTO, align: 'right' });
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.8);
  doc.line(margen, 34, margen + ancho, 34);
  doc.setLineWidth(0.2);
  doc.line(margen, 35.3, margen + ancho, 35.3);

  // =======================================================
  // 1. RESUMEN DE INDICADORES CLAVE
  // =======================================================
  y = 46;
  tituloSeccion('1. Resumen de Indicadores Clave', 50);

  const tarjetas = [
    { titulo: 'TOTAL DE PRÉSTAMOS', valor: totalPrestamos, detalle: variacion === null ? 'Préstamos otorgados' : `${variacion >= 0 ? '+' : ''}${variacion}% respecto al mes anterior` },
    { titulo: 'TASA DE APROBACIÓN', valor: `${tasaAprobacion}%`, detalle: 'Préstamos vs. rechazados' },
    { titulo: 'HORA PICO', valor: horaPico ? `${horaPico.hora} hrs` : '-', detalle: horaPico ? `${horaPico.solicitudes} solicitudes` : 'Sin datos' },
    { titulo: 'HERRAMIENTA MÁS SOLICITADA', valor: top1?.nombre || '-', detalle: top1 ? `${top1.prestamos} préstamos` : 'Sin datos' },
    { titulo: 'SEMESTRE CON MÁS SOLICITUDES', valor: semestresTop[0]?.semestre || '-', detalle: semestresTop[0] ? `${semestresTop[0].solicitudes} solicitudes` : 'Sin datos' },
    { titulo: 'REPORTES DE FALLA', valor: resumenFallas.totalReportes, detalle: `${resumenFallas.abiertas} sin resolver` },
  ];
  const anchoTarjeta = (ancho - 8) / 3;
  tarjetas.forEach((t, i) => {
    const tx = margen + (i % 3) * (anchoTarjeta + 4);
    const ty = y + Math.floor(i / 3) * 24;
    doc.setDrawColor(...GRIS_LINEA);
    doc.setLineWidth(0.3);
    doc.rect(tx, ty, anchoTarjeta, 20);
    escribir(t.titulo, tx + 3.5, ty + 5.5, { size: 6.5, bold: true, color: GRIS_TEXTO });
    escribir(recortar(t.valor, anchoTarjeta - 7, 12), tx + 3.5, ty + 12.5, { size: 12, bold: true });
    escribir(t.detalle, tx + 3.5, ty + 17, { size: 7, color: GRIS_TEXTO });
  });
  y += 54;

  tabla({
    head: [['Indicador', 'Resultado']],
    body: [
      ['Periodo analizado', periodo],
      ['Total de préstamos', variacion === null ? `${totalPrestamos}` : `${totalPrestamos} (${variacion >= 0 ? '+' : ''}${variacion}% respecto al mes anterior)`],
      ['Solicitudes recibidas', `${totalSolicitudes}`],
      ['Tasa de aprobación', `${tasaAprobacion}%`],
      ['Herramienta #1 más pedida', top1 ? `${top1.nombre} (${top1.prestamos} préstamos)` : 'Sin datos'],
      ['Categoría más utilizada', categoriaPico ? `${categoriaPico.categoria} (${categoriaPico.prestamos} préstamos)` : 'Sin datos'],
      ['Hora pico identificada', horaPico ? `${horaPico.hora} hrs (${horaPico.solicitudes} solicitudes)` : 'Sin datos'],
      ['Día con más demanda', diaPico ? `${diaPico.dia} (${diaPico.solicitudes} solicitudes)` : 'Sin datos'],
      ['Semestres que más piden herramientas', semestresTop.length ? semestresTop.map((s) => `${s.semestre} (${s.solicitudes})`).join(', ') : 'Sin datos'],
      ['Reportes de falla', `${resumenFallas.totalReportes}`],
      ['Equipo con más fallas', masDanado ? `${masDanado.nombre} (${masDanado.reportes} reportes)` : 'Sin reportes'],
    ],
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 65 } },
  });

  // =======================================================
  // 2. TOP DE HERRAMIENTAS MÁS SOLICITADAS
  // =======================================================
  tituloSeccion('2. Top de Herramientas Más Solicitadas', topHerramientas.length * ALTO_FILA + 8);
  y += barrasHorizontales(margen, y, ancho, topHerramientas.map((h) => ({ etiqueta: h.nombre, valor: h.prestamos }))) + 5;

  // Si la estadística no trae la categoría, se busca en el inventario
  const categoriaDe = (h) =>
    h.categoria || listaInventario.find((m) => m.ID_Material === h.id)?.Nombre_Categoria || 'Sin categoría';

  tabla({
    head: [['#', 'Nombre', 'Categoría', 'Préstamos', '% del total']],
    body: topHerramientas.map((h, i) => [i + 1, h.nombre, categoriaDe(h), h.prestamos, `${porcentaje(h.prestamos, totalPrestamos)}%`]),
    columnStyles: { 0: { cellWidth: 10, halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' } },
  });

  // =======================================================
  // 3. COMPORTAMIENTO DE LA DEMANDA
  // =======================================================
  const datosEstado = conPorcentaje(prestamosPorEstado.map((e) => ({ etiqueta: e.estado, valor: Number(e.total) })));
  const altoDemanda = Math.max(48, datosEstado.length * ALTO_FILA) + 6;
  tituloSeccion('3. Comportamiento de la Demanda', altoDemanda);
  subtitulo('Préstamos por semana del mes', margen, y);
  subtitulo('Estado de las solicitudes', margen + anchoColumna + separacion, y);
  columnas(margen, y + 3, anchoColumna, 48, porSemana.map((s) => ({ etiqueta: `Semana ${s.semana}`, valor: s.prestamos })));
  barrasHorizontales(margen + anchoColumna + separacion, y + 4, anchoColumna, datosEstado);
  y += altoDemanda + 6;

  const datosCategoria = conPorcentaje(porCategoria.map((c) => ({ etiqueta: c.categoria, valor: Number(c.prestamos) })));
  asegurarEspacio(datosCategoria.length * ALTO_FILA + 8);
  subtitulo('Préstamos por categoría de material', margen, y);
  y += 4;
  y += barrasHorizontales(margen, y, ancho, datosCategoria) + 8;

  // =======================================================
  // 4. HORARIO Y PERFIL DE LOS SOLICITANTES
  // =======================================================
  tituloSeccion('4. Horario y Perfil de los Solicitantes', 52);
  subtitulo('Solicitudes por hora de recogida (turno vespertino)', margen, y);
  y += 3;
  y += columnas(margen, y, ancho, 48, horasPico.map((h) => ({ etiqueta: h.hora, valor: h.solicitudes }))) + 8;

  const altoSemestres = Math.max(semestres.length * ALTO_FILA, 52) + 6;
  asegurarEspacio(altoSemestres);
  subtitulo('Solicitudes por semestre', margen, y);
  subtitulo('Solicitudes por día de la semana', margen + anchoColumna + separacion, y);
  barrasHorizontales(margen, y + 4, anchoColumna, semestres.map((s) => ({ etiqueta: s.semestre, valor: s.solicitudes })));
  columnas(margen + anchoColumna + separacion, y + 3, anchoColumna, 52, porDiaSemana.map((d) => ({ etiqueta: d.dia, valor: d.solicitudes })));
  y += altoSemestres + 8;

  // =======================================================
  // 5. FALLAS Y MANTENIMIENTO DE EQUIPO
  // =======================================================
  tituloSeccion('5. Fallas y Mantenimiento de Equipo', 50);
  if (resumenFallas.totalReportes === 0) {
    parrafo(`No se registraron reportes de falla durante ${periodo}.`);
  } else {
    const graves = resumenFallas.porSeveridad.find((s) => s.etiqueta === 'Grave')?.total || 0;
    parrafo(
      `Durante ${periodo} se registraron ${resumenFallas.totalReportes} reportes de falla que afectaron ` +
      `${resumenFallas.unidadesAfectadas} unidades de equipo. De ellos, ${graves} fueron clasificados como graves, ` +
      `${resumenFallas.abiertas} permanecen pendientes o en reparación y ${resumenFallas.unidadesBaja} unidades ` +
      `fueron dadas de baja.`
    );

    const masDanados = resumenFallas.porMaterial.slice(0, 6).map((m) => ({ etiqueta: m.nombre, valor: m.reportes }));
    const datosTipo = conPorcentaje(resumenFallas.porTipo.map((t) => ({ etiqueta: t.etiqueta, valor: t.total })));
    const altoFallas = Math.max(masDanados.length, datosTipo.length) * ALTO_FILA + 6;
    asegurarEspacio(altoFallas);
    subtitulo('Equipos con más reportes', margen, y);
    subtitulo('Causas de falla', margen + anchoColumna + separacion, y);
    barrasHorizontales(margen, y + 4, anchoColumna, masDanados);
    barrasHorizontales(margen + anchoColumna + separacion, y + 4, anchoColumna, datosTipo);
    y += altoFallas + 6;

    tabla({
      head: [['Equipo', 'Categoría', 'Reportes', 'Graves', 'Unid. de baja', 'Fallas / 100 préstamos']],
      body: resumenFallas.porMaterial.map((m) => [m.nombre, m.categoria, m.reportes, m.graves, m.bajas, m.tasa === null ? '-' : m.tasa]),
      columnStyles: { 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
    });
    y -= 6;
    escribir('Nota: Fallas / 100 préstamos indica qué tan frágil es un equipo en relación con su uso; un valor mayor implica más fallas.', margen, y, { size: 7, color: GRIS_TEXTO });
    y += 10;
  }

  // --- FIRMAS ---
  asegurarEspacio(40);
  y += 22;
  doc.setDrawColor(...NEGRO);
  doc.setLineWidth(0.3);
  [margen + 5, margen + anchoColumna + separacion + 5].forEach((x, i) => {
    const largo = anchoColumna - 10;
    doc.line(x, y, x + largo, y);
    escribir(i === 0 ? 'Elaboró' : 'Vo. Bo.', x + largo / 2, y + 5, { size: 9, bold: true, align: 'center' });
    escribir(i === 0 ? 'Encargado de Almacén' : 'Coordinación de Ingeniería Mecatrónica', x + largo / 2, y + 9.5, { size: 8, color: GRIS_TEXTO, align: 'center' });
  });

  // =======================================================
  // ENCABEZADO DE PÁGINAS INTERIORES Y PIE DE PÁGINA
  // =======================================================
  const totalPaginas = doc.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GRIS_LINEA);
    doc.setLineWidth(0.2);
    if (i > 1) {
      escribir('SafeStock - Reporte Ejecutivo de Almacén', margen, 15, { size: 8.5, bold: true });
      escribir(`División de Ingeniería Mecatrónica · ${periodo}`, margen + ancho, 15, { size: 8, color: GRIS_TEXTO, align: 'right' });
      doc.line(margen, 18, margen + ancho, 18);
    }
    doc.line(margen, altoPagina - 15, margen + ancho, altoPagina - 15);
    escribir('SafeStock · CETI Mecatrónica · Documento generado automáticamente', margen, altoPagina - 10, { size: 7.5, color: GRIS_TEXTO });
    escribir(`Página ${i} de ${totalPaginas}`, margen + ancho, altoPagina - 10, { size: 7.5, color: GRIS_TEXTO, align: 'right' });
  }

  doc.save('Reporte_SafeStock_Coordinacion.pdf');
};

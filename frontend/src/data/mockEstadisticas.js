// =======================================================
// DATOS DE PRUEBA (MOCK) PARA EL MÓDULO DE ESTADÍSTICAS Y FALLAS
// Tienen la misma forma que devolverán GET /api/admin/estadisticas?mes=AAAA-MM,
// GET /api/admin/materiales y GET /api/admin/fallas, así que al conectar
// la BD no hay que tocar las vistas.
// =======================================================

// Estadísticas de UN mes (el servicio le agrega el campo "mes" que se pidió)
export const mockEstadisticas = {
  totalPrestamos: 72,
  totalMesAnterior: 63,

  // Todos los pedidos del mes agrupados por su estado
  prestamosPorEstado: [
    { estado: 'Finalizado', total: 61 },
    { estado: 'Aprobado', total: 11 },
    { estado: 'Rechazado', total: 6 },
    { estado: 'Pendiente', total: 4 },
    { estado: 'Expirado', total: 2 },
  ],

  // Préstamos por semana del mes
  porSemana: [
    { semana: 1, prestamos: 14 },
    { semana: 2, prestamos: 19 },
    { semana: 3, prestamos: 22 },
    { semana: 4, prestamos: 13 },
    { semana: 5, prestamos: 4 },
  ],

  // Top de herramientas con mayor número de préstamos
  topHerramientas: [
    { id: 30001, nombre: 'Multímetro Digital', categoria: 'Medición', prestamos: 18 },
    { id: 30004, nombre: 'Osciloscopio', categoria: 'Medición', prestamos: 14 },
    { id: 30002, nombre: 'Protoboard', categoria: 'Electrónica', prestamos: 12 },
    { id: 30007, nombre: 'Cautín', categoria: 'Herramienta', prestamos: 10 },
    { id: 30003, nombre: 'Fuente de Poder', categoria: 'Electrónica', prestamos: 9 },
    { id: 30009, nombre: 'Arduino UNO', categoria: 'Microcontroladores', prestamos: 8 },
    { id: 30005, nombre: 'Pinzas de Punta', categoria: 'Herramienta', prestamos: 6 },
    { id: 30011, nombre: 'Vernier Digital', categoria: 'Medición', prestamos: 5 },
  ],

  // Préstamos por categoría de material
  porCategoria: [
    { categoria: 'Medición', prestamos: 27 },
    { categoria: 'Electrónica', prestamos: 20 },
    { categoria: 'Herramienta', prestamos: 15 },
    { categoria: 'Microcontroladores', prestamos: 7 },
    { categoria: 'Neumática', prestamos: 3 },
  ],

  // Solicitudes por hora de recogida (Mecatrónica solo trabaja en turno vespertino)
  horasPico: [
    { hora: '14:00', solicitudes: 9 },
    { hora: '15:00', solicitudes: 14 },
    { hora: '16:00', solicitudes: 18 },
    { hora: '17:00', solicitudes: 13 },
    { hora: '18:00', solicitudes: 9 },
    { hora: '19:00', solicitudes: 6 },
    { hora: '20:00', solicitudes: 3 },
  ],

  // Solicitudes por día de la semana
  porDiaSemana: [
    { dia: 'Lunes', solicitudes: 13 },
    { dia: 'Martes', solicitudes: 17 },
    { dia: 'Miércoles', solicitudes: 15 },
    { dia: 'Jueves', solicitudes: 19 },
    { dia: 'Viernes', solicitudes: 8 },
  ],

  // Solicitudes por semestre del alumno solicitante
  semestres: [
    { semestre: '1er Semestre', solicitudes: 2 },
    { semestre: '2do Semestre', solicitudes: 4 },
    { semestre: '3er Semestre', solicitudes: 7 },
    { semestre: '4to Semestre', solicitudes: 11 },
    { semestre: '5to Semestre', solicitudes: 16 },
    { semestre: '6to Semestre', solicitudes: 14 },
    { semestre: '7mo Semestre', solicitudes: 11 },
    { semestre: '8vo Semestre', solicitudes: 7 },
  ],
};

// Misma forma que GET /api/admin/materiales
export const mockInventario = [
  { ID_Material: 30001, Nombre: 'Multímetro Digital', Cantidad: 10, Nombre_Categoria: 'Medición' },
  { ID_Material: 30002, Nombre: 'Protoboard', Cantidad: 25, Nombre_Categoria: 'Electrónica' },
  { ID_Material: 30003, Nombre: 'Fuente de Poder', Cantidad: 6, Nombre_Categoria: 'Electrónica' },
  { ID_Material: 30004, Nombre: 'Osciloscopio', Cantidad: 4, Nombre_Categoria: 'Medición' },
  { ID_Material: 30005, Nombre: 'Pinzas de Punta', Cantidad: 15, Nombre_Categoria: 'Herramienta' },
  { ID_Material: 30006, Nombre: 'Compresor Neumático', Cantidad: 2, Nombre_Categoria: 'Neumática' },
  { ID_Material: 30007, Nombre: 'Cautín', Cantidad: 8, Nombre_Categoria: 'Herramienta' },
  { ID_Material: 30008, Nombre: 'Generador de Funciones', Cantidad: 3, Nombre_Categoria: 'Medición' },
  { ID_Material: 30009, Nombre: 'Arduino UNO', Cantidad: 12, Nombre_Categoria: 'Microcontroladores' },
  { ID_Material: 30010, Nombre: 'Motor a Pasos', Cantidad: 9, Nombre_Categoria: 'Electrónica' },
  { ID_Material: 30011, Nombre: 'Vernier Digital', Cantidad: 5, Nombre_Categoria: 'Medición' },
  { ID_Material: 30012, Nombre: 'Cilindro Neumático', Cantidad: 6, Nombre_Categoria: 'Neumática' },
];

// Fechas relativas a hoy para que siempre haya fallas en el mes anterior (el que se reporta por defecto)
const fechaRelativa = (mesesAtras, dia, hora) => {
  const fecha = new Date();
  fecha.setDate(1);
  fecha.setMonth(fecha.getMonth() - mesesAtras);
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  return `${fecha.getFullYear()}-${mes}-${String(dia).padStart(2, '0')}T${hora}:00`;
};

// Misma forma que GET /api/admin/fallas
export const mockFallas = [
  { id: 1, fecha: fechaRelativa(2, 12, '15:10'), materialId: 30001, materialNombre: 'Multímetro Digital', categoria: 'Medición', cantidad: 1, tipo: 'Falla eléctrica', severidad: 'Grave', estado: 'Dado de baja', pedido: 'PED-1021', matricula: '22310045', descripcion: 'Fusible interno quemado y pantalla sin respuesta.', reportadoPor: 'Almacenista' },
  { id: 2, fecha: fechaRelativa(2, 24, '17:40'), materialId: 30007, materialNombre: 'Cautín', categoria: 'Herramienta', cantidad: 1, tipo: 'Desgaste', severidad: 'Leve', estado: 'Reparado', pedido: 'PED-1040', matricula: '23110212', descripcion: 'Punta desgastada, se reemplazó.', reportadoPor: 'Almacenista' },
  { id: 3, fecha: fechaRelativa(1, 2, '15:05'), materialId: 30004, materialNombre: 'Osciloscopio', categoria: 'Medición', cantidad: 1, tipo: 'Falla de calibración', severidad: 'Moderada', estado: 'Reparado', pedido: 'PED-1067', matricula: '22110087', descripcion: 'Canal 2 con lectura desfasada.', reportadoPor: 'Almacenista' },
  { id: 4, fecha: fechaRelativa(1, 5, '16:20'), materialId: 30001, materialNombre: 'Multímetro Digital', categoria: 'Medición', cantidad: 2, tipo: 'Daño físico', severidad: 'Moderada', estado: 'Reparado', pedido: 'PED-1080', matricula: '22310101', descripcion: 'Puntas de prueba rotas.', reportadoPor: 'Almacenista' },
  { id: 5, fecha: fechaRelativa(1, 8, '18:00'), materialId: 30002, materialNombre: 'Protoboard', categoria: 'Electrónica', cantidad: 3, tipo: 'Desgaste', severidad: 'Leve', estado: 'Dado de baja', pedido: 'PED-1102', matricula: '24110033', descripcion: 'Contactos flojos en varias filas.', reportadoPor: 'Almacenista' },
  { id: 6, fecha: fechaRelativa(1, 11, '16:45'), materialId: 30003, materialNombre: 'Fuente de Poder', categoria: 'Electrónica', cantidad: 1, tipo: 'Falla eléctrica', severidad: 'Grave', estado: 'En reparación', pedido: 'PED-1119', matricula: '22110145', descripcion: 'No regula voltaje en salida variable.', reportadoPor: 'Almacenista' },
  { id: 7, fecha: fechaRelativa(1, 14, '17:10'), materialId: 30001, materialNombre: 'Multímetro Digital', categoria: 'Medición', cantidad: 1, tipo: 'Falla eléctrica', severidad: 'Moderada', estado: 'Reparado', pedido: 'PED-1133', matricula: '23310078', descripcion: 'Selector de escala con falso contacto.', reportadoPor: 'Almacenista' },
  { id: 8, fecha: fechaRelativa(1, 16, '14:30'), materialId: 30009, materialNombre: 'Arduino UNO', categoria: 'Microcontroladores', cantidad: 1, tipo: 'Falla eléctrica', severidad: 'Grave', estado: 'Dado de baja', pedido: 'PED-1150', matricula: '23110190', descripcion: 'Microcontrolador dañado por cortocircuito.', reportadoPor: 'Almacenista' },
  { id: 9, fecha: fechaRelativa(1, 19, '15:25'), materialId: 30004, materialNombre: 'Osciloscopio', categoria: 'Medición', cantidad: 1, tipo: 'Daño físico', severidad: 'Grave', estado: 'En reparación', pedido: 'PED-1168', matricula: '22310045', descripcion: 'Perilla de base de tiempo rota.', reportadoPor: 'Almacenista' },
  { id: 10, fecha: fechaRelativa(1, 21, '18:00'), materialId: 30007, materialNombre: 'Cautín', categoria: 'Herramienta', cantidad: 1, tipo: 'Falla eléctrica', severidad: 'Moderada', estado: 'Pendiente', pedido: 'PED-1181', matricula: '24110058', descripcion: 'No calienta lo suficiente.', reportadoPor: 'Almacenista' },
  { id: 11, fecha: fechaRelativa(1, 23, '16:35'), materialId: 30005, materialNombre: 'Pinzas de Punta', categoria: 'Herramienta', cantidad: 2, tipo: 'Pieza faltante', severidad: 'Leve', estado: 'Pendiente', pedido: 'PED-1195', matricula: '24310012', descripcion: 'Se entregaron sin funda protectora.', reportadoPor: 'Almacenista' },
  { id: 12, fecha: fechaRelativa(1, 26, '17:50'), materialId: 30001, materialNombre: 'Multímetro Digital', categoria: 'Medición', cantidad: 1, tipo: 'Daño físico', severidad: 'Leve', estado: 'Pendiente', pedido: 'PED-1203', matricula: '23110212', descripcion: 'Carcasa estrellada.', reportadoPor: 'Almacenista' },
  { id: 13, fecha: fechaRelativa(1, 28, '19:15'), materialId: 30006, materialNombre: 'Compresor Neumático', categoria: 'Neumática', cantidad: 1, tipo: 'Falla mecánica', severidad: 'Grave', estado: 'En reparación', pedido: '', matricula: '', descripcion: 'Fuga de aire en válvula de seguridad.', reportadoPor: 'Almacenista' },
  { id: 14, fecha: fechaRelativa(0, 1, '16:05'), materialId: 30011, materialNombre: 'Vernier Digital', categoria: 'Medición', cantidad: 1, tipo: 'Falla de calibración', severidad: 'Moderada', estado: 'Pendiente', pedido: 'PED-1220', matricula: '22110087', descripcion: 'No regresa a cero.', reportadoPor: 'Almacenista' },
];

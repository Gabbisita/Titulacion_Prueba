// =======================================================
// VALIDACIÓN DE ENTRADAS
// =======================================================
// Todo lo que manda el usuario (formularios, URL, parámetros) pasa por aquí ANTES
// de tocar la base de datos. Lo que no cumple el formato se rechaza con un mensaje
// claro; los campos que no esperamos simplemente se descartan.
const { z } = require('zod');
const { SEMESTRE_MIN, SEMESTRE_MAX } = require('./semestres');

class ErrorHttp extends Error {
  constructor(http, mensaje, extra = {}) {
    super(mensaje);
    this.http = http;
    this.extra = extra;
  }
}

// Sin caracteres de control ni < > (bloquea intentos de meter HTML o scripts).
const RARO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/;

const texto = (campo, { min = 1, max, patron, mensajePatron } = {}) => {
  let s = z.string({ error: `${campo}: dato no válido.` }).trim()
    .min(min, min <= 1 ? `${campo}: este dato es obligatorio.` : `${campo}: debe tener al menos ${min} caracteres.`)
    .max(max, `${campo}: máximo ${max} caracteres.`)
    .refine((v) => !RARO.test(v), `${campo}: contiene caracteres no permitidos.`);
  if (patron) s = s.regex(patron, mensajePatron || `${campo}: formato no válido.`);
  return s;
};

const entero = (campo, min, max) =>
  z.coerce.number({ error: `${campo}: debe ser un número.` })
    .int(`${campo}: debe ser un número entero.`)
    .min(min, `${campo}: el mínimo es ${min}.`)
    .max(max, `${campo}: el máximo es ${max}.`);

const email = z.string({ error: 'Correo: dato no válido.' }).trim().toLowerCase()
  .max(100, 'Correo: máximo 100 caracteres.')
  .regex(/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/, 'Escribe un correo válido.');

// En la base la matrícula puede ser numérica (23110115): se acepta número o texto y se trata como texto.
const numeroATexto = (v) => (typeof v === 'number' && Number.isSafeInteger(v) ? String(v) : v);
const matricula = z.preprocess(numeroATexto, texto('Matrícula', { min: 4, max: 20, patron: /^[A-Za-z0-9-]+$/, mensajePatron: 'Matrícula: solo letras y números, sin espacios.' }));

// bcrypt solo usa los primeros 72 bytes: no aceptamos contraseñas más largas.
const passwordNueva = z.string({ error: 'Contraseña: dato no válido.' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres.')
  .max(72, 'La contraseña puede tener máximo 72 caracteres.')
  .refine((v) => Buffer.byteLength(v, 'utf8') <= 72, 'La contraseña es demasiado larga.')
  .refine((v) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(v) && /\d/.test(v), 'La contraseña debe incluir al menos una letra y un número.');

const telefono = z.string({ error: 'Teléfono: dato no válido.' }).trim()
  .regex(/^(\+?[\d\s()-]{7,20})?$/, 'Teléfono: escribe solo números (7 a 20 dígitos).');

const semestre = entero('Semestre', SEMESTRE_MIN, SEMESTRE_MAX);
const hora = texto('Hora', { max: 12, patron: /^\d{1,2}:\d{2}(\s?[AaPp]\.?[Mm]\.?)?$/ });
const idMaterial = entero('ID del material', 1, 2147483647);

const esquemas = {
  login: z.object({
    email,
    password: z.string({ error: 'Escribe tu contraseña.' }).min(1, 'Escribe tu contraseña.').max(200, 'Contraseña no válida.'),
  }),

  registro: z.object({
    nombre: texto('Nombre', { min: 3, max: 100, patron: /^[\p{L}\s.'-]+$/u, mensajePatron: 'Nombre: solo se permiten letras y espacios.' }),
    registro_alu: matricula,
    email: email.refine((v) => v.endsWith('@ceti.mx'), 'Por seguridad, solo se permiten correos institucionales (@ceti.mx).'),
    password: passwordNueva,
    telefono: telefono.optional().default(''),
    carrera_texto: texto('Carrera', { max: 100 }),
    semestre,
  }),

  recuperarSolicitar: z.object({ email }),
  recuperarConfirmar: z.object({
    email,
    codigo: z.string({ error: 'Código: dato no válido.' }).trim().regex(/^\d{6}$/, 'El código es de 6 dígitos.'),
    password: passwordNueva,
  }),

  actualizarCiclo: z.object({ semestre, telefono: telefono.optional() }),

  pedido: z.object({
    fecha_recogida: texto('Fecha', { max: 60, patron: /^[\p{L}\d\s,./-]+$/u }),
    hora_recogida: hora,
    hora_devolucion: hora,
    proposito: texto('Propósito', { min: 5, max: 500 }),
    integrantes: z.array(z.object({ matricula }), { error: 'Integrantes: dato no válido.' }).max(10, 'Máximo 10 integrantes por pedido.').default([]),
    materiales: z.array(z.object({ id: idMaterial, cantidad: entero('Cantidad', 1, 100) }), { error: 'Materiales: dato no válido.' })
      .min(1, 'Agrega al menos un material.').max(40, 'Máximo 40 materiales distintos por pedido.'),
  }),

  idPedido: texto('Folio', { max: 50, patron: /^[A-Za-z0-9_-]+$/ }),
  idNumerico: entero('ID', 1, 2147483647),
  matricula,

  aprobar: z.object({ id_casillero: entero('Casillero', 1, 255) }),
  rechazar: z.object({ motivo: texto('Motivo', { min: 5, max: 500 }) }),
  estadoCasillero: z.object({ nuevo_estado: z.coerce.number().refine((v) => v === 1 || v === 3, 'Solo se puede cambiar a Libre o Mantenimiento.') }),
  codigoQR: z.string({ error: 'Código: dato no válido.' }).max(300, 'Código demasiado largo.'),

  material: z.object({
    ID_Material: idMaterial,
    Nombre: texto('Nombre', { min: 2, max: 150 }),
    Cantidad: entero('Cantidad', 0, 100000),
    Descripcion: texto('Descripción', { min: 0, max: 2000 }).optional().default(''),
    FK_No_Categoria: entero('Categoría', 1, 100000),
  }),

  falla: z.object({
    materialId: idMaterial,
    cantidad: entero('Cantidad', 1, 100000).optional().default(1),
    tipo: texto('Tipo de falla', { max: 40 }),
    severidad: z.enum(['Leve', 'Moderada', 'Grave'], { error: 'Severidad no válida.' }),
    pedido: texto('Folio', { min: 0, max: 50, patron: /^[A-Za-z0-9_-]*$/ }).optional().nullable(),
    matricula: z.preprocess(numeroATexto, texto('Matrícula', { min: 0, max: 20, patron: /^[A-Za-z0-9-]*$/ }).optional().nullable()),
    descripcion: texto('Descripción', { min: 5, max: 2000 }),
  }),
  estadoFalla: z.object({ estado: z.enum(['Pendiente', 'En reparación', 'Reparado', 'Dado de baja'], { error: 'Estado no válido.' }) }),

  busqueda: texto('Búsqueda', { min: 2, max: 50 }),
  mes: z.string({ error: 'Indica el mes en formato AAAA-MM.' }).regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Indica el mes en formato AAAA-MM.'),
  bitacora: z.object({
    nivel: z.enum(['info', 'alerta', 'critico'], { error: 'Nivel no válido.' }).optional(),
    limite: entero('Límite', 1, 500).optional().default(200),
  }),
};

// Devuelve los datos ya limpios o lanza un error 400 con el primer problema encontrado.
function leer(esquema, datos) {
  const r = esquema.safeParse(datos ?? undefined);
  if (r.success) return r.data;
  const problema = r.error.issues[0];
  // Los mensajes propios están en español; cualquier otro (generado por la librería) se generaliza.
  const mensaje = /^(Invalid|Too |Unrecognized|Expected)/i.test(problema.message) ? 'Los datos enviados no son válidos.' : problema.message;
  throw new ErrorHttp(400, mensaje, { validacion: `${problema.path.join('.')}: ${problema.code}` });
}

module.exports = { ErrorHttp, esquemas, leer };

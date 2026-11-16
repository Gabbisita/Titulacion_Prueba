// =======================================================
// SEGURIDAD: SESIONES, ROLES, LÍMITES DE PETICIONES Y BLOQUEOS
// =======================================================
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const config = require('./config');
const { registrar } = require('./bitacora');
const { ErrorHttp } = require('./validacion');

// ---------- 1. SESIÓN (token firmado dentro de una cookie httpOnly) ----------
// Antes el servidor confiaba en lo que el navegador decía ("soy admin").
// Ahora, al iniciar sesión, el servidor firma un token (JWT) con JWT_SECRET y lo
// guarda en una cookie:
//   - httpOnly: JavaScript no puede leerla, así que un script malicioso (XSS) no la roba.
//   - sameSite strict: otros sitios no pueden hacer peticiones a nombre del usuario (CSRF).
//   - secure: solo viaja por HTTPS cuando el sitio se sirve por HTTPS.
// El token dura 30 minutos y se renueva solo mientras el usuario siga activo.
const COOKIE = 'ss_sesion';
const DURACION_MIN = 30;
const RENOVAR_TRAS_MIN = 5;

const opcionesCookie = (req) => ({
  httpOnly: true,
  sameSite: 'strict',
  secure: req.secure || config.produccion,
  path: '/',
  maxAge: DURACION_MIN * 60 * 1000,
});

function abrirSesion(req, res, usuario) {
  const token = jwt.sign(
    { sub: String(usuario.sub), rol: usuario.rol, nombre: usuario.nombre || '', email: usuario.email || '' },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: `${DURACION_MIN}m` },
  );
  res.cookie(COOKIE, token, opcionesCookie(req));
}

function cerrarSesion(req, res) {
  const { maxAge, ...opciones } = opcionesCookie(req);
  res.clearCookie(COOKIE, opciones);
}

// Se ejecuta en todas las peticiones: si hay una cookie válida, deja al usuario en req.usuario.
function identificar(req, res, next) {
  const token = req.cookies?.[COOKIE];
  if (!token) return next();
  try {
    const datos = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
    req.usuario = { sub: datos.sub, rol: datos.rol, nombre: datos.nombre, email: datos.email };
    if (Date.now() / 1000 - datos.iat > RENOVAR_TRAS_MIN * 60) abrirSesion(req, res, req.usuario);
  } catch (err) {
    cerrarSesion(req, res);
    // Un token vencido es normal; uno con firma falsa es un intento de suplantación.
    if (err.name !== 'TokenExpiredError') {
      registrar('TOKEN_INVALIDO', { req, nivel: 'alerta', detalle: err.message });
      sospecha(req);
    }
  }
  next();
}

const requiereSesion = (req, res, next) => {
  if (req.usuario) return next();
  next(new ErrorHttp(401, 'Tu sesión expiró o no has iniciado sesión.'));
};

const requiereRol = (rol) => (req, res, next) => {
  if (!req.usuario) return next(new ErrorHttp(401, 'Tu sesión expiró o no has iniciado sesión.'));
  if (req.usuario.rol !== rol) {
    registrar('ACCESO_DENEGADO', { req, nivel: 'alerta', detalle: `Se requiere rol ${rol}` });
    sospecha(req);
    return next(new ErrorHttp(403, 'No tienes permiso para realizar esta acción.'));
  }
  next();
};

// ---------- 2. API KEY DEL CASILLERO (ESP32 + GM60) ----------
// El microcontrolador no inicia sesión: se identifica con una clave larga en el
// encabezado "X-API-Key". La comparación es en tiempo constante.
function claveCasilleroValida(req) {
  const recibida = String(req.get('x-api-key') || '');
  if (!config.casilleroApiKey || !recibida) return false;
  const a = crypto.createHash('sha256').update(recibida).digest();
  const b = crypto.createHash('sha256').update(config.casilleroApiKey).digest();
  return crypto.timingSafeEqual(a, b);
}

// ---------- 3. DETECCIÓN DE ATAQUES: BLOQUEO TEMPORAL POR IP ----------
// Cada evento sospechoso (contraseña incorrecta, token falso, acceso negado, ruta
// inexistente, QR falso, datos inválidos...) suma un punto a la IP. Demasiados puntos
// en poco tiempo = bloqueo temporal. Los umbrales son altos porque toda la escuela
// puede salir a internet con la misma IP.
const SOSPECHA_MAX = 40;
const SOSPECHA_VENTANA = 10 * 60 * 1000;
const BLOQUEO_IP = 10 * 60 * 1000;
const sospechas = new Map(); // ip -> { puntos, desde, bloqueadaHasta }

function sospecha(req, puntos = 1) {
  const ip = req.ip || 'desconocida';
  const ahora = Date.now();
  let r = sospechas.get(ip);
  if (!r || ahora - r.desde > SOSPECHA_VENTANA) r = { puntos: 0, desde: ahora, bloqueadaHasta: 0 };
  r.puntos += puntos;
  if (r.puntos >= SOSPECHA_MAX && r.bloqueadaHasta < ahora) {
    r.bloqueadaHasta = ahora + BLOQUEO_IP;
    registrar('IP_BLOQUEADA', { req, nivel: 'critico', detalle: `${r.puntos} eventos sospechosos en menos de 10 minutos` });
  }
  sospechas.set(ip, r);
}

function filtroIP(req, res, next) {
  const r = sospechas.get(req.ip);
  if (r && r.bloqueadaHasta > Date.now()) {
    return next(new ErrorHttp(429, 'Detectamos actividad inusual desde tu conexión. Intenta de nuevo en unos minutos.'));
  }
  next();
}

// ---------- 4. BLOQUEO DE CUENTA POR CONTRASEÑAS INCORRECTAS ----------
const INTENTOS_MAX = 5;
const BLOQUEO_CUENTA = 15 * 60 * 1000;
const intentos = new Map(); // email -> { fallos, desde, bloqueadaHasta }

const cuentaBloqueada = (email) => (intentos.get(email)?.bloqueadaHasta || 0) > Date.now();
const limpiarIntentos = (email) => intentos.delete(email);

// Devuelve true si con este fallo la cuenta quedó bloqueada.
function anotarFallo(email) {
  const ahora = Date.now();
  let r = intentos.get(email);
  if (!r || ahora - r.desde > BLOQUEO_CUENTA) r = { fallos: 0, desde: ahora, bloqueadaHasta: 0 };
  r.fallos++;
  const bloquea = r.fallos >= INTENTOS_MAX;
  if (bloquea) { r.bloqueadaHasta = ahora + BLOQUEO_CUENTA; r.fallos = 0; }
  intentos.set(email, r);
  return bloquea;
}

// Limpieza periódica para que los mapas no crezcan sin límite.
setInterval(() => {
  const ahora = Date.now();
  for (const [k, r] of sospechas) if (ahora - r.desde > SOSPECHA_VENTANA && r.bloqueadaHasta < ahora) sospechas.delete(k);
  for (const [k, r] of intentos) if (ahora - r.desde > BLOQUEO_CUENTA && r.bloqueadaHasta < ahora) intentos.delete(k);
}, 5 * 60 * 1000).unref();

// ---------- 5. RATE LIMITING ----------
// Con sesión, el límite es por usuario; sin sesión, por IP.
const llave = (req) => (req.usuario ? `u:${req.usuario.rol}:${req.usuario.sub}` : ipKeyGenerator(req.ip || ''));

const limite = (nombre, minutos, maximo, mensaje, porIP = false) => rateLimit({
  windowMs: minutos * 60 * 1000,
  limit: maximo,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: porIP ? (req) => ipKeyGenerator(req.ip || '') : llave,
  handler: (req, res, next, opciones) => {
    // Solo se anota la primera vez que se rebasa el límite en la ventana (evita inundar la bitácora).
    if (req.rateLimit.used === req.rateLimit.limit + 1) {
      registrar('LIMITE_EXCEDIDO', { req, nivel: 'alerta', detalle: `Límite "${nombre}": más de ${maximo} peticiones en ${minutos} min` });
      sospecha(req, 5);
    }
    if (req.query.formato === 'texto') return res.status(opciones.statusCode).type('text/plain').send('NO DEMASIADAS_PETICIONES');
    res.status(opciones.statusCode).json({ status: 'error', message: mensaje, error: mensaje });
  },
});

const limites = {
  general: limite('general', 5, 400, 'Demasiadas peticiones. Espera un momento e intenta de nuevo.'),
  login: limite('login', 15, 30, 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos.', true),
  registro: limite('registro', 60, 15, 'Se crearon demasiadas cuentas desde esta conexión. Intenta más tarde.', true),
  recuperar: limite('recuperar', 60, 15, 'Demasiadas solicitudes de recuperación. Intenta más tarde.', true),
  pedidos: limite('pedidos', 60, 15, 'Enviaste demasiadas solicitudes. Intenta más tarde.'),
  correo: limite('correo', 60, 10, 'Ya se enviaron varios correos. Intenta más tarde.'),
  qr: limite('qr', 1, 60, 'Demasiadas verificaciones de QR. Espera un momento.'),
};

module.exports = {
  abrirSesion, cerrarSesion, identificar, requiereSesion, requiereRol,
  claveCasilleroValida, sospecha, filtroIP,
  cuentaBloqueada, anotarFallo, limpiarIntentos, limites,
};

// Manejo central de la sesión.
// - Recargar la página NO cierra la sesión (todo vive en localStorage).
// - Después de MINUTOS_INACTIVIDAD sin actividad, la sesión se cierra, aunque la
//   pestaña haya estado cerrada o en segundo plano.

export const MINUTOS_INACTIVIDAD = 2;
const LIMITE_MS = MINUTOS_INACTIVIDAD * 60 * 1000;

const K_USUARIO = 'usuario_safestock';
const K_ROL = 'rol_safestock';
const K_ACTIVIDAD = 'ultima_actividad_safestock';
const K_CARRITO = 'solicitud_materiales_safe';

const leer = (k) => {
  try { return localStorage.getItem(k); } catch { return null; }
};

export function iniciarSesion(usuario, rol) {
  localStorage.setItem(K_USUARIO, JSON.stringify(usuario));
  localStorage.setItem(K_ROL, rol || 'alumno');
  localStorage.setItem(K_ACTIVIDAD, String(Date.now()));
}

export function cerrarSesion() {
  [K_USUARIO, K_ROL, K_ACTIVIDAD, K_CARRITO].forEach((k) => {
    try { localStorage.removeItem(k); } catch { /* nada */ }
  });
}

export function sesionExpirada() {
  const ultima = Number(leer(K_ACTIVIDAD));
  return !ultima || Date.now() - ultima > LIMITE_MS;
}

// Devuelve { usuario, rol } o null si no hay sesión o ya expiró.
export function obtenerSesion() {
  const crudo = leer(K_USUARIO);
  if (!crudo) return null;
  if (sesionExpirada()) {
    cerrarSesion();
    return null;
  }
  try {
    return { usuario: JSON.parse(crudo), rol: leer(K_ROL) || 'alumno' };
  } catch {
    cerrarSesion();
    return null;
  }
}

export function registrarActividad() {
  if (leer(K_USUARIO)) localStorage.setItem(K_ACTIVIDAD, String(Date.now()));
}

export const rutaInicio = (rol) => (rol === 'admin' ? '/inicioadmin' : '/inicio');

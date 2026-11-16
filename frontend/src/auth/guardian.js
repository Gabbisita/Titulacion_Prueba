// Vigila TODAS las respuestas del servidor. Si el servidor contesta 401 (la sesión
// venció o la cookie ya no es válida), se limpia la sesión local y se regresa al login.
// Así ninguna pantalla se queda "abierta" mostrando datos sin una sesión real.
import { limpiarSesionLocal } from './sesion';

const fetchOriginal = window.fetch.bind(window);
const SIN_VIGILAR = ['/api/login', '/api/logout', '/api/registro', '/api/recuperar'];

window.fetch = async (entrada, opciones) => {
  const respuesta = await fetchOriginal(entrada, opciones);
  const url = typeof entrada === 'string' ? entrada : entrada?.url || '';
  const esDelBackend = url.includes('/backend/') && !SIN_VIGILAR.some((ruta) => url.includes(ruta));
  if (respuesta.status === 401 && esDelBackend && localStorage.getItem('usuario_safestock')) {
    limpiarSesionLocal();
    sessionStorage.setItem('aviso_sesion', 'Tu sesión expiró. Inicia sesión de nuevo.');
    window.location.replace('/');
  }
  return respuesta;
};

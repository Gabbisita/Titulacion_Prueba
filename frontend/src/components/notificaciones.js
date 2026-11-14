// Uso desde cualquier página:
//   import { mostrarToast } from '../components/notificaciones';
//   mostrarToast('Se agregó al carrito');
//   mostrarToast('Sin stock suficiente', 'error');
export function mostrarToast(mensaje, tipo = 'exito') {
  window.dispatchEvent(new CustomEvent('safestock:toast', { detail: { mensaje, tipo } }));
}

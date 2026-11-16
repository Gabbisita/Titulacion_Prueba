// Uso desde cualquier página:
//   import { mostrarToast } from '../components/notificaciones';
//   mostrarToast('Se agregó al carrito');
//   mostrarToast('Sin stock suficiente', 'error');
export function mostrarToast(mensaje, tipo = 'exito') {
  window.dispatchEvent(new CustomEvent('safestock:toast', { detail: { mensaje, tipo } }));
}

// Ventana de confirmación con el estilo de la página (sustituye a window.confirm).
//   if (await confirmar('¿Eliminar este material?', { textoConfirmar: 'Eliminar', peligro: true })) { ... }
export function confirmar(mensaje, opciones = {}) {
  return new Promise((resolver) => {
    window.dispatchEvent(new CustomEvent('safestock:confirmar', { detail: { mensaje, ...opciones, resolver } }));
  });
}

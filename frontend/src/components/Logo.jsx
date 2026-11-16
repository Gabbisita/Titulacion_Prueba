// Logo oficial de SafeStock (emblema sin fondo).
//   fondo="oscuro" (por defecto): /logo-claro.png, azul y blanco, para barras y portadas oscuras.
//   fondo="claro": /logo.png, azul y azul marino, para fondos blancos (vale, reportes).
const tamanos = {
  sm: 'w-10 h-10',
  md: 'w-11 h-11',
  lg: 'w-16 h-16',
  xl: 'w-60 h-60',
};

export default function Logo({ tamano = 'md', fondo = 'oscuro', className = '' }) {
  return (
    <img
      src={fondo === 'claro' ? '/logo.png' : '/logo-claro.png'}
      alt="SafeStock"
      className={`object-contain shrink-0 ${tamanos[tamano]} ${className}`}
    />
  );
}

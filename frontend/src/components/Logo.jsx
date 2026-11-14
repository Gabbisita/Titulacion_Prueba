// Logo oficial de Safe Stock CETI (frontend/public/logo.png, fondo transparente).
const tamanos = {
  sm: 'w-10 h-10',
  md: 'w-11 h-11',
  lg: 'w-16 h-16',
  xl: 'w-60 h-60',
};

export default function Logo({ tamano = 'md', className = '' }) {
  return (
    <img
      src="/logo.png"
      alt="Safe Stock CETI"
      className={`object-contain shrink-0 ${tamanos[tamano]} ${className}`}
    />
  );
}

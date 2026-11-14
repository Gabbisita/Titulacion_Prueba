import { Navigate } from 'react-router-dom';
import { obtenerSesion, rutaInicio } from '../auth/sesion';

// rol: 'alumno' | 'admin'. Sin sesión → login; con otro rol → su propio inicio.
export default function RutaProtegida({ rol, children }) {
  const sesion = obtenerSesion();
  if (!sesion) return <Navigate to="/" replace />;
  if (rol && sesion.rol !== rol) return <Navigate to={rutaInicio(sesion.rol)} replace />;
  return children;
}

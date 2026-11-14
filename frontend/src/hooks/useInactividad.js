import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { obtenerSesion, registrarActividad, sesionExpirada, cerrarSesion } from '../auth/sesion';
import { mostrarToast } from '../components/notificaciones';

// Vigila la actividad en toda la app (se monta una sola vez en App.jsx).
// Cada movimiento, tecla, toque o scroll renueva la sesión; si pasan 2 minutos
// sin nada, se cierra y se manda al login.
const useInactividad = () => {
  const navigate = useNavigate();
  const ultimoRegistro = useRef(0);

  useEffect(() => {
    const alActuar = () => {
      // Escribir en localStorage como mucho cada 5 s
      if (Date.now() - ultimoRegistro.current > 5000) {
        ultimoRegistro.current = Date.now();
        registrarActividad();
      }
    };

    const revisar = () => {
      if (localStorage.getItem('usuario_safestock') && sesionExpirada()) {
        cerrarSesion();
        mostrarToast('Por seguridad, tu sesión se cerró por inactividad.', 'error');
        navigate('/', { replace: true });
      }
    };

    const eventos = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    eventos.forEach((ev) => window.addEventListener(ev, alActuar, { passive: true }));
    const intervalo = setInterval(revisar, 5000);
    // Si cerraron sesión en otra pestaña, también salimos aquí
    const alCambiarStorage = (e) => {
      if (e.key === 'usuario_safestock' && !e.newValue) navigate('/', { replace: true });
    };
    window.addEventListener('storage', alCambiarStorage);

    if (obtenerSesion()) alActuar();

    return () => {
      eventos.forEach((ev) => window.removeEventListener(ev, alActuar));
      window.removeEventListener('storage', alCambiarStorage);
      clearInterval(intervalo);
    };
  }, [navigate]);
};

export default useInactividad;

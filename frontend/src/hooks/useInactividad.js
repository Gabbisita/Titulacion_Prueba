import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const useInactividad = (minutos) => {
  const navigate = useNavigate();

  useEffect(() => {
    let temporizador;

    const cerrarSesionPorInactividad = () => {
      localStorage.removeItem('usuario_safestock');
      localStorage.removeItem('solicitud_materiales_safe');
      alert("Por seguridad, tu sesión ha sido cerrada por inactividad.");
      navigate('/');
    };

    const reiniciarTemporizador = () => {
      clearTimeout(temporizador);
      temporizador = setTimeout(cerrarSesionPorInactividad, minutos * 60 * 1000);
    };

    // Escuchamos cualquier señal de vida del usuario
    window.addEventListener('mousemove', reiniciarTemporizador);
    window.addEventListener('keydown', reiniciarTemporizador);
    window.addEventListener('touchstart', reiniciarTemporizador);
    window.addEventListener('scroll', reiniciarTemporizador);

    reiniciarTemporizador();

    // Limpiamos la memoria si el componente desaparece
    return () => {
      clearTimeout(temporizador);
      window.removeEventListener('mousemove', reiniciarTemporizador);
      window.removeEventListener('keydown', reiniciarTemporizador);
      window.removeEventListener('touchstart', reiniciarTemporizador);
      window.removeEventListener('scroll', reiniciarTemporizador);
    };
  }, [navigate, minutos]);
};

export default useInactividad;
import { USAR_MOCK, API_URL } from './estadisticasService';
import { mockFallas } from '../data/mockEstadisticas';

// =======================================================
// SERVICIO DE REPORTES DE FALLA
// Con USAR_MOCK = true los reportes se guardan en el navegador (localStorage)
// para poder probar sin base de datos. Con false se usan los endpoints reales.
// =======================================================

export const TIPOS_FALLA = ['Daño físico', 'Falla eléctrica', 'Falla mecánica', 'Falla de calibración', 'Pieza faltante', 'Desgaste', 'Otro'];
export const SEVERIDADES = ['Leve', 'Moderada', 'Grave'];
export const ESTADOS_FALLA = ['Pendiente', 'En reparación', 'Reparado', 'Dado de baja'];

const CLAVE_MOCK = 'fallas_safestock_mock_v2';

const leerMock = () => {
  try {
    const guardado = localStorage.getItem(CLAVE_MOCK);
    return guardado ? JSON.parse(guardado) : [...mockFallas];
  } catch {
    return [...mockFallas];
  }
};

const guardarMock = (fallas) => {
  try {
    localStorage.setItem(CLAVE_MOCK, JSON.stringify(fallas));
  } catch (error) {
    console.error("No se pudo guardar en el navegador:", error);
  }
};

export const obtenerFallas = async () => {
  if (USAR_MOCK) return leerMock();

  const respuesta = await fetch(`${API_URL}/api/admin/fallas`);
  if (!respuesta.ok) throw new Error('Error al cargar los reportes de falla');
  return respuesta.json();
};

// datos: { materialId, materialNombre, categoria, cantidad, tipo, severidad, pedido, matricula, descripcion, reportadoPor }
export const registrarFalla = async (datos) => {
  if (USAR_MOCK) {
    const fallas = leerMock();
    const nueva = {
      ...datos,
      id: Math.max(0, ...fallas.map((f) => f.id)) + 1,
      fecha: new Date().toISOString(),
      estado: 'Pendiente',
    };
    guardarMock([nueva, ...fallas]);
    return nueva;
  }

  const respuesta = await fetch(`${API_URL}/api/admin/fallas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos),
  });
  const resultado = await respuesta.json();
  if (!respuesta.ok) throw new Error(resultado.message || 'Error al registrar la falla');
  return resultado;
};

export const actualizarEstadoFalla = async (id, estado) => {
  if (USAR_MOCK) {
    guardarMock(leerMock().map((f) => (f.id === id ? { ...f, estado } : f)));
    return;
  }

  const respuesta = await fetch(`${API_URL}/api/admin/fallas/${id}/estado`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado }),
  });
  if (!respuesta.ok) throw new Error('Error al actualizar el estado');
};

// Solo para pruebas: regresa los reportes de ejemplo originales
export const reiniciarFallasMock = () => {
  try {
    localStorage.removeItem(CLAVE_MOCK);
  } catch {
    // sin acceso a localStorage, no hay nada que borrar
  }
};

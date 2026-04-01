import api from '../api/axios';

export const loginUser = async (registro, password) => {
  try {
    const response = await api.post('/auth/login', { registro, password });
    return response.data; 
  } catch (error) {
    throw error.response?.data?.message || "Error de conexión con base de datos";
  }
};
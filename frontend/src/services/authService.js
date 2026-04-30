import api from '../api/axios';

export const loginUser = async (registro, password) => {
  try {
    const response = await api.post('/login', { registro, password });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || 'Error de conexión. Intenta más tarde.';
  }
};
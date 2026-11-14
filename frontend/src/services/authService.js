import api from '../api/axios';

export const loginUser = async (email, password) => {
  try {
    const response = await api.post('/', { email, password });
    return response.data;
  } catch (error) {
    throw error.response?.data?.message || error.response?.data?.error || 'Error de conexión. Intenta más tarde.';
  }
};
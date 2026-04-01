import axios from 'axios';

const api = axios.create({
  // Esto busca la URL en el archivo .env, si no existe usa el puerto 5000 por defecto
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;
import api from '../api/axios';

export const loginUser = async (email, registro) => {
  try {
    const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },

        body: JSON.stringify({email, registro}),

    });

    const data = await response.json();

    if (!response.ok){

        throw new Error(data.message || 'Error al iniciar sesion');
    }

    return data; 
  } catch (error) {
    throw error.message
  }
};
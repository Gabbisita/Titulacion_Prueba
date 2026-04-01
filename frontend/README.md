# SafeStock - Frontend
Sistema de gestión de inventario para el CETI.

## Tecnologías
- React + Vite
- Tailwind CSS
- Axios

## Arquitectura de Conexión
Para facilitar la integración, el proyecto utiliza una estructura modular:

- src/api/axios.js: Configuración base de Axios (BaseURL).
- src/services/authService.js: Lógica de peticiones para autenticación.

## Instrucciones para Backend:
1. Entrar a la carpeta: `cd frontend`
2. Instalar dependencias: `npm install`
4. Configurar Variable de Entorno: Crear un archivo .env en la raíz de frontend con:
    VITE_API_URL=http://localhost:5000
3. Correr proyecto: `npm run dev`

## Especificaciones del Login
El componente de Login espera la siguiente respuesta del servidor:

- Endpoint: POST /api/auth/login
- Payload (JSON): { "registro": "string", "password": "string" }
- Respuesta Exitosa (200): { "token": "JWT_TOKEN_HERE" }
- Error (401/500): { "message": "Descripción del error" }




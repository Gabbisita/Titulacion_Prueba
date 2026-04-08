# SafeStock - Frontend
Sistema de gestión de inventario para el CETI.

## Tecnologías
- React + Vite: Base del proyecto para un desarrollo rápido.
- Tailwind CSS: Estilizado moderno y responsivo con diseño de tarjetas (Cards).
- Axios: Cliente HTTP para la futura comunicación con la API.
- Framer Motion: Micro-interacciones, desvanecimientos elegantes y efectos de hover.
- React Router Dom: Manejo de rutas SPA (Single Page Application) y navegación fluida.


## Arquitectura de Conexión
Para facilitar la integración, el proyecto utiliza una estructura modular:

- src/api/axios.js: Configuración base de Axios (BaseURL).
- src/services/authService.js: Lógica de peticiones para autenticación.
- src/components/Navbar.jsx: Barra de navegación con indicador de sección activa animado y lógica de scroll forzado.
- src/pages/Inicio.jsx: Hero section con acceso directo y vista previa visual de los materiales más recientes.
- src/pages/Inventario.jsx: Sistema completo de visualización con filtros dinámicos por Categoría y Estado.
- App.jsx: Configuración de rutas y asistente de posicionamiento de scroll.


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

## Especificaciones del Inventario
El frontend espera una lista de materiales para renderizar las tarjetas y aplicar los filtros.
    {
    "id": 1,
    "n": "Nombre del Material",
    "d": 10, 
    "e": "EN STOCK | AGOTADO | PRESTADO",
    "c": "Electrónica | Herramientas | Maquinaria",
    "i": "⚡" 
    }

    Nota: 'i' es el icono/emoji, 'd' unidades disponibles, 'e' estado y 'c' categoría

## Notas de diseño
- Transiciones: Se implementó AnimatePresence para desvanecimientos sutiles al filtrar, evitando movimientos bruscos de las cajas.
- Feedback: Las tarjetas cuentan con un efecto de ensanchamiento al pasar el cursor.
- Navegación: Se incluyó lógica de reseteo de scroll (window.scrollTo) para asegurar que el usuario siempre inicie al principio de la página al navegar. (Falta mejorar)
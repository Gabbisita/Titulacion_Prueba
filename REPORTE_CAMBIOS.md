# Reporte de cambios: Safe Stock CETI (sesiones del 14 y 16 de noviembre de 2026)

> **Para quien actualice la tesina:** este reporte resume los cambios hechos al sistema *Safe Stock CETI*, el sistema web de préstamo de material y casilleros inteligentes del almacén de Ingeniería Mecatrónica del CETI. Cada sección dice **qué cambió**, **por qué** y **cómo funciona técnicamente**, para incorporarlo a los capítulos de desarrollo, arquitectura, seguridad y resultados. Al final hay una lista de limitaciones y trabajo pendiente.

## 0. Contexto técnico del sistema

- **Frontend:** React 19 + Vite 8 + Tailwind CSS 4, framer-motion, React Router 7.
- **Backend:** Node.js + Express 5 (`backend/server.js`).
- **Base de datos:** MySQL en la nube (TiDB) con el driver `mysql2`.
- **Nuevas dependencias del backend:** `nodemailer` (correo) y `qrcode` (generación de QR en el servidor).
- **Hardware previsto para los casilleros:** escáner de códigos **GM60** conectado a un microcontrolador (ESP32 o similar).

---

## 1. Infraestructura y estabilidad

### 1.1 Comunicación frontend–backend (proxy)
- **Problema:** el frontend llamaba a `http://localhost:5000`. Al abrir la página desde otro equipo o desde un entorno en la nube (GitHub Codespaces), el navegador buscaba el servidor en la computadora del usuario y el inicio de sesión fallaba con "Error de conexión".
- **Solución:** se configuró un **proxy en Vite** (`/backend/*` → `localhost:5000`). Las 22 llamadas del frontend usan ahora rutas relativas `/backend/...`. Funciona igual en local y en la nube, sin exponer el puerto del servidor.

### 1.2 Reconexión automática a la base de datos
- **Problema:** la base de datos en la nube cierra las conexiones inactivas. El servidor usaba una sola conexión que nunca se reabría, así que después de un tiempo todas las peticiones se quedaban colgadas.
- **Solución (`backend/db.js`):** *keep-alive* de TCP, un `ping` cada 60 segundos y **reconexión automática** cuando la conexión se pierde. El resto del código no cambió.

### 1.3 Manejo de cuentas sin contraseña
- Hay cuentas antiguas con `Password = NULL`. Al intentar entrar con ellas, la verificación con bcrypt fallaba y se mostraba un error genérico. Ahora se responde un mensaje claro y se muestra el mensaje real del servidor en lugar de "Error de conexión".

---

## 2. Experiencia del alumno

### 2.1 Notificación al agregar al carrito
- Componente global de **notificaciones emergentes** (*toast*), en `components/Toast.jsx` y `components/notificaciones.js`. Al agregar material aparece "Se agregó 1 × Osciloscopio al carrito".
- Si no hay existencias suficientes aparece un aviso de error en lugar del `alert()` del navegador.
- Se corrigió que, desde la página de detalle, se podían pedir más unidades de las disponibles.

### 2.2 Inicio: "Más solicitados" en lugar de "Recién agregados"
- Antes la sección de inicio mostraba 4 materiales escritos a mano. Ahora muestra los **4 materiales más solicitados** según la base de datos.
- Nuevo endpoint `GET /api/materiales-populares`: cuenta en cuántos pedidos aparece cada material, sin contar los rechazados, cancelados ni expirados. Si hay pocos pedidos, completa la lista con el catálogo.

### 2.3 Mis pedidos: estados reales en lugar de línea de tiempo
- Se **eliminó la línea de tiempo** (Solicitado → Aceptado → En preparación → En casillero → Devuelto → Cerrado). Tenía etapas que el administrador no controla y que no existen en la base de datos.
- Ahora cada pedido muestra una tarjeta con su **estado real**:

| Estado | Qué lo provoca | Qué ve el alumno |
|---|---|---|
| Solicitado | El alumno envía la solicitud | "Esperando revisión" |
| Aprobado | El administrador acepta y asigna casillero | Botón "Ver código QR y vale" |
| Rechazado | El administrador rechaza | El **motivo del rechazo**; no se genera vale |
| Devuelto | El administrador libera el casillero | "Préstamo concluido" |

### 2.4 Detalle del pedido conectado a datos reales
- Antes la página del vale tenía datos inventados ("Casillero 07", 9 casilleros ficticios, un solicitante de ejemplo). Ahora consulta `GET /api/pedidos/:id` y muestra el solicitante, la fecha y el horario, los materiales y **el casillero que asignó el administrador**.
- El mapa de casilleros muestra los **4 casilleros reales** con su estado (Libre, Ocupado, Mantenimiento, **Tu pedido**).
- **Pedido rechazado:** muestra el motivo y no genera QR, vale ni PDF.
- **Pedido pendiente:** muestra "Esperando aprobación".
- Se corrigieron "Invalid Date" y el horario cortado. La fecha y la hora se guardan como texto en la BD y ahora se muestran tal cual.

---

## 3. Correo electrónico

### 3.1 Servicio de correo (`backend/mailer.js`)
- Se implementó con **Nodemailer** sobre SMTP de Gmail, con la cuenta del proyecto. Se autentica con una **contraseña de aplicación**, porque Google ya no acepta la contraseña normal en programas.
- Todos los correos llegan con el remitente **"Safe Stock CETI"**. El asunto empieza con "Safe Stock CETI ·" y el encabezado HTML lleva el **logo institucional incrustado** (como imagen adjunta en línea, CID).
- Si un correo falla, la operación principal (registro, pedido, etc.) **no se interrumpe**.

### 3.2 Correos automáticos

| Evento | Destinatarios | Contenido |
|---|---|---|
| Registro de cuenta | Alumno | Bienvenida |
| Pedido enviado | Todos los integrantes del equipo | Folio, fecha, horario, propósito y materiales |
| Pedido **aprobado** | Todos los integrantes | Casillero asignado, horario, materiales y **QR cifrado incrustado** |
| Pedido **rechazado** | Todos los integrantes | **Motivo del rechazo** |
| Recuperar contraseña | Usuario | Código de 6 dígitos |
| "Mandar al correo" (botón) | El integrante que lo pide | Pase de acceso con QR cifrado |

### 3.3 Registro con correo institucional
- El registro acepta **solo correos `@ceti.mx`**. La validación se hace en el servidor.

---

## 4. Recuperación de contraseña ("¿Olvidaste tu contraseña?")

- Antes era un botón sin funcionalidad. Ahora es una ventana en dos pasos:
  1. El usuario escribe su correo y recibe un **código de 6 dígitos**.
  2. Escribe el código y la nueva contraseña.
- Funciona para **alumnos y administradores**.
- **Seguridad:**
  - El código se genera con `crypto.randomInt` y se guarda solo como **hash SHA-256**.
  - Vence en **15 minutos** y permite **5 intentos**.
  - Hay que esperar 1 minuto antes de pedir otro código.
  - La nueva contraseña se guarda con **bcrypt**.
- Endpoints: `POST /api/recuperar/solicitar` y `POST /api/recuperar/confirmar`.

---

## 5. Sesión y control de acceso

- **Módulo central de sesión** (`frontend/src/auth/sesion.js`). Guarda el usuario, el rol y la **hora de la última actividad**.
- **Recargar la página ya no cierra la sesión.**
- **Cierre automático tras 2 minutos sin actividad.** Cuenta el ratón, el teclado, el toque y el scroll. Funciona aunque la pestaña haya estado cerrada y se sincroniza entre pestañas. Antes eran 5 minutos y solo para alumnos.
- **Rutas protegidas** (`components/RutaProtegida.jsx`):
  - Sin sesión, la página manda al login.
  - Un alumno no puede abrir páginas de administrador ni al revés.
  - Con sesión activa, el login lleva directo al inicio de cada rol.

---

## 6. Casilleros (lógica del administrador)

- **Regla de negocio nueva:** *un casillero = un pedido activo*. Al aprobar un pedido, el servidor verifica dentro de una **transacción con bloqueo de fila** (`SELECT ... FOR UPDATE`) que:
  - el casillero exista y esté **libre**;
  - el pedido siga **pendiente**.
- Antes podían quedar varios pedidos en el mismo casillero. Se encontró la Celda 03 con 3 pedidos aprobados a la vez; se corrigió dejando el más reciente y **devolviendo al inventario** el material descontado de los otros dos.
- El cambio manual de estado solo permite **Libre o Mantenimiento**, y nunca sobre un casillero ocupado; primero hay que liberarlo.
- Las pantallas usan el nombre real de cada celda (`Identificador`).

---

## 7. Motivo de rechazo

- **Cambio en la base de datos:** `ALTER TABLE pedido ADD COLUMN Motivo_Rechazo VARCHAR(500) NULL;` (documentado en `backend/sql/motivo_rechazo.sql`).
- El administrador ya escribía un motivo al rechazar, pero no se guardaba. Ahora:
  - es obligatorio;
  - se guarda en la base de datos;
  - se muestra al alumno;
  - se le envía por correo.
- Solo se pueden rechazar pedidos pendientes.

---

## 8. Código QR cifrado y escáner GM60

### 8.1 Cifrado (`backend/qrSeguro.js`)
- **Antes:** el QR contenía texto legible (`CETI-SAFESTOCK-LOCKER07-FOLIO:...`) y se generaba en el navegador, así que cualquiera podía leerlo o falsificarlo.
- **Ahora:** el **servidor** genera el QR con cifrado autenticado **AES-256-GCM**:
  - La clave (`QR_SECRET`) solo existe en el servidor.
  - El contenido cifrado es: número de casillero (1 byte) + fecha de emisión (4 bytes) + folio del pedido.
  - El QR es `SSC2` + vector de inicialización (12 bytes) + etiqueta de autenticación (16 bytes) + datos cifrados, codificado en **Base32**.
- **Propiedades:**
  - **Confidencialidad:** una app de QR común solo ve texto ilegible.
  - **Integridad y autenticidad:** si se cambia un solo carácter, la etiqueta GCM ya no coincide y el código se rechaza. No es posible fabricar un QR válido sin la clave.
  - **Revocación por estado:** aunque el QR sea auténtico, solo abre si el pedido sigue **Aprobado** en ese casillero. Al liberar el casillero, el QR deja de funcionar.
- El QR solo se entrega a **integrantes del pedido** y solo si el pedido está aprobado con casillero (`GET /api/pedidos/:id/qr`).

### 8.2 Optimización para el escáner GM60
- El código se compactó de 103 a **78 caracteres**, usando solo **mayúsculas y números** (Base32). Esto permite el **modo alfanumérico** del QR y baja de la **versión 6 (41×41) a la versión 4 (33×33)**. Los módulos quedan más grandes y se leen mejor desde la pantalla de un celular.
- Evitar signos de puntuación hace que el código llegue igual cuando el GM60 funciona como **teclado USB (HID)**, sin importar la distribución del teclado. El servidor tolera minúsculas (Bloq Mayús) y el salto de línea final que agrega el escáner.
- La imagen se genera en **negro puro sobre blanco**, con **zona de silencio de 4 módulos** y **corrección de errores nivel M**.
- Se probó de punta a punta: se generó el QR, se decodificó la imagen con un lector automático y el servidor respondió `OK 3`.

### 8.3 Integración con el casillero físico
- Endpoint `GET/POST /api/qr/verificar` con dos modos:
  - **JSON**, para el panel del administrador.
  - **Texto plano** (`?formato=texto`), para el microcontrolador: responde `OK <n>` (abrir la puerta *n*) o `NO <motivo>` (`CODIGO_INVALIDO`, `PEDIDO_INACTIVO`, `OTRO_CASILLERO`, etc.). El parámetro opcional `&casillero=n` hace que cada puerta solo acepte códigos de su propio casillero.
- Nueva pantalla de administrador **"Verificar QR"**: funciona con un lector USB (o pegando el código) y muestra si el código es auténtico, de quién es, qué casillero abre y qué materiales contiene.
- La guía técnica para programar el casillero está en `backend/CASILLERO_GM60.md`. Incluye la configuración recomendada del GM60 (UART 9600 8N1, solo QR, sufijo CR/LF) y la tabla de respuestas.

### 8.4 Flujo completo resultante
1. El alumno arma su carrito y envía la solicitud → estado **Solicitado** → correo de confirmación al equipo.
2. El administrador:
   - **acepta**, asignando un casillero libre → se descuenta el inventario → estado **Aprobado** → correo con el **QR cifrado**; o
   - **rechaza**, escribiendo el motivo → estado **Rechazado** → correo con el **motivo**.
3. El alumno presenta el QR en el **GM60** → el microcontrolador consulta al servidor → `OK n` → se abre la puerta *n*.
4. Al regresar el material, el administrador **libera el casillero** → el material vuelve al inventario → estado **Devuelto** → el QR deja de ser válido.

---

## 9. Identidad visual

- Se incorporó el **logo institucional** (circular azul y naranja), sin fondo, en:
  - la barra de navegación del alumno y del administrador;
  - el login y el registro;
  - el encabezado de inicio del alumno y del panel de administrador;
  - el ícono de la pestaña (favicon), con el título "Safe Stock CETI";
  - el vale de acceso imprimible;
  - el **reporte PDF de estadísticas**;
  - todos los **correos**.
- Componente reutilizable `components/Logo.jsx`.

---

## 10. Estadísticas y reporte ejecutivo (administrador)

- Al entrar a Estadísticas se muestran directamente las del **mes en curso**; antes mostraba el mes anterior.
- **Reporte PDF ejecutivo** (`utils/reportePDF.js`, jsPDF):
  - Encabezado rediseñado para que no se encimen los textos: logo, título "Reporte Ejecutivo de Almacén", subtítulo "Safe Stock CETI · División de Ingeniería Mecatrónica" y una franja con el periodo y la fecha de emisión.
  - En las tarjetas de indicadores, los textos largos reducen su tamaño de letra para caber completos antes de recortarse.
  - Logo en el encabezado de cada página interior.
  - El logo se comprime y se reutiliza en cada página: el PDF bajó de ~1 MB a ~110 KB.

---

## 11. Seguridad y configuración

- Se detectó que `backend/.env`, con las credenciales de la base de datos, estaba **versionado en un repositorio público de GitHub**. Se agregó a `.gitignore` y se dejó de rastrear.
- Variables nuevas en `backend/.env` (no se suben al repositorio):
  - `SMTP_USER` y `SMTP_PASS`: cuenta de correo del sistema.
  - `QR_SECRET`: clave de cifrado de los QR. Si se pierde o se cambia, todos los QR emitidos dejan de funcionar.

---

## 12. Archivos nuevos principales

| Archivo | Propósito |
|---|---|
| `backend/mailer.js` | Plantillas y envío de todos los correos |
| `backend/qrSeguro.js` | Cifrado y descifrado de QR (AES-256-GCM, Base32) y generación de la imagen |
| `backend/CASILLERO_GM60.md` | Guía de integración del escáner GM60 |
| `backend/sql/motivo_rechazo.sql` | Migración: columna `Motivo_Rechazo` |
| `frontend/src/auth/sesion.js` | Manejo central de la sesión e inactividad |
| `frontend/src/components/RutaProtegida.jsx` | Control de acceso por rol |
| `frontend/src/components/RecuperarPassword.jsx` | Ventana de recuperación de contraseña |
| `frontend/src/components/Toast.jsx`, `notificaciones.js` | Notificaciones emergentes |
| `frontend/src/components/Logo.jsx` | Logo reutilizable |
| `frontend/src/pages/VerificarQR.jsx` | Verificación de QR por el administrador |

## 13. Nuevos endpoints del backend

| Método y ruta | Uso |
|---|---|
| `GET /api/materiales-populares` | Materiales más solicitados (inicio) |
| `GET /api/pedidos/:id` | Detalle real de un pedido |
| `GET /api/pedidos/:id/qr?matricula=` | QR cifrado (solo integrantes, solo si está aprobado) |
| `POST /api/pedidos/:id/enviar-pase` | Envía el pase con QR al correo |
| `GET/POST /api/qr/verificar` | Verificación del QR (JSON o texto para el casillero) |
| `POST /api/recuperar/solicitar` | Enviar código de recuperación |
| `POST /api/recuperar/confirmar` | Cambiar contraseña con el código |

Endpoints modificados:
- `POST /registro`: solo `@ceti.mx`, correo de bienvenida.
- `POST /api/pedidos`: correo al equipo.
- `PUT /api/admin/pedidos/:id/aprobar`: valida casillero libre y pedido pendiente; envía correo con QR.
- `PUT /api/admin/pedidos/:id/rechazar`: guarda el motivo; envía correo.
- `PUT /api/admin/casilleros/:id/estado`: solo Libre o Mantenimiento, nunca sobre un ocupado.

---

## 14. Limitaciones y trabajo pendiente (útil para "Trabajo futuro")

1. **Programar el microcontrolador del casillero** (ESP32 + GM60 + relevadores) para que consulte `/api/qr/verificar?formato=texto` y abra la puerta. El servidor ya está listo.
2. **Autenticación de la API:** *resuelto en la sesión del 16 de noviembre (secciones 16 y 17).* Hasta el 14 de noviembre el servidor no usaba tokens de sesión, las rutas confiaban en los datos que enviaba el frontend y el endpoint del casillero no pedía clave.
3. Los **códigos de recuperación** viven en memoria: se pierden si el servidor se reinicia (el usuario solo pide otro).
4. Las **fechas y horas** de los pedidos se guardan como texto (`VARCHAR`), no como `DATE`/`TIME`. Esto limita los cálculos y ordenamientos por fecha.
5. Las **credenciales de la base de datos** quedaron expuestas en el historial público de GitHub. Hay que cambiarlas.
6. Conviene configurar la cuenta de correo del sistema con su propio dominio o un servicio de envío para que los correos no caigan en spam.

---
---

# Segunda parte: sesión del 16 de noviembre de 2026 (semestres y seguridad)

> Las secciones 1 a 14 describen la sesión del 14 de noviembre. Esta parte describe dos cambios posteriores: el **manejo de semestres por ciclo escolar** y el **endurecimiento de seguridad** del sistema. Donde esta parte contradice a la primera (por ejemplo, las rutas de login y registro), vale esta.

## 15. Semestres de 1° a 8° y actualización por ciclo escolar

### 15.1 Problema
- El registro solo ofrecía 1°, 3°, 5°, 7° y 9° semestre.
- El semestre se capturaba una sola vez al registrarse y nunca cambiaba, así que las estadísticas por semestre se volvían incorrectas con el tiempo.

### 15.2 Solución
- El catálogo `semestre` va ahora de **1° a 8°**, y el ID coincide con el número de semestre.
- Se definieron dos **ciclos escolares** por año (`backend/semestres.js`):
  - **A:** febrero a julio.
  - **B:** agosto a enero del año siguiente.
- Nueva columna `alumno.Ciclo_Semestre` (por ejemplo `2026-B`): guarda en qué ciclo confirmó el alumno su semestre.
- **Actualización semiautomática:** en el primer inicio de sesión de cada ciclo aparece una ventana obligatoria, "Confirma tus datos" (`components/ActualizarCiclo.jsx`):
  - El sistema ya trae seleccionado el semestre que corresponde: el guardado **+ 1 por cada ciclo transcurrido**, con tope en 8°.
  - El alumno lo confirma con un clic, o lo corrige si repite el semestre o estuvo de baja temporal.
  - También puede actualizar su teléfono.
- Solo se puede confirmar **una vez por ciclo**; el servidor rechaza un segundo intento.

### 15.3 Por qué no es totalmente automático
Sumar un semestre cada 6 meses sin preguntar daría datos falsos para quienes repiten o se dan de baja temporal. Pedir el dato completo cada ciclo sería molesto. La propuesta precargada combina ambas ideas: es automática para la mayoría y corregible para las excepciones.

### 15.4 Migración de datos
- Script `backend/scripts/migrar.js` (se ejecuta con `npm run migrar`; se puede correr varias veces sin dañar nada):
  - Crea los semestres 1 a 8.
  - Reubica a cada alumno según el **número** de su semestre anterior (por ejemplo, quien estaba en "5° Semestre" queda en el ID 5; quien estaba en 9° pasa a 8°).
  - Elimina los semestres fuera de 1 a 8.
- Los alumnos ya registrados quedan con `Ciclo_Semestre` vacío, por lo que verán la ventana de confirmación la próxima vez que entren.

---

## 16. Autenticación y control de acceso en el servidor

### 16.1 Problema
- El backend **no verificaba la identidad de nadie**. El control de acceso existía solo en el navegador (`RutaProtegida.jsx`), así que cualquier persona podía llamar directamente a las rutas de administrador (borrar usuarios, aprobar pedidos, editar inventario) sin iniciar sesión.
- El login devolvía la fila completa del usuario, **incluido el hash de la contraseña**, y el navegador la guardaba en `localStorage`.

### 16.2 Sesión con token firmado (JWT) en cookie
- Al iniciar sesión, el servidor firma un **JWT** (algoritmo HS256, clave `JWT_SECRET`) con la matrícula o correo, el rol y el nombre.
- El token viaja en una **cookie** con tres protecciones:
  - `httpOnly`: JavaScript no puede leerla, así que un script malicioso (XSS) no puede robarla.
  - `sameSite=strict`: otros sitios no pueden hacer peticiones a nombre del usuario (CSRF).
  - `secure`: solo viaja por HTTPS cuando el sitio se sirve por HTTPS.
- Dura **30 minutos** y se renueva sola mientras el usuario siga activo. El cierre por 2 minutos de inactividad del navegador (sección 5) se conserva y ahora también borra la cookie en el servidor (`POST /api/logout`).
- Lo que queda en `localStorage` (nombre y rol) solo sirve para pintar la interfaz. Aunque alguien lo edite a mano, el servidor no le concede permisos.

### 16.3 Roles
- **Todo `/api/admin/*` exige rol de administrador** con una sola regla global, de modo que una ruta nueva de administrador queda protegida aunque se olvide ponerle el candado.
- Las rutas del alumno exigen sesión de alumno. Solo el login, el registro y la recuperación de contraseña funcionan sin sesión: **ninguna tabla es de acceso público**.

### 16.4 Acceso por fila (equivalente a RLS)
- TiDB/MySQL **no tiene Row Level Security nativo** (es una función de PostgreSQL). La regla equivalente se aplica en el servidor:
  - La matrícula se toma **siempre de la sesión**, nunca de lo que envía el navegador.
  - "Mis pedidos" solo devuelve los pedidos del alumno con sesión.
  - El detalle, el QR y el pase de un pedido solo se entregan a sus **integrantes** (o al administrador, en el caso del detalle). A un extraño se le responde "Pedido no encontrado", para que no pueda averiguar qué folios existen.
  - El buscador de compañeros ya no devuelve correos, solo nombre y matrícula.

### 16.5 Respuestas que no revelan información
- El login responde lo mismo ("Correo o contraseña incorrectos") si el correo no existe o si la contraseña está mal, y tarda lo mismo en ambos casos.
- La recuperación de contraseña responde lo mismo exista o no la cuenta.
- El hash de la contraseña ya no sale del servidor en ninguna respuesta.

### 16.6 Sesión vencida en el navegador
- `frontend/src/auth/guardian.js` vigila todas las respuestas del servidor. Ante un **401** limpia la sesión local y regresa al login con el aviso "Tu sesión expiró".

---

## 17. Protección contra abuso y ataques

### 17.1 Límite de peticiones (rate limiting)
Con sesión el límite se cuenta **por usuario**; sin sesión, **por IP**. Los umbrales son amplios porque toda la escuela puede salir a internet con la misma IP.

| Límite | Máximo | Ventana |
|---|---|---|
| General | 400 peticiones | 5 minutos |
| Inicio de sesión | 30 intentos por IP | 15 minutos |
| Registro de cuentas | 15 por IP | 1 hora |
| Recuperación de contraseña | 15 por IP | 1 hora |
| Envío de pedidos | 15 por alumno | 1 hora |
| Envío de pase por correo | 10 por alumno | 1 hora |
| Verificación de QR | 60 | 1 minuto |

### 17.2 Bloqueos automáticos
- **Por cuenta:** 5 contraseñas incorrectas seguidas bloquean la cuenta **15 minutos**. Recuperar la contraseña la desbloquea.
- **Por IP:** cada evento sospechoso (contraseña incorrecta, token falsificado, acceso negado, ruta inexistente, QR falso, datos inválidos) suma puntos a la IP. Con **40 puntos en 10 minutos** la IP queda bloqueada **10 minutos**.
- Estos contadores viven en memoria: se reinician si el servidor se reinicia.

### 17.3 API key del casillero
- El microcontrolador no inicia sesión: se identifica con una clave secreta (`CASILLERO_API_KEY`) en el encabezado HTTP `X-API-Key`. La comparación se hace en tiempo constante.
- `/api/qr/verificar` solo responde a un **administrador con sesión** o a un dispositivo con la **clave correcta**. A cualquier otro le contesta `NO NO_AUTORIZADO`.
- `backend/CASILLERO_GM60.md` incluye el ejemplo para ESP32.

### 17.4 Validación de entradas (`backend/validacion.js`)
- Todas las entradas (formularios, parámetros de la URL, consultas) se validan en el servidor con la librería **zod** antes de tocar la base de datos. Los campos que no se esperan se descartan.
- Reglas principales:
  - Tipos estrictos: un campo de texto no acepta objetos ni arreglos. Esto cierra una variante de inyección propia del driver de MySQL.
  - Longitud máxima en cada campo.
  - Se rechazan los caracteres de control y los signos `<` y `>` (intentos de insertar HTML o scripts).
  - Matrícula: solo letras, números y guion. Nombre: solo letras y espacios.
  - Semestre: entero de 1 a 8.
  - **Contraseñas nuevas:** de 8 a 72 caracteres, con al menos una letra y un número (antes el mínimo era 6).
- Todas las consultas SQL siguen usando **parámetros**, nunca texto concatenado.
- En el buscador de alumnos se escapan los comodines `%` y `_`, para que no se pueda listar a todos los alumnos.

### 17.5 Subida de imágenes del inventario
- **Antes:** el archivo se guardaba en disco con un nombre tomado del formulario sin validar, lo que permitía escribir fuera de la carpeta de imágenes (*path traversal*), y se aceptaba cualquier tipo de archivo.
- **Ahora:**
  - El archivo se recibe en memoria y solo se guarda después de validar el formulario.
  - El nombre se forma con el ID del material ya validado como número entero.
  - Solo JPG, PNG o WEBP, máximo **3 MB**.
  - Se revisan los **primeros bytes** del archivo para confirmar que es una imagen real; no basta la extensión.

### 17.6 Otras capas
- **helmet:** encabezados HTTP de seguridad.
- **CORS cerrado por defecto:** ningún otro sitio puede llamar a la API desde un navegador, salvo los que se indiquen en `CORS_ORIGENES`.
- Cuerpo JSON limitado a **100 KB**.
- Tiempos límite de conexión contra peticiones lentas intencionales.
- Las contraseñas se cifran con **bcrypt de 12 rondas** (antes 10).

---

## 18. Bitácora de seguridad y manejo de errores

### 18.1 Bitácora (`backend/bitacora.js`)
- Cada evento relevante se guarda en la tabla **`bitacora_seguridad`** y, como respaldo, en `backend/logs/seguridad.log`.
- Datos de cada evento: fecha, nivel, tipo de evento, IP, usuario, rol, método, ruta y detalle.
- Tres niveles:

| Nivel | Ejemplos |
|---|---|
| Normal (`info`) | Inicio de sesión correcto, pedido creado, pedido aprobado o rechazado, acceso autorizado con QR, datos inválidos en un formulario |
| Alerta (`alerta`) | Contraseña incorrecta, acceso negado por rol, intento de abrir un pedido ajeno, token falsificado, QR falso, ruta inexistente, límite de peticiones rebasado, usuario o material eliminado |
| Crítico (`critico`) | Cuenta bloqueada, IP bloqueada, error interno del servidor |

- **Nunca** se guardan contraseñas, códigos de recuperación, tokens ni el contenido de los QR.
- Nueva pantalla de administrador **"Bitácora de seguridad"** (`pages/BitacoraAdmin.jsx`): resumen de las últimas 24 horas por nivel, filtro por nivel y los 200 eventos más recientes.

### 18.2 Errores útiles sin exponer datos internos
- **Antes:** varias rutas devolvían al usuario el mensaje de error de MySQL, con nombres de tablas y columnas.
- **Ahora** hay un manejador central de errores:
  - Los errores previsibles devuelven un mensaje claro en español ("Solo hay 2 unidades disponibles de Multímetro", "Ese casillero ya no está libre").
  - Los errores inesperados devuelven un mensaje genérico con un **código de referencia** (por ejemplo `A40F7BEC`). El detalle técnico completo queda solo en el servidor, ligado a ese código, y en la bitácora como evento crítico.

---

## 19. Configuración, integridad de datos y archivos

### 19.1 Variables de entorno
- `backend/config.js` valida la configuración al arrancar: si falta una variable obligatoria o un secreto es demasiado corto, **el servidor no inicia** y dice cuál falta.
- `backend/.env.example` es la plantilla (sin secretos) y sí se sube al repositorio.
- Variables nuevas:
  - `JWT_SECRET`: firma de las sesiones (mínimo 32 caracteres).
  - `CASILLERO_API_KEY`: clave del casillero (mínimo 24 caracteres).
  - Opcionales: `CORS_ORIGENES`, `NODE_ENV`, `PORT`, `DB_SSL`.
- `npm run claves` genera un secreto aleatorio.
- Se agregó un `.gitignore` en la raíz del proyecto que excluye `.env`, `logs/` y `node_modules/`.

### 19.2 Integridad de los datos
- **Conexiones a la base de datos:** se cambió la conexión única por un **grupo de conexiones** (`backend/db.js`). Cada transacción usa su propia conexión; antes, dos peticiones simultáneas podían mezclarse dentro de la misma transacción.
- **Folio del pedido:** lo genera el servidor (`PED-AAAA-######`); antes lo inventaba el navegador.
- **Alta de pedido en una sola transacción:** verifica que los integrantes existan, que no tengan otro pedido ese día y que haya existencias suficientes.
- **Inventario nunca negativo:** si al aprobar ya no alcanzan las existencias, se deshace toda la aprobación.
- **Reporte de fallas:** el nombre de quien reporta se toma de la sesión, no del formulario.
- El listado de pedidos del administrador ya no muestra "Invalid Date" cuando la fecha está guardada como texto.

### 19.3 Dependencias nuevas del backend
`helmet`, `express-rate-limit`, `jsonwebtoken`, `cookie-parser` y `zod`.

### 19.4 Archivos nuevos

| Archivo | Propósito |
|---|---|
| `backend/config.js` | Carga y validación de las variables de entorno |
| `backend/seguridad.js` | Sesiones, roles, límites de peticiones, bloqueos y API key |
| `backend/validacion.js` | Reglas de validación de todas las entradas |
| `backend/bitacora.js` | Registro de eventos de seguridad |
| `backend/semestres.js` | Cálculo del ciclo escolar y del semestre sugerido |
| `backend/scripts/migrar.js` | Migración de la base de datos |
| `backend/sql/seguridad_y_semestres.sql` | Documentación en SQL de esa migración |
| `backend/.env.example` | Plantilla de configuración |
| `frontend/src/auth/guardian.js` | Regreso al login cuando el servidor responde 401 |
| `frontend/src/components/ActualizarCiclo.jsx` | Ventana de confirmación de semestre por ciclo |
| `frontend/src/pages/BitacoraAdmin.jsx` | Pantalla de la bitácora de seguridad |

`backend/server.js` y `backend/db.js` se reescribieron.

### 19.5 Endpoints nuevos y modificados

| Método y ruta | Cambio |
|---|---|
| `POST /api/login` | Sustituye a `POST /`. Crea la cookie de sesión. |
| `POST /api/logout` | Nuevo. Borra la cookie de sesión. |
| `POST /api/registro` | Sustituye a `POST /registro`. Recibe `semestre` como número de 1 a 8. |
| `PUT /api/mi-perfil/ciclo` | Nuevo. Confirmación de semestre y teléfono, una vez por ciclo. |
| `GET /api/mis-pedidos` | Sustituye a `/api/mis-pedidos/:matricula`. La matrícula sale de la sesión. |
| `GET /api/pedidos/:id/qr` | Ya no recibe `?matricula=`. |
| `GET/POST /api/qr/verificar` | Exige sesión de administrador o `X-API-Key`. Respuestas nuevas: `NO NO_AUTORIZADO` y `NO DEMASIADAS_PETICIONES`. |
| `GET /api/admin/bitacora` | Nuevo. Eventos de seguridad (`?nivel=` y `?limite=`). |

---

## 20. Pruebas realizadas y pendientes

### 20.1 Cómo se probó
- Las pruebas se hicieron contra una **base de datos MySQL 8.4 local** con un esquema equivalente, **no contra la base real en TiDB**. El envío de correos **no** se probó (sin SMTP configurado).
- Pruebas automatizadas de la API (con `curl`) y de la interfaz en un **navegador real** (Chromium controlado con Playwright).

| Prueba | Resultado |
|---|---|
| Llamar a rutas protegidas sin sesión | 401 |
| Alumno llamando a rutas de administrador | 403, anotado en la bitácora |
| Alumno que cambia su rol a "admin" en `localStorage` | La pantalla abre, pero el servidor responde 403 y no entrega datos |
| Alumno pidiendo el detalle o el QR de un pedido ajeno | 404 "Pedido no encontrado" |
| Token de sesión falsificado (sin firma) | Rechazado, anotado como alerta |
| Login con el correo enviado como objeto (intento de inyección) | 400 |
| 5 contraseñas incorrectas | Cuenta bloqueada (429), incluso con la contraseña correcta |
| Más de 30 intentos de login | 429 |
| Registro con nombre `<script>`, correo que no es `@ceti.mx` o contraseña débil | 400 con mensaje claro |
| Subir un archivo de texto renombrado a `.jpg` | Rechazado |
| ID de material `../../x` al subir imagen | Rechazado |
| QR sin API key, con clave incorrecta, falso, de otro casillero y después de liberar | `NO NO_AUTORIZADO`, `NO NO_AUTORIZADO`, `NO CODIGO_INVALIDO`, `NO OTRO_CASILLERO`, `NO PEDIDO_INACTIVO` |
| QR válido con API key | `OK 2` |
| Error interno provocado a propósito | Mensaje genérico con código; el detalle solo en el servidor |
| Cookie de sesión vista desde JavaScript | No es legible |
| Ventana de inicio de ciclo | Aparece una vez, propone el semestre y no reaparece tras confirmar |
| Migración ejecutada dos veces | La segunda no cambia nada |
| Flujo completo: pedido → aprobación → QR → liberación | Correcto; el inventario se descuenta y se restituye |

### 20.2 Pasos pendientes para poner en marcha
1. **Cambiar la contraseña de la base de datos** en TiDB: las credenciales anteriores siguen en el historial público de git.
2. Crear `backend/.env` a partir de `backend/.env.example`. Generar `JWT_SECRET` y `CASILLERO_API_KEY` con `npm run claves`. **Conservar el `QR_SECRET` anterior** para que los QR ya enviados sigan funcionando.
3. Ejecutar `npm run migrar` en `backend/` y revisar lo que imprime. El esquema real se dedujo de las consultas del código, así que esta es la primera ejecución contra la base real.
4. Grabar `CASILLERO_API_KEY` en el firmware del ESP32 y enviar el encabezado `X-API-Key`.

### 20.3 Limitaciones y trabajo futuro
1. La respuesta `NO DEMASIADAS_PETICIONES` del casillero se agregó al final y solo se revisó su sintaxis.
2. Los bloqueos de cuenta y de IP, y los códigos de recuperación, viven en memoria: se pierden al reiniciar el servidor y no se comparten si hubiera más de un servidor.
3. Al cambiar la contraseña no se cierran las sesiones ya abiertas; siguen válidas hasta 30 minutos.
4. El bloqueo de cuenta por 5 intentos permite que un tercero bloquee temporalmente la cuenta de otra persona. Se mitiga con el bloqueo por IP y con la recuperación de contraseña.
5. No hay pantalla para que el administrador corrija el semestre de un alumno que confirmó uno equivocado; habría que cambiarlo en la base de datos.
6. La aplicación debería conectarse con un **usuario de base de datos de permisos mínimos** (sin permiso para crear o borrar tablas), y TiDB debería restringir las IP que pueden conectarse.
7. El servidor definitivo debe servirse por **HTTPS** con `NODE_ENV=production`.
8. Mejoras posibles: segundo factor de autenticación para el administrador y correo de alerta ante eventos críticos.
9. `backend/node_modules` sigue versionado en git aunque está en `.gitignore`.

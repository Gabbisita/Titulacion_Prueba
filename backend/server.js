const config = require('./config'); // valida backend/.env antes que nada
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const { consultar, transaccion } = require('./db');
const { registrar } = require('./bitacora');
const { ErrorHttp, esquemas, leer } = require('./validacion');
const seg = require('./seguridad');
const { cicloActual, semestreSugerido } = require('./semestres');
const { correoBienvenida, correoPedido, correoRecuperacion, correoAprobado, correoRechazado, correoPase } = require('./mailer');
const { leerToken, qrDataUrl, qrBuffer } = require('./qrSeguro');

const app = express();

// El frontend llega por el proxy de Vite (misma máquina). Con esto req.ip es la IP
// real del visitante y no 127.0.0.1; solo se confía en proxies locales.
app.set('trust proxy', 'loopback');

// =======================================================
// CAPAS DE SEGURIDAD (se aplican a TODAS las peticiones, en este orden)
// =======================================================
app.use(helmet());                                   // encabezados HTTP seguros
if (config.corsOrigenes.length > 0) {                // por defecto ningún otro sitio puede llamar a la API
    app.use(cors({ origin: config.corsOrigenes, credentials: true }));
}
app.use(express.json({ limit: '100kb' }));           // cuerpos pequeños: evita saturar el servidor
app.use(cookieParser());
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(seg.filtroIP);                               // IP bloqueadas por actividad sospechosa
app.use(seg.identificar);                            // lee la cookie de sesión → req.usuario
app.use(seg.limites.general);                        // rate limiting general

const soloAlumno = seg.requiereRol('alumno');
const soloAdmin = seg.requiereRol('admin');

// Estado en memoria de las puertas físicas reportadas por el ESP32 secundario vía ESP32 principal
let estadoPuertas = {
    1: null,
    2: null,
    3: null,
    4: null,
    actualizadoEn: null,
};

// ESP32 Principal reporta el estado físico de las 4 puertas usando X-API-Key
app.post('/api/casilleros/puertas', (req, res, next) => {
    try {
        if (!seg.claveCasilleroValida(req)) {
            registrar('PUERTAS_SIN_AUTORIZACION', {
                req,
                nivel: 'alerta',
                detalle: req.get('x-api-key') ? 'API key incorrecta' : 'Sin API key',
            });
            seg.sospecha(req, 3);
            throw new ErrorHttp(401, 'No autorizado.');
        }

        const { puerta1, puerta2, puerta3, puerta4 } = req.body || {};
        estadoPuertas = {
            1: typeof puerta1 === 'boolean' ? puerta1 : estadoPuertas[1],
            2: typeof puerta2 === 'boolean' ? puerta2 : estadoPuertas[2],
            3: typeof puerta3 === 'boolean' ? puerta3 : estadoPuertas[3],
            4: typeof puerta4 === 'boolean' ? puerta4 : estadoPuertas[4],
            actualizadoEn: new Date().toISOString(),
        };

        res.json({ status: 'success', puertas: estadoPuertas });
    } catch (err) {
        next(err);
    }
});

// TODO lo que empiece con /api/admin exige sesión de administrador, sin excepción.
// Así una ruta nueva de administrador queda protegida aunque se olvide ponerle el candado.
app.use('/api/admin', soloAdmin);

const BCRYPT_RONDAS = 12;
// Se compara contra este hash cuando el correo no existe, para que la respuesta tarde
// lo mismo exista o no la cuenta (no se puede "adivinar" quién está registrado).
const HASH_SENUELO = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), BCRYPT_RONDAS);

const sinPassword = ({ Password, ...resto }) => resto;

// =======================================================
// SESIÓN: LOGIN, LOGOUT, REGISTRO
// =======================================================
app.post('/api/login', seg.limites.login, async (req, res) => {
    const { email, password } = leer(esquemas.login, req.body);

    if (seg.cuentaBloqueada(email)) {
        registrar('LOGIN_CUENTA_BLOQUEADA', { req, nivel: 'alerta', usuario: email });
        throw new ErrorHttp(429, 'Cuenta bloqueada temporalmente por demasiados intentos. Intenta en 15 minutos o usa "¿Olvidaste tu contraseña?".');
    }

    let rol = 'admin';
    let [cuenta] = await consultar('SELECT * FROM administrador WHERE Email = ? LIMIT 1', [email]);
    if (!cuenta) {
        rol = 'alumno';
        [cuenta] = await consultar('SELECT * FROM alumno WHERE Email = ? LIMIT 1', [email]);
    }

    const coincide = await bcrypt.compare(password, cuenta?.Password || HASH_SENUELO);
    if (!cuenta || !cuenta.Password || !coincide) {
        const bloqueada = seg.anotarFallo(email);
        registrar(bloqueada ? 'CUENTA_BLOQUEADA' : 'LOGIN_FALLIDO', {
            req, nivel: bloqueada ? 'critico' : 'alerta', usuario: email,
            detalle: bloqueada ? '5 contraseñas incorrectas seguidas' : '',
        });
        seg.sospecha(req);
        // Mismo mensaje si el correo no existe o si la contraseña está mal.
        throw new ErrorHttp(401, 'Correo o contraseña incorrectos. Si no recuerdas tu contraseña usa "¿Olvidaste tu contraseña?".');
    }

    seg.limpiarIntentos(email);
    const sub = rol === 'admin' ? cuenta.Email : cuenta.Registro_Alu;
    seg.abrirSesion(req, res, { sub, rol, nombre: cuenta.Nombre, email: cuenta.Email });
    registrar('LOGIN_OK', { req, usuario: sub, rol });

    const user = sinPassword(cuenta); // el hash de la contraseña nunca sale del servidor
    if (rol === 'alumno') {
        const actual = cicloActual();
        user.Ciclo_Actual = actual;
        user.Requiere_Actualizar = cuenta.Ciclo_Semestre !== actual;
        user.Semestre_Sugerido = semestreSugerido(cuenta.FK_Semestre, cuenta.Ciclo_Semestre, actual);
    }
    res.json({ status: 'success', role: rol, user });
});

app.post('/api/logout', (req, res) => {
    if (req.usuario) registrar('LOGOUT', { req });
    seg.cerrarSesion(req, res);
    res.json({ status: 'success' });
});

app.post('/api/registro', seg.limites.registro, async (req, res) => {
    const d = leer(esquemas.registro, req.body);
    const hash = await bcrypt.hash(d.password, BCRYPT_RONDAS);

    const [carrera] = await consultar('SELECT ID_Carrera FROM carrera WHERE Nombre_Carrera = ? LIMIT 1', [d.carrera_texto]);
    if (!carrera) throw new ErrorHttp(400, 'La carrera seleccionada no es válida.');

    try {
        await consultar(
            `INSERT INTO alumno (Nombre, Registro_Alu, Email, Password, Telefono, FK_Carrera, FK_Semestre, Ciclo_Semestre)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [d.nombre, d.registro_alu, d.email, hash, d.telefono, carrera.ID_Carrera, d.semestre, cicloActual()],
        );
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') throw new ErrorHttp(400, 'Este alumno o correo ya está registrado.');
        throw err;
    }
    registrar('REGISTRO', { req, usuario: d.registro_alu, rol: 'alumno' });
    res.status(201).json({ status: 'success', message: 'Cuenta creada con éxito' });
    correoBienvenida(d.email, d.nombre);
});

// =======================================================
// RECUPERAR CONTRASEÑA (código de 6 dígitos por correo)
// =======================================================
// Los códigos viven en memoria: vencen en 15 min y se pierden si el servidor se reinicia.
const codigosRecuperacion = new Map(); // email -> { hash, expira, intentos, tabla }
const QUINCE_MIN = 15 * 60 * 1000;
const hashCodigo = (codigo) => crypto.createHash('sha256').update(codigo).digest();

async function buscarCuenta(email) {
    const [admin] = await consultar('SELECT Nombre FROM administrador WHERE Email = ? LIMIT 1', [email]);
    if (admin) return { tabla: 'administrador', nombre: admin.Nombre };
    const [alumno] = await consultar('SELECT Nombre FROM alumno WHERE Email = ? LIMIT 1', [email]);
    return alumno ? { tabla: 'alumno', nombre: alumno.Nombre } : null;
}

app.post('/api/recuperar/solicitar', seg.limites.recuperar, async (req, res) => {
    const { email } = leer(esquemas.recuperarSolicitar, req.body);
    // La respuesta es la misma exista o no la cuenta: no revela quién está registrado.
    const respuesta = { status: 'success', message: 'Si el correo está registrado, te enviamos un código de 6 dígitos.' };

    const previo = codigosRecuperacion.get(email);
    if (previo && previo.expira - QUINCE_MIN + 60 * 1000 > Date.now()) {
        throw new ErrorHttp(429, 'Ya se solicitó un código hace un momento. Espera un minuto para pedir otro.');
    }

    const cuenta = await buscarCuenta(email);
    if (!cuenta) {
        registrar('RECUPERAR_CORREO_INEXISTENTE', { req, nivel: 'alerta', usuario: email });
        seg.sospecha(req);
        return res.json(respuesta);
    }

    const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    codigosRecuperacion.set(email, { hash: hashCodigo(codigo), expira: Date.now() + QUINCE_MIN, intentos: 0, tabla: cuenta.tabla });
    registrar('RECUPERAR_SOLICITADO', { req, usuario: email });

    const enviado = await correoRecuperacion(email, cuenta.nombre || '', codigo);
    if (!enviado) {
        codigosRecuperacion.delete(email);
        throw new ErrorHttp(503, 'No se pudo enviar el correo. Intenta más tarde.');
    }
    res.json(respuesta);
});

app.post('/api/recuperar/confirmar', seg.limites.recuperar, async (req, res) => {
    const { email, codigo, password } = leer(esquemas.recuperarConfirmar, req.body);
    const registro = codigosRecuperacion.get(email);

    if (!registro || registro.expira < Date.now()) {
        codigosRecuperacion.delete(email);
        throw new ErrorHttp(400, 'El código venció o no existe. Pide uno nuevo.');
    }
    if (registro.intentos >= 5) {
        codigosRecuperacion.delete(email);
        registrar('RECUPERAR_DEMASIADOS_INTENTOS', { req, nivel: 'critico', usuario: email });
        throw new ErrorHttp(429, 'Demasiados intentos. Pide un código nuevo.');
    }
    if (!crypto.timingSafeEqual(hashCodigo(codigo), registro.hash)) {
        registro.intentos++;
        registrar('RECUPERAR_CODIGO_INCORRECTO', { req, nivel: 'alerta', usuario: email });
        seg.sospecha(req);
        throw new ErrorHttp(400, 'El código es incorrecto.');
    }

    const hash = await bcrypt.hash(password, BCRYPT_RONDAS);
    // registro.tabla solo puede ser 'administrador' o 'alumno' (lo fija buscarCuenta)
    await consultar(`UPDATE ${registro.tabla} SET Password = ? WHERE Email = ?`, [hash, email]);
    codigosRecuperacion.delete(email);
    seg.limpiarIntentos(email);
    registrar('PASSWORD_CAMBIADA', { req, usuario: email });
    res.json({ status: 'success', message: '¡Listo! Ya puedes iniciar sesión con tu nueva contraseña.' });
});

// =======================================================
// PERFIL DEL ALUMNO: ACTUALIZACIÓN AL INICIO DE CADA CICLO
// =======================================================
// Una sola vez por ciclo (cada 6 meses) el alumno confirma su semestre y su teléfono.
app.put('/api/mi-perfil/ciclo', soloAlumno, async (req, res) => {
    const { semestre, telefono } = leer(esquemas.actualizarCiclo, req.body);
    const actual = cicloActual();
    const r = await consultar(
        `UPDATE alumno SET FK_Semestre = ?, Telefono = COALESCE(?, Telefono), Ciclo_Semestre = ?
         WHERE Registro_Alu = ? AND (Ciclo_Semestre IS NULL OR Ciclo_Semestre <> ?)`,
        [semestre, telefono || null, actual, req.usuario.sub, actual],
    );
    if (r.affectedRows === 0) {
        throw new ErrorHttp(409, 'Ya confirmaste tus datos en este ciclo. Si hay un error, acude con el administrador del almacén.');
    }
    registrar('PERFIL_CICLO_ACTUALIZADO', { req, detalle: `Semestre ${semestre}, ciclo ${actual}` });
    const [alumno] = await consultar('SELECT * FROM alumno WHERE Registro_Alu = ?', [req.usuario.sub]);
    res.json({
        status: 'success',
        message: 'Datos actualizados. ¡Buen inicio de ciclo!',
        user: { ...sinPassword(alumno), Ciclo_Actual: actual, Requiere_Actualizar: false, Semestre_Sugerido: semestre },
    });
});

// =======================================================
// CATÁLOGO (requiere sesión; ninguna tabla es pública)
// =======================================================
app.get('/api/materiales', seg.requiereSesion, async (req, res) => {
    res.json(await consultar('SELECT * FROM material'));
});

// --- MATERIALES MÁS SOLICITADOS (para la página de inicio) ---
app.get('/api/materiales-populares', seg.requiereSesion, async (req, res) => {
    const limite = Math.min(Math.max(parseInt(req.query.limite, 10) || 4, 1), 12);
    // Cuenta en cuántos pedidos aparece cada material (sin contar rechazados, cancelados ni expirados).
    // Si hay pocos pedidos, completa la lista con otros materiales del catálogo.
    res.json(await consultar(`
        SELECT m.ID_Material, m.Nombre, m.Cantidad, m.FK_No_Categoria,
               COUNT(DISTINCT p.ID_Pedido) AS Veces_Solicitado,
               COALESCE(SUM(CASE WHEN p.ID_Pedido IS NOT NULL THEN dp.Cantidad END), 0) AS Unidades_Solicitadas
        FROM material m
        LEFT JOIN detalle_pedido dp ON dp.FK_Material = m.ID_Material
        LEFT JOIN pedido p ON p.ID_Pedido = dp.FK_Pedido AND p.FK_Estado NOT IN (4, 6, 7)
        GROUP BY m.ID_Material, m.Nombre, m.Cantidad, m.FK_No_Categoria
        ORDER BY Veces_Solicitado DESC, Unidades_Solicitadas DESC, m.Nombre ASC
        LIMIT ?`, [limite]));
});

app.get('/api/materiales/:id', seg.requiereSesion, async (req, res) => {
    const id = leer(esquemas.idNumerico, req.params.id);
    const [material] = await consultar('SELECT * FROM material WHERE ID_Material = ?', [id]);
    if (!material) throw new ErrorHttp(404, 'Material no encontrado.');
    res.json(material);
});

app.get('/api/casilleros', seg.requiereSesion, async (req, res) => {
    res.json(await consultar('SELECT * FROM casillero'));
});

// --- BUSCADOR DE COMPAÑEROS (solo alumnos con sesión; no entrega correos ni teléfonos) ---
app.get('/api/alumnos/buscar', soloAlumno, async (req, res) => {
    if (String(req.query.q || '').trim().length < 2) return res.json([]);
    const q = leer(esquemas.busqueda, req.query.q);
    // Se escapan % y _ para que no funcionen como comodines y listen a todos los alumnos.
    const patron = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    res.json(await consultar(
        `SELECT Registro_Alu AS registro, Nombre AS nombre FROM alumno
         WHERE Nombre LIKE ? OR Registro_Alu LIKE ? LIMIT 10`, [patron, patron]));
});

// =======================================================
// PEDIDOS DEL ALUMNO
// =======================================================
// Regla de acceso por fila: un alumno solo puede ver y usar los pedidos en los que
// es integrante. La matrícula SIEMPRE se toma de la sesión, nunca de lo que mande el navegador.
const nuevoFolio = () => `PED-${new Date().getFullYear()}-${crypto.randomInt(100000, 1000000)}`;

app.post('/api/pedidos', soloAlumno, seg.limites.pedidos, async (req, res) => {
    const d = leer(esquemas.pedido, req.body);
    const solicitante = req.usuario.sub;
    const matriculas = [...new Set([solicitante, ...d.integrantes.map((i) => i.matricula)])];

    // Si un material viene repetido, se suman sus cantidades.
    const cantidades = new Map();
    d.materiales.forEach((m) => cantidades.set(m.id, (cantidades.get(m.id) || 0) + m.cantidad));
    const materiales = [...cantidades].map(([id, cantidad]) => ({ id, cantidad }));

    const idPedido = await transaccion(async (q) => {
        const alumnos = await q('SELECT Registro_Alu FROM alumno WHERE Registro_Alu IN (?)', [matriculas]);
        if (alumnos.length !== matriculas.length) throw new ErrorHttp(400, 'Uno de los integrantes no está registrado en SafeStock.');

        const duplicados = await q(`
            SELECT u.Nombre FROM equipo_pedido ep
            JOIN pedido p ON ep.FK_Pedido = p.ID_Pedido
            JOIN alumno u ON ep.FK_Matricula = u.Registro_Alu
            WHERE p.Fecha_Recogida = ? AND ep.FK_Matricula IN (?) AND p.FK_Estado IN (1, 2, 3)
            LIMIT 1`, [d.fecha_recogida, matriculas]);
        if (duplicados.length > 0) {
            throw new ErrorHttp(400, `${duplicados[0].Nombre} ya tiene una solicitud de material registrada para esta misma fecha.`);
        }

        const existentes = await q('SELECT ID_Material, Nombre, Cantidad FROM material WHERE ID_Material IN (?)', [materiales.map((m) => m.id)]);
        for (const m of materiales) {
            const enAlmacen = existentes.find((e) => Number(e.ID_Material) === m.id);
            if (!enAlmacen) throw new ErrorHttp(400, 'Uno de los materiales ya no existe en el inventario.');
            if (m.cantidad > enAlmacen.Cantidad) throw new ErrorHttp(400, `Solo hay ${enAlmacen.Cantidad} unidades disponibles de ${enAlmacen.Nombre}.`);
            m.nombre = enAlmacen.Nombre;
        }

        // El folio lo genera el servidor (antes lo inventaba el navegador).
        let folio;
        for (let intento = 0; ; intento++) {
            folio = nuevoFolio();
            try {
                await q(`INSERT INTO pedido (ID_Pedido, Fecha_Solicitud, Fecha_Recogida, Proposito, FK_Solicitante, FK_Estado, Hora_Recogida, Hora_Devolucion)
                         VALUES (?, NOW(), ?, ?, ?, 1, ?, ?)`,
                    [folio, d.fecha_recogida, d.proposito, solicitante, d.hora_recogida, d.hora_devolucion]);
                break;
            } catch (err) {
                if (err.code !== 'ER_DUP_ENTRY' || intento >= 4) throw err;
            }
        }
        await q('INSERT INTO equipo_pedido (FK_Pedido, FK_Matricula, Rol) VALUES ?',
            [matriculas.map((m) => [folio, m, m === solicitante ? 'Líder' : 'Colaborador'])]);
        await q('INSERT INTO detalle_pedido (FK_Pedido, FK_Material, Cantidad) VALUES ?',
            [materiales.map((m) => [folio, m.id, m.cantidad])]);
        return folio;
    });

    registrar('PEDIDO_CREADO', { req, detalle: idPedido });
    res.json({ status: 'success', message: 'Pedido de equipo procesado con éxito.', id_pedido: idPedido });

    // Correo de confirmación a cada integrante (no bloquea la respuesta).
    const pedido = {
        id: idPedido, fecha: d.fecha_recogida, horaRecogida: d.hora_recogida, horaDevolucion: d.hora_devolucion,
        proposito: d.proposito, materiales: materiales.map((m) => ({ nombre: m.nombre, cantidad: m.cantidad })),
    };
    consultar('SELECT Nombre, Email FROM alumno WHERE Registro_Alu IN (?)', [matriculas])
        .then((alumnos) => alumnos.forEach((a) => a.Email && correoPedido(a.Email, a.Nombre, pedido)))
        .catch((err) => console.error('No se pudieron obtener los correos del equipo:', err.code || err.message));
});

app.get('/api/mis-pedidos', soloAlumno, async (req, res) => {
    // Los pedidos que llevan más de un día sin revisarse pasan a "Expirado".
    await consultar('UPDATE pedido SET FK_Estado = 7 WHERE FK_Estado = 1 AND Fecha_Solicitud < (NOW() - INTERVAL 1 DAY)')
        .catch((err) => console.error('Error en la limpieza automática:', err.code || err.message));

    const pedidos = await consultar(`
        SELECT p.ID_Pedido, p.Fecha_Solicitud, p.Fecha_Recogida, p.Proposito, p.Motivo_Rechazo,
               est.Nombre_de_estado AS Estado, ep.Rol,
               GROUP_CONCAT(CONCAT(dp.Cantidad, 'x ', m.Nombre) SEPARATOR '|') AS ListaMateriales
        FROM pedido p
        JOIN equipo_pedido ep ON p.ID_Pedido = ep.FK_Pedido
        JOIN estado_pedido est ON p.FK_Estado = est.No_estado
        LEFT JOIN detalle_pedido dp ON p.ID_Pedido = dp.FK_Pedido
        LEFT JOIN material m ON dp.FK_Material = m.ID_Material
        WHERE ep.FK_Matricula = ? AND est.No_estado != 7
        GROUP BY p.ID_Pedido, p.Fecha_Solicitud, p.Fecha_Recogida, p.Proposito, p.Motivo_Rechazo, est.Nombre_de_estado, ep.Rol
        ORDER BY p.Fecha_Solicitud DESC`, [req.usuario.sub]);
    res.json({ status: 'success', pedidos });
});

// Detalle completo de un pedido (uso interno: incluye correos de los integrantes).
async function obtenerDetallePedido(idPedido) {
    const [pedido] = await consultar(`
        SELECT p.ID_Pedido, p.Fecha_Solicitud, p.Fecha_Recogida, p.Hora_Recogida, p.Hora_Devolucion,
               p.Proposito, p.FK_Estado, est.Nombre_de_estado AS Estado, p.FK_Casillero, p.Motivo_Rechazo,
               c.Identificador AS Casillero, a.Nombre AS Solicitante_Nombre, a.Apellido AS Solicitante_Apellido,
               a.Registro_Alu AS Solicitante_Matricula, a.Email AS Solicitante_Email
        FROM pedido p
        JOIN estado_pedido est ON p.FK_Estado = est.No_estado
        LEFT JOIN casillero c ON p.FK_Casillero = c.ID_Casillero
        LEFT JOIN alumno a ON p.FK_Solicitante = a.Registro_Alu
        WHERE p.ID_Pedido = ?`, [idPedido]);
    if (!pedido) return null;
    const [materiales, equipo] = await Promise.all([
        consultar(`SELECT m.ID_Material, m.Nombre, dp.Cantidad FROM detalle_pedido dp
                   JOIN material m ON m.ID_Material = dp.FK_Material WHERE dp.FK_Pedido = ?`, [idPedido]),
        consultar(`SELECT a.Nombre, a.Email, ep.FK_Matricula, ep.Rol FROM equipo_pedido ep
                   JOIN alumno a ON a.Registro_Alu = ep.FK_Matricula WHERE ep.FK_Pedido = ?`, [idPedido]),
    ]);
    return { ...pedido, materiales, equipo };
}

// Carga el pedido y comprueba que quien lo pide sea integrante (o administrador).
// A un extraño se le responde "no encontrado": así no puede saber qué folios existen.
async function pedidoAutorizado(req, { soloIntegrante = false } = {}) {
    const id = leer(esquemas.idPedido, req.params.id);
    const pedido = await obtenerDetallePedido(id);
    const integrante = pedido?.equipo.find((i) => String(i.FK_Matricula) === req.usuario.sub && req.usuario.rol === 'alumno');
    const permitido = integrante || (!soloIntegrante && req.usuario.rol === 'admin');
    if (pedido && !permitido) {
        registrar('PEDIDO_AJENO', { req, nivel: 'alerta', detalle: `Intentó abrir el pedido ${id}` });
        seg.sospecha(req, 3);
    }
    if (!pedido || !permitido) throw new ErrorHttp(404, 'Pedido no encontrado.');
    return { pedido, integrante };
}

app.get('/api/pedidos/:id', seg.requiereSesion, async (req, res) => {
    const { pedido } = await pedidoAutorizado(req);
    // No exponemos los correos de los integrantes
    pedido.equipo = pedido.equipo.map(({ Email, ...resto }) => resto);
    delete pedido.Solicitante_Email;
    res.json(pedido);
});

// QR cifrado del pedido. Solo existe si el pedido está aprobado y tiene casillero,
// y solo se entrega a un integrante del pedido.
app.get('/api/pedidos/:id/qr', soloAlumno, async (req, res) => {
    const { pedido } = await pedidoAutorizado(req, { soloIntegrante: true });
    if (pedido.FK_Estado !== 2 || !pedido.FK_Casillero) throw new ErrorHttp(409, 'Este pedido no tiene un casillero activo.');
    res.json({ status: 'success', qr: await qrDataUrl(pedido) });
});

// Envía el pase (con el QR cifrado) al correo del alumno con sesión; debe ser integrante del pedido.
app.post('/api/pedidos/:id/enviar-pase', soloAlumno, seg.limites.correo, async (req, res) => {
    const { pedido, integrante } = await pedidoAutorizado(req, { soloIntegrante: true });
    if (!integrante.Email) throw new ErrorHttp(409, 'Tu cuenta no tiene un correo registrado.');
    if (pedido.FK_Estado !== 2 || !pedido.FK_Casillero) throw new ErrorHttp(409, 'Este pedido no tiene un casillero activo.');
    const qr = await qrBuffer(pedido);
    const ok = await correoPase(integrante.Email, integrante.Nombre, pedido, qr);
    if (!ok) throw new ErrorHttp(503, 'No se pudo enviar el correo. Intenta más tarde.');
    res.json({ status: 'success', message: `Pase enviado a ${integrante.Email}` });
});

// =======================================================
// VERIFICACIÓN DE QR (panel del administrador y casillero físico)
// =======================================================
//  - Panel del administrador (con sesión):  POST /api/qr/verificar  { "codigo": "SSC2..." }  → JSON
//  - Casillero (ESP32 + GM60), con el encabezado  X-API-Key: <CASILLERO_API_KEY>:
//      POST/GET /api/qr/verificar?formato=texto&codigo=SSC2...
//      responde texto plano "OK <número de casillero>" (abrir esa puerta) o "NO <motivo>"
//      Opcional: &casillero=3 para que la puerta solo acepte códigos de su propio casillero.
async function verificarQR(req, res) {
    const enTexto = req.query.formato === 'texto';
    const responder = (http, cuerpo, texto) => (enTexto ? res.status(http).type('text/plain').send(texto) : res.status(http).json(cuerpo));

    const esAdmin = req.usuario?.rol === 'admin';
    const esCasillero = seg.claveCasilleroValida(req);
    if (!esAdmin && !esCasillero) {
        registrar('QR_SIN_AUTORIZACION', { req, nivel: 'alerta', detalle: req.get('x-api-key') ? 'API key incorrecta' : 'Sin sesión ni API key' });
        seg.sospecha(req, 3);
        return responder(401, { valido: false, status: 'error', message: 'No autorizado.' }, 'NO NO_AUTORIZADO');
    }
    const origen = esAdmin ? 'panel' : 'casillero';

    const codigo = esquemas.codigoQR.safeParse(req.body?.codigo ?? req.query.codigo);
    const casilleroLector = /^\d{1,3}$/.test(String(req.query.casillero || '')) ? Number(req.query.casillero) : null;
    const datos = codigo.success ? leerToken(codigo.data) : null;
    if (!datos) {
        registrar('QR_INVALIDO', { req, nivel: 'alerta', usuario: origen, detalle: 'Código falso, alterado o ilegible' });
        seg.sospecha(req);
        return responder(400, { valido: false, message: 'Código QR no válido: no fue generado por Safe Stock CETI o fue alterado.' }, 'NO CODIGO_INVALIDO');
    }

    let pedido;
    try {
        pedido = await obtenerDetallePedido(datos.p);
    } catch (err) {
        console.error('Error al verificar QR:', err.code || err.message);
        return responder(500, { valido: false, message: 'Error al consultar el pedido.' }, 'NO ERROR_SERVIDOR');
    }
    if (!pedido) return responder(404, { valido: false, message: 'El pedido de este código ya no existe.' }, 'NO PEDIDO_INEXISTENTE');
    if (pedido.FK_Estado !== 2 || pedido.FK_Casillero !== datos.c) {
        registrar('QR_PEDIDO_INACTIVO', { req, usuario: origen, detalle: `Pedido ${pedido.ID_Pedido} (${pedido.Estado})` });
        return responder(409, { valido: false, message: `El código es auténtico, pero el pedido ya no está activo en ese casillero (estado: ${pedido.Estado}).` }, 'NO PEDIDO_INACTIVO');
    }
    if (casilleroLector && casilleroLector !== pedido.FK_Casillero) {
        return responder(409, { valido: false, message: `Este código es del casillero ${pedido.FK_Casillero}, no de este.` }, `NO OTRO_CASILLERO ${pedido.FK_Casillero}`);
    }
    const nombreCelda = pedido.Casillero || `Casillero ${pedido.FK_Casillero}`;
    registrar('QR_ACCESO_AUTORIZADO', { req, usuario: origen, detalle: `Pedido ${pedido.ID_Pedido} → ${nombreCelda}` });
    responder(200, {
        valido: true,
        message: `Acceso autorizado a ${nombreCelda}.`,
        pedido: {
            id: pedido.ID_Pedido,
            casilleroId: pedido.FK_Casillero,
            casillero: nombreCelda,
            solicitante: `${pedido.Solicitante_Nombre || ''} ${pedido.Solicitante_Apellido || ''}`.trim(),
            matricula: pedido.Solicitante_Matricula,
            fecha: pedido.Fecha_Recogida,
            horario: `${pedido.Hora_Recogida || ''} – ${pedido.Hora_Devolucion || ''}`,
            materiales: pedido.materiales.map((m) => ({ nombre: m.Nombre, cantidad: m.Cantidad })),
        },
    }, `OK ${pedido.FK_Casillero}`);
}
app.post('/api/qr/verificar', seg.limites.qr, verificarQR);
app.get('/api/qr/verificar', seg.limites.qr, verificarQR);

// Al aprobar: cada integrante recibe su casillero y el QR cifrado.
async function notificarAprobacion(idPedido) {
    try {
        const pedido = await obtenerDetallePedido(idPedido);
        if (!pedido) return;
        let qr = null;
        try { qr = await qrBuffer(pedido); } catch (e) { console.error('No se pudo generar el QR de', idPedido, e.message); }
        pedido.equipo.forEach((i) => i.Email && correoAprobado(i.Email, i.Nombre, pedido, qr));
    } catch (err) {
        console.error('No se pudo notificar la aprobación de', idPedido, err.code || err.message);
    }
}

// Al rechazar: cada integrante recibe el motivo.
async function notificarRechazo(idPedido) {
    try {
        const pedido = await obtenerDetallePedido(idPedido);
        if (pedido) pedido.equipo.forEach((i) => i.Email && correoRechazado(i.Email, i.Nombre, pedido));
    } catch (err) {
        console.error('No se pudo notificar el rechazo de', idPedido, err.code || err.message);
    }
}

// =======================================================
// ADMINISTRADOR: PEDIDOS  (todo /api/admin exige rol admin, ver arriba)
// =======================================================
app.get('/api/admin/pedidos', async (req, res) => {
    const pedidosDb = await consultar('SELECT ID_Pedido, Fecha_Recogida, Proposito FROM pedido WHERE FK_Estado = 1 ORDER BY Fecha_Recogida ASC');
    if (pedidosDb.length === 0) return res.json([]);
    const ids = pedidosDb.map((p) => p.ID_Pedido);

    const [equipoDb, materialesDb] = await Promise.all([
        consultar(`SELECT ep.FK_Pedido, ep.FK_Matricula, a.Nombre, ep.Rol FROM equipo_pedido ep
                   JOIN alumno a ON ep.FK_Matricula = a.Registro_Alu WHERE ep.FK_Pedido IN (?)`, [ids]),
        consultar(`SELECT dp.FK_Pedido, m.Nombre, dp.Cantidad FROM detalle_pedido dp
                   JOIN material m ON dp.FK_Material = m.ID_Material WHERE dp.FK_Pedido IN (?)`, [ids]),
    ]);

    res.json(pedidosDb.map((pedido) => {
        const integrantes = equipoDb.filter((e) => e.FK_Pedido === pedido.ID_Pedido);
        const lider = integrantes.find((e) => e.Rol === 'Líder') || integrantes[0];
        const colaboradores = integrantes.filter((e) => e !== lider);

        const fechaObj = new Date(pedido.Fecha_Recogida);
        // La fecha puede venir ya escrita ("Martes 17 de noviembre, 2026") o como 2026-11-17.
        let fechaBonita = String(pedido.Fecha_Recogida || '');
        if (!Number.isNaN(fechaObj.getTime())) {
            fechaBonita = fechaObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            fechaBonita = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);
        }

        return {
            id: pedido.ID_Pedido,
            fecha_recogida: fechaBonita,
            esEquipo: colaboradores.length > 0,
            solicitante: { matricula: lider ? lider.FK_Matricula : 'N/A', nombre: lider ? lider.Nombre : 'Desconocido' },
            equipo: colaboradores.map((c) => ({ matricula: c.FK_Matricula, nombre: c.Nombre })),
            proposito: pedido.Proposito,
            materiales: materialesDb.filter((m) => m.FK_Pedido === pedido.ID_Pedido).map((m) => ({ nombre: m.Nombre, cantidad: m.Cantidad })),
        };
    }));
});

app.put('/api/admin/pedidos/:id/aprobar', async (req, res) => {
    const idPedido = leer(esquemas.idPedido, req.params.id);
    const { id_casillero } = leer(esquemas.aprobar, req.body);

    await transaccion(async (q) => {
        // El casillero elegido debe existir y estar libre: un casillero = un pedido.
        const celdas = await q('SELECT FK_Estado AS estado FROM casillero WHERE ID_Casillero = ? FOR UPDATE', [id_casillero]);
        if (celdas.length === 0) throw new ErrorHttp(404, 'Ese casillero no existe.');
        if (celdas[0].estado !== 1) throw new ErrorHttp(409, 'Ese casillero ya no está libre. Elige otro.');

        const pedidos = await q('SELECT FK_Estado AS estado FROM pedido WHERE ID_Pedido = ? FOR UPDATE', [idPedido]);
        if (pedidos.length === 0) throw new ErrorHttp(404, 'El pedido no existe.');
        if (pedidos[0].estado !== 1) throw new ErrorHttp(409, 'Este pedido ya fue procesado.');

        await q('UPDATE pedido SET FK_Estado = 2, FK_Casillero = ? WHERE ID_Pedido = ?', [id_casillero, idPedido]);
        await q('UPDATE casillero SET FK_Estado = 2 WHERE ID_Casillero = ?', [id_casillero]);

        const detalles = await q(`SELECT dp.FK_Material, dp.Cantidad, m.Nombre FROM detalle_pedido dp
                                  JOIN material m ON m.ID_Material = dp.FK_Material WHERE dp.FK_Pedido = ?`, [idPedido]);
        for (const item of detalles) {
            // El inventario nunca queda en negativo: si ya no alcanza, se deshace toda la aprobación.
            const r = await q('UPDATE material SET Cantidad = Cantidad - ? WHERE ID_Material = ? AND Cantidad >= ?', [item.Cantidad, item.FK_Material, item.Cantidad]);
            if (r.affectedRows === 0) throw new ErrorHttp(409, `Ya no hay existencias suficientes de ${item.Nombre}. Rechaza el pedido o ajusta el inventario.`);
        }
    });

    registrar('PEDIDO_APROBADO', { req, detalle: `${idPedido} → casillero ${id_casillero}` });
    res.json({ status: 'success', message: '¡Stock descontado y casillero ocupado!' });
    notificarAprobacion(idPedido);
});

app.put('/api/admin/pedidos/:id/rechazar', async (req, res) => {
    const idPedido = leer(esquemas.idPedido, req.params.id);
    const { motivo } = leer(esquemas.rechazar, req.body);
    // Solo se rechazan pedidos pendientes (estado 1). Se guarda el motivo para el alumno.
    const r = await consultar('UPDATE pedido SET FK_Estado = 4, Motivo_Rechazo = ? WHERE ID_Pedido = ? AND FK_Estado = 1', [motivo, idPedido]);
    if (r.affectedRows === 0) throw new ErrorHttp(409, 'Este pedido ya fue procesado o no existe.');
    registrar('PEDIDO_RECHAZADO', { req, detalle: idPedido });
    res.json({ status: 'success', message: 'Pedido rechazado y removido de la lista.' });
    notificarRechazo(idPedido);
});

// =======================================================
// ADMINISTRADOR: CASILLEROS
// =======================================================
app.get('/api/admin/casilleros/puertas', (req, res) => {
    res.json(estadoPuertas);
});

app.put('/api/admin/casilleros/:id/estado', async (req, res) => {
    const idCasillero = leer(esquemas.idNumerico, req.params.id);
    const { nuevo_estado } = leer(esquemas.estadoCasillero, req.body);
    // No se puede cambiar a mano un casillero ocupado: primero hay que liberarlo.
    const r = await consultar('UPDATE casillero SET FK_Estado = ? WHERE ID_Casillero = ? AND FK_Estado <> 2', [nuevo_estado, idCasillero]);
    if (r.affectedRows === 0) throw new ErrorHttp(409, 'El casillero está ocupado o no existe.');
    registrar('CASILLERO_ESTADO', { req, detalle: `Casillero ${idCasillero} → estado ${nuevo_estado}` });
    res.json({ status: 'success', message: 'Estado actualizado.' });
});

app.get('/api/admin/casilleros/:id/pedido', async (req, res) => {
    const idCasillero = leer(esquemas.idNumerico, req.params.id);
    const [pedido] = await consultar(`
        SELECT p.ID_Pedido, p.Proposito, a.Nombre AS Solicitante, a.Registro_Alu
        FROM pedido p JOIN alumno a ON p.FK_Solicitante = a.Registro_Alu
        WHERE p.FK_Casillero = ? AND p.FK_Estado = 2 LIMIT 1`, [idCasillero]);
    res.json(pedido || null);
});

// Liberar casillero: el pedido pasa a Devuelto y el material regresa al inventario.
app.put('/api/admin/casilleros/:id/liberar', async (req, res) => {
    const idCasillero = leer(esquemas.idNumerico, req.params.id);

    const idPedido = await transaccion(async (q) => {
        const pedidos = await q('SELECT ID_Pedido FROM pedido WHERE FK_Casillero = ? AND FK_Estado = 2 LIMIT 1 FOR UPDATE', [idCasillero]);
        await q('UPDATE casillero SET FK_Estado = 1 WHERE ID_Casillero = ?', [idCasillero]);
        if (pedidos.length === 0) return null; // estaba ocupado sin pedido: solo se libera

        const folio = pedidos[0].ID_Pedido;
        await q('UPDATE pedido SET FK_Estado = 5, FK_Casillero = NULL WHERE ID_Pedido = ?', [folio]);
        const detalles = await q('SELECT FK_Material, Cantidad FROM detalle_pedido WHERE FK_Pedido = ?', [folio]);
        for (const item of detalles) {
            await q('UPDATE material SET Cantidad = Cantidad + ? WHERE ID_Material = ?', [item.Cantidad, item.FK_Material]);
        }
        return folio;
    });

    registrar('CASILLERO_LIBERADO', { req, detalle: `Casillero ${idCasillero}${idPedido ? `, pedido ${idPedido}` : ''}` });
    res.json({
        status: 'success',
        message: idPedido ? 'Casillero liberado y materiales devueltos al almacén.' : 'Casillero liberado (No había pedido activo).',
    });
});

// =======================================================
// ADMINISTRADOR: INVENTARIO CON IMÁGENES
// =======================================================
// La imagen se recibe en memoria y solo se guarda en disco después de validar el
// formulario y de comprobar que el archivo es de verdad una imagen (no basta la extensión).
const CARPETA_IMAGENES = path.join(__dirname, '../frontend/public/images');
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 3 * 1024 * 1024, files: 1, fields: 20, fieldSize: 10 * 1024 },
    fileFilter: (req, file, cb) => {
        if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) return cb(null, true);
        cb(new ErrorHttp(400, 'La imagen debe ser JPG, PNG o WEBP.'));
    },
});

function esImagenReal(b) {
    if (!b || b.length < 12) return false;
    const jpg = b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
    const png = b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));
    const webp = b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP';
    return jpg || png || webp;
}

async function guardarImagen(req, idMaterial) {
    if (!req.file) return;
    // idMaterial ya está validado como número entero: no puede contener "../" ni otra ruta.
    await fs.promises.writeFile(path.join(CARPETA_IMAGENES, `${idMaterial}.jpg`), req.file.buffer);
}

const validarImagen = (req) => {
    if (req.file && !esImagenReal(req.file.buffer)) {
        registrar('ARCHIVO_RECHAZADO', { req, nivel: 'alerta', detalle: 'El archivo subido no es una imagen real' });
        throw new ErrorHttp(400, 'El archivo no es una imagen válida.');
    }
};

app.get('/api/admin/materiales', async (req, res) => {
    res.json(await consultar(`
        SELECT m.ID_Material, m.Nombre, m.Cantidad, m.Descripcion, m.FK_No_Categoria, c.Nombre_Categoria
        FROM material m JOIN categoria_material c ON m.FK_No_Categoria = c.No_Categoria`));
});

app.post('/api/admin/materiales', upload.single('imagen'), async (req, res) => {
    const d = leer(esquemas.material, req.body);
    validarImagen(req);
    try {
        await consultar('INSERT INTO material (ID_Material, Nombre, Cantidad, Descripcion, FK_No_Categoria) VALUES (?, ?, ?, ?, ?)',
            [d.ID_Material, d.Nombre, d.Cantidad, d.Descripcion, d.FK_No_Categoria]);
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') throw new ErrorHttp(400, 'Ya existe un material con ese ID.');
        if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new ErrorHttp(400, 'La categoría seleccionada no existe.');
        throw err;
    }
    await guardarImagen(req, d.ID_Material);
    registrar('MATERIAL_CREADO', { req, detalle: `${d.ID_Material} ${d.Nombre}` });
    res.json({ status: 'success', message: 'Material guardado correctamente' });
});

app.put('/api/admin/materiales/:id', upload.single('imagen'), async (req, res) => {
    const id = leer(esquemas.idNumerico, req.params.id);
    const d = leer(esquemas.material, { ...req.body, ID_Material: id });
    validarImagen(req);
    try {
        const r = await consultar('UPDATE material SET Nombre = ?, Cantidad = ?, Descripcion = ?, FK_No_Categoria = ? WHERE ID_Material = ?',
            [d.Nombre, d.Cantidad, d.Descripcion, d.FK_No_Categoria, id]);
        if (r.affectedRows === 0) throw new ErrorHttp(404, 'Material no encontrado.');
    } catch (err) {
        if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new ErrorHttp(400, 'La categoría seleccionada no existe.');
        throw err;
    }
    await guardarImagen(req, id);
    registrar('MATERIAL_EDITADO', { req, detalle: `${id} ${d.Nombre} (cantidad ${d.Cantidad})` });
    res.json({ status: 'success', message: 'Material actualizado' });
});

app.delete('/api/admin/materiales/:id', async (req, res) => {
    const id = leer(esquemas.idNumerico, req.params.id);
    try {
        const r = await consultar('DELETE FROM material WHERE ID_Material = ?', [id]);
        if (r.affectedRows === 0) throw new ErrorHttp(404, 'Material no encontrado.');
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') throw new ErrorHttp(400, 'No se puede eliminar: este material aparece en pedidos o reportes registrados.');
        throw err;
    }
    registrar('MATERIAL_ELIMINADO', { req, nivel: 'alerta', detalle: `Material ${id}` });
    res.json({ status: 'success', message: 'Material eliminado' });
});

// =======================================================
// ADMINISTRADOR: USUARIOS
// =======================================================
app.get('/api/admin/usuarios', async (req, res) => {
    // Solo las columnas necesarias: la contraseña (hash) nunca se consulta ni se envía.
    res.json(await consultar(`
        SELECT a.Registro_Alu, CONCAT(IFNULL(a.Nombre, ''), ' ', IFNULL(a.Apellido, '')) AS NombreCompleto,
               a.Email, a.Telefono, a.FK_Semestre, a.Ciclo_Semestre, c.Nombre_Carrera
        FROM alumno a LEFT JOIN carrera c ON a.FK_Carrera = c.ID_Carrera
        ORDER BY a.Nombre ASC`));
});

app.delete('/api/admin/usuarios/:registro', async (req, res) => {
    const registro = leer(esquemas.matricula, req.params.registro);
    try {
        const r = await consultar('DELETE FROM alumno WHERE Registro_Alu = ?', [registro]);
        if (r.affectedRows === 0) throw new ErrorHttp(404, 'Usuario no encontrado.');
    } catch (err) {
        if (err.code === 'ER_ROW_IS_REFERENCED_2') {
            throw new ErrorHttp(400, 'No se puede eliminar a este usuario porque tiene pedidos registrados en el historial de SafeStock.');
        }
        throw err;
    }
    registrar('USUARIO_ELIMINADO', { req, nivel: 'alerta', detalle: `Alumno ${registro}` });
    res.json({ status: 'success', message: 'Usuario eliminado correctamente del sistema.' });
});

// =======================================================
// ADMINISTRADOR: ESTADÍSTICAS
// Reporte MENSUAL: GET /api/admin/estadisticas?mes=AAAA-MM
// =======================================================

// Solo cuenta pedidos que sí se convirtieron en préstamo
// (excluye 1 = Solicitado, 4 = Rechazado, 6 = Cancelado, 7 = Expirado)
const FILTRO_PRESTAMOS = "p.FK_Estado NOT IN (1, 4, 6, 7)";
const FILTRO_MES = "DATE_FORMAT(p.Fecha_Solicitud, '%Y-%m') = ?";

app.get('/api/admin/estadisticas', async (req, res) => {
    const mes = leer(esquemas.mes, req.query.mes);

    const queryTotal = `SELECT COUNT(*) AS total FROM pedido p WHERE ${FILTRO_PRESTAMOS} AND ${FILTRO_MES}`;

    const queryTotalAnterior = `
        SELECT COUNT(*) AS total FROM pedido p
        WHERE ${FILTRO_PRESTAMOS}
        AND DATE_FORMAT(p.Fecha_Solicitud, '%Y-%m') = DATE_FORMAT(DATE_SUB(STR_TO_DATE(CONCAT(?, '-01'), '%Y-%m-%d'), INTERVAL 1 MONTH), '%Y-%m')
    `;

    // Todos los pedidos del mes por estado (incluye pendientes, rechazados y expirados)
    const queryEstados = `
        SELECT est.Nombre_de_estado AS estado, COUNT(*) AS total
        FROM pedido p
        JOIN estado_pedido est ON p.FK_Estado = est.No_estado
        WHERE ${FILTRO_MES}
        GROUP BY est.No_estado, est.Nombre_de_estado
        ORDER BY total DESC
    `;

    const querySemanas = `
        SELECT FLOOR((DAY(p.Fecha_Solicitud) - 1) / 7) + 1 AS semana, COUNT(*) AS prestamos
        FROM pedido p
        WHERE ${FILTRO_PRESTAMOS} AND ${FILTRO_MES}
        GROUP BY semana
        ORDER BY semana ASC
    `;

    const queryTop = `
        SELECT m.ID_Material AS id, m.Nombre AS nombre, c.Nombre_Categoria AS categoria,
               COUNT(DISTINCT p.ID_Pedido) AS prestamos
        FROM detalle_pedido dp
        JOIN pedido p ON dp.FK_Pedido = p.ID_Pedido
        JOIN material m ON dp.FK_Material = m.ID_Material
        LEFT JOIN categoria_material c ON m.FK_No_Categoria = c.No_Categoria
        WHERE ${FILTRO_PRESTAMOS} AND ${FILTRO_MES}
        GROUP BY m.ID_Material, m.Nombre, c.Nombre_Categoria
        ORDER BY prestamos DESC
        LIMIT 8
    `;

    const queryCategorias = `
        SELECT IFNULL(c.Nombre_Categoria, 'Sin categoría') AS categoria, COUNT(DISTINCT p.ID_Pedido) AS prestamos
        FROM detalle_pedido dp
        JOIN pedido p ON dp.FK_Pedido = p.ID_Pedido
        JOIN material m ON dp.FK_Material = m.ID_Material
        LEFT JOIN categoria_material c ON m.FK_No_Categoria = c.No_Categoria
        WHERE ${FILTRO_PRESTAMOS} AND ${FILTRO_MES}
        GROUP BY categoria
        ORDER BY prestamos DESC
    `;

    const queryHoras = `
        SELECT CONCAT(LPAD(HOUR(STR_TO_DATE(p.Hora_Recogida, '%l:%i %p')), 2, '0'), ':00') AS hora, COUNT(*) AS solicitudes
        FROM pedido p
        WHERE STR_TO_DATE(p.Hora_Recogida, '%l:%i %p') IS NOT NULL AND ${FILTRO_MES}
        GROUP BY hora
        ORDER BY hora ASC
    `;

    // Fecha_Recogida puede venir como "Martes 16 de junio, 2026" o, en pedidos antiguos, como "2026-06-18"
    const queryDias = `
        SELECT CASE
                   WHEN p.Fecha_Recogida REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
                   THEN ELT(DAYOFWEEK(STR_TO_DATE(p.Fecha_Recogida, '%Y-%m-%d')), 'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado')
                   ELSE SUBSTRING_INDEX(p.Fecha_Recogida, ' ', 1)
               END AS dia, COUNT(*) AS solicitudes
        FROM pedido p
        WHERE p.Fecha_Recogida IS NOT NULL AND ${FILTRO_MES}
        GROUP BY dia
        ORDER BY FIELD(dia, 'Lunes', 'Martes', 'Miércoles', 'Miercoles', 'Jueves', 'Viernes', 'Sábado', 'Sabado', 'Domingo') ASC
    `;

    const querySemestres = `
        SELECT s.Nombre_Semestre AS semestre, COUNT(*) AS solicitudes
        FROM pedido p
        JOIN alumno a ON p.FK_Solicitante = a.Registro_Alu
        JOIN semestre s ON a.FK_Semestre = s.ID_Semestre
        WHERE ${FILTRO_MES}
        GROUP BY s.ID_Semestre, s.Nombre_Semestre
        ORDER BY s.ID_Semestre ASC
    `;

    const [total, totalAnterior, prestamosPorEstado, porSemana, topHerramientas, porCategoria, horasPico, porDiaSemana, semestres] =
        await Promise.all([
            consultar(queryTotal, [mes]),
            consultar(queryTotalAnterior, [mes]),
            consultar(queryEstados, [mes]),
            consultar(querySemanas, [mes]),
            consultar(queryTop, [mes]),
            consultar(queryCategorias, [mes]),
            consultar(queryHoras, [mes]),
            consultar(queryDias, [mes]),
            consultar(querySemestres, [mes]),
        ]);

    res.json({
        mes,
        totalPrestamos: total[0].total,
        totalMesAnterior: totalAnterior[0].total,
        prestamosPorEstado,
        porSemana,
        topHerramientas,
        porCategoria,
        horasPico,
        porDiaSemana,
        semestres,
    });
});

// =======================================================
// ADMINISTRADOR: REPORTES DE FALLA
// Requiere la tabla de backend/sql/reporte_falla.sql
// =======================================================
app.get('/api/admin/fallas', async (req, res) => {
    res.json(await consultar(`
        SELECT f.ID_Falla AS id, DATE_FORMAT(f.Fecha_Reporte, '%Y-%m-%dT%H:%i:%s') AS fecha, f.FK_Material AS materialId,
               m.Nombre AS materialNombre, c.Nombre_Categoria AS categoria, f.Cantidad AS cantidad,
               f.Tipo_Falla AS tipo, f.Severidad AS severidad, f.Estado AS estado,
               IFNULL(f.FK_Pedido, '') AS pedido, IFNULL(f.FK_Matricula, '') AS matricula,
               f.Descripcion AS descripcion, f.Reportado_Por AS reportadoPor
        FROM reporte_falla f
        JOIN material m ON f.FK_Material = m.ID_Material
        LEFT JOIN categoria_material c ON m.FK_No_Categoria = c.No_Categoria
        ORDER BY f.Fecha_Reporte DESC`));
});

app.post('/api/admin/fallas', async (req, res) => {
    const d = leer(esquemas.falla, req.body);
    // Quién reporta se toma de la sesión, no del formulario: no se puede firmar a nombre de otro.
    const reportadoPor = (req.usuario.nombre || req.usuario.email || 'Administrador').slice(0, 100);
    let resultado;
    try {
        resultado = await consultar(
            `INSERT INTO reporte_falla (FK_Material, Cantidad, Tipo_Falla, Severidad, FK_Pedido, FK_Matricula, Descripcion, Reportado_Por)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [d.materialId, d.cantidad, d.tipo, d.severidad, d.pedido || null, d.matricula || null, d.descripcion, reportadoPor]);
    } catch (err) {
        if (err.code === 'ER_NO_REFERENCED_ROW_2') throw new ErrorHttp(400, 'El material indicado no existe.');
        throw err;
    }
    registrar('FALLA_REPORTADA', { req, detalle: `Material ${d.materialId}, ${d.severidad}` });
    res.status(201).json({ status: 'success', message: 'Reporte de falla registrado.', id: resultado.insertId });
});

app.put('/api/admin/fallas/:id/estado', async (req, res) => {
    const id = leer(esquemas.idNumerico, req.params.id);
    const { estado } = leer(esquemas.estadoFalla, req.body);
    await consultar('UPDATE reporte_falla SET Estado = ? WHERE ID_Falla = ?', [estado, id]);
    res.json({ status: 'success', message: 'Estado actualizado.' });
});

// =======================================================
// ADMINISTRADOR: BITÁCORA DE SEGURIDAD
// =======================================================
app.get('/api/admin/bitacora', async (req, res) => {
    const { nivel, limite } = leer(esquemas.bitacora, { nivel: req.query.nivel || undefined, limite: req.query.limite || undefined });
    const [eventos, resumen] = await Promise.all([
        consultar(
            `SELECT ID AS id, DATE_FORMAT(Fecha, '%Y-%m-%dT%H:%i:%s') AS fecha, Nivel AS nivel, Evento AS evento, IP AS ip,
                    Usuario AS usuario, Rol AS rol, Metodo AS metodo, Ruta AS ruta, Detalle AS detalle
             FROM bitacora_seguridad ${nivel ? 'WHERE Nivel = ?' : ''} ORDER BY ID DESC LIMIT ?`,
            nivel ? [nivel, limite] : [limite]),
        consultar(`SELECT Nivel AS nivel, COUNT(*) AS total FROM bitacora_seguridad
                   WHERE Fecha > (NOW() - INTERVAL 1 DAY) GROUP BY Nivel`),
    ]);
    res.json({ eventos, ultimas24h: Object.fromEntries(resumen.map((r) => [r.nivel, r.total])) });
});

// =======================================================
// RUTAS INEXISTENTES Y MANEJO CENTRAL DE ERRORES
// =======================================================
app.use((req, res, next) => {
    // Los escáneres automáticos prueban rutas al azar (/admin.php, /.env, ...): se anota.
    registrar('RUTA_INEXISTENTE', { req, nivel: 'alerta' });
    seg.sospecha(req);
    next(new ErrorHttp(404, 'Recurso no encontrado.'));
});

// El usuario recibe un mensaje útil, pero NUNCA detalles internos (consultas SQL,
// nombres de tablas, rutas de archivos). El detalle completo queda solo en el servidor,
// ligado a un código que el usuario puede compartir con el administrador.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    let http = 500;
    let mensaje;

    if (err instanceof ErrorHttp) {
        http = err.http;
        mensaje = err.message;
        if (http === 400 && err.extra.validacion) {
            // Casi siempre es un descuido del usuario: se anota como 'info', pero cuenta para detectar abuso.
            registrar('DATOS_INVALIDOS', { req, detalle: err.extra.validacion });
            seg.sospecha(req);
        }
    } else if (err.type === 'entity.too.large') {
        http = 413; mensaje = 'La información enviada es demasiado grande.';
    } else if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        http = 400; mensaje = 'La información enviada no tiene un formato válido.';
    } else if (err instanceof multer.MulterError) {
        http = 400; mensaje = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen pesa más de 3 MB.' : 'No se pudo procesar el archivo enviado.';
    } else {
        const codigo = crypto.randomBytes(4).toString('hex').toUpperCase();
        console.error(`[error ${codigo}] ${req.method} ${req.path}`, err);
        registrar('ERROR_INTERNO', { req, nivel: 'critico', detalle: `[${codigo}] ${err.code || err.name || 'Error'}` });
        mensaje = `Ocurrió un error interno y no se completó la operación. Intenta de nuevo; si continúa, comparte este código con el administrador: ${codigo}`;
    }

    if (res.headersSent) return;
    if (req.path === '/api/qr/verificar' && req.query.formato === 'texto') {
        return res.status(http).type('text/plain').send(http === 429 ? 'NO DEMASIADAS_PETICIONES' : 'NO ERROR_SERVIDOR');
    }
    res.status(http).json({ status: 'error', message: mensaje, error: mensaje });
});

// --- ENCENDIDO DEL SERVIDOR ---
const servidor = app.listen(config.puerto, () => {
    console.log(`Servidor corriendo en el puerto ${config.puerto}`);
});
// Corta conexiones que se quedan abiertas sin enviar nada (ataques tipo "slowloris").
servidor.headersTimeout = 15000;
servidor.requestTimeout = 30000;

module.exports = app;

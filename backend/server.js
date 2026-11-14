const express = require('express');
const db = require('./db');
const cors = require('cors');
const bcrypt = require('bcrypt');
const multer = require('multer'); // <-- NUEVO: Librería para subir archivos
const path = require('path');
const crypto = require('crypto');
const { correoBienvenida, correoPedido, correoRecuperacion, correoAprobado, correoRechazado, correoPase } = require('./mailer');
const { leerToken, qrDataUrl, qrBuffer } = require('./qrSeguro');     // <-- NUEVO: Librería para manejar rutas de carpetas

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// =======================================================
// CONFIGURACIÓN DE MULTER (GUARDADO FÍSICO DE IMÁGENES)
// =======================================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Apuntamos directamente a la carpeta del frontend
        cb(null, path.join(__dirname, '../frontend/public/images')); 
    },
    filename: (req, file, cb) => {
        // Tomamos el ID que viene en el formulario (POST) o en la URL (PUT)
        const idMaterial = req.body.ID_Material || req.params.id; 
        cb(null, `${idMaterial}.jpg`); // Forzamos a que se guarde como .jpg
    }
});
const upload = multer({ storage: storage });


// --- VENTANILLA 1: LOGIN INTELIGENTE (ADMINISTRADOR Y ALUMNO) ---
app.post('/', (req, res) => {
    const { email, password } = req.body;

    // 1. Primero buscamos si el correo es del Jefe (Administrador)
    const queryAdmin = "SELECT * FROM administrador WHERE Email = ?";

    db.query(queryAdmin, [email], (err, resultAdmin) => {
        if (err) return res.status(500).json({ error: err.message });

        if (resultAdmin.length > 0) {
            const admin = resultAdmin[0]; 

            bcrypt.compare(password, admin.Password, (err, coinciden) => {
                if (err) return res.status(500).json({ error: "Error interno de seguridad" });

                if (coinciden) {
                    return res.status(200).json({ status: "success", role: "admin", user: admin });
                } else {
                    return res.status(401).json({ status: "error", message: "Contraseña incorrecta" });
                }
            });
        } else {
            // 2. Si NO es administrador, entonces buscamos en la tabla de alumnos
            const queryAlumno = "SELECT * FROM alumno WHERE Email = ?";
            
            db.query(queryAlumno, [email], (err, resultAlumno) => {
                if (err) return res.status(500).json({ error: err.message });

                if (resultAlumno.length > 0) {
                    const alumno = resultAlumno[0];

                    if (!alumno.Password) {
                        return res.status(401).json({ status: "error", message: "Esta cuenta no tiene contraseña registrada. Contacta al administrador." });
                    }

                    bcrypt.compare(password, alumno.Password, (err, coinciden) => {
                        if (err) return res.status(500).json({ error: "Error interno de seguridad" });

                        if (coinciden) {
                            return res.status(200).json({ status: "success", role: "alumno", user: alumno });
                        } else {
                            return res.status(401).json({ status: "error", message: "Contraseña incorrecta" });
                        }
                    });
                } else {
                    return res.status(401).json({ status: "error", message: "Correo no registrado" });
                }
            });
        }
    });
});

// --- VENTANILLA 2: TODO EL CATÁLOGO ---
app.get('/api/materiales', (req, res) => {
    const query = 'SELECT * FROM material';

    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.status(200).json(results);
    });
});

// --- VENTANILLA 3: DETALLES DE UN SOLO MATERIAL ---
app.get('/api/materiales/:id', (req, res) => {
    const idMaterial = req.params.id; 
    const query = 'SELECT * FROM material WHERE ID_Material = ?';

    db.query(query, [idMaterial], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (result.length > 0) {
            res.status(200).json(result[0]); 
        } else {
            res.status(404).json({ message: "Material no encontrado" });
        }
    });
});

// --- VENTANILLA DE REGISTRO ---
app.post('/registro', (req, res) => {
    const { nombre, registro_alu, email, password, telefono, carrera_texto, semestre_texto } = req.body;

    if (!/^[^\s@]+@ceti\.mx$/i.test(String(email || '').trim())) {
        return res.status(400).json({ 
            status: "error", 
            message: "Por seguridad, solo se permiten correos institucionales (@ceti.mx)" 
        });
    }

    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hashPassword) => {
        if (err) return res.status(500).json({ error: "Error al encriptar" });

        const query = `
            INSERT INTO alumno (Nombre, Registro_Alu, Email, Password, Telefono, FK_Carrera, FK_Semestre) 
            VALUES (
                ?, ?, ?, ?, ?, 
                (SELECT ID_Carrera FROM carrera WHERE Nombre_Carrera = ? LIMIT 1), 
                (SELECT ID_Semestre FROM semestre WHERE Nombre_Semestre = ? LIMIT 1)
            )
        `;

        db.query(query, [nombre, registro_alu, email, hashPassword, telefono, carrera_texto, semestre_texto], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ status: "error", message: "Este alumno o correo ya está registrado." });
                if (err.code === 'ER_BAD_NULL_ERROR') return res.status(400).json({ status: "error", message: "Error: La carrera o semestre seleccionados no son válidos." });
                return res.status(500).json({ status: "error", message: err.message });
            }
            res.status(201).json({ status: "success", message: "Cuenta creada con éxito" });
            correoBienvenida(email, nombre);
        });
    });
});

// --- VENTANILLA 4: REGISTRAR UN PEDIDO ---
app.post('/api/pedidos', (req, res) => {
    const { id_pedido, fecha_recogida, hora_recogida, hora_devolucion, proposito, solicitante, integrantes, materiales } = req.body;
    const listaMatriculas = integrantes.map(i => i.matricula);

    const queryValidar = `
            SELECT ep.FK_Matricula, u.Nombre 
            FROM equipo_pedido ep
            JOIN pedido p ON ep.FK_Pedido = p.ID_Pedido
            JOIN alumno u ON ep.FK_Matricula = u.Registro_Alu
            WHERE p.Fecha_Recogida = ? 
            AND ep.FK_Matricula IN (?)
            AND p.FK_Estado IN (1, 2, 3); /* <-- LA MAGIA: Solo bloquea si tiene un pedido Pendiente (1) o Aprobado (2) */
        `;

    db.query(queryValidar, [fecha_recogida, listaMatriculas], (err, duplicados) => {
        if (err) return res.status(500).json({ status: "error", message: "Error interno al verificar el equipo." });

        if (duplicados.length > 0) {
            const alumnoConflictivo = duplicados[0].Nombre;
            return res.status(400).json({ 
                status: "error", 
                message: `${alumnoConflictivo} ya tiene una solicitud de material registrada para esta misma fecha.` 
            });
        }

        const queryPedido = `
            INSERT INTO pedido (ID_Pedido, Fecha_Solicitud, Fecha_Recogida, Proposito, FK_Solicitante, FK_Estado, Hora_Recogida, Hora_Devolucion) 
            VALUES (?, NOW(), ?, ?, ?, 1, ?, ?);
        `;

        db.query(queryPedido, [id_pedido, fecha_recogida, proposito, solicitante, hora_recogida, hora_devolucion], (err, result) => {
            if (err) return res.status(500).json({ status: "error", message: "Error al registrar la cabecera del pedido." });

            const queryEquipo = `INSERT INTO equipo_pedido (FK_Pedido, FK_Matricula, Rol) VALUES ?`;
            const valoresEquipo = integrantes.map(i => [
                id_pedido, i.matricula, i.matricula === solicitante ? 'Líder' : 'Colaborador'
            ]);

            db.query(queryEquipo, [valoresEquipo], (err) => {
                if (err) console.error("Error menor al guardar equipo:", err);

                const queryDetalle = `INSERT INTO detalle_pedido (FK_Pedido, FK_Material, Cantidad) VALUES ?`;
                const valoresDetalles = materiales.map(m => [id_pedido, m.id, m.cantidad]);

                db.query(queryDetalle, [valoresDetalles], (err) => {
                    if (err) return res.status(500).json({ status: "error", message: "Error al registrar los materiales." });
                    res.status(200).json({ status: "success", message: "Pedido de equipo procesado con éxito." });
                    notificarPedido(id_pedido, listaMatriculas, materiales, { fecha_recogida, hora_recogida, hora_devolucion, proposito });
                });
            });
        });
    });
});

// Manda el correo de confirmación a cada integrante del equipo (no bloquea la respuesta).
function notificarPedido(idPedido, matriculas, materiales, datos) {
    const ids = materiales.map(m => m.id);
    db.query('SELECT ID_Material, Nombre FROM material WHERE ID_Material IN (?)', [ids], (err, mats) => {
        const nombres = {};
        (mats || []).forEach(m => { nombres[m.ID_Material] = m.Nombre; });
        const pedido = {
            id: idPedido,
            fecha: datos.fecha_recogida ? String(datos.fecha_recogida) : '',
            horaRecogida: datos.hora_recogida || '',
            horaDevolucion: datos.hora_devolucion || '',
            proposito: datos.proposito || '',
            materiales: materiales.map(m => ({ nombre: nombres[m.id] || m.n || `Material ${m.id}`, cantidad: m.cantidad })),
        };
        db.query('SELECT Nombre, Email FROM alumno WHERE Registro_Alu IN (?)', [matriculas], (err, alumnos) => {
            if (err) return console.error('No se pudieron obtener los correos del equipo:', err.message);
            alumnos.forEach(a => a.Email && correoPedido(a.Email, a.Nombre, pedido));
        });
    });
}

// =======================================================
// RECUPERAR CONTRASEÑA (código de 6 dígitos por correo)
// =======================================================
// Los códigos viven en memoria: vencen en 15 min y se pierden si el servidor se reinicia.
const codigosRecuperacion = new Map(); // email -> { hash, expira, intentos, tabla }
const QUINCE_MIN = 15 * 60 * 1000;
const hashCodigo = (codigo) => crypto.createHash('sha256').update(codigo).digest('hex');

function buscarCuenta(email, cb) {
    db.query('SELECT Nombre FROM administrador WHERE Email = ?', [email], (err, admins) => {
        if (err) return cb(err);
        if (admins.length > 0) return cb(null, { tabla: 'administrador', nombre: admins[0].Nombre });
        db.query('SELECT Nombre FROM alumno WHERE Email = ?', [email], (err, alumnos) => {
            if (err) return cb(err);
            if (alumnos.length > 0) return cb(null, { tabla: 'alumno', nombre: alumnos[0].Nombre });
            cb(null, null);
        });
    });
}

app.post('/api/recuperar/solicitar', (req, res) => {
    const email = String(req.body.email || '').trim();
    if (!email) return res.status(400).json({ status: "error", message: "Escribe tu correo." });

    const previo = codigosRecuperacion.get(email.toLowerCase());
    if (previo && previo.expira - QUINCE_MIN + 60 * 1000 > Date.now()) {
        return res.status(429).json({ status: "error", message: "Ya te enviamos un código. Espera un minuto para pedir otro." });
    }

    buscarCuenta(email, async (err, cuenta) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al buscar la cuenta." });
        if (!cuenta) return res.status(404).json({ status: "error", message: "No hay ninguna cuenta con ese correo." });

        const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
        codigosRecuperacion.set(email.toLowerCase(), {
            hash: hashCodigo(codigo), expira: Date.now() + QUINCE_MIN, intentos: 0, tabla: cuenta.tabla,
        });

        const enviado = await correoRecuperacion(email, cuenta.nombre || '', codigo);
        if (!enviado) {
            codigosRecuperacion.delete(email.toLowerCase());
            return res.status(500).json({ status: "error", message: "No se pudo enviar el correo. Intenta más tarde." });
        }
        res.json({ status: "success", message: "Te enviamos un código de 6 dígitos a tu correo." });
    });
});

app.post('/api/recuperar/confirmar', (req, res) => {
    const email = String(req.body.email || '').trim();
    const codigo = String(req.body.codigo || '').trim();
    const nueva = String(req.body.password || '');
    const registro = codigosRecuperacion.get(email.toLowerCase());

    if (!registro || registro.expira < Date.now()) {
        codigosRecuperacion.delete(email.toLowerCase());
        return res.status(400).json({ status: "error", message: "El código venció o no existe. Pide uno nuevo." });
    }
    if (registro.intentos >= 5) {
        codigosRecuperacion.delete(email.toLowerCase());
        return res.status(429).json({ status: "error", message: "Demasiados intentos. Pide un código nuevo." });
    }
    if (hashCodigo(codigo) !== registro.hash) {
        registro.intentos++;
        return res.status(400).json({ status: "error", message: "El código es incorrecto." });
    }
    if (nueva.length < 6) {
        return res.status(400).json({ status: "error", message: "La contraseña debe tener al menos 6 caracteres." });
    }

    bcrypt.hash(nueva, 10, (err, hash) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al encriptar." });
        // registro.tabla solo puede ser 'administrador' o 'alumno' (lo fija buscarCuenta)
        db.query(`UPDATE ${registro.tabla} SET Password = ? WHERE Email = ?`, [hash, email], (err) => {
            if (err) return res.status(500).json({ status: "error", message: "No se pudo guardar la contraseña." });
            codigosRecuperacion.delete(email.toLowerCase());
            res.json({ status: "success", message: "¡Listo! Ya puedes iniciar sesión con tu nueva contraseña." });
        });
    });
});

// --- VENTANILLA 5: OBTENER HISTORIAL DE PEDIDOS ---
app.get('/api/mis-pedidos/:matricula', (req, res) => {
    const matricula = req.params.matricula;

    const queryLimpieza = `
        UPDATE pedido 
        SET FK_Estado = 7 
        WHERE FK_Estado = 1 AND Fecha_Solicitud < (NOW() - INTERVAL 1 DAY)
    `;

    db.query(queryLimpieza, (err) => {
        if (err) console.error("Error silencioso en la limpieza automática:", err);

        const queryHistorial = `
            SELECT 
                p.ID_Pedido, 
                p.Fecha_Solicitud, 
                p.Fecha_Recogida, 
                p.Proposito, 
                p.Motivo_Rechazo,
                est.Nombre_de_estado AS Estado, 
                ep.Rol,
                GROUP_CONCAT(CONCAT(dp.Cantidad, 'x ', m.Nombre) SEPARATOR '|') AS ListaMateriales
            FROM pedido p
            JOIN equipo_pedido ep ON p.ID_Pedido = ep.FK_Pedido
            JOIN estado_pedido est ON p.FK_Estado = est.No_estado
            LEFT JOIN detalle_pedido dp ON p.ID_Pedido = dp.FK_Pedido
            LEFT JOIN material m ON dp.FK_Material = m.ID_Material
            WHERE ep.FK_Matricula = ? AND est.No_estado != 7 
            GROUP BY p.ID_Pedido, p.Fecha_Solicitud, p.Fecha_Recogida, p.Proposito, p.Motivo_Rechazo, est.Nombre_de_estado, ep.Rol
            ORDER BY p.Fecha_Solicitud DESC;
        `;

        db.query(queryHistorial, [matricula], (err, resultados) => {
            if (err) return res.status(500).json({ status: "error", message: "Error al buscar los pedidos." });
            res.status(200).json({ status: "success", pedidos: resultados });
        });
    });
});

// --- VENTANILLA 6: OBTENER PEDIDOS PENDIENTES PARA EL ADMIN ---
app.get('/api/admin/pedidos', (req, res) => {
    const queryPedidos = `
        SELECT ID_Pedido, Fecha_Recogida, Proposito 
        FROM pedido 
        WHERE FK_Estado = 1 
        ORDER BY Fecha_Recogida ASC;
    `;

    db.query(queryPedidos, (err, pedidosDb) => {
        if (err) return res.status(500).json({ error: err.message });
        if (pedidosDb.length === 0) return res.status(200).json([]);

        const idsPedidos = pedidosDb.map(p => p.ID_Pedido);

        const queryEquipo = `
            SELECT ep.FK_Pedido, ep.FK_Matricula, a.Nombre, ep.Rol 
            FROM equipo_pedido ep 
            JOIN alumno a ON ep.FK_Matricula = a.Registro_Alu 
            WHERE ep.FK_Pedido IN (?)
        `;

        const queryMateriales = `
            SELECT dp.FK_Pedido, m.Nombre, dp.Cantidad 
            FROM detalle_pedido dp 
            JOIN material m ON dp.FK_Material = m.ID_Material 
            WHERE dp.FK_Pedido IN (?)
        `;

        db.query(queryEquipo, [idsPedidos], (err, equipoDb) => {
            if (err) return res.status(500).json({ error: err.message });

            db.query(queryMateriales, [idsPedidos], (err, materialesDb) => {
                if (err) return res.status(500).json({ error: err.message });

                const pedidosArmados = pedidosDb.map(pedido => {
                    const integrantes = equipoDb.filter(e => e.FK_Pedido === pedido.ID_Pedido);
                    const lider = integrantes.find(e => e.Rol === 'Líder') || integrantes[0];
                    const colaboradores = integrantes.filter(e => e.Rol !== 'Líder');
                    const materiales = materialesDb.filter(m => m.FK_Pedido === pedido.ID_Pedido);

                    const fechaObj = new Date(pedido.Fecha_Recogida);
                    const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
                    let fechaBonita = fechaObj.toLocaleDateString('es-ES', opcionesFecha);
                    fechaBonita = fechaBonita.charAt(0).toUpperCase() + fechaBonita.slice(1);

                    return {
                        id: pedido.ID_Pedido,
                        fecha_recogida: fechaBonita,
                        esEquipo: colaboradores.length > 0,
                        solicitante: { 
                            matricula: lider ? lider.FK_Matricula : 'N/A', 
                            nombre: lider ? lider.Nombre : 'Desconocido' 
                        },
                        equipo: colaboradores.map(c => ({ matricula: c.FK_Matricula, nombre: c.Nombre })),
                        proposito: pedido.Proposito,
                        materiales: materiales.map(m => ({ nombre: m.Nombre, cantidad: m.Cantidad }))
                    };
                });

                res.status(200).json(pedidosArmados);
            });
        });
    });
});

// --- VENTANILLA 7: ADMIN - APROBAR PEDIDO ---
app.put('/api/admin/pedidos/:id/aprobar', (req, res) => {
    const idPedido = req.params.id;
    const { id_casillero } = req.body; 

    if (!id_casillero) return res.status(400).json({ status: "error", message: "Selecciona un casillero." });

    db.beginTransaction((err) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al iniciar el motor de base de datos" });

        // El casillero elegido debe existir y estar libre: un casillero = un pedido.
        db.query("SELECT Fk_Estado FROM casillero WHERE ID_Casillero = ? FOR UPDATE", [id_casillero], (err, celdas) => {
            if (err) return db.rollback(() => res.status(500).json({ status: "error", message: "Error al revisar el casillero." }));
            if (celdas.length === 0) return db.rollback(() => res.status(404).json({ status: "error", message: "Ese casillero no existe." }));
            if (celdas[0].Fk_Estado !== 1) return db.rollback(() => res.status(409).json({ status: "error", message: "Ese casillero ya no está libre. Elige otro." }));

        db.query("SELECT FK_Estado FROM pedido WHERE ID_Pedido = ? FOR UPDATE", [idPedido], (err, pedidos) => {
            if (err) return db.rollback(() => res.status(500).json({ status: "error", message: "Error al revisar el pedido." }));
            if (pedidos.length === 0) return db.rollback(() => res.status(404).json({ status: "error", message: "El pedido no existe." }));
            if (pedidos[0].FK_Estado !== 1) return db.rollback(() => res.status(409).json({ status: "error", message: "Este pedido ya fue procesado." }));

        const queryUpdatePedido = "UPDATE pedido SET FK_Estado = 2, FK_Casillero = ? WHERE ID_Pedido = ?";
        
        db.query(queryUpdatePedido, [id_casillero, idPedido], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ status: "error", message: "Error al actualizar la cabecera." }));

        const queryOcuparCasillero = "UPDATE casillero SET FK_Estado = 2 WHERE ID_Casillero = ?";
            
        db.query(queryOcuparCasillero, [id_casillero], (err) => {
            if (err) return db.rollback(() => res.status(500).json({ status: "error", message: "Error al bloquear el casillero." }));

                const queryDetalles = "SELECT FK_Material, Cantidad FROM detalle_pedido WHERE FK_Pedido = ?";
                
                db.query(queryDetalles, [idPedido], (err, detalles) => {
                    if (err) return db.rollback(() => res.status(500).json({ status: "error", message: "Error al leer lista de materiales." }));
                    if (detalles.length === 0) return db.commit(() => { res.status(200).json({ status: "success", message: "Pedido procesado." }); notificarAprobacion(idPedido); });

                    let restasCompletadas = 0;
                    detalles.forEach((item) => {
                        const queryDescuento = "UPDATE material SET Cantidad = Cantidad - ? WHERE ID_Material = ?";
                        
                        db.query(queryDescuento, [item.Cantidad, item.FK_Material], (err) => {
                            if (err) return db.rollback(() => res.status(500).json({ status: "error", message: `Error en stock.` }));
                            
                            restasCompletadas++;
                            
                            if (restasCompletadas === detalles.length) {
                                db.commit((errCommit) => {
                                    if (errCommit) return db.rollback(() => res.status(500).json({ status: "error", message: "Error al confirmar." }));
                                    res.status(200).json({ status: "success", message: "¡Stock descontado y casillero ocupado!" });
                                    notificarAprobacion(idPedido);
                                });
                            }
                        });
                    });
                });
            });
        });
        });
        });
    });
});

// --- VENTANILLA 7.5: ADMIN - RECHAZAR PEDIDO ---
app.put('/api/admin/pedidos/:id/rechazar', (req, res) => {
    const idPedido = req.params.id;
    const motivo = String(req.body.motivo || '').trim().slice(0, 500);
    if (!motivo) return res.status(400).json({ status: "error", message: "Escribe el motivo del rechazo." });

    // Solo se rechazan pedidos pendientes (estado 1). Se guarda el motivo para el alumno.
    const queryRechazar = "UPDATE pedido SET FK_Estado = 4, Motivo_Rechazo = ? WHERE ID_Pedido = ? AND FK_Estado = 1";
    db.query(queryRechazar, [motivo, idPedido], (err, resultado) => {
        if (err) {
            console.error("Error al rechazar pedido:", err);
            return res.status(500).json({ status: "error", message: "Error al actualizar el estado a rechazado." });
        }
        if (resultado.affectedRows === 0) return res.status(409).json({ status: "error", message: "Este pedido ya fue procesado o no existe." });
        res.status(200).json({ status: "success", message: "Pedido rechazado y removido de la lista." });
        notificarRechazo(idPedido);
    });
});

// --- MATERIALES MÁS SOLICITADOS (para la página de inicio) ---
app.get('/api/materiales-populares', (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 4, 12);
    // Cuenta en cuántos pedidos aparece cada material (sin contar rechazados, cancelados ni expirados).
    // Si hay pocos pedidos, completa la lista con otros materiales del catálogo.
    const query = `
        SELECT m.ID_Material, m.Nombre, m.Cantidad, m.FK_No_Categoria,
               COUNT(DISTINCT p.ID_Pedido) AS Veces_Solicitado,
               COALESCE(SUM(CASE WHEN p.ID_Pedido IS NOT NULL THEN dp.Cantidad END), 0) AS Unidades_Solicitadas
        FROM material m
        LEFT JOIN detalle_pedido dp ON dp.FK_Material = m.ID_Material
        LEFT JOIN pedido p ON p.ID_Pedido = dp.FK_Pedido AND p.FK_Estado NOT IN (4, 6, 7)
        GROUP BY m.ID_Material, m.Nombre, m.Cantidad, m.FK_No_Categoria
        ORDER BY Veces_Solicitado DESC, Unidades_Solicitadas DESC, m.Nombre ASC
        LIMIT ?`;
    db.query(query, [limite], (err, resultado) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al cargar los más solicitados." });
        res.json(resultado);
    });
});

// --- DETALLE REAL DE UN PEDIDO (página del pase / QR del alumno) ---
function obtenerDetallePedido(idPedido, cb) {
    const query = `
        SELECT p.ID_Pedido, p.Fecha_Solicitud, p.Fecha_Recogida, p.Hora_Recogida, p.Hora_Devolucion,
               p.Proposito, p.FK_Estado, est.Nombre_de_estado AS Estado, p.FK_Casillero, p.Motivo_Rechazo,
               c.Identificador AS Casillero, a.Nombre AS Solicitante_Nombre, a.Apellido AS Solicitante_Apellido,
               a.Registro_Alu AS Solicitante_Matricula, a.Email AS Solicitante_Email
        FROM pedido p
        JOIN estado_pedido est ON p.FK_Estado = est.No_estado
        LEFT JOIN casillero c ON p.FK_Casillero = c.ID_Casillero
        LEFT JOIN alumno a ON p.FK_Solicitante = a.Registro_Alu
        WHERE p.ID_Pedido = ?`;
    db.query(query, [idPedido], (err, filas) => {
        if (err) return cb(err);
        if (filas.length === 0) return cb(null, null);
        const pedido = filas[0];
        db.query(`SELECT m.ID_Material, m.Nombre, dp.Cantidad FROM detalle_pedido dp
                  JOIN material m ON m.ID_Material = dp.FK_Material WHERE dp.FK_Pedido = ?`, [idPedido], (err, materiales) => {
            if (err) return cb(err);
            db.query(`SELECT a.Nombre, a.Email, ep.FK_Matricula, ep.Rol FROM equipo_pedido ep
                      JOIN alumno a ON a.Registro_Alu = ep.FK_Matricula WHERE ep.FK_Pedido = ?`, [idPedido], (err, equipo) => {
                if (err) return cb(err);
                cb(null, { ...pedido, materiales, equipo });
            });
        });
    });
}

app.get('/api/pedidos/:id', (req, res) => {
    obtenerDetallePedido(req.params.id, (err, pedido) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al cargar el pedido." });
        if (!pedido) return res.status(404).json({ status: "error", message: "Pedido no encontrado." });
        // No exponemos los correos de los integrantes
        pedido.equipo = pedido.equipo.map(({ Email, ...resto }) => resto);
        delete pedido.Solicitante_Email;
        res.json(pedido);
    });
});

// QR cifrado del pedido. Solo existe si el pedido está aprobado y tiene casillero,
// y solo se entrega a un integrante del pedido.
app.get('/api/pedidos/:id/qr', (req, res) => {
    const matricula = String(req.query.matricula || '');
    obtenerDetallePedido(req.params.id, async (err, pedido) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al cargar el pedido." });
        if (!pedido) return res.status(404).json({ status: "error", message: "Pedido no encontrado." });
        if (!pedido.equipo.some(i => String(i.FK_Matricula) === matricula)) return res.status(403).json({ status: "error", message: "No perteneces a este pedido." });
        if (pedido.FK_Estado !== 2 || !pedido.FK_Casillero) return res.status(409).json({ status: "error", message: "Este pedido no tiene un casillero activo." });
        try {
            res.json({ status: "success", qr: await qrDataUrl(pedido) });
        } catch (e) {
            res.status(500).json({ status: "error", message: "No se pudo generar el código QR." });
        }
    });
});

// Verifica un QR escaneado. Solo los QR generados por este servidor son válidos.
//  - Panel del administrador:   POST /api/qr/verificar  { "codigo": "SSC2..." }  → JSON
//  - Casillero (ESP32 + GM60):  POST/GET /api/qr/verificar?formato=texto&codigo=SSC2...
//      responde texto plano "OK <número de casillero>" (abrir esa puerta) o "NO <motivo>"
//      Opcional: &casillero=3 para que la puerta solo acepte códigos de su propio casillero.
function verificarQR(req, res) {
    const codigo = req.body?.codigo ?? req.query.codigo;
    const enTexto = req.query.formato === 'texto';
    const casilleroLector = req.query.casillero ? Number(req.query.casillero) : null;
    const responder = (http, cuerpo, texto) => (enTexto ? res.status(http).type('text/plain').send(texto) : res.status(http).json(cuerpo));

    const datos = leerToken(codigo);
    if (!datos) return responder(400, { valido: false, message: "Código QR no válido: no fue generado por Safe Stock CETI o fue alterado." }, 'NO CODIGO_INVALIDO');
    obtenerDetallePedido(datos.p, (err, pedido) => {
        if (err) return responder(500, { valido: false, message: "Error al consultar el pedido." }, 'NO ERROR_SERVIDOR');
        if (!pedido) return responder(404, { valido: false, message: "El pedido de este código ya no existe." }, 'NO PEDIDO_INEXISTENTE');
        if (pedido.FK_Estado !== 2 || pedido.FK_Casillero !== datos.c) {
            return responder(409, { valido: false, message: `El código es auténtico, pero el pedido ya no está activo en ese casillero (estado: ${pedido.Estado}).` }, 'NO PEDIDO_INACTIVO');
        }
        if (casilleroLector && casilleroLector !== pedido.FK_Casillero) {
            return responder(409, { valido: false, message: `Este código es del casillero ${pedido.FK_Casillero}, no de este.` }, `NO OTRO_CASILLERO ${pedido.FK_Casillero}`);
        }
        const nombreCelda = pedido.Casillero || `Casillero ${pedido.FK_Casillero}`;
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
                materiales: pedido.materiales.map(m => ({ nombre: m.Nombre, cantidad: m.Cantidad })),
            },
        }, `OK ${pedido.FK_Casillero}`);
    });
}
app.post('/api/qr/verificar', verificarQR);
app.get('/api/qr/verificar', verificarQR);

// Envía el pase (con el QR cifrado) al correo del alumno que lo pide; debe ser integrante del pedido.
app.post('/api/pedidos/:id/enviar-pase', (req, res) => {
    const { matricula } = req.body;
    obtenerDetallePedido(req.params.id, async (err, pedido) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al cargar el pedido." });
        if (!pedido) return res.status(404).json({ status: "error", message: "Pedido no encontrado." });
        const integrante = pedido.equipo.find(i => String(i.FK_Matricula) === String(matricula));
        if (!integrante || !integrante.Email) return res.status(403).json({ status: "error", message: "No perteneces a este pedido." });
        if (pedido.FK_Estado !== 2 || !pedido.FK_Casillero) return res.status(409).json({ status: "error", message: "Este pedido no tiene un casillero activo." });
        let qr;
        try { qr = await qrBuffer(pedido); } catch { return res.status(500).json({ status: "error", message: "No se pudo generar el código QR." }); }
        const ok = await correoPase(integrante.Email, integrante.Nombre, pedido, qr);
        if (!ok) return res.status(500).json({ status: "error", message: "No se pudo enviar el correo." });
        res.json({ status: "success", message: `Pase enviado a ${integrante.Email}` });
    });
});

// Al aprobar: cada integrante recibe su casillero y el QR cifrado.
function notificarAprobacion(idPedido) {
    obtenerDetallePedido(idPedido, async (err, pedido) => {
        if (err || !pedido) return console.error('No se pudo notificar la aprobación de', idPedido);
        let qr = null;
        try { qr = await qrBuffer(pedido); } catch (e) { console.error('No se pudo generar el QR de', idPedido, e.message); }
        pedido.equipo.forEach(i => i.Email && correoAprobado(i.Email, i.Nombre, pedido, qr));
    });
}

// Al rechazar: cada integrante recibe el motivo.
function notificarRechazo(idPedido) {
    obtenerDetallePedido(idPedido, (err, pedido) => {
        if (err || !pedido) return console.error('No se pudo notificar el rechazo de', idPedido);
        pedido.equipo.forEach(i => i.Email && correoRechazado(i.Email, i.Nombre, pedido));
    });
}

// --- VENTANILLA 8: OBTENER EL MAPA DE CASILLEROS ---
app.get('/api/casilleros', (req, res) => {
    const query = 'SELECT * FROM Casillero'; 
    db.query(query, (err, resultados) => {
        if (err) return res.status(500).json({ error: "Error interno al cargar el mapa" });
        res.status(200).json(resultados);
    });
});

// =======================================================
// NUEVAS RUTAS DE CONTROL DE CASILLEROS (ADMIN)
// =======================================================

// --- VENTANILLA 9: ADMIN - ACTUALIZAR ESTADO NORMAL (Libre / Mantenimiento) ---
app.put('/api/admin/casilleros/:id/estado', (req, res) => {
    const idCasillero = req.params.id;
    const { nuevo_estado } = req.body; 

    if (![1, 3].includes(Number(nuevo_estado))) {
        return res.status(400).json({ status: "error", message: "Solo se puede cambiar a Libre o Mantenimiento." });
    }

    // No se puede cambiar a mano un casillero ocupado: primero hay que liberarlo.
    const queryUpdate = "UPDATE casillero SET FK_Estado = ? WHERE ID_Casillero = ? AND Fk_Estado <> 2";
    db.query(queryUpdate, [Number(nuevo_estado), idCasillero], (err, r) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al actualizar." });
        if (r.affectedRows === 0) return res.status(409).json({ status: "error", message: "El casillero está ocupado o no existe." });
        res.status(200).json({ status: "success", message: "Estado actualizado." });
    });
});

// --- VENTANILLA 10: ADMIN - VER QUIÉN OCUPA EL CASILLERO ---
app.get('/api/admin/casilleros/:id/pedido', (req, res) => {
    const idCasillero = req.params.id;
    // Buscamos el pedido Aprobado (Estado = 2) asignado a este casillero
    const query = `
        SELECT p.ID_Pedido, p.Proposito, a.Nombre AS Solicitante, a.Registro_Alu
        FROM pedido p
        JOIN alumno a ON p.FK_Solicitante = a.Registro_Alu
        WHERE p.FK_Casillero = ? AND p.FK_Estado = 2
        LIMIT 1
    `;
    db.query(query, [idCasillero], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(result.length > 0 ? result[0] : null);
    });
});

// --- VENTANILLA 11: ADMIN - FORZAR DEVOLUCIÓN (LIBERAR Y DEVOLVER STOCK) ---
app.put('/api/admin/casilleros/:id/liberar', (req, res) => {
    const idCasillero = req.params.id;
    
    db.beginTransaction(err => {
        if (err) return res.status(500).json({status: 'error', message: 'Error de BD'});
        
        // 1. Buscamos el pedido activo en este casillero
        db.query("SELECT ID_Pedido FROM pedido WHERE FK_Casillero = ? AND FK_Estado = 2 LIMIT 1", [idCasillero], (err, pedidos) => {
            if (err) return db.rollback(() => res.status(500).json({error: err.message}));
            
            if (pedidos.length === 0) {
                // Si por alguna razón está ocupado pero no hay pedido, solo liberamos el casillero a la fuerza
                db.query("UPDATE casillero SET FK_Estado = 1 WHERE ID_Casillero = ?", [idCasillero], () => {
                    db.commit(() => res.json({status: 'success', message: 'Casillero liberado (No había pedido activo).'}));
                });
                return;
            }
            
            const idPedido = pedidos[0].ID_Pedido;
            
            // 2. Liberar el casillero (Estado = 1)
            db.query("UPDATE casillero SET FK_Estado = 1 WHERE ID_Casillero = ?", [idCasillero], (err) => {
                if (err) return db.rollback(() => res.status(500).json({error: err.message}));
                
                // 3. Marcar pedido como Finalizado/Devuelto (Usaremos el estado 4) y desvincular el casillero
                db.query("UPDATE pedido SET FK_Estado = 5, FK_Casillero = NULL WHERE ID_Pedido = ?", [idPedido], (err) => {
                    if (err) return db.rollback(() => res.status(500).json({error: err.message}));
                    
                    // 4. Leer los materiales que se prestaron
                    db.query("SELECT FK_Material, Cantidad FROM detalle_pedido WHERE FK_Pedido = ?", [idPedido], (err, detalles) => {
                        if (err) return db.rollback(() => res.status(500).json({error: err.message}));
                        
                        if (detalles.length === 0) return db.commit(() => res.json({status: 'success'}));
                        
                        // 5. Devolver cantidades al inventario
                        let restaurados = 0;
                        detalles.forEach(item => {
                            db.query("UPDATE material SET Cantidad = Cantidad + ? WHERE ID_Material = ?", [item.Cantidad, item.FK_Material], (err) => {
                                if (err) return db.rollback(() => res.status(500).json({error: err.message}));
                                restaurados++;
                                if (restaurados === detalles.length) {
                                    db.commit(() => res.json({status: 'success', message: 'Casillero liberado y materiales devueltos al almacén.'}));
                                }
                            });
                        });
                    });
                });
            });
        });
    });
});

// --- RUTA PARA EL BUSCADOR PREDICTIVO DE ALUMNOS ---
app.get('/api/alumnos/buscar', (req, res) => {
    const busqueda = req.query.q;
    if (!busqueda) return res.json([]);

    const queryBuscar = `
        SELECT Registro_Alu AS registro, Nombre AS nombre, Email AS correo 
        FROM alumno 
        WHERE Nombre LIKE ? OR Registro_Alu LIKE ? 
        LIMIT 10
    `;
    
    const parametroBusqueda = `%${busqueda}%`;
    db.query(queryBuscar, [parametroBusqueda, parametroBusqueda], (err, resultados) => {
        if (err) return res.status(500).json({ error: "Error interno del servidor" });
        res.json(resultados);
    });
});

// =======================================================
// RUTAS DEL INVENTARIO (ADMINISTRADOR) CON IMÁGENES
// =======================================================

app.get('/api/admin/materiales', (req, res) => {
    const queryBuscar = `
        SELECT m.ID_Material, m.Nombre, m.Cantidad, m.Descripcion, m.FK_No_Categoria, c.Nombre_Categoria 
        FROM material m 
        JOIN categoria_material c ON m.FK_No_Categoria = c.No_Categoria
    `;
    db.query(queryBuscar, (err, resultados) => {
        if (err) return res.status(500).json({ error: "Error al cargar el inventario" });
        res.json(resultados);
    });
});

app.post('/api/admin/materiales', upload.single('imagen'), (req, res) => {
    const { ID_Material, Nombre, Cantidad, Descripcion, FK_No_Categoria } = req.body;
    const queryInsertar = `
        INSERT INTO material (ID_Material, Nombre, Cantidad, Descripcion, FK_No_Categoria) 
        VALUES (?, ?, ?, ?, ?)
    `;
    db.query(queryInsertar, [ID_Material, Nombre, Cantidad, Descripcion, FK_No_Categoria], (err, resultado) => {
        if (err) return res.status(500).json({ error: "Error al guardar el material", detalle: err });
        res.json({ status: "success", message: "Material guardado correctamente" });
    });
});

app.put('/api/admin/materiales/:id', upload.single('imagen'), (req, res) => {
    const id = req.params.id;
    const { Nombre, Cantidad, Descripcion, FK_No_Categoria } = req.body;
    const queryActualizar = `
        UPDATE material 
        SET Nombre = ?, Cantidad = ?, Descripcion = ?, FK_No_Categoria = ? 
        WHERE ID_Material = ?
    `;
    db.query(queryActualizar, [Nombre, Cantidad, Descripcion, FK_No_Categoria, id], (err, resultado) => {
        if (err) return res.status(500).json({ error: "Error al actualizar el material" });
        res.json({ status: "success", message: "Material actualizado" });
    });
});

app.delete('/api/admin/materiales/:id', (req, res) => {
    const id = req.params.id;
    const queryEliminar = `DELETE FROM material WHERE ID_Material = ?`;
    db.query(queryEliminar, [id], (err, resultado) => {
        if (err) return res.status(500).json({ error: "Error al eliminar el material" });
        res.json({ status: "success", message: "Material eliminado" });
    });
});

// =======================================================
// RUTAS DE USUARIOS (ADMINISTRADOR)
// =======================================================

app.get('/api/admin/usuarios', (req, res) => {
    const queryBuscar = `
        SELECT 
            a.Registro_Alu, 
            CONCAT(IFNULL(a.Nombre, ''), ' ', IFNULL(a.Apellido, '')) AS NombreCompleto,
            a.Email, 
            a.Telefono, 
            a.FK_Semestre,
            c.Nombre_Carrera 
        FROM alumno a
        LEFT JOIN carrera c ON a.FK_Carrera = c.ID_Carrera
        ORDER BY a.Nombre ASC
    `;
    
    db.query(queryBuscar, (err, resultados) => {
        if (err) return res.status(500).json({ error: "Error al cargar la lista de usuarios" });
        res.json(resultados);
    });
});

app.delete('/api/admin/usuarios/:registro', (req, res) => {
    const registro = req.params.registro;
    const queryEliminar = `DELETE FROM alumno WHERE Registro_Alu = ?`;
    
    db.query(queryEliminar, [registro], (err, resultado) => {
        if (err) {
            if (err.code === 'ER_ROW_IS_REFERENCED_2') {
                return res.status(400).json({ 
                    status: "error", 
                    message: "No se puede eliminar a este usuario porque tiene pedidos registrados en el historial de SafeStock." 
                });
            }
            return res.status(500).json({ status: "error", message: "Error interno al eliminar el usuario." });
        }
        res.json({ status: "success", message: "Usuario eliminado correctamente del sistema." });
    });
});

// =======================================================
// RUTAS DE ESTADÍSTICAS (ADMINISTRADOR)
// Reporte MENSUAL: GET /api/admin/estadisticas?mes=AAAA-MM
// =======================================================

// Solo cuenta pedidos que sí se convirtieron en préstamo
// (excluye 1 = Solicitado, 4 = Rechazado, 6 = Cancelado, 7 = Expirado)
const FILTRO_PRESTAMOS = "p.FK_Estado NOT IN (1, 4, 6, 7)";
const FILTRO_MES = "DATE_FORMAT(p.Fecha_Solicitud, '%Y-%m') = ?";

// Envuelve db.query en una promesa para lanzar varias consultas a la vez
const consultar = (sql, parametros) => new Promise((resolve, reject) => {
    db.query(sql, parametros, (err, resultados) => (err ? reject(err) : resolve(resultados)));
});

app.get('/api/admin/estadisticas', async (req, res) => {
    const mes = req.query.mes;
    if (!/^\d{4}-\d{2}$/.test(mes || '')) {
        return res.status(400).json({ error: "Indica el mes en formato AAAA-MM" });
    }

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

    try {
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
            semestres
        });
    } catch (err) {
        console.error("Error al calcular estadísticas:", err);
        res.status(500).json({ error: "Error al calcular las estadísticas del mes" });
    }
});

// =======================================================
// RUTAS DE REPORTES DE FALLA (ADMINISTRADOR)
// Requiere la tabla de backend/sql/reporte_falla.sql
// =======================================================

app.get('/api/admin/fallas', (req, res) => {
    const queryFallas = `
        SELECT f.ID_Falla AS id, DATE_FORMAT(f.Fecha_Reporte, '%Y-%m-%dT%H:%i:%s') AS fecha, f.FK_Material AS materialId,
               m.Nombre AS materialNombre, c.Nombre_Categoria AS categoria, f.Cantidad AS cantidad,
               f.Tipo_Falla AS tipo, f.Severidad AS severidad, f.Estado AS estado,
               IFNULL(f.FK_Pedido, '') AS pedido, IFNULL(f.FK_Matricula, '') AS matricula,
               f.Descripcion AS descripcion, f.Reportado_Por AS reportadoPor
        FROM reporte_falla f
        JOIN material m ON f.FK_Material = m.ID_Material
        LEFT JOIN categoria_material c ON m.FK_No_Categoria = c.No_Categoria
        ORDER BY f.Fecha_Reporte DESC
    `;

    db.query(queryFallas, (err, resultados) => {
        if (err) return res.status(500).json({ error: "Error al cargar los reportes de falla" });
        res.json(resultados);
    });
});

app.post('/api/admin/fallas', (req, res) => {
    const { materialId, cantidad, tipo, severidad, pedido, matricula, descripcion, reportadoPor } = req.body;

    if (!materialId || !tipo || !severidad || !descripcion || !reportadoPor) {
        return res.status(400).json({ status: "error", message: "Faltan datos obligatorios del reporte." });
    }

    const queryInsertar = `
        INSERT INTO reporte_falla (FK_Material, Cantidad, Tipo_Falla, Severidad, FK_Pedido, FK_Matricula, Descripcion, Reportado_Por)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const valores = [materialId, cantidad || 1, tipo, severidad, pedido || null, matricula || null, descripcion, reportadoPor];

    db.query(queryInsertar, valores, (err, resultado) => {
        if (err) {
            console.error("Error al registrar falla:", err);
            return res.status(500).json({ status: "error", message: "Error al registrar el reporte de falla." });
        }
        res.status(201).json({ status: "success", message: "Reporte de falla registrado.", id: resultado.insertId });
    });
});

app.put('/api/admin/fallas/:id/estado', (req, res) => {
    const { estado } = req.body;
    const estadosValidos = ['Pendiente', 'En reparación', 'Reparado', 'Dado de baja'];
    if (!estadosValidos.includes(estado)) {
        return res.status(400).json({ status: "error", message: "Estado no válido." });
    }

    db.query("UPDATE reporte_falla SET Estado = ? WHERE ID_Falla = ?", [estado, req.params.id], (err) => {
        if (err) return res.status(500).json({ status: "error", message: "Error al actualizar el estado." });
        res.json({ status: "success", message: "Estado actualizado." });
    });
});

// --- ENCENDIDO DEL SERVIDOR ---
app.listen(5000, () => {
    console.log("Servidor corriendo en el puerto 5000");
});
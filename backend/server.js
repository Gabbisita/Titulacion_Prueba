const express = require('express');
const db = require('./db');
const cors = require('cors');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// Configuración del mensajero oficial de SafeStock
const transporador = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'tu_correo_institucional@ceti.mx', // El correo que enviará los avisos
    pass: 'xxxx xxxx xxxx xxxx' // Tu Contraseña de Aplicación de Google (16 letras)
  }
});

// Verificación rápida en la terminal al arrancar el servidor
transporador.verify((error, success) => {
  if (error) {
    console.log("Error en la configuración de correo:", error);
  } else {
    console.log("Servidor listo para enviar correos automáticos ✉️");
  }
});


// --- VENTANILLA 1: LOGIN ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    
    // 1. Ahora SOLO buscamos al alumno por su correo institucional
    const query = "SELECT * FROM alumno WHERE Email = ?";

    db.query(query, [email], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        // Si encontramos el correo en la base de datos...
        if (result.length > 0) {
            const alumno = result[0]; 

            // 2. Usamos bcrypt para comparar el texto (password) con el código secreto (alumno.Password)
            bcrypt.compare(password, alumno.Password, (err, coinciden) => {
                if (err) return res.status(500).json({ error: "Error interno de seguridad" });

                if (coinciden) {
                    // ¡Las contraseñas coinciden matemáticamente! Pasa.
                    res.status(200).json({ status: "success", user: alumno });
                } else {
                    // La contraseña es incorrecta
                    res.status(401).json({ status: "error", message: "Contraseña incorrecta" });
                }
            });
        } else {
            // El correo no existe en la base de datos
            res.status(401).json({ status: "error", message: "Correo no registrado" });
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
    const idMaterial = req.params.id; // Agarramos el ID que viene en la URL
    const query = 'SELECT * FROM material WHERE ID_Material = ?';

    db.query(query, [idMaterial], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });
        
        if (result.length > 0) {
            res.status(200).json(result[0]); // Mandamos el material encontrado
        } else {
            res.status(404).json({ message: "Material no encontrado" });
        }
    });
});

// --- VENTANILLA DE REGISTRO ---
app.post('/registro', (req, res) => {
    // 1. Atrapamos todos los datos que nos mandó React
    const { nombre, registro_alu, email, password, telefono, carrera_texto, semestre_texto } = req.body;

    // --- FILTRO DE DOMINIO ---
    if (!email.endsWith('@ceti.mx')) {
        return res.status(400).json({ 
            status: "error", 
            message: "Por seguridad, solo se permiten correos institucionales (@ceti.mx)" 
        });
    }

    // --- SEGURIDAD: Encriptar la contraseña ---
    const saltRounds = 10;
    bcrypt.hash(password, saltRounds, (err, hashPassword) => {
        if (err) return res.status(500).json({ error: "Error al encriptar" });

        // 2. LA MAGIA DEL TRADUCTOR (Subconsultas)
        // Usamos (SELECT ...) para que MySQL convierta el texto en ID automáticamente
        const query = `
            INSERT INTO alumno (Nombre, Registro_Alu, Email, Password, Telefono, FK_Carrera, FK_Semestre) 
            VALUES (
                ?, 
                ?, 
                ?, 
                ?, 
                ?, 
                (SELECT ID_Carrera FROM carrera WHERE Nombre_Carrera = ? LIMIT 1), 
                (SELECT ID_Semestre FROM semestre WHERE Nombre_Semestre = ? LIMIT 1)
            )
        `;

        // 3. Inyectamos las variables en orden
        db.query(query, [nombre, registro_alu, email, hashPassword, telefono, carrera_texto, semestre_texto], (err, result) => {
            if (err) {
                // Si intentan usar el mismo correo o matrícula
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ status: "error", message: "Este alumno o correo ya está registrado." });
                }
                // Si mandan una carrera que no existe en la base de datos
                if (err.code === 'ER_BAD_NULL_ERROR') {
                    return res.status(400).json({ status: "error", message: "Error: La carrera o semestre seleccionados no son válidos." });
                }
                return res.status(500).json({ status: "error", message: err.message });
            }

            res.status(201).json({ status: "success", message: "Cuenta creada con éxito" });
        });
    });
});

// --- VENTANILLA 4: REGISTRAR UN PEDIDO (CON ESCUDO ANTIDUPLICADOS) ---
app.post('/api/pedidos', (req, res) => {
    const { id_pedido, fecha_recogida, proposito, solicitante, integrantes, materiales } = req.body;

    // 1. Extraemos solo las matrículas de los integrantes para la consulta SQL
    const listaMatriculas = integrantes.map(i => i.matricula);

    // 2. Consulta de control: Cruzamos equipo_pedido con pedido y usuario
    const queryValidar = `
        SELECT ep.FK_Matricula, u.Nombre 
        FROM equipo_pedido ep
        JOIN pedido p ON ep.FK_Pedido = p.ID_Pedido
        JOIN usuario u ON ep.FK_Matricula = u.Registro_Alu
        WHERE p.Fecha_Recogida = ? AND ep.FK_Matricula IN (?);
    `;

    // 3. Ejecutamos la inspección antes de registrar nada
    db.query(queryValidar, [fecha_recogida, [listaMatriculas]], (err, duplicados) => {
        if (err) {
            console.error("Error al validar duplicados:", err);
            return res.status(500).json({ status: "error", message: "Error interno al verificar el equipo." });
        }

        // ¡ALERTA! Si la consulta regresa filas, significa que alguien ya está ocupado
        if (duplicados.length > 0) {
            const alumnoConflictivo = duplicados[0].Nombre;
            return res.status(400).json({ 
                status: "error", 
                message: `${alumnoConflictivo} ya tiene una solicitud de material registrada para esta misma fecha. Coordínate con tu equipo.` 
            });
        }

        // 4. SI PASA EL ESCUDO, SE PROCEDE A GUARDAR EL PEDIDO (Tu código base de inserción)
        const queryPedido = `
            INSERT INTO pedido (ID_Pedido, Fecha_Solicitud, Fecha_Recogida, Proposito, FK_Solicitante, FK_Estado) 
            VALUES (?, NOW(), ?, ?, ?, 1);
        `;

        db.query(queryPedido, [id_pedido, fecha_recogida, proposito, solicitante], (err, result) => {
            if (err) {
                console.error("Error al insertar pedido:", err);
                return res.status(500).json({ status: "error", message: "Error al registrar la cabecera del pedido." });
            }

            // Inserción de los integrantes en equipo_pedido
            const queryDetalle = `INSERT INTO detalle_pedido (FK_Pedido, FK_Material, Cantidad) VALUES ?`;
            const valoresDetalles = materiales.map(m => [id_pedido, m.id, m.cantidad]);

                db.query(queryDetalle, [valoresDetalles], (err) => {
                    if (err) {
                        console.error("Error al insertar detalles:", err);
                        return res.status(500).json({ status: "error", message: "Error al registrar los materiales." });
                    }

                    // --- NUEVA LÓGICA: BUSCAR CORREOS Y NOTIFICAR AL EQUIPO ---
                    // Buscamos los correos de todos los integrantes involucrados
                    const queryCorreos = `SELECT Correo, Nombre FROM usuario WHERE Registro_Alu IN (?);`;
                    
                    db.query(queryCorreos, [listaMatriculas], (err, usuarios) => {
                        if (!err && usuarios.length > 0) {
                            
                            // Enviamos un correo individual a cada miembro del equipo
                            usuarios.forEach(usuario => {
                                const opcionesCorreo = {
                                    from: '"SafeStock CETI" <tu_correo_institucional@ceti.mx>',
                                    to: usuario.Correo,
                                    subject: `🚨 Notificación de Préstamo - Folio: ${id_pedido}`,
                                    html: `
                                        <div style="font-family: sans-serif; padding: 20px; color: #334155;">
                                            <h2 style="color: #1e3a8a;">¡Hola, ${usuario.Nombre}!</h2>
                                            <p>Te informamos que has sido incluido en una nueva solicitud de préstamo de materiales en la plataforma <strong>SafeStock</strong>.</p>
                                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                                            <p><strong>Detalles del Vale:</strong></p>
                                            <ul>
                                                <li><strong>Folio de Pedido:</strong> ${id_pedido}</li>
                                                <li><strong>Fecha Programada de Recogida:</strong> ${fecha_recogida}</li>
                                                <li><strong>Propósito:</strong> "${proposito}"</li>
                                            </ul>
                                            <p style="font-size: 12px; color: #94a3b8; margin-top: 30px;">Si consideras que esto es un error o no autorizaste el uso de tu matrícula, acude inmediatamente a la ventanilla del almacén de electrónica.</p>
                                        </div>
                                    `
                                };

                                transporador.sendMail(opcionesCorreo, (errorMail, info) => {
                                    if (errorMail) console.error("Error al enviar a " + usuario.Correo, errorMail);
                                });
                            });
                        }
                    });

                    // Éxito absoluto: Respondemos a React inmediatamente sin esperar a que terminen de salir todos los correos
                    res.status(200).json({ status: "success", message: "Pedido procesado y equipo notificado por correo." });
                });
            });
        });
});

// --- VENTANILLA 5: OBTENER HISTORIAL DE PEDIDOS ---
app.get('/api/mis-pedidos/:matricula', (req, res) => {
    const matricula = req.params.matricula;

    // Juntamos 5 tablas y usamos GROUP_CONCAT para hacer una lista separada por comas
    const queryHistorial = `
        SELECT 
            p.ID_Pedido, 
            p.Fecha_Solicitud, 
            p.Fecha_Recogida, 
            p.Proposito, 
            est.Nombre_de_estado AS Estado, 
            ep.Rol,
            GROUP_CONCAT(CONCAT(dp.Cantidad, 'x ', m.Nombre) SEPARATOR '|') AS ListaMateriales
        FROM pedido p
        JOIN equipo_pedido ep ON p.ID_Pedido = ep.FK_Pedido
        JOIN estado_pedido est ON p.FK_Estado = est.No_estado
        LEFT JOIN detalle_pedido dp ON p.ID_Pedido = dp.FK_Pedido
        LEFT JOIN material m ON dp.FK_Material = m.ID_Material
        WHERE ep.FK_Matricula = ?
        GROUP BY p.ID_Pedido, p.Fecha_Solicitud, p.Fecha_Recogida, p.Proposito, est.Nombre_de_estado, ep.Rol
        ORDER BY p.Fecha_Solicitud DESC;
    `;

    db.query(queryHistorial, [matricula], (err, resultados) => {
        if (err) {
            console.error("Error al buscar historial:", err);
            return res.status(500).json({ status: "error", message: "Error al buscar los pedidos." });
        }
        res.status(200).json({ status: "success", pedidos: resultados });
    });
});



// --- ENCENDIDO DEL SERVIDOR ---
app.listen(5000, () => {
    console.log("Servidor corriendo en el puerto 5000");
});
const express = require('express');
const db = require('./db');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// --- VENTANILLA 1: LOGIN INTELIGENTE (ADMINISTRADOR Y ALUMNO) ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    // 1. Primero buscamos si el correo es del Jefe (Administrador)
    const queryAdmin = "SELECT * FROM administrador WHERE Email = ?";

    db.query(queryAdmin, [email], (err, resultAdmin) => {
        if (err) return res.status(500).json({ error: err.message });

        // Si encontramos el correo en la tabla administrador
        if (resultAdmin.length > 0) {
            const admin = resultAdmin[0]; 

            bcrypt.compare(password, admin.Password, (err, coinciden) => {
                if (err) return res.status(500).json({ error: "Error interno de seguridad" });

                if (coinciden) {
                    // Pasa como ADMIN (React atrapará esto y lo mandará a /admin)
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

                    bcrypt.compare(password, alumno.Password, (err, coinciden) => {
                        if (err) return res.status(500).json({ error: "Error interno de seguridad" });

                        if (coinciden) {
                            // Pasa como ALUMNO (React lo mandará a /inicio)
                            return res.status(200).json({ status: "success", role: "alumno", user: alumno });
                        } else {
                            return res.status(401).json({ status: "error", message: "Contraseña incorrecta" });
                        }
                    });
                } else {
                    // Si no está en NINGUNA de las dos tablas
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

    if (!email.endsWith('@ceti.mx')) {
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
                ?, 
                ?, 
                ?, 
                ?, 
                ?, 
                (SELECT ID_Carrera FROM carrera WHERE Nombre_Carrera = ? LIMIT 1), 
                (SELECT ID_Semestre FROM semestre WHERE Nombre_Semestre = ? LIMIT 1)
            )
        `;

        db.query(query, [nombre, registro_alu, email, hashPassword, telefono, carrera_texto, semestre_texto], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ status: "error", message: "Este alumno o correo ya está registrado." });
                }
                if (err.code === 'ER_BAD_NULL_ERROR') {
                    return res.status(400).json({ status: "error", message: "Error: La carrera o semestre seleccionados no son válidos." });
                }
                return res.status(500).json({ status: "error", message: err.message });
            }

            res.status(201).json({ status: "success", message: "Cuenta creada con éxito" });
        });
    });
});

// --- VENTANILLA 4: REGISTRAR UN PEDIDO (CORREGIDO PARA EQUIPOS) ---
app.post('/api/pedidos', (req, res) => {
    const { id_pedido, fecha_recogida, proposito, solicitante, integrantes, materiales } = req.body;

    const listaMatriculas = integrantes.map(i => i.matricula);

    const queryValidar = `
        SELECT ep.FK_Matricula, u.Nombre 
        FROM equipo_pedido ep
        JOIN pedido p ON ep.FK_Pedido = p.ID_Pedido
        JOIN alumno u ON ep.FK_Matricula = u.Registro_Alu
        WHERE p.Fecha_Recogida = ? AND ep.FK_Matricula IN (?);
    `;

    // SOLUCIÓN 1: Quitamos los corchetes extra alrededor de listaMatriculas
    db.query(queryValidar, [fecha_recogida, listaMatriculas], (err, duplicados) => {
        if (err) {
            console.error("Error SQL en validación:", err);
            return res.status(500).json({ status: "error", message: "Error interno al verificar el equipo." });
        }

        if (duplicados.length > 0) {
            const alumnoConflictivo = duplicados[0].Nombre;
            return res.status(400).json({ 
                status: "error", 
                message: `${alumnoConflictivo} ya tiene una solicitud de material registrada para esta misma fecha.` 
            });
        }

        const queryPedido = `
            INSERT INTO pedido (ID_Pedido, Fecha_Solicitud, Fecha_Recogida, Proposito, FK_Solicitante, FK_Estado) 
            VALUES (?, NOW(), ?, ?, ?, 1);
        `;

        db.query(queryPedido, [id_pedido, fecha_recogida, proposito, solicitante], (err, result) => {
            if (err) {
                console.error("Error al insertar pedido:", err);
                return res.status(500).json({ status: "error", message: "Error al registrar la cabecera del pedido." });
            }

            const queryEquipo = `INSERT INTO equipo_pedido (FK_Pedido, FK_Matricula, Rol) VALUES ?`;
            const valoresEquipo = integrantes.map(i => [
                id_pedido, 
                i.matricula, 
                i.matricula === solicitante ? 'Líder' : 'Colaborador'
            ]);

            db.query(queryEquipo, [valoresEquipo], (err) => {
                if (err) console.error("Error menor al guardar equipo:", err);

                // Finalmente insertamos las herramientas
                const queryDetalle = `INSERT INTO detalle_pedido (FK_Pedido, FK_Material, Cantidad) VALUES ?`;
                const valoresDetalles = materiales.map(m => [id_pedido, m.id, m.cantidad]);

                db.query(queryDetalle, [valoresDetalles], (err) => {
                    if (err) {
                        console.error("Error al insertar detalles:", err);
                        return res.status(500).json({ status: "error", message: "Error al registrar los materiales." });
                    }

                    res.status(200).json({ status: "success", message: "Pedido de equipo procesado con éxito." });
                });
            });
        });
    });
});

// --- VENTANILLA 5: OBTENER HISTORIAL DE PEDIDOS ---
app.get('/api/mis-pedidos/:matricula', (req, res) => {
    const matricula = req.params.matricula;

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

// --- VENTANILLA 5: OBTENER PEDIDOS PENDIENTES PARA EL ADMIN ---
app.get('/api/admin/pedidos', (req, res) => {
    // Asumimos que FK_Estado = 1 significa "Pendiente"
    const queryPedidos = `
        SELECT ID_Pedido, Fecha_Recogida, Proposito 
        FROM pedido 
        WHERE FK_Estado = 1 
        ORDER BY Fecha_Recogida ASC;
    `;

    db.query(queryPedidos, (err, pedidosDb) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Si no hay pedidos, regresamos un arreglo vacío rápido
        if (pedidosDb.length === 0) return res.status(200).json([]);

        const idsPedidos = pedidosDb.map(p => p.ID_Pedido);

        // Extraemos a todos los integrantes de todos los pedidos encontrados
        const queryEquipo = `
            SELECT ep.FK_Pedido, ep.FK_Matricula, a.Nombre, ep.Rol 
            FROM equipo_pedido ep 
            JOIN alumno a ON ep.FK_Matricula = a.Registro_Alu 
            WHERE ep.FK_Pedido IN (?)
        `;

        // Extraemos todas las herramientas de esos pedidos
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

                // Armamos el rompecabezas para que el JSON quede exactamente como lo pide React
                const pedidosArmados = pedidosDb.map(pedido => {
                    const integrantes = equipoDb.filter(e => e.FK_Pedido === pedido.ID_Pedido);
                    const lider = integrantes.find(e => e.Rol === 'Líder') || integrantes[0];
                    const colaboradores = integrantes.filter(e => e.Rol !== 'Líder');
                    const materiales = materialesDb.filter(m => m.FK_Pedido === pedido.ID_Pedido);

                    // Damos formato a la fecha
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

// --- ENCENDIDO DEL SERVIDOR ---
app.listen(5000, () => {
    console.log("Servidor corriendo en el puerto 5000");
});
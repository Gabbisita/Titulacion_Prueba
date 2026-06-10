const express = require('express');
const db = require('./db');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// --- VENTANILLA 1: LOGIN ---
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const query = "SELECT * FROM alumno WHERE Email = ? AND Password = ?";

    db.query(query, [email, password], (err, result) => {
        if (err) return res.status(500).json({ error: err.message });

        if (result.length > 0) {
            res.status(200).json({ status: "success", user: result[0] });
        } else {
            res.status(401).json({ status: "error", message: "Usuario o Registro incorrecto" });
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

// --- ENCENDIDO DEL SERVIDOR ---
app.listen(5000, () => {
    console.log("Servidor corriendo en el puerto 5000");
});
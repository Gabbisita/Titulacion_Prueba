const express = require('express');
const db = require('./db');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// --- VENTANILLA 1: LOGIN ---
app.post('/login', (req, res) => {
    const { registro, password } = req.body;
    const query = "SELECT * FROM alumno WHERE Email = ? AND Registro_Alu = ?";

    db.query(query, [registro, password], (err, result) => {
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

// --- ENCENDIDO DEL SERVIDOR ---
app.listen(5000, () => {
    console.log("Servidor corriendo en el puerto 5000");
});
const express = require('express');
const db = require('./db');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/Login', (req, res) =>{
    const { email, registro } = req.body;

    const query = "SELECT * FROM alumno WHERE Email = ? AND Registro_Alu = ?";

    db.query(query, [email, registro], (err, result) => {
        if(err) return res.status(500).json({error: err.message});

        if(result.length > 0) {
            res.status(200).json({ status: "succes", user: result[0]});
        } else{

            res.status(401).json({status: "Error", message: "Usuario o Registro incorrecto" });
        }

    });

});

app.listen(5000, () => {
    console.log("Servidor corriendo en el puerto 5000");

});
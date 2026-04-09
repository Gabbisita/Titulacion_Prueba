const mysql = require('mysql2');

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Leonelhalo2003.',
    database: 'almacen_electronica'

});

db.connect((err) =>{
    if (err) {
        console.error('Error de conexion:' , err);
        return;
    }
    console.log('¡Conectado a la base de datos de Almacen!');

});

module.exports = db;
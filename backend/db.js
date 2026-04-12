const mysql = require('mysql2');

const db = mysql.createConnection({
  host: 'gateway01.us-east-1.prod.aws.tidbcloud.com',
  port: 4000,
  user: '4HBSXKLUs96dsK7.root',
  password: '5CwVuuw7mWbCGuu0',
  database: 'almacen_electronica',
  ssl: {
      rejectUnauthorized: true
  }
});

db.connect((err) => {
  if (err) {
    console.error('Error de conexion:', err);
    return;
  }
  console.log('¡Conectado a la base de datos en la NUBE!');
});

module.exports = db;
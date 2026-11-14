require('dotenv').config();
const mysql = require('mysql2');

// La base de datos en la nube cierra las conexiones inactivas. Antes, cuando
// eso pasaba, el servidor se quedaba colgado y el login mostraba
// "Error de conexión". Ahora la conexión se reabre sola.
let connection;

function conectar() {
  connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    ssl: {
      rejectUnauthorized: true
    },
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    connectTimeout: 10000
  });

  connection.connect((err) => {
    if (err) {
      console.error('Error de conexion:', err.message);
      setTimeout(conectar, 3000);
      return;
    }
    console.log('¡Conectado a la base de datos en la NUBE!');
  });

  connection.on('error', (err) => {
    console.error('Se perdió la conexión con la base de datos:', err.code);
    if (err.fatal) conectar();
  });
}

conectar();

// Ping periódico para que la nube no cierre la conexión por inactividad.
setInterval(() => {
  connection.ping((err) => {
    if (err) {
      console.error('Ping falló, reconectando...', err.code);
      try { connection.destroy(); } catch (_) {}
      conectar();
    }
  });
}, 60000).unref();

// server.js usa db.query, db.beginTransaction, db.commit y db.rollback;
// todos se envían a la conexión activa.
const db = {
  query: (...args) => connection.query(...args),
  beginTransaction: (...args) => connection.beginTransaction(...args),
  commit: (...args) => connection.commit(...args),
  rollback: (...args) => connection.rollback(...args),
};

module.exports = db;

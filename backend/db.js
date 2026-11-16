const mysql = require('mysql2');
const config = require('./config');

// Grupo de conexiones (pool):
// - Si la nube cierra una conexión inactiva, el pool abre otra sola.
// - Cada transacción usa SU PROPIA conexión; así dos peticiones simultáneas
//   no se mezclan dentro de la misma transacción.
// - multipleStatements queda apagado: aunque alguien lograra inyectar texto,
//   no podría encadenar una segunda instrucción (p. ej. "; DROP TABLE ...").
const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  ssl: config.db.ssl ? { rejectUnauthorized: true } : undefined,
  waitForConnections: true,
  connectionLimit: 5,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  connectTimeout: 10000,
  multipleStatements: false,
});
const promesas = pool.promise();

promesas.query('SELECT 1')
  .then(() => console.log('¡Conectado a la base de datos!'))
  .catch((err) => console.error('Error de conexión con la base de datos:', err.code || err.message));

// Todas las consultas usan parámetros (?), nunca texto pegado: evita inyección SQL.
const consultar = async (sql, parametros) => (await promesas.query(sql, parametros))[0];

// Ejecuta fn(consultar) dentro de una transacción. Si fn lanza un error, se deshace todo.
async function transaccion(fn) {
  const conexion = await promesas.getConnection();
  try {
    await conexion.beginTransaction();
    const resultado = await fn(async (sql, parametros) => (await conexion.query(sql, parametros))[0]);
    await conexion.commit();
    return resultado;
  } catch (err) {
    await conexion.rollback().catch(() => {});
    throw err;
  } finally {
    conexion.release();
  }
}

module.exports = { consultar, transaccion, cerrar: () => promesas.end() };

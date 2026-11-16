// =======================================================
// BITÁCORA DE SEGURIDAD
// =======================================================
// Cada evento importante (inicios de sesión, accesos negados, datos rechazados,
// acciones del administrador, errores internos) se guarda en:
//   1. la tabla bitacora_seguridad (se consulta desde el panel del administrador), y
//   2. el archivo backend/logs/seguridad.log (respaldo si la base de datos no responde).
// NUNCA se guardan contraseñas, códigos de recuperación ni tokens.
const fs = require('fs');
const path = require('path');
const { consultar } = require('./db');

const CARPETA = path.join(__dirname, 'logs');
const ARCHIVO = path.join(CARPETA, 'seguridad.log');
try { fs.mkdirSync(CARPETA, { recursive: true }); } catch { /* sin permisos: solo BD */ }

// Quita saltos de línea y caracteres de control para que nadie pueda "falsificar"
// renglones de la bitácora metiendo texto raro en un campo.
const limpiar = (valor, max) =>
  String(valor ?? '').replace(/[\u0000-\u001F\u007F]+/g, ' ').slice(0, max);

// nivel: 'info' (normal) | 'alerta' (sospechoso) | 'critico' (ataque probable o error grave)
function registrar(evento, { req, nivel = 'info', usuario, rol, detalle } = {}) {
  const fila = {
    Nivel: nivel,
    Evento: limpiar(evento, 40),
    IP: limpiar(req?.ip, 45),
    Usuario: limpiar(usuario ?? req?.usuario?.sub, 120),
    Rol: limpiar(rol ?? req?.usuario?.rol, 10),
    Metodo: limpiar(req?.method, 8),
    Ruta: limpiar(req?.path, 200), // sin la query: ahí podría venir un código QR
    Detalle: limpiar(detalle, 500),
    Agente: limpiar(req?.get?.('user-agent'), 200),
  };

  fs.appendFile(ARCHIVO, JSON.stringify({ fecha: new Date().toISOString(), ...fila }) + '\n', () => {});
  consultar('INSERT INTO bitacora_seguridad SET ?', [fila]).catch((err) => {
    console.error('No se pudo guardar en la bitácora (¿falta correr "npm run migrar"?):', err.code || err.message);
  });
  if (nivel !== 'info') console.warn(`[seguridad:${nivel}] ${fila.Evento} ip=${fila.IP} usuario=${fila.Usuario} ${fila.Detalle}`);
}

module.exports = { registrar };

require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true });

const OBLIGATORIAS = ['DB_HOST', 'DB_USER', 'DB_PASS', 'DB_NAME', 'JWT_SECRET', 'QR_SECRET'];

const faltantes = OBLIGATORIAS.filter((v) => !process.env[v] || !process.env[v].trim());
if (faltantes.length > 0) {
  console.error('\n❌ Faltan variables en backend/.env: ' + faltantes.join(', '));
  console.error('   Copia backend/.env.example a backend/.env y llena los valores.\n');
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('\n❌ JWT_SECRET es demasiado corto (mínimo 32 caracteres). Genera uno con: npm run claves\n');
  process.exit(1);
}
if (process.env.CASILLERO_API_KEY && process.env.CASILLERO_API_KEY.length < 24) {
  console.error('\n❌ CASILLERO_API_KEY es demasiado corta (mínimo 24 caracteres). Genera una con: npm run claves\n');
  process.exit(1);
}
if (!process.env.CASILLERO_API_KEY) {
  console.warn('⚠️  Sin CASILLERO_API_KEY: el casillero físico (ESP32) no podrá verificar códigos QR.');
}

const lista = (texto) => String(texto || '').split(',').map((s) => s.trim()).filter(Boolean);

module.exports = {
  puerto: Number(process.env.PORT || 5000),
  produccion: process.env.NODE_ENV === 'production',
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    // La base en la nube exige TLS. Solo se apaga para una base local de pruebas.
    ssl: process.env.DB_SSL !== 'false',
  },
  jwtSecret: process.env.JWT_SECRET,
  casilleroApiKey: process.env.CASILLERO_API_KEY || '',
  // Orígenes externos que pueden llamar a la API desde un navegador (separados por coma).
  // Vacío = solo el propio sitio (el frontend llega por el proxy /backend).
  corsOrigenes: lista(process.env.CORS_ORIGENES),
};

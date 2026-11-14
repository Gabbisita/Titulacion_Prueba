require('dotenv').config();
const crypto = require('crypto');
const QRCode = require('qrcode');

// =======================================================
// QR CIFRADO (AES-256-GCM) PENSADO PARA EL ESCÁNER GM60
// =======================================================
// - Solo este servidor tiene la clave (QR_SECRET en backend/.env). Cualquier otra app
//   de QR solo ve texto sin sentido; si se cambia un solo carácter, deja de ser válido.
// - Formato: "SSC2" + Base32 (solo A-Z y 2-7), ~78 caracteres.
//   * Solo mayúsculas y números → el QR usa modo alfanumérico (más pequeño, versión 4)
//     y el GM60 lo "teclea" igual en cualquier distribución de teclado (sin . _ - :).
//   * Se acepta en minúsculas por si el Bloq Mayús estaba activado al escanear.
// - Imagen: negro puro sobre blanco, margen de 4 módulos, corrección de errores M.
const PREFIJO = 'SSC2';
const PREFIJO_ANTERIOR = 'SSC1.'; // QR generados antes del ajuste para el GM60
const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

if (!process.env.QR_SECRET) {
  console.warn('⚠️  Falta QR_SECRET en backend/.env: los códigos QR no se podrán generar ni verificar.');
}
const clave = () => {
  if (!process.env.QR_SECRET) throw new Error('QR_SECRET no configurado');
  return crypto.createHash('sha256').update(process.env.QR_SECRET).digest();
};

function aBase32(buf) {
  let bits = 0, valor = 0, salida = '';
  for (const byte of buf) {
    valor = (valor << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      salida += ALFABETO[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) salida += ALFABETO[(valor << (5 - bits)) & 31];
  return salida;
}

function deBase32(texto) {
  let bits = 0, valor = 0;
  const bytes = [];
  for (const c of texto) {
    const i = ALFABETO.indexOf(c);
    if (i === -1) return null;
    valor = (valor << 5) | i;
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// Contenido cifrado: [casillero 1 byte][fecha en segundos 4 bytes][folio del pedido]
function crearToken(pedido) {
  const folio = Buffer.from(String(pedido.ID_Pedido), 'utf8');
  const datos = Buffer.alloc(5 + folio.length);
  datos.writeUInt8(Number(pedido.FK_Casillero) & 255, 0);
  datos.writeUInt32BE(Math.floor(Date.now() / 1000), 1);
  folio.copy(datos, 5);

  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv('aes-256-gcm', clave(), iv);
  const cifrado = Buffer.concat([cifrador.update(datos), cifrador.final()]);
  return PREFIJO + aBase32(Buffer.concat([iv, cifrador.getAuthTag(), cifrado]));
}

const descifrar = (bruto) => {
  if (!bruto || bruto.length < 29) return null;
  const descifrador = crypto.createDecipheriv('aes-256-gcm', clave(), bruto.subarray(0, 12));
  descifrador.setAuthTag(bruto.subarray(12, 28));
  return Buffer.concat([descifrador.update(bruto.subarray(28)), descifrador.final()]);
};

// Devuelve { p: folio, c: idCasillero, t: fecha ms } o null si es falso, alterado o ilegible.
function leerToken(token) {
  try {
    const crudo = String(token || '').replace(/\s+/g, ''); // el GM60 agrega Enter/salto al final
    if (crudo.toUpperCase().startsWith(PREFIJO)) {
      const datos = descifrar(deBase32(crudo.slice(PREFIJO.length).toUpperCase()));
      if (!datos || datos.length < 6) return null;
      return { c: datos.readUInt8(0), t: datos.readUInt32BE(1) * 1000, p: datos.subarray(5).toString('utf8') };
    }
    if (crudo.startsWith(PREFIJO_ANTERIOR)) {
      const datos = descifrar(Buffer.from(crudo.slice(PREFIJO_ANTERIOR.length), 'base64url'));
      return datos ? JSON.parse(datos.toString('utf8')) : null;
    }
    return null;
  } catch {
    return null;
  }
}

const opcionesQR = {
  width: 360,
  margin: 4,
  errorCorrectionLevel: 'M',
  color: { dark: '#000000', light: '#ffffff' },
};
const qrDataUrl = (pedido) => QRCode.toDataURL(crearToken(pedido), opcionesQR);
const qrBuffer = (pedido) => QRCode.toBuffer(crearToken(pedido), opcionesQR);

module.exports = { crearToken, leerToken, qrDataUrl, qrBuffer };

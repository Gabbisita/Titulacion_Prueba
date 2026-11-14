require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');

const REMITENTE = 'Safe Stock CETI';
// Logo incrustado en cada correo (se muestra aunque el lector bloquee imágenes externas)
const LOGO = { filename: 'safestock-ceti.png', path: path.join(__dirname, 'logo-correo.png'), cid: 'logo-safestock' };

// Configuración en backend/.env:
//   SMTP_USER=tucorreo@gmail.com
//   SMTP_PASS=contraseña de aplicación de 16 letras (no la contraseña normal)
//   SMTP_HOST / SMTP_PORT son opcionales; por defecto se usa Gmail.
const configurado = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

const transporter = configurado
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      secure: Number(process.env.SMTP_PORT || 465) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS.replace(/\s/g, '') },
    })
  : null;

if (!configurado) {
  console.warn('⚠️  Correos desactivados: faltan SMTP_USER y SMTP_PASS en backend/.env');
} else {
  transporter.verify((err) => {
    if (err) console.error('⚠️  No se pudo conectar al servidor de correo:', err.message);
    else console.log('📧 Servidor de correo listo');
  });
}

const escapar = (t) =>
  String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function plantilla(titulo, contenidoHtml) {
  return `
  <div style="background:#f1f5f9;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
      <div style="background:#0a0f1d;padding:20px 32px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td><img src="cid:logo-safestock" width="60" height="60" alt="Safe Stock CETI" style="display:block;"/></td>
          <td style="padding-left:14px;color:#ffffff;font-weight:900;font-size:20px;letter-spacing:0.5px;">SAFE STOCK CETI</td>
        </tr></table>
      </div>
      <div style="padding:32px;color:#1a1f2e;font-size:15px;line-height:1.6;">
        <h1 style="font-size:22px;margin:0 0 16px;">${titulo}</h1>
        ${contenidoHtml}
      </div>
      <div style="padding:16px 32px;background:#f8f9fc;color:#64748b;font-size:12px;">
        Safe Stock CETI · División de Ingeniería Mecatrónica · Este es un correo automático, no respondas a este mensaje.
      </div>
    </div>
  </div>`;
}

// Nunca lanza error: si el correo falla, el registro o el pedido siguen funcionando.
async function enviar(para, asunto, html, adjuntos = []) {
  asunto = `${REMITENTE} · ${asunto}`;
  if (!configurado) {
    console.warn(`(correo no enviado a ${para}: SMTP sin configurar) ${asunto}`);
    return false;
  }
  try {
    await transporter.sendMail({
      from: { name: REMITENTE, address: process.env.SMTP_USER },
      to: para,
      subject: asunto,
      html,
      attachments: [LOGO, ...adjuntos],
    });
    console.log(`📧 Correo enviado a ${para}: ${asunto}`);
    return true;
  } catch (err) {
    console.error(`Error enviando correo a ${para}:`, err.message);
    return false;
  }
}

function correoBienvenida(email, nombre) {
  return enviar(
    email,
    '¡Bienvenido!',
    plantilla(
      `¡Hola, ${escapar(nombre)}!`,
      `<p>Tu cuenta en <b>Safe Stock CETI</b> se creó correctamente.</p>
       <p>Ya puedes iniciar sesión con tu correo institucional <b>${escapar(email)}</b> para solicitar préstamos de equipos y materiales del laboratorio.</p>`
    )
  );
}

function correoPedido(email, nombre, pedido) {
  const filas = pedido.materiales
    .map(
      (m) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapar(m.nombre)}</td>
             <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">${escapar(m.cantidad)}</td></tr>`
    )
    .join('');
  return enviar(
    email,
    `Solicitud recibida · Pedido ${pedido.id}`,
    plantilla(
      `Recibimos tu solicitud, ${escapar(nombre)}`,
      `<p>Tu pedido <b>${escapar(pedido.id)}</b> quedó registrado y está <b>pendiente de aprobación</b>.</p>
       <p><b>Fecha de recogida:</b> ${escapar(pedido.fecha)}<br/>
          <b>Horario:</b> ${escapar(pedido.horaRecogida)} – ${escapar(pedido.horaDevolucion)}<br/>
          <b>Propósito:</b> ${escapar(pedido.proposito)}</p>
       <table style="width:100%;border-collapse:collapse;margin-top:12px;">
         <tr><th style="text-align:left;color:#64748b;font-size:12px;">MATERIAL</th><th style="text-align:right;color:#64748b;font-size:12px;">CANTIDAD</th></tr>
         ${filas}
       </table>
       <p style="margin-top:20px;">Te avisaremos cuando el administrador revise tu solicitud.</p>`
    )
  );
}

function correoRecuperacion(email, nombre, codigo) {
  return enviar(
    email,
    `Código para restablecer tu contraseña: ${codigo}`,
    plantilla(
      'Restablecer contraseña',
      `<p>Hola ${escapar(nombre)}, recibimos una solicitud para cambiar la contraseña de tu cuenta.</p>
       <p>Escribe este código en la página:</p>
       <p style="font-size:34px;font-weight:900;letter-spacing:10px;text-align:center;background:#f1f5f9;border-radius:12px;padding:16px;">${codigo}</p>
       <p>El código vence en <b>15 minutos</b>. Si no fuiste tú, ignora este correo; tu contraseña no cambiará.</p>`
    )
  );
}

// Fecha_Recogida se guarda como texto ("Lunes 16 de noviembre, 2026"); solo se formatea si viene como fecha ISO.
const fecha = (f) => {
  if (!f) return '';
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(f))) return String(f);
  const d = new Date(f);
  return isNaN(d) ? String(f) : d.toLocaleDateString('es-MX', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' });
};

function listaMateriales(materiales) {
  return `<table style="width:100%;border-collapse:collapse;margin-top:12px;">
    <tr><th style="text-align:left;color:#64748b;font-size:12px;">MATERIAL</th><th style="text-align:right;color:#64748b;font-size:12px;">CANTIDAD</th></tr>
    ${materiales
      .map(
        (m) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">${escapar(m.Nombre)}</td>
                <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:bold;">${escapar(m.Cantidad)}</td></tr>`
      )
      .join('')}
  </table>`;
}

const nombreCasillero = (pedido) => pedido.Casillero || (pedido.FK_Casillero ? 'Casillero ' + pedido.FK_Casillero : 'Por asignar');

// Bloque con el QR cifrado incrustado (qrPng: Buffer PNG generado por qrSeguro.js)
const bloqueQR = (qrPng) =>
  qrPng
    ? `<p style="text-align:center;margin:24px 0 8px;"><img src="cid:qr-pase" width="220" height="220" alt="Código QR de acceso" style="border:1px solid #e2e8f0;border-radius:12px;padding:8px;"/></p>
       <p style="text-align:center;color:#64748b;font-size:12px;margin:0 0 20px;">Código cifrado: solo lo puede leer el sistema Safe Stock CETI.</p>`
    : '';
const adjuntoQR = (qrPng, pedido) => (qrPng ? [{ filename: `QR-${pedido.ID_Pedido}.png`, content: qrPng, cid: 'qr-pase' }] : []);

function correoAprobado(email, nombre, pedido, qrPng) {
  return enviar(
    email,
    `Pedido ${pedido.ID_Pedido} aprobado · ${nombreCasillero(pedido)}`,
    plantilla(
      `¡Tu pedido fue aprobado, ${escapar(nombre)}!`,
      `<p>Tus materiales quedaron resguardados en:</p>
       <p style="font-size:26px;font-weight:900;text-align:center;background:#eff6ff;color:#2563eb;border-radius:12px;padding:16px;">${escapar(nombreCasillero(pedido))}</p>
       <p><b>Pedido:</b> ${escapar(pedido.ID_Pedido)}<br/>
          <b>Fecha de recogida:</b> ${escapar(fecha(pedido.Fecha_Recogida))}<br/>
          <b>Horario:</b> ${escapar(pedido.Hora_Recogida || '')} – ${escapar(pedido.Hora_Devolucion || '')}</p>
       ${bloqueQR(qrPng)}
       <p>Presenta este código QR en el escáner del casillero para recoger tus materiales. También lo encuentras en <b>Safe Stock CETI → Pedidos</b>.</p>
       ${listaMateriales(pedido.materiales)}`
    ),
    adjuntoQR(qrPng, pedido)
  );
}

function correoRechazado(email, nombre, pedido) {
  return enviar(
    email,
    `Pedido ${pedido.ID_Pedido} rechazado`,
    plantilla(
      `Tu pedido no fue aprobado, ${escapar(nombre)}`,
      `<p>El administrador del almacén revisó tu solicitud <b>${escapar(pedido.ID_Pedido)}</b> y no pudo aprobarla.</p>
       <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;padding:14px 18px;margin:16px 0;">
         <p style="margin:0 0 4px;font-size:11px;font-weight:bold;color:#991b1b;letter-spacing:1px;">MOTIVO DEL RECHAZO</p>
         <p style="margin:0;color:#7f1d1d;">${escapar(pedido.Motivo_Rechazo || 'No se especificó un motivo.')}</p>
       </div>
       <p><b>Fecha solicitada:</b> ${escapar(fecha(pedido.Fecha_Recogida))}</p>
       ${listaMateriales(pedido.materiales)}
       <p style="margin-top:20px;">Puedes hacer una nueva solicitud desde <b>Safe Stock CETI → Inventario</b> tomando en cuenta el motivo. Si tienes dudas, acude al almacén de Mecatrónica.</p>`
    )
  );
}

function correoPase(email, nombre, pedido, qrPng) {
  return enviar(
    email,
    `Pase de acceso · Pedido ${pedido.ID_Pedido}`,
    plantilla(
      `Tu pase de acceso, ${escapar(nombre)}`,
      `<p><b>Pedido:</b> ${escapar(pedido.ID_Pedido)}<br/>
          <b>Casillero:</b> ${escapar(nombreCasillero(pedido))}<br/>
          <b>Fecha de recogida:</b> ${escapar(fecha(pedido.Fecha_Recogida))}<br/>
          <b>Horario:</b> ${escapar(pedido.Hora_Recogida || '')} – ${escapar(pedido.Hora_Devolucion || '')}</p>
       ${bloqueQR(qrPng)}
       ${listaMateriales(pedido.materiales)}
       <p style="margin-top:20px;">Presenta este código QR en el escáner del casillero para recoger tus materiales.</p>`
    ),
    adjuntoQR(qrPng, pedido)
  );
}

module.exports = { configurado, correoBienvenida, correoPedido, correoRecuperacion, correoAprobado, correoRechazado, correoPase };

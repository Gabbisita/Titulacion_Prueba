# Conexión del casillero con el escáner GM60

## Cómo funciona

1. El administrador **acepta** un pedido y le asigna un casillero (Celda 01–04).
2. El servidor genera un **QR cifrado** y se lo envía por correo a cada integrante. También aparece en *Mis pedidos → Ver código QR y vale*.
3. El alumno acerca el QR al **GM60** del casillero.
4. El microcontrolador (ESP32 o similar) envía al servidor el texto que leyó el GM60.
5. Si el servidor responde `OK <n>`, el microcontrolador abre la puerta `<n>`.
6. Cuando el material regresa, el administrador usa **Casilleros → Finalizar pedido y liberar**. A partir de ahí ese QR ya no abre la puerta.

## El código QR

- El texto empieza con `SSC2` y tiene unos 78 caracteres, solo letras `A-Z` y números `2-7`.
- Está cifrado con AES-256-GCM. Solo este servidor puede leerlo, y nadie puede fabricar uno válido.
- El QR es versión 4 (33×33), negro sobre blanco, con margen de 4 módulos y corrección de errores M. Es fácil de leer para el GM60, incluso desde la pantalla de un celular.

## Configuración recomendada del GM60

| Opción | Valor |
|---|---|
| Interfaz | **UART (TTL 3.3 V)** hacia el ESP32. Con USB‑HID funciona como teclado y sirve para la pantalla *Verificar QR* del administrador. |
| Velocidad UART | 9600 bps, 8N1 (valor de fábrica) |
| Modo de lectura | Continuo o por detección (*sensing*) |
| Sufijo | CR o CR+LF. El servidor ignora espacios y saltos de línea. |
| Simbologías | Basta con QR. Desactivar las demás reduce las lecturas falsas. |

Los valores se cambian escaneando los códigos de configuración del manual del GM60.

## Petición al servidor

```
GET http://<servidor>:5000/api/qr/verificar?formato=texto&casillero=3&codigo=SSC2XXXX...
X-API-Key: <valor de CASILLERO_API_KEY en backend/.env>
```

- **`X-API-Key` (obligatorio):** el casillero se identifica con una clave secreta en este encabezado HTTP. Sin ella el servidor responde `NO NO_AUTORIZADO` y no revela nada sobre el código. La clave se genera con `npm run claves`, se guarda en `backend/.env` como `CASILLERO_API_KEY` y se graba la misma en el firmware. En ESP32 (Arduino):

  ```cpp
  HTTPClient http;
  http.begin(url);                       // la URL de arriba
  http.addHeader("X-API-Key", API_KEY);  // la misma clave que en backend/.env
  int estado = http.GET();
  String respuesta = http.getString();   // "OK 3" o "NO ..."
  ```

- `formato=texto`: la respuesta es texto plano, fácil de procesar en Arduino o ESP32.
- `casillero=3`: opcional. La puerta solo acepta códigos de su propio casillero.

Respuestas posibles:

| Respuesta | Significado |
|---|---|
| `OK 3` | Código válido: abrir la puerta 3 |
| `NO CODIGO_INVALIDO` | QR falso, alterado o que no es de Safe Stock CETI |
| `NO PEDIDO_INACTIVO` | QR auténtico, pero el pedido ya se devolvió o se canceló |
| `NO OTRO_CASILLERO 2` | El código es de otro casillero (el 2) |
| `NO PEDIDO_INEXISTENTE` / `NO ERROR_SERVIDOR` | No abrir; reintentar o avisar al almacén |
| `NO NO_AUTORIZADO` | Falta el encabezado `X-API-Key` o la clave no coincide |
| `NO DEMASIADAS_PETICIONES` | Más de 60 lecturas por minuto; esperar unos segundos |

## Importante

- **No cambies ni borres `QR_SECRET`** en `backend/.env`. Todos los QR ya enviados dejarían de funcionar.
- Si el servidor se mueve a otra computadora, copia también `QR_SECRET`.
- **`CASILLERO_API_KEY` es un secreto:** no la subas a GitHub junto con el firmware. Si se filtra, genera otra, cámbiala en `backend/.env` y vuelve a grabar el ESP32.
- Cada lectura (autorizada, falsa o sin clave) queda anotada en la **Bitácora de seguridad** del panel de administrador.

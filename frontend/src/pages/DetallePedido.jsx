import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { mostrarToast } from '../components/notificaciones';
import { obtenerSesion } from '../auth/sesion';

// Estado del casillero en la BD: 1 = Disponible, 2 = Ocupado, 3 = Mantenimiento
// Fecha_Recogida se guarda como texto ("Lunes 16 de noviembre, 2026"); si viniera como fecha ISO, se formatea.
const formatearFecha = (f) => {
  if (!f) return '—';
  if (!/^\d{4}-\d{2}-\d{2}/.test(String(f))) return String(f);
  const d = new Date(f);
  return isNaN(d) ? String(f) : d.toLocaleDateString('es-MX', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};
// Las horas se guardan como texto ("3:00 pm"), se muestran tal cual
const formatearHora = (h) => (h ? String(h).trim() : '');
const numeroCelda = (c) => String(c?.ID_Casillero ?? '').padStart(2, '0');

const DetallePedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [casilleros, setCasilleros] = useState([]);
  const [error, setError] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [enviandoCorreo, setEnviandoCorreo] = useState(false);

  const sesion = obtenerSesion();
  const matricula = sesion?.usuario?.Registro_Alu;

  // 1. Pedido real y mapa real de casilleros
  useEffect(() => {
    const cargar = async () => {
      try {
        const [rp, rc] = await Promise.all([
          fetch(`/backend/api/pedidos/${encodeURIComponent(id)}`),
          fetch('/backend/api/casilleros'),
        ]);
        if (!rp.ok) {
          setError(rp.status === 404 ? 'Este pedido no existe.' : 'No se pudo cargar el pedido.');
          return;
        }
        setPedido(await rp.json());
        if (rc.ok) setCasilleros(await rc.json());
      } catch {
        setError('Error de conexión con el servidor.');
      }
    };
    cargar();
  }, [id]);

  const casilleroAsignado = pedido?.FK_Casillero ? casilleros.find((c) => c.ID_Casillero === pedido.FK_Casillero) : null;
  const nombreCasillero = pedido?.FK_Casillero
    ? casilleroAsignado?.Identificador || pedido.Casillero || `Celda ${String(pedido.FK_Casillero).padStart(2, '0')}`
    : null;
  const enCasillero = Boolean(pedido?.FK_Casillero) && pedido?.FK_Estado === 2;
  const rechazado = pedido?.FK_Estado === 4;

  // 2. QR CIFRADO: lo genera el servidor (solo él tiene la clave), nunca la página
  useEffect(() => {
    if (!enCasillero || !matricula) return;
    fetch(`/backend/api/pedidos/${encodeURIComponent(id)}/qr?matricula=${encodeURIComponent(matricula)}`)
      .then((r) => r.json())
      .then((d) => (d.qr ? setQrUrl(d.qr) : console.error('QR:', d.message)))
      .catch((err) => console.error('Error obteniendo el código QR:', err));
  }, [enCasillero, id, matricula]);

  // 3. Envío real del pase al correo del alumno
  const manejarEnvioCorreo = async () => {
    setEnviandoCorreo(true);
    try {
      const r = await fetch(`/backend/api/pedidos/${encodeURIComponent(id)}/enviar-pase`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matricula }),
      });
      const data = await r.json();
      mostrarToast(data.message || (r.ok ? 'Pase enviado' : 'No se pudo enviar'), r.ok ? 'exito' : 'error');
    } catch {
      mostrarToast('Error de conexión con el servidor.', 'error');
    } finally {
      setEnviandoCorreo(false);
    }
  };

  const estadoCelda = (c) => {
    if (pedido?.FK_Casillero === c.ID_Casillero && c.Fk_Estado === 2) return 'TU PEDIDO';
    if (c.Fk_Estado === 2) return 'OCUPADO';
    if (c.Fk_Estado === 3) return 'MANTENIMIENTO';
    return 'LIBRE';
  };

  if (error || !pedido) {
    return (
      <div className="min-h-screen bg-[#f8f9fc] font-sans">
        <Navbar />
        <div className="max-w-[1200px] mx-auto px-6 pt-10 text-left">
          <button onClick={() => navigate('/pedidos')} className="text-slate-400 hover:text-blue-600 text-xs font-black uppercase mb-6 block">
            ← Volver a pedidos
          </button>
          <p className={`font-bold ${error ? 'text-red-500' : 'text-slate-400 animate-pulse'}`}>{error || 'Cargando pedido...'}</p>
        </div>
      </div>
    );
  }

  const solicitante = `${pedido.Solicitante_Nombre || ''} ${pedido.Solicitante_Apellido || ''}`.trim();
  const horario = `${formatearHora(pedido.Hora_Recogida)}${pedido.Hora_Devolucion ? ' – ' + formatearHora(pedido.Hora_Devolucion) : ''}`;

  return (
    <div className="min-h-screen bg-[#f8f9fc] text-slate-700 font-sans pb-12 print:bg-white print:pb-0">
      <div className="print:hidden">
        <Navbar />

        <div className="max-w-[1200px] mx-auto px-6 pt-10 text-left">
          <button
            onClick={() => navigate('/pedidos')}
            className="text-slate-400 hover:text-blue-600 text-xs font-black uppercase mb-6 block transition-colors"
          >
            ← Volver a pedidos
          </button>

          <h1 className="text-3xl font-black text-[#1a1f2e] tracking-tight mb-1">
            {enCasillero ? 'Tu código de acceso al casillero' : 'Detalle de tu pedido'}
          </h1>
          <p className="text-slate-400 text-xs font-bold">
            Pedido #{pedido.ID_Pedido} · {nombreCasillero || (rechazado ? 'Sin casillero' : 'Casillero por asignar')} · Estado: {pedido.Estado}
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-stretch">
            <div className="bg-white border border-slate-100 rounded-3xl p-10 flex flex-col items-center justify-center shadow-sm">
              {enCasillero ? (
                <>
                  <div className="w-56 h-56 bg-slate-50 border border-slate-200/60 rounded-2xl flex items-center justify-center p-2 shadow-inner">
                    {qrUrl ? (
                      <img src={qrUrl} alt="Código QR de acceso" className="w-full h-full object-contain rounded-xl" />
                    ) : (
                      <div className="text-xs text-slate-400 font-bold animate-pulse">Generando QR...</div>
                    )}
                  </div>
                  <h3 className="font-black text-lg text-[#1a1f2e] mt-6 mb-1">Código QR del pedido</h3>
                  <p className="text-slate-400 text-xs text-center max-w-sm leading-relaxed mb-6">
                    Presenta este código en el escáner de la <b>{nombreCasillero}</b> para desbloquearla y recoger tus materiales.
                  </p>
                  <p className="text-[10px] font-bold text-blue-600 bg-blue-50 rounded-lg px-3 py-2 text-center max-w-sm -mt-3 mb-6">
                    💡 Sube el brillo de tu pantalla y acerca el celular a unos 10–15 cm del lector.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
                    <button
                      type="button"
                      onClick={manejarEnvioCorreo}
                      disabled={enviandoCorreo || !qrUrl}
                      className="flex-1 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-black py-3 rounded-xl text-xs uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {enviandoCorreo ? (
                        <>
                          <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                          Mandando...
                        </>
                      ) : (
                        <>✉ Mandar al correo</>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 bg-[#111827] text-white font-black py-3 rounded-xl text-xs uppercase flex items-center justify-center gap-2 hover:bg-black transition-colors shadow-md shadow-slate-900/10"
                    >
                      📄 Descargar PDF de acceso
                    </button>
                  </div>
                </>
              ) : rechazado ? (
                <div className="w-full max-w-md text-left">
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center text-2xl">✕</span>
                    <div>
                      <h3 className="font-black text-lg text-[#1a1f2e] leading-tight">Pedido rechazado</h3>
                      <p className="text-slate-400 text-xs font-bold">No se generó vale ni código QR</p>
                    </div>
                  </div>
                  <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 mb-5">
                    <p className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-2">Motivo del rechazo</p>
                    <p className="text-sm font-bold text-red-900 leading-relaxed">
                      {pedido.Motivo_Rechazo || 'El administrador no especificó un motivo.'}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 mb-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Materiales solicitados</p>
                    <ul className="text-xs font-bold text-slate-600 space-y-1">
                      {pedido.materiales.map((m) => (
                        <li key={m.ID_Material}>{m.Cantidad}× {m.Nombre}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/inventario')}
                    className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-black py-3 rounded-xl text-xs uppercase transition-colors"
                  >
                    Hacer una nueva solicitud
                  </button>
                </div>
              ) : (
                <div className="text-center max-w-sm">
                  <span className="text-5xl block mb-4">{pedido.FK_Estado === 1 ? '⏳' : '📋'}</span>
                  <h3 className="font-black text-lg text-[#1a1f2e] mb-2">
                    {pedido.FK_Estado === 1 ? 'Esperando aprobación' : `Pedido ${pedido.Estado.toLowerCase()}`}
                  </h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    {pedido.FK_Estado === 1
                      ? 'Cuando el administrador apruebe tu solicitud y te asigne un casillero, aquí aparecerá tu código QR y te llegará por correo.'
                      : 'Este pedido ya no tiene un casillero activo.'}
                  </p>
                </div>
              )}
            </div>

            {/* MAPA REAL DE CASILLEROS */}
            <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="font-black text-lg text-[#1a1f2e] mb-1">Estado de casilleros</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">Actualizado desde el almacén</p>

                <div className="grid grid-cols-2 gap-4">
                  {casilleros.map((c) => {
                    const est = estadoCelda(c);
                    return (
                      <div
                        key={c.ID_Casillero}
                        className={`border rounded-xl p-5 text-center transition-all shadow-sm ${
                          est === 'TU PEDIDO'
                            ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                            : est === 'LIBRE'
                            ? 'border-green-200 bg-green-50/20'
                            : est === 'MANTENIMIENTO'
                            ? 'border-amber-200 bg-amber-50/40'
                            : 'border-slate-200 bg-slate-50/50 opacity-60'
                        }`}
                      >
                        <span className="text-2xl font-black block text-slate-800">{numeroCelda(c)}</span>
                        <span
                          className={`text-[9px] font-black tracking-wide block mt-1 ${
                            est === 'TU PEDIDO' ? 'text-blue-600' : est === 'LIBRE' ? 'text-green-600' : est === 'MANTENIMIENTO' ? 'text-amber-600' : 'text-slate-400'
                          }`}
                        >
                          {est}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {!rechazado && (
              <div className="mt-8 border-t border-slate-100 pt-4 flex justify-between items-center gap-4 text-xs">
                <span className="text-slate-500 font-bold">
                  📅 Recoge: <span className="font-black text-slate-800">{formatearFecha(pedido.Fecha_Recogida)}</span>
                  {horario && <> · <span className="font-mono font-black text-slate-800">{horario}</span></>}
                </span>
                <p className="text-[10px] text-slate-400 text-right max-w-xs font-medium">
                  Si no recoges a tiempo, el pedido regresará al almacén y deberás solicitar una nueva fecha.
                </p>
              </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* FORMATO DE IMPRESIÓN (solo existe si el pedido tiene casillero activo) */}
      {enCasillero && (
      <div className="hidden print:block max-w-[800px] mx-auto p-4 text-left bg-white text-black">
        <div className="flex justify-between items-start border-b-2 border-black pb-6 mb-6">
          <div className="flex items-center gap-4">
            <img src="/logo.png" alt="Safe Stock CETI" className="w-16 h-16 object-contain" />
            <div>
            <h2 className="text-xl font-black uppercase tracking-tight text-slate-900">Safe Stock CETI</h2>
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wide mt-0.5">División de Ingeniería Mecatrónica · Control de Almacén</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-black border-2 border-black px-3 py-1 bg-slate-100 rounded">FOLIO: {pedido.ID_Pedido}</span>
            <p className="text-[10px] font-bold text-slate-500 mt-2">ESTADO: {pedido.Estado.toUpperCase()}</p>
          </div>
        </div>

        <div className="text-center my-6">
          <h1 className="text-2xl font-black uppercase tracking-tight text-black">VALE DIGITAL DE ACCESO A CASILLERO</h1>
          <p className="text-xs text-slate-600 font-medium">Presente este pase impreso o digital ante la celda de almacenamiento inteligente</p>
        </div>

        <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Usuario Solicitante</span>
            <p className="text-sm font-black text-slate-900">{solicitante || '—'}</p>
            <p className="text-xs text-slate-500">Matrícula: {pedido.Solicitante_Matricula}</p>
          </div>
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Casillero Asignado</span>
            <p className="text-sm font-black text-blue-600">{nombreCasillero || 'Por asignar'}</p>
            <p className="text-xs text-slate-500">Recogida: {formatearFecha(pedido.Fecha_Recogida)} {horario}</p>
          </div>
        </div>

        <div className="mb-6">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Propósito / Destino Académico</span>
          <div className="border-l-4 border-black pl-4 py-1 bg-slate-50 rounded-r-lg">
            <p className="text-xs text-slate-800 font-bold italic">"{pedido.Proposito}"</p>
          </div>
        </div>

        <div className="mb-8">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-2">Lista de Materiales Vinculados</span>
          <table className="w-full text-left border border-slate-300 rounded-lg overflow-hidden border-collapse">
            <thead>
              <tr className="bg-slate-100 text-black text-[11px] font-black uppercase border-b border-slate-300">
                <th className="p-2.5 pl-4">Descripción del Material</th>
                <th className="p-2.5 text-center w-24">Cantidad</th>
                <th className="p-2.5 text-right pr-4">Ubicación</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-200 font-medium text-slate-700">
              {pedido.materiales.map((m) => (
                <tr key={m.ID_Material}>
                  <td className="p-2.5 pl-4 text-black font-bold">{m.Nombre}</td>
                  <td className="p-2.5 text-center font-mono font-black">{m.Cantidad} ud(s)</td>
                  <td className="p-2.5 text-right pr-4 text-slate-400 italic">{nombreCasillero || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-6 items-center border-t border-slate-200 pt-6 mt-8">
          <div className="col-span-1 flex justify-center">
            {qrUrl && enCasillero && <img src={qrUrl} alt="QR Impresión Vale" className="w-36 h-36 border border-slate-200 p-1 rounded-lg" />}
          </div>
          <div className="col-span-2 text-left">
            <h4 className="text-xs font-black uppercase text-black mb-1">Instrucciones de Retiro:</h4>
            <ul className="text-[11px] text-slate-600 list-disc pl-4 space-y-1 font-medium">
              <li>Diríjase a los casilleros del almacén de Mecatrónica.</li>
              <li>Coloque este código QR frente al lector óptico.</li>
              <li>
                La puerta de la <span className="font-bold text-black">{nombreCasillero || 'celda asignada'}</span> se abrirá automáticamente.
              </li>
              <li>Retire sus materiales y asegúrese de dejar el casillero completamente cerrado.</li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 mt-12 text-center text-xs">
          <div>
            <div className="w-40 border-b border-slate-400 mx-auto mb-1.5 h-8"></div>
            <p className="font-black text-slate-800 uppercase text-[10px]">Firma de Recogida Alumno</p>
          </div>
          <div>
            <div className="w-40 border-b border-slate-400 mx-auto mb-1.5 h-8"></div>
            <p className="font-black text-slate-800 uppercase text-[10px]">Sello Autorizado Almacén</p>
          </div>
        </div>
      </div>
      )}

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .hidden { display: block !important; }
          body { background-color: #ffffff !important; color: #000000 !important; }
          @page { size: letter; margin: 1.5cm; }
        }
      `}</style>
    </div>
  );
};

export default DetallePedido;

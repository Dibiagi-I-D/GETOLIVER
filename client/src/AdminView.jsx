import { useState, useEffect } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './AdminView.css';

const API_BASE = import.meta.env.VITE_API_URL || '';
const WHATSAPP_NUMBER = '542616085158';

const EMPRESAS = [
  { value: 'FP',     label: 'FP' },
  { value: 'MULTIM', label: 'MULTIMODAL' },
];

const formatPrecio = (n) =>
  `$ ${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

const parseFechaDDMMYYYY = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  return new Date(`${y}-${m}-${d}`);
};

const sanitizarNombre = (nombre) =>
  nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 _-]/g, '')
    .trim()
    .replace(/\s+/g, '_');

// Mapa de código de empresa a nombre completo
const NOMBRE_EMPRESA = {
  FP:     'FLOTA DEL PACÍFICO',
  MULTIM: 'MULTIMODAL',
};

// Convierte un número a palabras en español (para el monto del recibo)
const numeroALetras = (num) => {
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const decenas  = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const centenas = ['', 'cien', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
    'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];

  const parteEntera = Math.floor(num);
  const centavos    = Math.round((num - parteEntera) * 100);

  const convertirGrupo = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'cien';
    let res = '';
    if (n >= 100) { res += centenas[Math.floor(n / 100)] + ' '; n %= 100; }
    if (n >= 20)  { res += decenas[Math.floor(n / 10)]; if (n % 10) res += ' y ' + unidades[n % 10]; }
    else if (n > 0) res += unidades[n];
    return res.trim();
  };

  const convertir = (n) => {
    if (n === 0) return 'cero';
    let res = '';
    if (n >= 1000000) {
      const m = Math.floor(n / 1000000);
      res += (m === 1 ? 'un millón' : convertirGrupo(m) + ' millones') + ' ';
      n %= 1000000;
    }
    if (n >= 1000) {
      const m = Math.floor(n / 1000);
      res += (m === 1 ? 'mil' : convertirGrupo(m) + ' mil') + ' ';
      n %= 1000;
    }
    if (n > 0) res += convertirGrupo(n);
    return res.trim();
  };

  const letras = convertir(parteEntera);
  const letrasCapital = letras.charAt(0).toUpperCase() + letras.slice(1);
  return `${letrasCapital} con ${String(centavos).padStart(2, '0')}/100`;
};

// Extrae el método de pago legible desde el campo observaciones
const extraerMetodoPago = (observaciones) => {
  if (!observaciones) return '';
  if (observaciones.toLowerCase().includes('bono')) return 'Descuento por Bono';
  if (observaciones.toLowerCase().includes('empleado')) return 'Empleado (efectivo/transferencia)';
  return observaciones;
};

const generarPDF = (pedido) => {
  const doc  = new jsPDF({ unit: 'mm', format: 'a4' });
  const W    = 210;
  const ML   = 15;   // margen izquierdo
  const MR   = 15;   // margen derecho
  const INNER = W - ML - MR;  // ancho útil

  const negro  = [0, 0, 0];
  const gris   = [100, 100, 100];
  const blanco = [255, 255, 255];

  // Helpers
  const borde = (x, y, w, h) => {
    doc.setDrawColor(...negro);
    doc.setLineWidth(0.3);
    doc.rect(x, y, w, h, 'S');
  };
  const txt = (text, x, y, opts = {}) => {
    doc.setTextColor(...(opts.color || negro));
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(opts.size || 9);
    doc.text(String(text), x, y, opts);
  };
  const label = (t, x, y) => txt(t, x, y, { size: 9, color: gris });
  const valor = (t, x, y, size = 9) => txt(t, x, y, { bold: true, size });

  // ── Encabezado de la empresa ───────────────────────────────────────────────
  txt('DIBIAGI S.A.',     W / 2, 16, { bold: true, size: 14, align: 'center' });
  txt('Aceite de Oliva Oliver Cooks', W / 2, 22, { size: 9, color: gris, align: 'center' });

  doc.setDrawColor(...negro);
  doc.setLineWidth(0.5);
  doc.line(ML, 25, W - MR, 25);

  // ── CAJA 1: Recibo Número / Fecha ──────────────────────────────────────────
  let y = 28;
  borde(ML, y, INNER, 12);
  label('Recibo Número:', ML + 3, y + 8);
  valor(String(pedido.nrofor), ML + 35, y + 8, 11);
  label('Fecha', W - MR - 45, y + 8);
  valor(pedido.fecha, W - MR - 28, y + 8, 11);

  // ── CAJA 2: Páguese a / Empresa / Legajo ──────────────────────────────────
  y += 12;
  borde(ML, y, INNER, 16);
  label('Páguese a:', ML + 3, y + 6);
  valor(pedido.nombre, ML + 25, y + 6);

  const empresaNombre = NOMBRE_EMPRESA[pedido.empresa] || pedido.empresa;
  label('Empresa:', ML + 3, y + 12);
  valor(empresaNombre, ML + 22, y + 12);
  label('Legajo', W - MR - 35, y + 12);
  valor(String(pedido.nroleg).padStart(4, '0'), W - MR - 16, y + 12);

  // ── CAJA 3: La suma de ────────────────────────────────────────────────────
  y += 16;
  borde(ML, y, INNER, 14);
  label('La suma de:', ML + 3, y + 6);
  valor(
    Number(pedido.importeTotal).toLocaleString('es-AR', { minimumFractionDigits: 2 }),
    ML + 26, y + 6, 10
  );
  // Monto en letras
  const enLetras = numeroALetras(pedido.importeTotal);
  txt(enLetras, ML + 58, y + 6, { size: 9, color: gris });
  // Entregado (siempre en el PDF)
  doc.setFillColor(230, 230, 230);
  doc.rect(W - MR - 32, y + 2, 30, 10, 'F');
  borde(W - MR - 32, y + 2, 30, 10);
  txt('ENTREGADO', W - MR - 17, y + 8.5, { bold: true, size: 8, align: 'center' });

  // ── CAJA 4: En concepto de / Observaciones ────────────────────────────────
  y += 14;
  borde(ML, y, INNER, 18);
  label('En concepto de:', ML + 3, y + 6);
  valor('POLIVA. Préstamos x Aceite de Oliva', ML + 3, y + 12);

  const mitad = ML + INNER / 2;
  doc.setDrawColor(...gris);
  doc.setLineWidth(0.15);
  doc.line(mitad, y, mitad, y + 18);

  label('Observaciones:', mitad + 3, y + 6);
  txt(pedido.observaciones || '-', mitad + 3, y + 12, { size: 8.5, color: gris });

  // ── CAJA 5: Información adicional ────────────────────────────────────────
  y += 18;
  borde(ML, y, INNER, 16);
  label('Información adicional:', ML + 3, y + 6);
  label('Fecha de inicio:', W - MR - 65, y + 6);
  valor(pedido.fecha, W - MR - 30, y + 6);

  const metodoPago = extraerMetodoPago(pedido.observaciones);
  label('Forma de pago:', ML + 3, y + 13);
  txt(metodoPago || '-', ML + 35, y + 13, { size: 8.5 });
  label('Tipo de corte:', W - MR - 65, y + 13);
  valor('Mensual', W - MR - 30, y + 13);

  // ── Tabla de productos ───────────────────────────────────────────────────
  y += 20;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [['N°', 'Producto', 'Importe']],
    body: pedido.items.map((item, i) => [
      i + 1,
      item.motivo,
      `$ ${Number(item.impcuo).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    ]),
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: negro,
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left',
    },
    bodyStyles: { fontSize: 8.5, textColor: negro },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 38, halign: 'right' },
    },
    styles: { lineColor: negro, lineWidth: 0.15 },
    theme: 'grid',
  });

  // ── Total ─────────────────────────────────────────────────────────────────
  const afterTable = doc.lastAutoTable.finalY;
  borde(ML, afterTable, INNER, 12);
  label('TOTAL', ML + 3, afterTable + 8);
  txt(
    `$ ${Number(pedido.importeTotal).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`,
    W - MR - 3, afterTable + 8,
    { bold: true, size: 11, align: 'right' }
  );

  // ── Líneas de firma ───────────────────────────────────────────────────────
  const firmaY = afterTable + 26;
  doc.setDrawColor(...negro);
  doc.setLineWidth(0.3);
  doc.line(ML, firmaY, ML + 60, firmaY);
  doc.line(W - MR - 60, firmaY, W - MR, firmaY);
  txt('Firma y aclaración empleado', ML + 30, firmaY + 5, { size: 7.5, color: gris, align: 'center' });
  txt('Firma entregador', W - MR - 30, firmaY + 5, { size: 7.5, color: gris, align: 'center' });

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = 290;
  doc.setDrawColor(...gris);
  doc.setLineWidth(0.2);
  doc.line(ML, footerY - 3, W - MR, footerY - 3);
  txt(
    `Generado el ${new Date().toLocaleString('es-AR')}`,
    ML, footerY, { size: 7, color: gris }
  );
  txt('DIBIAGI S.A. — Documento interno', W - MR, footerY, { size: 7, color: gris, align: 'right' });

  return doc;
};

const nombreArchivo = (pedido) => {
  const nombre = sanitizarNombre(pedido.nombre);
  return `${nombre}_${pedido.nroleg}.pdf`;
};

// Genera el PDF como File (Blob con nombre) para poder compartirlo
const generarPDFComoFile = (pedido) => {
  const doc = generarPDF(pedido);
  const blob = doc.output('blob');
  return new File([blob], nombreArchivo(pedido), { type: 'application/pdf' });
};

// Intenta compartir via Web Share API (abre el menú del SO, permite elegir WhatsApp).
// Si el browser no soporta compartir archivos, descarga el PDF y abre el chat de WA.
const compartirViaWhatsApp = async (archivo) => {
  if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
    try {
      await navigator.share({
        files: [archivo],
        title: archivo.name,
      });
      return;
    } catch (err) {
      // El usuario canceló el menú de compartir — no hacer nada más
      if (err.name === 'AbortError') return;
    }
  }
  // Fallback: descarga directa + abre chat de WhatsApp
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = archivo.name;
  a.click();
  URL.revokeObjectURL(url);
  setTimeout(() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank'), 400);
};

const descargarYEnviar = (pedido) => {
  const archivo = generarPDFComoFile(pedido);
  compartirViaWhatsApp(archivo);
};

const descargarTodosYEnviar = async (pedidos) => {
  // Si el browser soporta compartir múltiples archivos, los manda todos juntos
  const archivos = pedidos.map(generarPDFComoFile);
  if (navigator.canShare && navigator.canShare({ files: archivos })) {
    try {
      await navigator.share({ files: archivos, title: 'Comprobantes pendientes' });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  // Fallback: descarga todos en secuencia y abre WhatsApp al final
  archivos.forEach((archivo, i) => {
    setTimeout(() => {
      const url = URL.createObjectURL(archivo);
      const a = document.createElement('a');
      a.href = url;
      a.download = archivo.name;
      a.click();
      URL.revokeObjectURL(url);
    }, i * 300);
  });
  setTimeout(() => window.open(`https://wa.me/${WHATSAPP_NUMBER}`, '_blank'), archivos.length * 300 + 400);
};

function AdminView() {
  const [empresa, setEmpresa]       = useState('FP');
  const [pedidos, setPedidos]       = useState([]);
  const [filtro, setFiltro]         = useState('pendientes');
  const [loading, setLoading]       = useState(false);
  const [confirm, setConfirm]       = useState(null);
  const [entregando, setEntregando] = useState(null);
  const [detalle, setDetalle]       = useState(null);
  const [descargando, setDescargando] = useState(false);

  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    cargarPedidos();
  }, [empresa]);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/admin/pedidos?empresa=${empresa}`);
      if (res.data.success) setPedidos(res.data.pedidos);
    } catch (err) {
      console.error('Error al cargar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmarEntrega = (pedido) => {
    setConfirm({ nrofor: pedido.nrofor, nombre: pedido.nombre });
  };

  const ejecutarEntrega = async () => {
    const { nrofor } = confirm;
    setConfirm(null);
    setEntregando(nrofor);
    try {
      const res = await axios.post(`${API_BASE}/api/admin/marcar-entregado`, { nrofor, empresa });
      if (res.data.success) {
        setPedidos((prev) =>
          prev.map((p) => p.nrofor === nrofor ? { ...p, status: 'E' } : p)
        );
      }
    } catch (err) {
      console.error('Error al marcar entregado:', err);
    } finally {
      setEntregando(null);
    }
  };

  const pedidosFiltrados = pedidos.filter((p) => {
    const esEntregado = p.status === 'E';

    if (filtro === 'pendientes') return !esEntregado;

    if (filtro === 'entregados') {
      if (!esEntregado) return false;
      const fechaPedido = parseFechaDDMMYYYY(p.fecha);
      if (fechaDesde && fechaPedido) {
        if (fechaPedido < new Date(fechaDesde)) return false;
      }
      if (fechaHasta && fechaPedido) {
        const hasta = new Date(fechaHasta);
        hasta.setHours(23, 59, 59);
        if (fechaPedido > hasta) return false;
      }
      return true;
    }

    return true;
  });

  const totalPendientes = pedidos.filter((p) => p.status !== 'E').length;
  const totalEntregados = pedidos.filter((p) => p.status === 'E').length;
  const pendientesFiltrados = pedidosFiltrados.filter((p) => p.status !== 'E');

  const handleDescargarTodos = async () => {
    if (pendientesFiltrados.length === 0) return;
    setDescargando(true);
    try {
      await descargarTodosYEnviar(pendientesFiltrados);
    } finally {
      setDescargando(false);
    }
  };

  return (
    <div>

      {/* Modal de confirmación */}
      {confirm && (
        <div className="modal-overlay" onClick={() => setConfirm(null)}>
          <div className="modal-confirm" onClick={(e) => e.stopPropagation()}>
            <span className="modal-confirm-icon">📦</span>
            <h3>Confirmar entrega</h3>
            <p>
              ¿Marcar el pedido <strong>N°{confirm.nrofor}</strong> de{' '}
              <strong>{confirm.nombre}</strong> como entregado?
              <br />Esta acción no se puede deshacer.
            </p>
            <div className="modal-confirm-actions">
              <button className="btn-confirm-no" onClick={() => setConfirm(null)}>
                Cancelar
              </button>
              <button className="btn-confirm-si" onClick={ejecutarEntrega}>
                Sí, entregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal comprobante */}
      {detalle && (
        <div className="modal-overlay" onClick={() => setDetalle(null)}>
          <div className="modal-comprobante" onClick={(e) => e.stopPropagation()}>

            <div className="comprobante-header">
              <span className="comprobante-icon">🫒</span>
              <div>
                <h3>Comprobante de Pedido</h3>
                <span className="comprobante-nrofor">N° {detalle.nrofor}</span>
              </div>
              <button className="btn-modal-x" onClick={() => setDetalle(null)}>✕</button>
            </div>

            <div className="comprobante-body">

              <div className="comprobante-section">
                <div className="comprobante-row">
                  <span>Empleado</span>
                  <strong>{detalle.nombre}</strong>
                </div>
                <div className="comprobante-row">
                  <span>Legajo</span>
                  <strong>{detalle.nroleg}</strong>
                </div>
                <div className="comprobante-row">
                  <span>Empresa</span>
                  <strong>{detalle.empresa}</strong>
                </div>
                <div className="comprobante-row">
                  <span>Fecha</span>
                  <strong>{detalle.fecha}</strong>
                </div>
                <div className="comprobante-row">
                  <span>Estado</span>
                  {detalle.status === 'E'
                    ? <span className="badge-entregado">✓ Entregado</span>
                    : <span className="badge-pendiente">⏳ Pendiente</span>
                  }
                </div>
              </div>

              <div className="comprobante-productos-titulo">Productos</div>
              <div className="comprobante-section comprobante-items">
                {detalle.items.map((item, i) => (
                  <div key={i} className="comprobante-item">
                    <span className="comprobante-item-nombre">🫒 {item.motivo}</span>
                    <span className="comprobante-item-precio">{formatPrecio(item.impcuo)}</span>
                  </div>
                ))}
              </div>

              <div className="comprobante-total">
                <span>Total del pedido</span>
                <strong>{formatPrecio(detalle.importeTotal)}</strong>
              </div>

            </div>

            <div className="comprobante-footer">
              <button className="btn-cerrar-comprobante" onClick={() => setDetalle(null)}>
                Cerrar
              </button>
              <button
                className="btn-descargar-pdf"
                onClick={() => descargarYEnviar(detalle)}
              >
                ⬇ Descargar PDF
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Selector de empresa */}
      <div className="admin-empresa-bar">
        <label>Empresa:</label>
        <select value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
          {EMPRESAS.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
        <button className="btn-recargar" onClick={cargarPedidos}>
          ↻ Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="admin-filtros">
        <button
          className={`btn-filtro ${filtro === 'pendientes' ? 'activo' : ''}`}
          onClick={() => setFiltro('pendientes')}
        >
          ⏳ Pendientes ({totalPendientes})
        </button>
        <button
          className={`btn-filtro ${filtro === 'entregados' ? 'activo' : ''}`}
          onClick={() => setFiltro('entregados')}
        >
          ✅ Entregados ({totalEntregados})
        </button>
      </div>

      {/* Filtro de fechas — solo visible en Entregados */}
      {filtro === 'entregados' && (
        <div className="filtro-fechas">
          <span className="filtro-fechas-label">📅 Filtrar por fecha:</span>
          <div className="filtro-fechas-inputs">
            <div className="filtro-fecha-group">
              <label>Desde</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div className="filtro-fecha-group">
              <label>Hasta</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            {(fechaDesde || fechaHasta) && (
              <button
                className="btn-limpiar-fechas"
                onClick={() => { setFechaDesde(''); setFechaHasta(''); }}
              >
                ✕ Limpiar
              </button>
            )}
          </div>
          {(fechaDesde || fechaHasta) && (
            <span className="filtro-fechas-resultado">
              {pedidosFiltrados.length} resultado{pedidosFiltrados.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Barra de acciones para pendientes */}
      {filtro === 'pendientes' && pendientesFiltrados.length > 0 && (
        <div className="admin-acciones-bar">
          <span className="admin-acciones-info">
            {pendientesFiltrados.length} comprobante{pendientesFiltrados.length !== 1 ? 's' : ''} pendiente{pendientesFiltrados.length !== 1 ? 's' : ''}
          </span>
          <button
            className="btn-descargar-todos"
            onClick={handleDescargarTodos}
            disabled={descargando}
          >
            {descargando
              ? '⏳ Generando...'
              : `⬇ Descargar todos (${pendientesFiltrados.length}) + WhatsApp`}
          </button>
        </div>
      )}

      {/* Contenido */}
      {loading ? (
        <div className="admin-loading">
          <div className="spinner" />
          Cargando pedidos...
        </div>
      ) : pedidosFiltrados.length === 0 ? (
        <div className="admin-empty">
          <div className="admin-empty-icon">🫒</div>
          {filtro === 'pendientes'
            ? 'No hay pedidos pendientes.'
            : 'No hay pedidos entregados en ese período.'}
        </div>
      ) : (
        <div className="pedidos-grid">
          {pedidosFiltrados.map((pedido) => {
            const esEntregado = pedido.status === 'E';
            const enProceso   = entregando === pedido.nrofor;

            return (
              <div
                key={pedido.nrofor}
                className={`pedido-card ${esEntregado ? 'entregado' : ''}`}
              >
                <div
                  className="pedido-card-header"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setDetalle(pedido)}
                >
                  <div className="pedido-empleado">
                    <span className="pedido-nombre">👤 {pedido.nombre}</span>
                    <span className="pedido-meta">
                      <span>Leg. {pedido.nroleg}</span>
                      <span>📅 {pedido.fecha}</span>
                      <span>N°{pedido.nrofor}</span>
                    </span>
                  </div>
                  {esEntregado
                    ? <span className="badge-entregado">✓ Entregado</span>
                    : <span className="badge-pendiente">⏳ Pendiente</span>
                  }
                </div>

                <div className="pedido-items" style={{ cursor: 'pointer' }} onClick={() => setDetalle(pedido)}>
                  {pedido.items.length > 0 ? (
                    pedido.items.map((item, i) => (
                      <div key={i} className="pedido-item">
                        <span className="pedido-item-motivo">🫒 {item.motivo}</span>
                        <span className="pedido-item-importe">{formatPrecio(item.impcuo)}</span>
                      </div>
                    ))
                  ) : (
                    <span style={{ fontSize: '13px', color: '#aaa' }}>Sin detalle</span>
                  )}
                </div>

                <div className="pedido-card-footer">
                  <div className="pedido-total">
                    <span>Total</span>
                    {formatPrecio(pedido.importeTotal)}
                  </div>
                  <div className="pedido-card-actions">
                    {!esEntregado && (
                      <button
                        className="btn-pdf-individual"
                        title="Descargar PDF y enviar por WhatsApp"
                        onClick={(e) => { e.stopPropagation(); descargarYEnviar(pedido); }}
                      >
                        ⬇ PDF
                      </button>
                    )}
                    {esEntregado ? (
                      <span className="entregado-label">✅ Entregado</span>
                    ) : (
                      <button
                        className="btn-entregar"
                        onClick={() => confirmarEntrega(pedido)}
                        disabled={enProceso}
                      >
                        {enProceso ? 'Guardando...' : '📦 Marcar entregado'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminView;

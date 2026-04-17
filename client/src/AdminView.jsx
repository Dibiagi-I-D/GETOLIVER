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

const generarPDF = (pedido) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const ancho = 210;

  // ── Fondo del header ──────────────────────────────────────────────────────
  doc.setFillColor(10, 35, 5);
  doc.rect(0, 0, ancho, 48, 'F');

  // Línea dorada decorativa
  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.6);
  doc.line(0, 48, ancho, 48);

  // Título empresa
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(201, 168, 76);
  doc.text('DIBIAGI — Aceite Oliver', ancho / 2, 20, { align: 'center' });

  // Subtítulo
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(200, 200, 200);
  doc.text('COMPROBANTE DE PEDIDO', ancho / 2, 30, { align: 'center' });

  // Número de pedido
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(201, 168, 76);
  doc.text(`N° ${pedido.nrofor}`, ancho / 2, 40, { align: 'center' });

  // ── Sección: Datos del empleado ───────────────────────────────────────────
  let y = 60;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 140, 120);
  doc.text('DATOS DEL EMPLEADO', 15, y);
  y += 5;

  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.3);
  doc.line(15, y, ancho - 15, y);
  y += 6;

  const filas = [
    ['Empleado',  pedido.nombre],
    ['Legajo',    String(pedido.nroleg)],
    ['Empresa',   pedido.empresa],
    ['Fecha',     pedido.fecha],
    ['Estado',    pedido.status === 'E' ? 'ENTREGADO' : 'PENDIENTE DE ENTREGA'],
  ];

  filas.forEach(([label, valor]) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(110, 130, 110);
    doc.text(label, 15, y);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(valor, 75, y);
    y += 8;
  });

  // ── Sección: Productos ────────────────────────────────────────────────────
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 140, 120);
  doc.text('DETALLE DE PRODUCTOS', 15, y);
  y += 5;

  autoTable(doc, {
    startY: y,
    margin: { left: 15, right: 15 },
    head: [['#', 'Producto', 'Precio']],
    body: pedido.items.map((item, i) => [
      i + 1,
      item.motivo,
      formatPrecio(item.impcuo),
    ]),
    headStyles: {
      fillColor: [10, 35, 5],
      textColor: [201, 168, 76],
      fontStyle: 'bold',
      fontSize: 9,
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [245, 248, 243],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 35, halign: 'right' },
    },
    styles: {
      lineColor: [220, 230, 215],
      lineWidth: 0.2,
    },
    theme: 'grid',
  });

  // ── Total ─────────────────────────────────────────────────────────────────
  const finalY = doc.lastAutoTable.finalY + 6;

  doc.setFillColor(10, 35, 5);
  doc.roundedRect(15, finalY, ancho - 30, 14, 3, 3, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(180, 180, 180);
  doc.text('TOTAL DEL PEDIDO', 25, finalY + 9);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(201, 168, 76);
  doc.text(formatPrecio(pedido.importeTotal), ancho - 20, finalY + 9, { align: 'right' });

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = 287;
  doc.setDrawColor(201, 168, 76);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 4, ancho - 15, footerY - 4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  const ahora = new Date().toLocaleString('es-AR');
  doc.text(`Generado el ${ahora}`, 15, footerY);
  doc.text('DIBIAGI — Documento interno', ancho - 15, footerY, { align: 'right' });

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

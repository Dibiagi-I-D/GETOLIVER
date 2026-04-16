import { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminView.css';

const EMPRESAS = [
  { value: 'FP',     label: 'FP' },
  { value: 'MULTIM', label: 'MULTIMODAL' },
];

const formatPrecio = (n) =>
  `$\u00A0${Number(n).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

// Convierte "DD/MM/YYYY" → Date para comparar
const parseFechaDDMMYYYY = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split('/');
  return new Date(`${y}-${m}-${d}`);
};

function AdminView() {
  const [empresa, setEmpresa]       = useState('FP');
  const [pedidos, setPedidos]       = useState([]);
  const [filtro, setFiltro]         = useState('pendientes'); // 'pendientes' | 'entregados'
  const [loading, setLoading]       = useState(false);
  const [confirm, setConfirm]       = useState(null);
  const [entregando, setEntregando] = useState(null);
  const [detalle, setDetalle]       = useState(null); // pedido seleccionado para ver comprobante

  // Filtros de fecha para entregados
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  useEffect(() => {
    cargarPedidos();
  }, [empresa]);

  const cargarPedidos = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/admin/pedidos?empresa=${empresa}`);
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
      const res = await axios.post('/api/admin/marcar-entregado', { nrofor, empresa });
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
      // Aplicar rango de fechas si están definidos
      const fechaPedido = parseFechaDDMMYYYY(p.fecha);
      if (fechaDesde && fechaPedido) {
        if (fechaPedido < new Date(fechaDesde)) return false;
      }
      if (fechaHasta && fechaPedido) {
        // Incluir todo el día hasta
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
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AdminView;

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './App.css';
import Login from './Login';
import AdminView from './AdminView';
import fondoDesktop from '../assets/fondo de pantalla de desktop.png';

const ADMIN_LEGAJOS = [13];

const API_BASE = import.meta.env.VITE_API_URL || '';
const API_URL = `${API_BASE}/api/aceite`;

// Lista base de productos (sin precio, se asigna según método de pago)
const TIPOS_ACEITE_BASE = [
  { tipo: 'Oliver Cooks AOVE Clásico - Vidrio 250cc' },
  { tipo: 'Oliver Cooks AOVE Clásico - Vidrio 250cc (Caja x12)' },
  { tipo: 'Oliver Cooks AOVE Intenso - Vidrio 250cc' },
  { tipo: 'Oliver Cooks AOVE Intenso - Vidrio 250cc (Caja x12)' },
  { tipo: 'Oliver Cooks AOVE Clásico - Vidrio 500cc' },
  { tipo: 'Oliver Cooks AOVE Clásico - Vidrio 500cc (Caja x6)' },
  { tipo: 'Oliver Cooks AOVE Intenso - Vidrio 500cc' },
  { tipo: 'Oliver Cooks AOVE Intenso - Vidrio 500cc (Caja x6)' },
  { tipo: 'Oliver Cooks AOVE Clásico - Pet 1000cc' },
  { tipo: 'Oliver Cooks AOVE Clásico - Pet 1000cc (Caja x6)' },
  { tipo: 'Oliver Cooks AOVE Intenso - Pet 1000cc' },
  { tipo: 'Oliver Cooks AOVE Intenso - Pet 1000cc (Caja x6)' },
  { tipo: 'Oliver Cooks AOVE Clásico - Pet 3000cc' },
  { tipo: 'Oliver Cooks AOVE Clásico - Pet 3000cc (Caja x4)' },
  { tipo: 'Oliver Cooks AOVE Intenso - Pet 3000cc' },
  { tipo: 'Oliver Cooks AOVE Intenso - Pet 3000cc (Caja x4)' },
  { tipo: 'Oliver Cooks AOVE Clásico - Pet 5000cc' },
  { tipo: 'Oliver Cooks AOVE Clásico - Pet 5000cc (Caja x2)' },
  { tipo: 'Oliver Cooks AOVE Intenso - Pet 5000cc' },
  { tipo: 'Oliver Cooks AOVE Intenso - Pet 5000cc (Caja x2)' },
];

const PRECIOS_POR_METODO = {
  empleado: {
    'Oliver Cooks AOVE Clásico - Vidrio 250cc':              4700,
    'Oliver Cooks AOVE Clásico - Vidrio 250cc (Caja x12)':  54000,
    'Oliver Cooks AOVE Intenso - Vidrio 250cc':              4700,
    'Oliver Cooks AOVE Intenso - Vidrio 250cc (Caja x12)':  54000,
    'Oliver Cooks AOVE Clásico - Vidrio 500cc':              7500,
    'Oliver Cooks AOVE Clásico - Vidrio 500cc (Caja x6)':   43000,
    'Oliver Cooks AOVE Intenso - Vidrio 500cc':              7500,
    'Oliver Cooks AOVE Intenso - Vidrio 500cc (Caja x6)':   43000,
    'Oliver Cooks AOVE Clásico - Pet 1000cc':               14000,
    'Oliver Cooks AOVE Clásico - Pet 1000cc (Caja x6)':     80000,
    'Oliver Cooks AOVE Intenso - Pet 1000cc':               14000,
    'Oliver Cooks AOVE Intenso - Pet 1000cc (Caja x6)':     80000,
    'Oliver Cooks AOVE Clásico - Pet 3000cc':               38800,
    'Oliver Cooks AOVE Clásico - Pet 3000cc (Caja x4)':    148000,
    'Oliver Cooks AOVE Intenso - Pet 3000cc':               38800,
    'Oliver Cooks AOVE Intenso - Pet 3000cc (Caja x4)':    148000,
    'Oliver Cooks AOVE Clásico - Pet 5000cc':               63500,
    'Oliver Cooks AOVE Clásico - Pet 5000cc (Caja x2)':    120000,
    'Oliver Cooks AOVE Intenso - Pet 5000cc':               63500,
    'Oliver Cooks AOVE Intenso - Pet 5000cc (Caja x2)':    120000,
  },
  bono: {
    'Oliver Cooks AOVE Clásico - Vidrio 250cc':              5100,
    'Oliver Cooks AOVE Clásico - Vidrio 250cc (Caja x12)':  58100,
    'Oliver Cooks AOVE Intenso - Vidrio 250cc':              5100,
    'Oliver Cooks AOVE Intenso - Vidrio 250cc (Caja x12)':  58100,
    'Oliver Cooks AOVE Clásico - Vidrio 500cc':              8100,
    'Oliver Cooks AOVE Clásico - Vidrio 500cc (Caja x6)':   46200,
    'Oliver Cooks AOVE Intenso - Vidrio 500cc':              8100,
    'Oliver Cooks AOVE Intenso - Vidrio 500cc (Caja x6)':   46200,
    'Oliver Cooks AOVE Clásico - Pet 1000cc':               15000,
    'Oliver Cooks AOVE Clásico - Pet 1000cc (Caja x6)':     85500,
    'Oliver Cooks AOVE Intenso - Pet 1000cc':               15000,
    'Oliver Cooks AOVE Intenso - Pet 1000cc (Caja x6)':     85500,
    'Oliver Cooks AOVE Clásico - Pet 3000cc':               41800,
    'Oliver Cooks AOVE Clásico - Pet 3000cc (Caja x4)':    158000,
    'Oliver Cooks AOVE Intenso - Pet 3000cc':               41800,
    'Oliver Cooks AOVE Intenso - Pet 3000cc (Caja x4)':    158000,
    'Oliver Cooks AOVE Clásico - Pet 5000cc':               68300,
    'Oliver Cooks AOVE Clásico - Pet 5000cc (Caja x2)':    129700,
    'Oliver Cooks AOVE Intenso - Pet 5000cc':               68300,
    'Oliver Cooks AOVE Intenso - Pet 5000cc (Caja x2)':    129700,
  },
};

const METODOS_PAGO = [
  { value: 'empleado', label: 'Empleado', desc: 'Abona en el momento (efectivo o transferencia)' },
  { value: 'bono',     label: 'Por Bono', desc: 'Se descuenta del sueldo el próximo mes' },
];

const formatPrecio = (n) =>
  n === 0 ? 'A consultar' : `$\u00A0${n.toLocaleString('es-AR')}`;

const EMPRESAS = [
  { value: 'FP',     label: 'FP' },
  { value: 'MULTIM', label: 'MULTIMODAL' },
];

function App() {
  const [usuario, setUsuario] = useState(null);
  const [empresa, setEmpresa] = useState('FP');
  const [metodoPago, setMetodoPago] = useState('empleado');

  const [carrito, setCarrito] = useState([]);
  const [modalCantidad, setModalCantidad] = useState(null);
  const [cantidadInput, setCantidadInput] = useState(1);
  const cantidadRef = useRef(null);

  const hoy = () => new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [siguienteNroFor, setSiguienteNroFor] = useState(null);
  const [modoAdmin, setModoAdmin] = useState(false);

  // Precios activos según método seleccionado
  const preciosActivos = PRECIOS_POR_METODO[metodoPago];
  const tiposAceite = TIPOS_ACEITE_BASE.map(({ tipo }) => ({
    tipo,
    precio: preciosActivos[tipo] ?? 0,
  }));

  // Restaurar sesión
  useEffect(() => {
    const legajoGuardado = localStorage.getItem('aceite_legajo');
    const nombreGuardado = localStorage.getItem('aceite_nombre');
    const empresaGuardada = localStorage.getItem('aceite_empresa');
    if (legajoGuardado && nombreGuardado) {
      setUsuario({ legajo: legajoGuardado, nombre: nombreGuardado, empresa: empresaGuardada || 'FP' });
      setEmpresa(empresaGuardada || 'FP');
    }
  }, []);

  useEffect(() => {
    if (usuario) cargarSiguienteNroFor();
  }, [empresa, usuario]);

  useEffect(() => {
    if (modalCantidad && cantidadRef.current) {
      setTimeout(() => cantidadRef.current?.focus(), 80);
    }
  }, [modalCantidad]);

  const cargarSiguienteNroFor = async () => {
    try {
      const res = await axios.get(`${API_URL}/ultimo-nrofor?empresa=${empresa}`);
      if (res.data.success) setSiguienteNroFor(res.data.siguienteNroFor);
    } catch { /* silencioso */ }
  };

  const handleLogin = (datos) => {
    setUsuario(datos);
    setEmpresa(datos.empresa || 'FP');
  };

  const handleLogout = () => {
    setUsuario(null);
    localStorage.removeItem('aceite_legajo');
    localStorage.removeItem('aceite_nombre');
    localStorage.removeItem('aceite_empresa');
    setCarrito([]);
    setModal(null);
    setSiguienteNroFor(null);
    setMetodoPago('empleado');
  };

  // Cambiar método de pago limpia el carrito
  const handleCambioMetodo = (nuevoMetodo) => {
    if (carrito.length > 0) {
      if (!window.confirm('Cambiar el método de pago vaciará el carrito. ¿Continuar?')) return;
    }
    setMetodoPago(nuevoMetodo);
    setCarrito([]);
  };

  const abrirModalCantidad = (tipo) => {
    const enCarrito = carrito.find((p) => p.tipo === tipo);
    setCantidadInput(enCarrito ? enCarrito.cantidad : 1);
    setModalCantidad({ tipo });
  };

  const confirmarCantidad = () => {
    const cant = parseInt(cantidadInput, 10);
    if (!cant || cant < 1) return;
    setCarrito((prev) => {
      const existe = prev.find((p) => p.tipo === modalCantidad.tipo);
      if (existe) {
        return prev.map((p) => p.tipo === modalCantidad.tipo ? { ...p, cantidad: cant } : p);
      }
      return [...prev, { tipo: modalCantidad.tipo, cantidad: cant }];
    });
    setModalCantidad(null);
  };

  const quitarDelCarrito = (tipo) => {
    setCarrito((prev) => prev.filter((p) => p.tipo !== tipo));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (carrito.length === 0) {
      setModal({ type: 'error', icon: '⚠️', title: 'Sin productos', message: 'Debe agregar al menos un producto al pedido.' });
      return;
    }

    setLoading(true);
    try {
      const fechaHoy = hoy();
      const response = await axios.post(`${API_URL}/insertar`, {
        empresa,
        nroleg: usuario.legajo,
        fechaMov: fechaHoy,
        fechaIni: fechaHoy,
        metodoPago,
        productos: carrito,
      });

      if (response.data.success) {
        setModal({
          type: 'success',
          icon: '✅',
          title: '¡Pedido registrado!',
          message: `${response.data.insertados} producto(s) guardado(s) correctamente.`,
          detail: {
            nrofor: response.data.nrofor,
            legajo: usuario.legajo,
            nombre: usuario.nombre,
            empresa,
            metodoPago,
            productos: response.data.productos,
          },
        });
        setCarrito([]);
        setMetodoPago('empleado');
        await cargarSiguienteNroFor();
      }
    } catch (error) {
      console.error('Error al insertar pedido:', error);
      setModal({
        type: 'error',
        icon: '❌',
        title: 'Error al registrar',
        message: error.response?.data?.message || 'No se pudo registrar el pedido. Intente nuevamente.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!usuario) return <Login onLogin={handleLogin} />;

  const esAdmin = ADMIN_LEGAJOS.includes(parseInt(usuario.legajo, 10));
  const totalProductos = carrito.reduce((acc, p) => acc + p.cantidad, 0);
  const totalImporte = carrito.reduce((acc, p) => {
    const precio = preciosActivos[p.tipo] ?? 0;
    return acc + precio * p.cantidad;
  }, 0);

  return (
    <div className="app" style={{ '--app-bg': `url(${fondoDesktop})` }}>
      <div className="container">

        {/* HEADER */}
        <header className="app-header">
          <div className="header-top">
            <div className="header-title">
              <span className="icon">🫒</span>
              <div>
                <h1>Pedido de Aceite</h1>
                <p>DIBIAGI — Sistema de Beneficios</p>
              </div>
            </div>
            <button className="btn-logout" onClick={handleLogout}>Cerrar sesión</button>
          </div>
          <div className="header-user">
            <span className="user-badge">Legajo {usuario.legajo}</span>
            <span className="user-name">{usuario.nombre}</span>
          </div>
          {esAdmin && (
            <div className="header-tabs">
              <button
                className={`tab-btn ${!modoAdmin ? 'activo' : ''}`}
                onClick={() => setModoAdmin(false)}
              >
                🛒 Mi pedido
              </button>
              <button
                className={`tab-btn ${modoAdmin ? 'activo' : ''}`}
                onClick={() => setModoAdmin(true)}
              >
                ⚙️ Administración
              </button>
            </div>
          )}
        </header>

        {/* ── MODAL CANTIDAD ── */}
        <AnimatePresence>
          {modalCantidad && (
            <motion.div className="modal-overlay" onClick={() => setModalCantidad(null)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <motion.div className="modal-cantidad" onClick={(e) => e.stopPropagation()}
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="modal-cantidad-header">
                  <span className="modal-cantidad-icon">🫒</span>
                  <h3>Cantidad</h3>
                  <button className="btn-modal-x" onClick={() => setModalCantidad(null)}>✕</button>
                </div>
                <p className="modal-cantidad-producto">{modalCantidad.tipo}</p>
                <p className="modal-cantidad-precio">
                  {formatPrecio(preciosActivos[modalCantidad.tipo] ?? 0)} c/u
                </p>
                <div className="cantidad-control">
                  <button type="button" className="btn-qty"
                    onClick={() => setCantidadInput((v) => Math.max(1, parseInt(v || 1) - 1))}>−</button>
                  <input
                    ref={cantidadRef}
                    type="number" min="1" value={cantidadInput}
                    onChange={(e) => setCantidadInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && confirmarCantidad()}
                    className="qty-input"
                  />
                  <button type="button" className="btn-qty"
                    onClick={() => setCantidadInput((v) => parseInt(v || 1) + 1)}>+</button>
                </div>
                <div className="modal-cantidad-actions">
                  <button type="button" className="btn-cancelar-qty" onClick={() => setModalCantidad(null)}>
                    Cancelar
                  </button>
                  <button type="button" className="btn-agregar-qty" onClick={confirmarCantidad}>
                    {carrito.find((p) => p.tipo === modalCantidad.tipo) ? 'Actualizar' : 'Agregar al pedido'}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MODAL RESULTADO ── */}
        <AnimatePresence>
          {modal && (
            <motion.div className="modal-overlay"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              <motion.div className={`modal-box ${modal.type}`}
                initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }} transition={{ duration: 0.2 }}>
                <div className="modal-top">
                  <span className="modal-icon">{modal.icon}</span>
                  <h3>{modal.title}</h3>
                  <p>{modal.message}</p>
                </div>

                {modal.detail && (
                  <div className="modal-detail">
                    <div className="modal-detail-row">
                      <span>N° Formulario</span>
                      <strong>{modal.detail.nrofor}</strong>
                    </div>
                    <div className="modal-detail-row">
                      <span>Legajo</span>
                      <strong>{modal.detail.legajo} — {modal.detail.nombre}</strong>
                    </div>
                    <div className="modal-detail-row">
                      <span>Empresa</span>
                      <strong>{modal.detail.empresa}</strong>
                    </div>
                    <div className="modal-detail-row">
                      <span>Método de pago</span>
                      <strong>
                        {modal.detail.metodoPago === 'bono' ? 'Por Bono' : 'Empleado (efectivo/transferencia)'}
                      </strong>
                    </div>
                    {modal.detail.productos && modal.detail.productos.map((p, i) => (
                      <div key={i} className="modal-detail-row modal-producto-row">
                        <span>🫒 {p.tipo}</span>
                        <strong>×{p.cantidad}</strong>
                      </div>
                    ))}
                  </div>
                )}

                <div className="modal-actions">
                  <button className="btn-modal-close" onClick={() => setModal(null)}>Aceptar</button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VISTA ADMIN */}
        {esAdmin && modoAdmin && (
          <div className="form-body">
            <AdminView />
          </div>
        )}

        {/* FORMULARIO CLIENTE */}
        {(!esAdmin || !modoAdmin) && (
          <div className="form-body">
            <form onSubmit={handleSubmit}>

              {/* EMPRESA */}
              <motion.div className="form-section"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <div className="section-title"><span>🏢</span> Empresa y legajo</div>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="empresa">Empresa</label>
                    <select id="empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
                      {EMPRESAS.map((emp) => (
                        <option key={emp.value} value={emp.value}>{emp.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Legajo</label>
                    <div className="legajo-display">
                      <span className="lock-icon">🔒</span>
                      {usuario.legajo} — {usuario.nombre}
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* MÉTODO DE PAGO */}
              <motion.div className="form-section"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <div className="section-title"><span>💳</span> Método de pago</div>
                <div className="metodo-pago-grid">
                  {METODOS_PAGO.map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      className={`metodo-card ${metodoPago === value ? 'activo' : ''}`}
                      onClick={() => handleCambioMetodo(value)}
                    >
                      <span className="metodo-label">{label}</span>
                      <span className="metodo-desc">{desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* PRODUCTOS */}
              <motion.div className="form-section"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                <div className="section-title">
                  <span>🫒</span> Productos
                  {carrito.length > 0 && (
                    <span className="carrito-badge">{totalProductos} unid. seleccionadas</span>
                  )}
                </div>
                <div className="productos-grid">
                  {tiposAceite.map(({ tipo, precio }) => {
                    const enCarrito = carrito.find((p) => p.tipo === tipo);
                    return (
                      <button
                        key={tipo}
                        type="button"
                        className={`producto-card ${enCarrito ? 'en-carrito' : ''}`}
                        onClick={() => abrirModalCantidad(tipo)}
                      >
                        <span className="producto-icon">🫒</span>
                        <span className="producto-nombre">
                          {tipo}
                          <span className="producto-precio">{formatPrecio(precio)}</span>
                        </span>
                        {enCarrito ? (
                          <span className="producto-qty-badge">×{enCarrito.cantidad}</span>
                        ) : (
                          <span className="producto-agregar">+</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </motion.div>

              {/* CARRITO */}
              <AnimatePresence>
                {carrito.length > 0 && (
                  <motion.div className="carrito-section"
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.22 }}>
                    <div className="section-title">
                      <span>🛒</span> Mi pedido ({carrito.length} producto{carrito.length > 1 ? 's' : ''})
                    </div>
                    <div className="carrito-lista">
                      {carrito.map((item) => {
                        const precio = preciosActivos[item.tipo] ?? 0;
                        const subtotal = precio * item.cantidad;
                        return (
                          <motion.div key={item.tipo} className="carrito-item"
                            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }} layout>
                            <div className="carrito-item-info">
                              <span className="carrito-item-nombre">🫒 {item.tipo}</span>
                              <span className="carrito-item-subtotal">
                                {formatPrecio(precio)} × {item.cantidad} = <strong>{formatPrecio(subtotal)}</strong>
                              </span>
                            </div>
                            <div className="carrito-item-actions">
                              <button type="button" className="btn-edit-qty"
                                onClick={() => abrirModalCantidad(item.tipo)}>
                                ×{item.cantidad}
                              </button>
                              <button type="button" className="btn-quitar"
                                onClick={() => quitarDelCarrito(item.tipo)}>✕</button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                    <div className="carrito-total">
                      <span>Total del pedido</span>
                      <strong>{formatPrecio(totalImporte)}</strong>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SUBMIT */}
              <motion.div className="submit-section"
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                <button
                  type="submit"
                  className="btn-submit"
                  disabled={loading || carrito.length === 0}
                >
                  {loading ? (
                    <>Registrando pedido<span className="loading-dots"><span /><span /><span /></span></>
                  ) : (
                    `🫒 Confirmar pedido${carrito.length > 0 ? ` (${carrito.length} producto${carrito.length > 1 ? 's' : ''})` : ''}`
                  )}
                </button>
              </motion.div>

            </form>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;

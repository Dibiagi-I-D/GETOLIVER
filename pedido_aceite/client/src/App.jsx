import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';
import Login from './Login';
import AdminView from './AdminView';

// Legajos con acceso al panel de administración
const ADMIN_LEGAJOS = [13];

const API_URL = '/api/aceite';

const TIPOS_ACEITE = [
  { tipo: 'Aceite de Oliva Blend Clasico 0,25 lts.',       precio: 4550 },
  { tipo: 'Aceite de Oliva Blend Clasico 0,5 lts.',        precio: 7210 },
  { tipo: 'Aceite de Oliva Blend Clasico 1 lts.',          precio: 13300 },
  { tipo: 'Aceite de Oliva Blend Clasico 3 lts.',          precio: 18000 },
  { tipo: 'Aceite de Oliva Blend Clasico 5 lts.',          precio: 25000 },
  { tipo: 'Aceite de Oliva Blend Intenso 0,25 lts.',       precio: 4550 },
  { tipo: 'Aceite de Oliva Blend Intenso 0,5 lts.',        precio: 7210 },
  { tipo: 'Aceite de Oliva Blend Intenso 1 lts.',          precio: 13300 },
  { tipo: 'Aceite de Oliva Blend Intenso 3 lts.',          precio: 18000 },
  { tipo: 'Aceite de Oliva Blend Intenso 5 lts.',          precio: 25000 },
  { tipo: 'Aceite de Oliva Cosecha Nocturna 0,25 lts.',    precio: 4550 },
  { tipo: 'Aceite de Oliva Cosecha Nocturna 0,50 lts.',    precio: 7210 },
  { tipo: 'Aceite de Oliva bidón 3 lts sin etiqueta',      precio: 18000 },
  { tipo: 'Aceite de Oliva bidón 5 lts sin etiqueta',      precio: 25000 },
  { tipo: 'Aceite de Oliva virgen extra Blend 0,5 lts.',   precio: 7210 },
];

const formatPrecio = (n) =>
  n === 0 ? 'A consultar' : `$\u00A0${n.toLocaleString('es-AR')}`;

const EMPRESAS = [
  { value: 'FP', label: 'FP' },
  { value: 'MULTIM', label: 'MULTIMODAL' },
];

function App() {
  const [usuario, setUsuario] = useState(null);
  const [empresa, setEmpresa] = useState('FP');

  // Carrito: array de { tipo, cantidad }
  const [carrito, setCarrito] = useState([]);

  // Modal de cantidad (al clickear un producto)
  const [modalCantidad, setModalCantidad] = useState(null); // { tipo } o null
  const [cantidadInput, setCantidadInput] = useState(1);
  const cantidadRef = useRef(null);

  const hoy = () => new Date().toISOString().split('T')[0];
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [siguienteNroFor, setSiguienteNroFor] = useState(null);
  const [modoAdmin, setModoAdmin] = useState(false);

  // Restaurar sesión
  useEffect(() => {
    const legajoGuardado = localStorage.getItem('aceite_legajo');
    const nombreGuardado = localStorage.getItem('aceite_nombre');
    const empresaGuardada = localStorage.getItem('aceite_empresa');
    if (legajoGuardado && nombreGuardado) {
      setUsuario({ legajo: legajoGuardado, nombre: nombreGuardado, empresa: empresaGuardada || 'DIBIAG' });
      setEmpresa(empresaGuardada || 'FP');
    }
  }, []);

  useEffect(() => {
    if (usuario) cargarSiguienteNroFor();
  }, [empresa, usuario]);

  // Foco automático en el input de cantidad cuando se abre el modal
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
  };

  // Abre el modal de cantidad para un producto
  const abrirModalCantidad = (tipo) => {
    const enCarrito = carrito.find((p) => p.tipo === tipo);
    setCantidadInput(enCarrito ? enCarrito.cantidad : 1);
    setModalCantidad({ tipo });
  };

  // Confirma la cantidad y agrega/actualiza el carrito
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
            productos: response.data.productos,
          },
        });
        setCarrito([]);
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
    const prod = TIPOS_ACEITE.find((t) => t.tipo === p.tipo);
    return acc + (prod ? prod.precio * p.cantidad : 0);
  }, 0);

  return (
    <div className="app">
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
        {modalCantidad && (
          <div className="modal-overlay" onClick={() => setModalCantidad(null)}>
            <div className="modal-cantidad" onClick={(e) => e.stopPropagation()}>
              <div className="modal-cantidad-header">
                <span className="modal-cantidad-icon">🫒</span>
                <h3>Cantidad</h3>
                <button className="btn-modal-x" onClick={() => setModalCantidad(null)}>✕</button>
              </div>
              <p className="modal-cantidad-producto">{modalCantidad.tipo}</p>
              <div className="cantidad-control">
                <button
                  type="button"
                  className="btn-qty"
                  onClick={() => setCantidadInput((v) => Math.max(1, parseInt(v || 1) - 1))}
                >−</button>
                <input
                  ref={cantidadRef}
                  type="number"
                  min="1"
                  value={cantidadInput}
                  onChange={(e) => setCantidadInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && confirmarCantidad()}
                  className="qty-input"
                />
                <button
                  type="button"
                  className="btn-qty"
                  onClick={() => setCantidadInput((v) => parseInt(v || 1) + 1)}
                >+</button>
              </div>
              <div className="modal-cantidad-actions">
                <button type="button" className="btn-cancelar-qty" onClick={() => setModalCantidad(null)}>
                  Cancelar
                </button>
                <button type="button" className="btn-agregar-qty" onClick={confirmarCantidad}>
                  {carrito.find((p) => p.tipo === modalCantidad.tipo) ? 'Actualizar' : 'Agregar al pedido'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── MODAL RESULTADO ── */}
        {modal && (
          <div className="modal-overlay">
            <div className={`modal-box ${modal.type}`}>
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
            </div>
          </div>
        )}

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
            <div className="form-section">
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
            </div>

            {/* PRODUCTOS */}
            <div className="form-section">
              <div className="section-title">
                <span>🫒</span> Productos
                {carrito.length > 0 && (
                  <span className="carrito-badge">{totalProductos} unid. seleccionadas</span>
                )}
              </div>

              <div className="productos-grid">
                {TIPOS_ACEITE.map(({ tipo, precio }) => {
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
            </div>

            {/* CARRITO */}
            {carrito.length > 0 && (
              <div className="carrito-section">
                <div className="section-title">
                  <span>🛒</span> Mi pedido ({carrito.length} producto{carrito.length > 1 ? 's' : ''})
                </div>
                <div className="carrito-lista">
                  {carrito.map((item) => {
                    const prod = TIPOS_ACEITE.find((t) => t.tipo === item.tipo);
                    const subtotal = prod ? prod.precio * item.cantidad : 0;
                    return (
                      <div key={item.tipo} className="carrito-item">
                        <div className="carrito-item-info">
                          <span className="carrito-item-nombre">🫒 {item.tipo}</span>
                          <span className="carrito-item-subtotal">
                            {formatPrecio(prod?.precio ?? 0)} × {item.cantidad} = <strong>{formatPrecio(subtotal)}</strong>
                          </span>
                        </div>
                        <div className="carrito-item-actions">
                          <button
                            type="button"
                            className="btn-edit-qty"
                            onClick={() => abrirModalCantidad(item.tipo)}
                            title="Editar cantidad"
                          >
                            ×{item.cantidad}
                          </button>
                          <button
                            type="button"
                            className="btn-quitar"
                            onClick={() => quitarDelCarrito(item.tipo)}
                            title="Quitar"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="carrito-total">
                  <span>Total del pedido</span>
                  <strong>{formatPrecio(totalImporte)}</strong>
                </div>
              </div>
            )}


            {/* SUBMIT */}
            <div className="submit-section">
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
            </div>

          </form>
        </div>
        )}

      </div>
    </div>
  );
}

export default App;

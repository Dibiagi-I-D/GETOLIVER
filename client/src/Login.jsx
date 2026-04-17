import { useState, useEffect } from 'react';
import axios from 'axios';
import './Login.css';
import fondoDesktop from '../assets/fondo de pantalla de desktop.png';
import fondoMobile from '../assets/fondo de pantalla responsivo.jpeg';

const API_BASE = import.meta.env.VITE_API_URL || '';

const EMPRESAS = [
  { value: 'FP', label: 'FP' },
  { value: 'MULTIM', label: 'MULTIMODAL' },
];

function Login({ onLogin }) {
  const [legajo, setLegajo] = useState('');
  const [empresa, setEmpresa] = useState('FP');
  const [error, setError] = useState('');
  const [validando, setValidando] = useState(false);

  // Datos guardados de visita anterior
  const [datoGuardado, setDatoGuardado] = useState(null);

  useEffect(() => {
    const legajoGuardado = localStorage.getItem('aceite_legajo');
    const nombreGuardado = localStorage.getItem('aceite_nombre');
    const empresaGuardada = localStorage.getItem('aceite_empresa');
    if (legajoGuardado && nombreGuardado) {
      setDatoGuardado({
        legajo: legajoGuardado,
        nombre: nombreGuardado,
        empresa: empresaGuardada || 'FP',
      });
    }
  }, []);

  const validarYEntrar = async (legajoInput, empresaInput) => {
    const legajoLimpio = String(legajoInput).trim();
    if (!legajoLimpio) {
      setError('Ingrese su número de legajo');
      return;
    }

    setValidando(true);
    setError('');

    try {
      const response = await axios.get(
        `${API_BASE}/api/aceite/validar-legajo?legajo=${legajoLimpio}&empresa=${empresaInput}`
      );

      if (response.data.success) {
        const { legajo: legajoValidado, nombre } = response.data;

        // Guardar en localStorage (sin expiración)
        localStorage.setItem('aceite_legajo', legajoValidado);
        localStorage.setItem('aceite_nombre', nombre);
        localStorage.setItem('aceite_empresa', empresaInput);

        onLogin({ legajo: legajoValidado, nombre, empresa: empresaInput });
      } else {
        setError(response.data.message || 'Legajo no encontrado');
      }
    } catch (err) {
      console.error('Error al validar legajo:', err);
      setError('Error al conectar con el servidor. Verifique su conexión.');
    } finally {
      setValidando(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    validarYEntrar(legajo, empresa);
  };

  const handleContinuar = () => {
    onLogin(datoGuardado);
  };

  const handleCambiarLegajo = () => {
    setDatoGuardado(null);
    localStorage.removeItem('aceite_legajo');
    localStorage.removeItem('aceite_nombre');
    localStorage.removeItem('aceite_empresa');
  };

  return (
    <div
      className="login-container"
      style={{
        '--bg-desktop': `url(${fondoDesktop})`,
        '--bg-mobile': `url(${fondoMobile})`,
      }}
    >
      <div className="login-brand">
        <div className="login-brand-title">Oliver</div>
        <div className="login-brand-sub">Sistema de Beneficios — DIBIAGI</div>
      </div>

      <div className="login-box">

        <div className="login-body">
          {datoGuardado ? (
            /* Vista para usuario que ya ingresó antes */
            <div className="login-returning">
              <span className="returning-icon">👋</span>
              <h2>¡Bienvenido de nuevo!</h2>
              <p className="empleado-name">{datoGuardado.nombre}</p>
              <span className="legajo-badge">
                🪪 Legajo {datoGuardado.legajo} &nbsp;·&nbsp; {datoGuardado.empresa}
              </span>

              <button className="btn-continuar" onClick={handleContinuar}>
                Continuar
              </button>

              <div className="login-divider">o</div>

              <button className="btn-cambiar" onClick={handleCambiarLegajo}>
                Cambiar legajo
              </button>
            </div>
          ) : (
            /* Vista de primer ingreso */
            <form className="login-form" onSubmit={handleSubmit}>
              <h2>Ingrese su legajo</h2>

              {error && <div className="login-error">{error}</div>}

              <div className="login-field">
                <label htmlFor="empresa">Empresa</label>
                <select
                  id="empresa"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                >
                  {EMPRESAS.map((e) => (
                    <option key={e.value} value={e.value}>
                      {e.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="login-field">
                <label htmlFor="legajo">Número de legajo</label>
                <input
                  type="text"
                  id="legajo"
                  value={legajo}
                  onChange={(e) => setLegajo(e.target.value)}
                  placeholder="Ej: 1234"
                  autoFocus
                  inputMode="numeric"
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={validando}>
                {validando ? 'Verificando...' : 'Ingresar'}
              </button>

              {validando && (
                <div className="validating-text">
                  <div className="spinner-sm" />
                  Verificando legajo...
                </div>
              )}
            </form>
          )}
        </div>

        <div className="login-footer">
          <small>Su legajo se guardará para facilitar futuros ingresos</small>
        </div>
      </div>
    </div>
  );
}

export default Login;

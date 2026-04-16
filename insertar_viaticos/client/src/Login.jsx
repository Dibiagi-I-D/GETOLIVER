import React, { useState } from 'react';
import './Login.css';

const USUARIOS = [
  { usuario: 'AGAVAS', contraseña: 'ALE' },
  { usuario: 'MBECER', contraseña: 'Pelado' },
  { usuario: 'NGONZA', contraseña: 'lucari' },
  { usuario: 'CARMEN', contraseña: 'feli30' },
  { usuario: 'VBUSTO', contraseña: 'jcmpbm' },
  { usuario: 'NFIGUE', contraseña: '270496' },
];

function Login({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Buscar usuario (case-insensitive para ambos campos)
    const usuarioEncontrado = USUARIOS.find(
      (u) => 
        u.usuario.toUpperCase() === usuario.toUpperCase() && 
        u.contraseña.toUpperCase() === contraseña.toUpperCase()
    );

    if (usuarioEncontrado) {
      onLogin(usuarioEncontrado.usuario.toUpperCase());
    } else {
      setError('Usuario o contraseña incorrectos');
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>🧾 Sistema de Viáticos</h1>
        <h2>Iniciar Sesión</h2>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="usuario">Usuario</label>
            <input
              type="text"
              id="usuario"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              placeholder="Ingrese su usuario"
              autoFocus
              required
            />
          </div>

          <div className="login-field">
            <label htmlFor="contraseña">Contraseña</label>
            <input
              type="password"
              id="contraseña"
              value={contraseña}
              onChange={(e) => setContraseña(e.target.value)}
              placeholder="Ingrese su contraseña"
              required
            />
          </div>

          <button type="submit" className="login-button">
            Ingresar
          </button>
        </form>

        <div className="login-info">
          <small>Sistema de Carga de Anticipos de Viáticos</small>
        </div>
      </div>
    </div>
  );
}

export default Login;

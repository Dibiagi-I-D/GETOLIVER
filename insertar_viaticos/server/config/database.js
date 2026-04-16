import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

// TODAS las empresas están en la misma base de datos: DIBIAG
// El selector de empresa solo cambia el CODEMP en las consultas

// Configuración base - siempre DIBIAG
const getConfig = () => ({
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE || 'DIBIAG',
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '1433'),
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
});

// Pool de conexión único para DIBIAG
let pool = null;

export async function getConnection() {
  try {
    if (!pool) {
      const config = getConfig();
      pool = await sql.connect(config);
      console.log(`✅ Conectado a SQL Server: DIBIAG`);
    }
    
    return pool;
  } catch (error) {
    console.error('❌ Error al conectar a la base de datos:', error);
    throw error;
  }
}

export async function closeConnection() {
  try {
    if (pool) {
      await pool.close();
      pool = null;
      console.log(`🔌 Conexión cerrada: DIBIAG`);
    }
  } catch (error) {
    console.error('❌ Error al cerrar la conexión:', error);
  }
}

export { sql };

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import aceiteRoutes from './routes/aceite.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { closeConnection } from './config/database.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3502;

const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim())
  : ['http://localhost:5175'];

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requests sin origin (apps móviles, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('CORS: origen no permitido'));
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Demasiadas solicitudes desde esta IP, intente más tarde',
});

app.use(limiter);

app.use('/api/aceite', aceiteRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Servidor de pedidos de aceite funcionando correctamente' });
});

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    error: err.message,
  });
});

process.on('SIGINT', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Cerrando servidor...');
  await closeConnection();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`\n🫒 Servidor de Pedidos de Aceite corriendo en http://localhost:${PORT}`);
  console.log(`📊 Base de datos: ${process.env.DB_DATABASE}`);
  console.log(`🌐 Frontend permitido: ${process.env.FRONTEND_URL}\n`);
});

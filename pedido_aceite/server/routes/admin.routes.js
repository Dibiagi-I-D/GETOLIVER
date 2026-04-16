import express from 'express';
import { getPedidos, marcarEntregado } from '../controllers/admin.controller.js';

const router = express.Router();

// Obtener todos los pedidos POLIVA
router.get('/pedidos', getPedidos);

// Marcar un pedido como entregado
router.post('/marcar-entregado', marcarEntregado);

export default router;

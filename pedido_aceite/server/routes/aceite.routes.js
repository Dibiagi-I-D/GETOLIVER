import express from 'express';
import {
  validarLegajo,
  getUltimoNroFor,
  insertarPedidoAceite,
} from '../controllers/aceite.controller.js';

const router = express.Router();

// Validar que el legajo existe en SJMLGH
router.get('/validar-legajo', validarLegajo);

// Obtener el último número de formulario (POLIVA)
router.get('/ultimo-nrofor', getUltimoNroFor);

// Insertar pedido de aceite
router.post('/insertar', insertarPedidoAceite);

export default router;

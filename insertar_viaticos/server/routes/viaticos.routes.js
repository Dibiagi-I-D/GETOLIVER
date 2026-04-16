import express from 'express';
import {
  getUltimoNroFor,
  getEmpleados,
  insertarViaticos,
  getUltimosRegistros,
  getCuilChoferes,
} from '../controllers/viaticos.controller.js';

const router = express.Router();

// Obtener el último número de formulario
router.get('/ultimo-nrofor', getUltimoNroFor);

// Obtener lista de empleados
router.get('/empleados', getEmpleados);

// Obtener CUIL de choferes seleccionados
router.post('/cuil-choferes', getCuilChoferes);

// Insertar viáticos masivamente
router.post('/insertar', insertarViaticos);

// Obtener últimos registros insertados
router.get('/ultimos-registros', getUltimosRegistros);

export default router;

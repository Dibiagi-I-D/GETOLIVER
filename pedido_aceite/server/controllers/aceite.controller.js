import { getConnection } from '../config/database.js';

// Precios por producto (en pesos)
const PRECIOS = {
  'Aceite de Oliva Blend Clasico 0,25 lts.':      4550.00,
  'Aceite de Oliva Blend Clasico 0,5 lts.':       7210.00,
  'Aceite de Oliva Blend Clasico 1 lts.':        13300.00,
  'Aceite de Oliva Blend Clasico 3 lts.':        18000.00,
  'Aceite de Oliva Blend Clasico 5 lts.':        25000.00,
  'Aceite de Oliva Blend Intenso 0,25 lts.':      4550.00,
  'Aceite de Oliva Blend Intenso 0,5 lts.':       7210.00,
  'Aceite de Oliva Blend Intenso 1 lts.':        13300.00,
  'Aceite de Oliva Blend Intenso 3 lts.':        18000.00,
  'Aceite de Oliva Blend Intenso 5 lts.':        25000.00,
  'Aceite de Oliva Cosecha Nocturna 0,25 lts.':   4550.00,
  'Aceite de Oliva Cosecha Nocturna 0,50 lts.':   7210.00,
  'Aceite de Oliva bidón 3 lts sin etiqueta':    18000.00,
  'Aceite de Oliva bidón 5 lts sin etiqueta':    25000.00,
  'Aceite de Oliva virgen extra Blend 0,5 lts.':  7210.00,
};

/**
 * Valida que el legajo exista en SJMLGH para la empresa dada
 * Devuelve el nombre del empleado si existe
 */
export async function validarLegajo(req, res) {
  try {
    const { legajo, empresa = 'FP' } = req.query;

    if (!legajo || !String(legajo).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Debe ingresar un número de legajo',
      });
    }

    const legajoLimpio = String(legajo).trim();
    const legajoPadded = legajoLimpio.padStart(6, ' ');

    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT TOP 1
        RTRIM(LTRIM(SJMLGH_NROLEG)) as nroleg,
        RTRIM(LTRIM(SJMLGH_NOMBRE)) as nombre
      FROM SJMLGH
      WHERE SJMLGH_CODEMP = '${empresa}'
        AND (
          RTRIM(LTRIM(SJMLGH_NROLEG)) = '${legajoLimpio}'
          OR SJMLGH_NROLEG = '${legajoPadded}'
        )
        AND SJMLGH_DEBAJA <> 'S'
        AND SJMLGH_DEBAJA IS NOT NULL
    `);

    if (result.recordset.length === 0) {
      return res.json({
        success: false,
        message: 'Legajo no encontrado. Verifique el número y la empresa seleccionada.',
      });
    }

    const empleado = result.recordset[0];
    console.log(`✅ Legajo validado: ${empleado.nroleg} - ${empleado.nombre}`);

    res.json({
      success: true,
      legajo: empleado.nroleg,
      nombre: empleado.nombre,
    });
  } catch (error) {
    console.error('Error al validar legajo:', error);
    res.status(500).json({
      success: false,
      message: 'Error al validar el legajo',
      error: error.message,
    });
  }
}

/**
 * Obtiene el último NROFOR para CODFOR = 'POLIVA' y empresa específica
 */
export async function getUltimoNroFor(req, res) {
  try {
    const { empresa = 'FP' } = req.query;
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT TOP 1 CAST(SJTPAH_NROFOR AS INT) as SJTPAH_NROFOR
      FROM SJTPAH
      WHERE SJTPAH_CODFOR = 'POLIVA'
        AND SJTPAH_CODEMP = '${empresa}'
      ORDER BY CAST(SJTPAH_NROFOR AS INT) DESC
    `);

    let ultimoNroFor = 0;
    if (result.recordset.length > 0) {
      ultimoNroFor = parseInt(result.recordset[0].SJTPAH_NROFOR) || 0;
    }

    const siguienteNroFor = ultimoNroFor + 1;

    res.json({
      success: true,
      ultimoNroFor,
      siguienteNroFor,
    });
  } catch (error) {
    console.error('Error al obtener último NROFOR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener el número de formulario',
      error: error.message,
    });
  }
}

/**
 * Inserta el pedido de aceite para un empleado.
 * Acepta un array de productos: [{ tipo, cantidad }]
 * Lógica:
 *   - 1 registro SJTPAH para todo el pedido
 *   - 1 registro SJTPAI por cada producto, con SJTPAI_CUOTAS = 1, 2, 3...
 *   - SJTPAI_MOTIVO = nombre del producto + cantidad
 */
export async function insertarPedidoAceite(req, res) {
  try {
    const {
      empresa = 'FP',
      nroleg,
      fechaMov,
      fechaIni,
      productos, // [{ tipo, cantidad }]
    } = req.body;

    console.log('=== INICIANDO INSERCIÓN PEDIDO ACEITE ===');
    console.log('CODEMP:', empresa);
    console.log('Legajo:', nroleg);
    console.log('Fecha Mov:', fechaMov);
    console.log('Fecha Ini:', fechaIni);
    console.log('Productos:', productos);

    // Validaciones
    if (!nroleg || !String(nroleg).trim()) {
      return res.status(400).json({ success: false, message: 'Legajo es obligatorio' });
    }
    if (!fechaMov || !fechaIni) {
      return res.status(400).json({ success: false, message: 'Las fechas son obligatorias' });
    }
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar al menos un producto' });
    }

    const pool = await getConnection();

    // Obtener el siguiente NROFOR disponible
    const resultNroFor = await pool.request().query(`
      SELECT TOP 1 CAST(SJTPAH_NROFOR AS INT) as SJTPAH_NROFOR
      FROM SJTPAH
      WHERE SJTPAH_CODFOR = 'POLIVA'
        AND SJTPAH_CODEMP = '${empresa}'
      ORDER BY CAST(SJTPAH_NROFOR AS INT) DESC
    `);

    let nroFor = 1;
    if (resultNroFor.recordset.length > 0) {
      nroFor = parseInt(resultNroFor.recordset[0].SJTPAH_NROFOR) + 1;
    }

    console.log(`NROFOR asignado: ${nroFor} para CODEMP ${empresa}`);

    const legajoLimpio = String(nroleg).trim();
    const legajoPadded = legajoLimpio.padStart(6, ' ');

    // Calcular precio total del pedido (suma de precio_unitario × cantidad por producto)
    const importeTotal = productos.reduce((acc, { tipo, cantidad = 1 }) => {
      const precioUnit = PRECIOS[String(tipo).trim()] ?? 0;
      return acc + precioUnit * parseInt(cantidad, 10);
    }, 0);

    console.log(`Importe total calculado: $${importeTotal.toFixed(2)}`);

    // ── 1. INSERT SJTPAH (cabecera única del pedido) ──
    // SJTPAH_CUOTAS = 1 siempre
    // SJTPAH_IMPORT = precio total de todos los productos
    const resumenTexto = `Pedido de aceite - ${productos.length} producto(s)`;

    await pool.request().query(`
      INSERT INTO SJTPAH (
        SJTPAH_CODEMP, SJTPAH_MODFOR, SJTPAH_CODFOR, SJTPAH_NROFOR,
        SJTPAH_FCHMOV, SJTPAH_EMPLEG, SJTPAH_NROLEG,
        SJTPAH_IMPORT, SJTPAH_CUOTAS, SJTPAH_FCHINI, SJTPAH_TASINT,
        SJTPAH_PERIOD, SJTPAH_STATUS, SJTPAH_MODCPT, SJTPAH_TIPCPT,
        SJTPAH_CODCPT, SJTPAH_OALIAS, SJTPAH_DEBAJA,
        SJTPAH_FECALT, SJTPAH_FECMOD, SJTPAH_USERID, SJTPAH_ULTOPR,
        USR_SJTPAH_TEXTOS
      ) VALUES (
        '${empresa}', 'SJ', 'POLIVA', ${nroFor},
        '${fechaMov}', '${empresa}', '${legajoPadded}',
        ${importeTotal.toFixed(2)}, 1, '${fechaIni}', 0.0000,
        '', 'M', 'CJ', 's',
        'ANTI', 'SJTPAH', 'N',
        GETDATE(), GETDATE(), '${legajoLimpio}', 'A',
        '${resumenTexto.replace(/'/g, "''")}'
      )
    `);
    console.log(`✓ SJTPAH insertado (NROFOR: ${nroFor}, IMPORT: $${importeTotal.toFixed(2)})`);

    // ── 2. INSERT SJTPAI: un registro por producto ──
    const itemsInsertados = [];
    const errores = [];

    for (let i = 0; i < productos.length; i++) {
      const { tipo, cantidad = 1 } = productos[i];
      if (!tipo || !String(tipo).trim()) continue;

      const nroCuota = i + 1; // 1, 2, 3...
      const precioUnit = PRECIOS[String(tipo).trim()] ?? 0;
      const totalLinea = precioUnit * parseInt(cantidad, 10);
      const precioFmt = precioUnit.toLocaleString('es-AR', { minimumFractionDigits: 2 });
      const motivoTexto = `${String(tipo).trim().substring(0, 200)} - Cant: ${cantidad} x $${precioFmt}`;

      try {
        await pool.request().query(`
          INSERT INTO SJTPAI (
            SJTPAI_CODEMP, SJTPAI_MODFOR, SJTPAI_CODFOR, SJTPAI_NROFOR,
            SJTPAI_CUOTAS, SJTPAI_FCHVNC, SJTPAI_IMPCUO, SJTPAI_SALCUO,
            SJTPAI_REFERN, SJTPAI_IMPSEL, SJTPAI_SELECC, SJTPAI_ANULAR,
            SJTPAI_MOTIVO, SJTPAI_OALIAS, SJTPAI_DEBAJA,
            SJTPAI_FECALT, SJTPAI_FECMOD, SJTPAI_USERID, SJTPAI_ULTOPR,
            USR_SJTPAI_TEXTOS
          ) VALUES (
            '${empresa}', 'SJ', 'POLIVA', ${nroFor},
            ${nroCuota}, '${fechaIni}', ${totalLinea.toFixed(2)}, 0.00,
            '', 0.00, 'N', 'N',
            '${motivoTexto.replace(/'/g, "''")}', 'SJTPAI', 'N',
            GETDATE(), GETDATE(), '${legajoLimpio}', 'A',
            '${motivoTexto.replace(/'/g, "''")}'
          )
        `);
        console.log(`  ✓ SJTPAI cuota ${nroCuota}: ${tipo} | unit $${precioUnit.toFixed(2)} x${cantidad} = $${totalLinea.toFixed(2)}`);
        itemsInsertados.push({ tipo, cantidad, cuota: nroCuota, precioUnit, totalLinea });
      } catch (paiErr) {
        console.error(`  ✗ Error SJTPAI cuota ${nroCuota}:`, paiErr.message);
        errores.push({ tipo, cuota: nroCuota, error: paiErr.message });
      }
    }

    console.log(`\n=== RESUMEN: NROFOR ${nroFor} | ${itemsInsertados.length} items OK, ${errores.length} errores ===`);

    res.json({
      success: true,
      message: `Pedido registrado correctamente`,
      nrofor: nroFor,
      insertados: itemsInsertados.length,
      productos: itemsInsertados,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error('✗✗✗ ERROR AL INSERTAR PEDIDO ACEITE:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el pedido',
      error: error.message,
    });
  }
}

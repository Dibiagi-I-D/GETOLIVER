import { getConnection } from '../config/database.js';

// Precios por método de pago
const PRECIOS_POR_METODO = {
  empleado: {
    'Oliver Cooks AOVE Clásico - Vidrio 250cc':              4700.00,
    'Oliver Cooks AOVE Clásico - Vidrio 250cc (Caja x12)':  54000.00,
    'Oliver Cooks AOVE Intenso - Vidrio 250cc':              4700.00,
    'Oliver Cooks AOVE Intenso - Vidrio 250cc (Caja x12)':  54000.00,
    'Oliver Cooks AOVE Clásico - Vidrio 500cc':              7500.00,
    'Oliver Cooks AOVE Clásico - Vidrio 500cc (Caja x6)':   43000.00,
    'Oliver Cooks AOVE Intenso - Vidrio 500cc':              7500.00,
    'Oliver Cooks AOVE Intenso - Vidrio 500cc (Caja x6)':   43000.00,
    'Oliver Cooks AOVE Clásico - Pet 1000cc':               14000.00,
    'Oliver Cooks AOVE Clásico - Pet 1000cc (Caja x6)':     80000.00,
    'Oliver Cooks AOVE Intenso - Pet 1000cc':               14000.00,
    'Oliver Cooks AOVE Intenso - Pet 1000cc (Caja x6)':     80000.00,
    'Oliver Cooks AOVE Clásico - Pet 3000cc':               38800.00,
    'Oliver Cooks AOVE Clásico - Pet 3000cc (Caja x4)':    148000.00,
    'Oliver Cooks AOVE Intenso - Pet 3000cc':               38800.00,
    'Oliver Cooks AOVE Intenso - Pet 3000cc (Caja x4)':    148000.00,
    'Oliver Cooks AOVE Clásico - Pet 5000cc':               63500.00,
    'Oliver Cooks AOVE Clásico - Pet 5000cc (Caja x2)':    120000.00,
    'Oliver Cooks AOVE Intenso - Pet 5000cc':               63500.00,
    'Oliver Cooks AOVE Intenso - Pet 5000cc (Caja x2)':    120000.00,
  },
  bono: {
    'Oliver Cooks AOVE Clásico - Vidrio 250cc':              5100.00,
    'Oliver Cooks AOVE Clásico - Vidrio 250cc (Caja x12)':  58100.00,
    'Oliver Cooks AOVE Intenso - Vidrio 250cc':              5100.00,
    'Oliver Cooks AOVE Intenso - Vidrio 250cc (Caja x12)':  58100.00,
    'Oliver Cooks AOVE Clásico - Vidrio 500cc':              8100.00,
    'Oliver Cooks AOVE Clásico - Vidrio 500cc (Caja x6)':   46200.00,
    'Oliver Cooks AOVE Intenso - Vidrio 500cc':              8100.00,
    'Oliver Cooks AOVE Intenso - Vidrio 500cc (Caja x6)':   46200.00,
    'Oliver Cooks AOVE Clásico - Pet 1000cc':               15000.00,
    'Oliver Cooks AOVE Clásico - Pet 1000cc (Caja x6)':     85500.00,
    'Oliver Cooks AOVE Intenso - Pet 1000cc':               15000.00,
    'Oliver Cooks AOVE Intenso - Pet 1000cc (Caja x6)':     85500.00,
    'Oliver Cooks AOVE Clásico - Pet 3000cc':               41800.00,
    'Oliver Cooks AOVE Clásico - Pet 3000cc (Caja x4)':    158000.00,
    'Oliver Cooks AOVE Intenso - Pet 3000cc':               41800.00,
    'Oliver Cooks AOVE Intenso - Pet 3000cc (Caja x4)':    158000.00,
    'Oliver Cooks AOVE Clásico - Pet 5000cc':               68300.00,
    'Oliver Cooks AOVE Clásico - Pet 5000cc (Caja x2)':    129700.00,
    'Oliver Cooks AOVE Intenso - Pet 5000cc':               68300.00,
    'Oliver Cooks AOVE Intenso - Pet 5000cc (Caja x2)':    129700.00,
  },
};

/**
 * Valida que el legajo exista en SJMLGH para la empresa dada
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

    res.json({
      success: true,
      ultimoNroFor,
      siguienteNroFor: ultimoNroFor + 1,
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

// Mapeo de nombre de producto (app) → STMPDH_ARTCOD
const PRODUCTO_A_ARTCOD = {
  'Oliver Cooks AOVE Clásico - Vidrio 250cc':             8,
  'Oliver Cooks AOVE Clásico - Vidrio 250cc (Caja x12)':  8,
  'Oliver Cooks AOVE Intenso - Vidrio 250cc':             13,
  'Oliver Cooks AOVE Intenso - Vidrio 250cc (Caja x12)': 13,
  'Oliver Cooks AOVE Clásico - Vidrio 500cc':             9,
  'Oliver Cooks AOVE Clásico - Vidrio 500cc (Caja x6)':   9,
  'Oliver Cooks AOVE Intenso - Vidrio 500cc':             14,
  'Oliver Cooks AOVE Intenso - Vidrio 500cc (Caja x6)':  14,
  'Oliver Cooks AOVE Clásico - Pet 1000cc':              10,
  'Oliver Cooks AOVE Clásico - Pet 1000cc (Caja x6)':    10,
  'Oliver Cooks AOVE Intenso - Pet 1000cc':              15,
  'Oliver Cooks AOVE Intenso - Pet 1000cc (Caja x6)':    15,
  'Oliver Cooks AOVE Clásico - Pet 3000cc':              11,
  'Oliver Cooks AOVE Clásico - Pet 3000cc (Caja x4)':    11,
  'Oliver Cooks AOVE Intenso - Pet 3000cc':              16,
  'Oliver Cooks AOVE Intenso - Pet 3000cc (Caja x4)':    16,
  'Oliver Cooks AOVE Clásico - Pet 5000cc':              12,
  'Oliver Cooks AOVE Clásico - Pet 5000cc (Caja x2)':    12,
  'Oliver Cooks AOVE Intenso - Pet 5000cc':              17,
  'Oliver Cooks AOVE Intenso - Pet 5000cc (Caja x2)':    17,
};

/**
 * Inserta el pedido de aceite para un empleado.
 * Acepta: { empresa, nroleg, fechaMov, fechaIni, metodoPago, productos: [{ tipo, cantidad }] }
 *
 * Vías de inserción:
 *   - bono:               SJTPAH/SJTPAI  +  FCRMVH/FCRMVI
 *   - empleado (ef/transf):               FCRMVH/FCRMVI  (solo)
 */
export async function insertarPedidoAceite(req, res) {
  try {
    const {
      empresa = 'FP',
      nroleg,
      fechaMov,
      fechaIni,
      metodoPago = 'empleado',
      productos,
    } = req.body;

    console.log('=== INICIANDO INSERCIÓN PEDIDO ACEITE ===');
    console.log('CODEMP:', empresa, '| Legajo:', nroleg, '| Método:', metodoPago);
    console.log('Productos:', productos);

    if (!nroleg || !String(nroleg).trim()) {
      return res.status(400).json({ success: false, message: 'Legajo es obligatorio' });
    }
    if (!fechaMov || !fechaIni) {
      return res.status(400).json({ success: false, message: 'Las fechas son obligatorias' });
    }
    if (!productos || !Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({ success: false, message: 'Debe seleccionar al menos un producto' });
    }

    const PRECIOS = PRECIOS_POR_METODO[metodoPago] || PRECIOS_POR_METODO.empleado;
    const metodoLabel = metodoPago === 'bono' ? 'Descuento por Bono' : 'Empleado (efectivo/transferencia)';

    const pool = await getConnection();

    // Siguiente NROFOR
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

    console.log(`NROFOR asignado: ${nroFor}`);

    const legajoLimpio = String(nroleg).trim();
    const legajoPadded = legajoLimpio.padStart(6, ' ');

    // Importe total
    const importeTotal = productos.reduce((acc, { tipo, cantidad = 1 }) => {
      const precioUnit = PRECIOS[String(tipo).trim()] ?? 0;
      return acc + precioUnit * parseInt(cantidad, 10);
    }, 0);

    console.log(`Importe total: $${importeTotal.toFixed(2)}`);

    const itemsInsertados = [];
    const errores = [];

    // ── VÍA BONO: INSERT SJTPAH + SJTPAI ──────────────────────────────────
    if (metodoPago === 'bono') {
      const resumenTexto = `${metodoLabel} - ${productos.length} producto(s)`;

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
      console.log(`✓ SJTPAH insertado (NROFOR: ${nroFor})`);

      for (let i = 0; i < productos.length; i++) {
        const { tipo, cantidad = 1 } = productos[i];
        if (!tipo || !String(tipo).trim()) continue;

        const nroCuota = i + 1;
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
          console.log(`  ✓ SJTPAI cuota ${nroCuota}: ${tipo} x${cantidad} = $${totalLinea.toFixed(2)}`);
          itemsInsertados.push({ tipo, cantidad, cuota: nroCuota, precioUnit, totalLinea });
        } catch (paiErr) {
          console.error(`  ✗ Error SJTPAI cuota ${nroCuota}:`, paiErr.message);
          errores.push({ tipo, cuota: nroCuota, error: paiErr.message });
        }
      }
    }

    // ── SIEMPRE: INSERT FCRMVH + FCRMVI (MODFOR=FC, CODFOR=NPI) ──────────
    const textosMetodoPago = metodoPago === 'bono'
      ? 'Pago por Bono: se descuenta del sueldo el próximo mes'
      : 'Pago en efectivo o transferencia bancaria';

    // NROFOR propio para NPI (secuencia independiente de POLIVA)
    const resultNroNPI = await pool.request().query(`
      SELECT TOP 1 CAST(FCRMVH_NROFOR AS INT) as FCRMVH_NROFOR
      FROM FCRMVH
      WHERE FCRMVH_MODFOR = 'FC'
        AND FCRMVH_CODFOR = 'NPI'
      ORDER BY FCRMVH_NROFOR DESC
    `);
    let nroNPI = 1;
    if (resultNroNPI.recordset.length > 0) {
      nroNPI = parseInt(resultNroNPI.recordset[0].FCRMVH_NROFOR) + 1;
    }
    console.log(`NROFOR NPI asignado: ${nroNPI}`);

    await pool.request().query(`
      INSERT INTO FCRMVH (
        FCRMVH_CODEMP, FCRMVH_MODFOR, FCRMVH_CODFOR, FCRMVH_NROFOR,
        FCRMVH_CIRCOM, FCRMVH_CIRAPL,
        FCRMVH_FCHMOV,
        FCRMVH_NROCTA, FCRMVH_NROSUB,
        FCRMVH_VNDDOR, FCRMVH_CNDPAG, FCRMVH_CODLIS,
        FCRMVH_COFLIS, FCRMVH_COFFAC, FCRMVH_COFDEU,
        FCRMVH_TEXTOS,
        FCRMVH_EMPGEN, FCRMVH_MODGEN, FCRMVH_CODGEN,
        FCRMVH_CIRGEN, FCRMVH_NROGEN,
        FCRMVH_JURISD,
        USR_FCRMVH_TIPOPE,
        FCRMVH_OALIAS, FCRMVH_DEBAJA,
        FCRMVH_FECALT, FCRMVH_FECMOD, FCRMVH_USERID, FCRMVH_ULTOPR
      ) VALUES (
        '${empresa}', 'FC', 'NPI', ${nroNPI},
        '0201', '0201',
        '${fechaMov}',
        '   417', '   417',
        '01', '001', '01',
        'ARS', 'ARS', 'ARS',
        '${textosMetodoPago.replace(/'/g, "''")}',
        'DIBIAG', 'FC', 'NPI',
        '0201', ${nroNPI},
        '913',
        'P',
        'FCRMVH', 'N',
        GETDATE(), GETDATE(), '${legajoLimpio}', 'A'
      )
    `);
    console.log(`✓ FCRMVH insertado (NROFOR: ${nroFor})`);

    for (let i = 0; i < productos.length; i++) {
      const { tipo, cantidad = 1 } = productos[i];
      if (!tipo || !String(tipo).trim()) continue;

      const artcodNum = PRODUCTO_A_ARTCOD[String(tipo).trim()];
      if (!artcodNum) {
        console.warn(`  ⚠ Sin mapeo ARTCOD para: ${tipo}`);
        errores.push({ tipo, error: 'Sin mapeo de código de producto' });
        continue;
      }
      const artcod = String(artcodNum).padStart(5, ' ');

      const nroIte = i + 1;

      try {
        const precioUnit = PRECIOS[String(tipo).trim()] ?? 0;
        const cantNum    = parseInt(cantidad, 10);
        const totalLinea = precioUnit * cantNum;

        await pool.request().query(`
          INSERT INTO FCRMVI (
            FCRMVI_CODEMP, FCRMVI_MODFOR, FCRMVI_CODFOR, FCRMVI_NROFOR,
            FCRMVI_NROITM,
            FCRMVI_NIVEXP,
            FCRMVI_EMPAPL, FCRMVI_MODAPL, FCRMVI_CODAPL, FCRMVI_NROAPL, FCRMVI_ITMAPL, FCRMVI_EXPAPL,
            FCRMVI_TIPPRO, FCRMVI_ARTCOD,
            FCRMVI_MODCPT, FCRMVI_TIPCPT, FCRMVI_CODCPT,
            FCRMVI_TIPORI, FCRMVI_ARTORI,
            FCRMVI_DEPOSI, FCRMVI_SECTOR, FCRMVI_SUCURS,
            FCRMVI_NROCTA, FCRMVI_NROSUB,
            FCRMVI_PRECIO, FCRMVI_CANTID,
            FCRMVI_UNIMED, FCRMVI_TIPUNI, FCRMVI_CNTFAC,
            FCRMVI_FCHENT, FCRMVI_FCHHAS,
            FCRMVI_EMPORI, FCRMVI_MODORI, FCRMVI_CODORI, FCRMVI_NROORI, FCRMVI_ITMORI, FCRMVI_EXPORI,
            FCRMVI_CUENTA,
            FCRMVI_CANTST, FCRMVI_CNTORI,
            FCRMVI_EMPINI, FCRMVI_MODINI, FCRMVI_CODINI, FCRMVI_NROINI, FCRMVI_ITMINI, FCRMVI_NIVINI,
            FCRMVI_COFLIS,
            FCRMVI_PRENAC, FCRMVI_TOTLIN,
            FCRMVI_OALIAS, FCRMVI_DEBAJA,
            FCRMVI_FECALT, FCRMVI_FECMOD, FCRMVI_USERID, FCRMVI_ULTOPR
          ) VALUES (
            '${empresa}', 'FC', 'NPI', ${nroNPI},
            ${nroIte},
            '1',
            'DIBIAG', 'FC', 'NPI', ${nroNPI}, ${nroIte}, '1',
            'PRODTE', '${artcod}',
            'VT', 'A', 'V001',
            'PRODTE', '${artcod}',
            '12', '03', '0001',
            '   417', '   417',
            ${precioUnit.toFixed(6)}, ${cantNum},
            'UN', 'F', ${cantNum},
            '${fechaMov}', '${fechaMov}',
            'DIBIAG', 'FC', 'NPI', ${nroNPI}, ${nroIte}, '1',
            '41010105',
            ${cantNum}, ${cantNum},
            'DIBIAG', 'FC', 'NPI', ${nroNPI}, ${nroIte}, '1',
            'ARS',
            ${precioUnit.toFixed(6)}, ${totalLinea.toFixed(4)},
            'FCRMVI', 'N',
            GETDATE(), GETDATE(), '${legajoLimpio}', 'A'
          )
        `);
        console.log(`  ✓ FCRMVI item ${nroIte}: ARTCOD=${artcod} x${cantNum}`);
        if (metodoPago !== 'bono') {
          itemsInsertados.push({ tipo, cantidad: cantNum, cuota: nroIte, precioUnit, totalLinea });
        }
      } catch (viErr) {
        const prevErrors = viErr.precedingErrors?.map(e => e.message).join(' | ') || '';
        console.error(`  ✗ Error FCRMVI item ${nroIte}:`, viErr.message, prevErrors ? `| PREV: ${prevErrors}` : '');
        errores.push({ tipo, item: nroIte, error: viErr.message });
      }
    }

    console.log(`=== NROFOR ${nroFor} | ${itemsInsertados.length} OK, ${errores.length} errores ===`);

    res.json({
      success: true,
      message: 'Pedido registrado correctamente',
      nrofor: nroFor,
      insertados: itemsInsertados.length,
      metodoPago,
      productos: itemsInsertados,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error('✗✗✗ ERROR AL INSERTAR:', error);
    res.status(500).json({
      success: false,
      message: 'Error al registrar el pedido',
      error: error.message,
    });
  }
}

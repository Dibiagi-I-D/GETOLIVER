import { getConnection, sql } from '../config/database.js';

/**
 * Obtiene el último NROFOR para CODFOR = 'ANTV' y empresa específica
 */
export async function getUltimoNroFor(req, res) {
  try {
    const { empresa = 'DIBIAG' } = req.query;
    const pool = await getConnection();
    
    const result = await pool
      .request()
      .query(`
        SELECT TOP 1 CAST(SJTPAH_NROFOR AS INT) as SJTPAH_NROFOR
        FROM SJTPAH
        WHERE SJTPAH_CODFOR = 'ANTV'
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
      message: 'Error al obtener el último número de formulario',
      error: error.message,
    });
  }
}

/**
 * Obtiene la lista de empleados desde SJMLGH filtrados por CODEMP
 */
export async function getEmpleados(req, res) {
  try {
    const { empresa = 'DIBIAG' } = req.query;
    const pool = await getConnection();
    
    const result = await pool.request().query(`
      SELECT DISTINCT
        SJMLGH_NROLEG as nroleg,
        SJMLGH_NOMBRE as nombre
      FROM SJMLGH
      WHERE SJMLGH_CDAREA = 'Chofer'
        AND SJMLGH_CODEMP = '${empresa}'
        AND SJMLGH_NROLEG IS NOT NULL 
        AND SJMLGH_NROLEG <> ''
        AND SJMLGH_NOMBRE IS NOT NULL
        AND SJMLGH_CHKMOV <> 'S'
        AND SJMLGH_CHKMOV IS NOT NULL
        AND SJMLGH_DEBAJA <> 'S'
        AND SJMLGH_DEBAJA IS NOT NULL
        AND RTRIM(LTRIM(SJMLGH_NROLEG)) NOT IN ('999997', '999999')
      ORDER BY SJMLGH_NOMBRE
    `);

    console.log(`Empleados (Choferes) encontrados para CODEMP ${empresa}:`, result.recordset.length);

    res.json({
      success: true,
      empleados: result.recordset,
    });
  } catch (error) {
    console.error('Error al obtener empleados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la lista de empleados',
      error: error.message,
    });
  }
}

/**
 * Obtiene los datos de CUIL de los choferes seleccionados para el Excel
 */
export async function getCuilChoferes(req, res) {
  try {
    const { empresa = 'DIBIAG', nrolegajos } = req.body;

    if (!nrolegajos || nrolegajos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe enviar al menos un legajo',
      });
    }

    const pool = await getConnection();

    // Construir lista de legajos para el IN (con y sin padding por si acaso)
    const legajosSet = new Set();
    nrolegajos.forEach(l => {
      const limpio = String(l).trim();
      legajosSet.add(`'${limpio}'`);
      legajosSet.add(`'${limpio.padStart(6, ' ')}'`);
    });
    const legajosList = [...legajosSet].join(',');

    console.log('Legajos buscados:', legajosList);

    const result = await pool.request().query(`
      SELECT 
        RTRIM(LTRIM(SJMLGH_NROLEG)) as nroleg,
        RTRIM(LTRIM(SJMLGH_NOMBRE)) as nombre,
        RTRIM(LTRIM(SJMLGH_TIPDO1)) as tipodoc,
        RTRIM(LTRIM(SJMLGH_NRODO1)) as nrodoc,
        CASE 
          WHEN RTRIM(LTRIM(USR_SJMLGH_BANDO3)) = 'SANTANDER' THEN RTRIM(LTRIM(SJMLGH_NRODO3))
          ELSE NULL
        END as cbu,
        RTRIM(LTRIM(USR_SJMLGH_BANDO3)) as banco
      FROM SJMLGH
      WHERE SJMLGH_CODEMP = '${empresa}'
        AND SJMLGH_NROLEG IN (${legajosList})
    `);

    console.log(`CUIL datos obtenidos para ${result.recordset.length} choferes (seleccionados: ${nrolegajos.length}):`);
    result.recordset.forEach(r => {
      console.log(`  Legajo: [${r.nroleg}] Nombre: [${r.nombre}] TipoDoc: [${r.tipodoc}] NroDoc: [${r.nrodoc}] Banco: [${r.banco}] CBU: [${r.cbu || 'SIN CBU'}]`);
    });

    res.json({
      success: true,
      choferes: result.recordset,
    });
  } catch (error) {
    console.error('Error al obtener CUIL de choferes:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener datos de CUIL',
      error: error.message,
    });
  }
}

/**
 * Inserta viáticos masivamente para múltiples empleados
 */
export async function insertarViaticos(req, res) {
  try {
    const {
      empresa = 'DIBIAG',
      usuario = 'ADMIN',
      nrolegajos,
      fechaMov,
      fechaIni,
      textoSJTPAH,
      textoSJTPAI,
    } = req.body;

    console.log('=== INICIANDO INSERCIÓN ===');
    console.log('CODEMP:', empresa);
    console.log('Usuario:', usuario);
    console.log('Legajos recibidos:', nrolegajos);
    console.log('Fecha Mov:', fechaMov);
    console.log('Fecha Ini:', fechaIni);

    // Validaciones
    if (!nrolegajos || nrolegajos.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos un empleado',
      });
    }

    if (!fechaMov || !fechaIni) {
      return res.status(400).json({
        success: false,
        message: 'Las fechas son obligatorias',
      });
    }

    const pool = await getConnection();
    console.log(`Conexión a BD establecida: DIBIAG`);
    
    // Obtener el siguiente NROFOR disponible para esta empresa
    const resultNroFor = await pool
      .request()
      .query(`
        SELECT TOP 1 CAST(SJTPAH_NROFOR AS INT) as SJTPAH_NROFOR
        FROM SJTPAH
        WHERE SJTPAH_CODFOR = 'ANTV'
          AND SJTPAH_CODEMP = '${empresa}'
        ORDER BY CAST(SJTPAH_NROFOR AS INT) DESC
      `);

    let siguienteNroFor = 1;
    
    if (resultNroFor.recordset.length > 0) {
      siguienteNroFor = parseInt(resultNroFor.recordset[0].SJTPAH_NROFOR) + 1;
    }

    console.log('Siguiente NROFOR para CODEMP', empresa, ':', siguienteNroFor);

    const resultados = [];
    const errores = [];

    // Insertar para cada empleado
    for (const nroleg of nrolegajos) {
      // Limpiar el legajo (quitar espacios)
      const legajoLimpio = String(nroleg).trim();
      console.log(`\n--- Insertando para legajo: ${legajoLimpio} ---`);
      
      try {
        // INSERT en SJTPAH
        console.log('Insertando en SJTPAH...');
        
        // Truncar textos si son muy largos (máximo 255 caracteres)
        const textoSJTPAHTruncado = (textoSJTPAH || '').substring(0, 255);
        const textoSJTPAITruncado = (textoSJTPAI || '').substring(0, 255);
        
        // Determinar CODCPT según la empresa
        const codCpt = empresa === 'DIBIAG' ? 'B24CCN' : 'B25CCN';
        
        console.log('Datos a insertar:');
        console.log('  - Empresa:', empresa);
        console.log('  - CODCPT:', codCpt);
        console.log('  - Legajo:', legajoLimpio, `(${legajoLimpio.length} chars)`);
        console.log('  - NROFOR:', siguienteNroFor);
        console.log('  - Texto SJTPAH:', textoSJTPAHTruncado, `(${textoSJTPAHTruncado.length} chars)`);
        console.log('  - Texto SJTPAI:', textoSJTPAITruncado, `(${textoSJTPAITruncado.length} chars)`);
        
        // Construir el query INSERT con valores correctos
        // Ajustar legajo a 6 caracteres con padding a la izquierda
        const legajoPadded = legajoLimpio.padStart(6, ' ');
        
        const queryInsert = `
          INSERT INTO SJTPAH (
            SJTPAH_CODEMP,
            SJTPAH_MODFOR,
            SJTPAH_CODFOR,
            SJTPAH_NROFOR,
            SJTPAH_FCHMOV,
            SJTPAH_EMPLEG,
            SJTPAH_NROLEG,
            SJTPAH_IMPORT,
            SJTPAH_CUOTAS,
            SJTPAH_FCHINI,
            SJTPAH_TASINT,
            SJTPAH_PERIOD,
            SJTPAH_STATUS,
            SJTPAH_MODCPT,
            SJTPAH_TIPCPT,
            SJTPAH_CODCPT,
            SJTPAH_OALIAS,
            SJTPAH_DEBAJA,
            SJTPAH_FECALT,
            SJTPAH_FECMOD,
            SJTPAH_USERID,
            SJTPAH_ULTOPR,
            USR_SJTPAH_TEXTOS
          ) VALUES (
            '${empresa}',
            'SJ',
            'ANTV  ',
            ${siguienteNroFor},
            '${fechaMov}',
            '${empresa}',
            '${legajoPadded}',
            100000.00,
            1,
            '${fechaIni}',
            0.0000,
            '',
            'M',
            'CJ',
            'B',
            '${codCpt}',
            'SJTPAH',
            'N',
            GETDATE(),
            GETDATE(),
            '${usuario}',
            'A',
            '${textoSJTPAHTruncado.replace(/'/g, "''")}'
          )
        `;
        
        console.log('Query a ejecutar:', queryInsert);
        
        const insertResult = await pool
          .request()
          .query(queryInsert);

        console.log('✓ SJTPAH insertado correctamente');
        console.log('Resultado INSERT:', insertResult.rowsAffected);

        // INSERT en SJTPAI (tabla hija - cuotas)
        try {
          console.log('Insertando en SJTPAI...');
          
          const queryInsertPai = `
            INSERT INTO SJTPAI (
              SJTPAI_CODEMP,
              SJTPAI_MODFOR,
              SJTPAI_CODFOR,
              SJTPAI_NROFOR,
              SJTPAI_CUOTAS,
              SJTPAI_FCHVNC,
              SJTPAI_IMPCUO,
              SJTPAI_SALCUO,
              SJTPAI_REFERN,
              SJTPAI_IMPSEL,
              SJTPAI_SELECC,
              SJTPAI_ANULAR,
              SJTPAI_MOTIVO,
              SJTPAI_OALIAS,
              SJTPAI_DEBAJA,
              SJTPAI_FECALT,
              SJTPAI_FECMOD,
              SJTPAI_USERID,
              SJTPAI_ULTOPR,
              USR_SJTPAI_TEXTOS
            ) VALUES (
              '${empresa}',
              'SJ',
              'ANTV  ',
              ${siguienteNroFor},
              1,
              '${fechaIni}',
              100000.00,
              100000.00,
              '',
              100000.00,
              'N',
              'N',
              '',
              'SJTPAI',
              'N',
              GETDATE(),
              GETDATE(),
              '${usuario}',
              'A',
              '${textoSJTPAITruncado.replace(/'/g, "''")}'
            )
          `;
          
          console.log('Query SJTPAI:', queryInsertPai);
          await pool.request().query(queryInsertPai);
          console.log('✓ SJTPAI insertado correctamente');
        } catch (sjtpaiError) {
          console.error(`✗ Error al insertar SJTPAI:`, sjtpaiError.message);
          console.warn(`⚠ SJTPAI no se pudo insertar, pero SJTPAH sí está guardado`);
        }

        console.log(`✓ Registros guardados para legajo ${legajoLimpio}`);

        resultados.push({
          nroleg: legajoLimpio,
          nrofor: siguienteNroFor,
          success: true,
        });

        siguienteNroFor++; // Incrementar para el siguiente empleado
      } catch (error) {
        console.error(`✗ Error al insertar para legajo ${legajoLimpio}:`, error);
        errores.push({
          nroleg: legajoLimpio,
          error: error.message,
        });
      }
    }

    console.log('\n=== RESUMEN DE INSERCIÓN ===');
    console.log(`✓ Exitosos: ${resultados.length}`);
    console.log(`✗ Errores: ${errores.length}`);

    res.json({
      success: true,
      message: `Insertados ${resultados.length} registros correctamente`,
      resultados,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error('✗✗✗ ERROR GENERAL AL INSERTAR VIÁTICOS:', error);
    res.status(500).json({
      success: false,
      message: 'Error al insertar los viáticos',
      error: error.message,
    });
  }
}

/**
 * Consulta los últimos registros insertados
 */
export async function getUltimosRegistros(req, res) {
  try {
    const pool = await getConnection();
    
    const result = await pool.request().query(`
      SELECT TOP 20
        h.SJTPAH_CODFOR,
        h.SJTPAH_NROFOR,
        h.SJTPAH_EMPLEG,
        h.SJTPAH_NROLEG,
        h.SJTPAH_FCHMOV,
        h.SJTPAH_IMPORT,
        h.SJTPAH_FCHINI,
        h.SJTPAH_STATUS,
        h.SJTPAH_CODCPT,
        h.USR_SJTPAH_TEXTOS,
        m.SJMLGH_NOMBRE
      FROM SJTPAH h
      LEFT JOIN SJMLGH m ON h.SJTPAH_NROLEG = m.SJMLGH_NROLEG
      WHERE h.SJTPAH_CODFOR = 'ANTV'
      ORDER BY h.SJTPAH_NROFOR DESC, h.SJTPAH_FCHMOV DESC
    `);

    res.json({
      success: true,
      registros: result.recordset,
    });
  } catch (error) {
    console.error('Error al consultar últimos registros:', error);
    res.status(500).json({
      success: false,
      message: 'Error al consultar los registros',
      error: error.message,
    });
  }
}

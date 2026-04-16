import { getConnection } from '../config/database.js';

/**
 * Obtiene todos los pedidos POLIVA con sus items y nombre del empleado,
 * agrupados por NROFOR. Devuelve un array de pedidos.
 */
export async function getPedidos(req, res) {
  try {
    const { empresa = 'FP' } = req.query;
    const pool = await getConnection();

    const result = await pool.request().query(`
      SELECT
        h.SJTPAH_NROFOR                                   AS nrofor,
        RTRIM(LTRIM(h.SJTPAH_NROLEG))                    AS nroleg,
        h.SJTPAH_CODEMP                                   AS empresa,
        CONVERT(VARCHAR, h.SJTPAH_FCHMOV, 103)            AS fecha,
        h.SJTPAH_STATUS                                   AS status,
        h.SJTPAH_IMPORT                                   AS importeTotal,
        RTRIM(LTRIM(ISNULL(m.SJMLGH_NOMBRE, 'Sin nombre'))) AS nombre,
        i.SJTPAI_CUOTAS                                   AS cuota,
        RTRIM(LTRIM(ISNULL(i.SJTPAI_MOTIVO, '')))         AS motivo,
        i.SJTPAI_IMPCUO                                   AS impcuo
      FROM SJTPAH h
      LEFT JOIN SJMLGH m
        ON RTRIM(LTRIM(m.SJMLGH_NROLEG)) = RTRIM(LTRIM(h.SJTPAH_NROLEG))
        AND m.SJMLGH_CODEMP = h.SJTPAH_CODEMP
      LEFT JOIN SJTPAI i
        ON i.SJTPAI_NROFOR  = h.SJTPAH_NROFOR
        AND i.SJTPAI_CODEMP  = h.SJTPAH_CODEMP
        AND i.SJTPAI_CODFOR  = h.SJTPAH_CODFOR
        AND i.SJTPAI_MODFOR  = h.SJTPAH_MODFOR
      WHERE h.SJTPAH_CODFOR = 'POLIVA'
        AND h.SJTPAH_CODEMP = '${empresa}'
      ORDER BY h.SJTPAH_NROFOR DESC, i.SJTPAI_CUOTAS ASC
    `);

    // Agrupar filas por NROFOR
    const pedidosMap = new Map();

    for (const row of result.recordset) {
      const key = row.nrofor;

      if (!pedidosMap.has(key)) {
        pedidosMap.set(key, {
          nrofor:       row.nrofor,
          nroleg:       row.nroleg,
          empresa:      row.empresa,
          fecha:        row.fecha,
          status:       row.status,
          importeTotal: parseFloat(row.importeTotal) || 0,
          nombre:       row.nombre,
          items:        [],
        });
      }

      if (row.motivo) {
        pedidosMap.get(key).items.push({
          cuota:  row.cuota,
          motivo: row.motivo,
          impcuo: parseFloat(row.impcuo) || 0,
        });
      }
    }

    const pedidos = Array.from(pedidosMap.values());

    res.json({ success: true, pedidos });
  } catch (error) {
    console.error('Error al obtener pedidos:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los pedidos',
      error: error.message,
    });
  }
}

/**
 * Marca un pedido como entregado (SJTPAH_STATUS = 'E')
 */
export async function marcarEntregado(req, res) {
  try {
    const { nrofor, empresa = 'FP' } = req.body;

    if (!nrofor) {
      return res.status(400).json({ success: false, message: 'Falta el número de formulario' });
    }

    const pool = await getConnection();

    await pool.request().query(`
      UPDATE SJTPAH
      SET SJTPAH_STATUS = 'E',
          SJTPAH_FECMOD  = GETDATE()
      WHERE SJTPAH_CODFOR = 'POLIVA'
        AND SJTPAH_CODEMP = '${empresa}'
        AND SJTPAH_NROFOR = ${nrofor}
    `);

    console.log(`✓ Pedido N°${nrofor} marcado como entregado (empresa: ${empresa})`);

    res.json({ success: true, message: `Pedido N°${nrofor} marcado como entregado` });
  } catch (error) {
    console.error('Error al marcar como entregado:', error);
    res.status(500).json({
      success: false,
      message: 'Error al actualizar el pedido',
      error: error.message,
    });
  }
}

import { getConnection } from '../config/database.js';

const ARTCOD_A_NOMBRE = {
  '8':  'Oliver Cooks AOVE Clásico - Vidrio 250cc',
  '9':  'Oliver Cooks AOVE Clásico - Vidrio 500cc',
  '10': 'Oliver Cooks AOVE Clásico - Pet 1000cc',
  '11': 'Oliver Cooks AOVE Clásico - Pet 3000cc',
  '12': 'Oliver Cooks AOVE Clásico - Pet 5000cc',
  '13': 'Oliver Cooks AOVE Intenso - Vidrio 250cc',
  '14': 'Oliver Cooks AOVE Intenso - Vidrio 500cc',
  '15': 'Oliver Cooks AOVE Intenso - Pet 1000cc',
  '16': 'Oliver Cooks AOVE Intenso - Pet 3000cc',
  '17': 'Oliver Cooks AOVE Intenso - Pet 5000cc',
};

/**
 * Obtiene pedidos de ambas vías:
 *  - SJTPAH/SJTPAI  (bono, CODFOR='POLIVA')
 *  - FCRMVH/FCRMVI  (empleado efectivo/transf, CODFOR='NPI', sin Bono en TEXTOS)
 */
export async function getPedidos(req, res) {
  try {
    const { empresa = 'FP' } = req.query;
    const pool = await getConnection();

    // ── Query 1: pedidos bono (SJTPAH/SJTPAI) ────────────────────────────────
    const r1 = await pool.request().query(`
      SELECT
        h.SJTPAH_NROFOR                                    AS nrofor,
        RTRIM(LTRIM(h.SJTPAH_NROLEG))                     AS nroleg,
        h.SJTPAH_CODEMP                                    AS empresa,
        CONVERT(VARCHAR, h.SJTPAH_FCHMOV, 103)             AS fecha,
        h.SJTPAH_STATUS                                    AS status,
        h.SJTPAH_IMPORT                                    AS importeTotal,
        RTRIM(LTRIM(ISNULL(m.SJMLGH_NOMBRE, 'Sin nombre'))) AS nombre,
        RTRIM(LTRIM(ISNULL(h.USR_SJTPAH_TEXTOS, '')))     AS observaciones,
        i.SJTPAI_CUOTAS                                    AS cuota,
        RTRIM(LTRIM(ISNULL(i.SJTPAI_MOTIVO, '')))          AS motivo,
        i.SJTPAI_IMPCUO                                    AS impcuo
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

    // ── Agrupar bono orders ───────────────────────────────────────────────────
    const polivaMap = new Map();
    for (const row of r1.recordset) {
      const key = row.nrofor;
      if (!polivaMap.has(key)) {
        polivaMap.set(key, {
          tipo:          'POLIVA',
          nrofor:        row.nrofor,
          nroleg:        row.nroleg,
          empresa:       row.empresa,
          fecha:         row.fecha,
          status:        row.status,
          importeTotal:  parseFloat(row.importeTotal) || 0,
          nombre:        row.nombre,
          observaciones: row.observaciones || '',
          items:         [],
        });
      }
      if (row.motivo) {
        polivaMap.get(key).items.push({
          cuota:  row.cuota,
          motivo: row.motivo,
          impcuo: parseFloat(row.impcuo) || 0,
        });
      }
    }

    // ── Query 2: pedidos empleado (FCRMVH/FCRMVI) ────────────────────────────
    // Si falla este query, los pedidos bono igual se devuelven
    const npiMap = new Map();
    try {
      const r2 = await pool.request().query(`
        SELECT
          h.FCRMVH_NROFOR                                    AS nrofor,
          RTRIM(LTRIM(h.FCRMVH_USERID))                     AS nroleg,
          h.FCRMVH_CODEMP                                    AS empresa,
          CONVERT(VARCHAR, h.FCRMVH_FCHMOV, 103)             AS fecha,
          h.FCRMVH_ULTOPR                                    AS status,
          RTRIM(LTRIM(ISNULL(m.SJMLGH_NOMBRE, 'Sin nombre'))) AS nombre,
          RTRIM(LTRIM(ISNULL(h.FCRMVH_TEXTOS, '')))         AS observaciones,
          v.FCRMVI_NROITM                                    AS cuota,
          RTRIM(LTRIM(ISNULL(v.FCRMVI_ARTCOD, '')))         AS artcod,
          v.FCRMVI_CANTID                                    AS cantidad,
          v.FCRMVI_TOTLIN                                    AS impcuo
        FROM FCRMVH h
        LEFT JOIN SJMLGH m
          ON RTRIM(LTRIM(m.SJMLGH_NROLEG)) = RTRIM(LTRIM(h.FCRMVH_USERID))
          AND m.SJMLGH_CODEMP = h.FCRMVH_CODEMP
        LEFT JOIN FCRMVI v
          ON v.FCRMVI_CODEMP = h.FCRMVH_CODEMP
          AND v.FCRMVI_MODFOR = h.FCRMVH_MODFOR
          AND v.FCRMVI_CODFOR = h.FCRMVH_CODFOR
          AND v.FCRMVI_NROFOR = h.FCRMVH_NROFOR
        WHERE h.FCRMVH_CODFOR = 'NPI'
          AND h.FCRMVH_CODEMP = '${empresa}'
          AND h.FCRMVH_TEXTOS NOT LIKE '%Bono%'
          AND RTRIM(LTRIM(h.FCRMVH_NROCTA)) = '417'
        ORDER BY h.FCRMVH_NROFOR DESC, v.FCRMVI_NROITM ASC
      `);

      for (const row of r2.recordset) {
        const key = row.nrofor;
        if (!npiMap.has(key)) {
          npiMap.set(key, {
            tipo:          'NPI',
            nrofor:        row.nrofor,
            nroleg:        row.nroleg,
            empresa:       row.empresa,
            fecha:         row.fecha,
            status:        row.status,  // 'A'=pendiente, 'E'=entregado
            importeTotal:  0,
            nombre:        row.nombre,
            observaciones: row.observaciones || '',
            items:         [],
          });
        }

        if (row.cuota != null) {
          const artcodNum  = String(row.artcod).trim();
          const nombre     = ARTCOD_A_NOMBRE[artcodNum] || `Producto ${artcodNum}`;
          const cantNum    = parseFloat(row.cantidad) || 1;
          const impcuo     = parseFloat(row.impcuo)   || 0;
          const precioUnit = cantNum > 0 ? impcuo / cantNum : impcuo;
          const precioFmt  = precioUnit.toLocaleString('es-AR', { minimumFractionDigits: 2 });

          npiMap.get(key).items.push({
            cuota:  row.cuota,
            motivo: `${nombre} - Cant: ${cantNum} x $${precioFmt}`,
            impcuo,
          });
          npiMap.get(key).importeTotal += impcuo;
        }
      }
    } catch (npiErr) {
      console.error('⚠ Error al obtener pedidos NPI (se omiten):', npiErr.message);
    }

    // ── Combinar y ordenar por fecha más reciente primero ────────────────────
    const parseDate = (str) => {
      if (!str) return 0;
      const [d, m, y] = str.split('/');
      return new Date(`${y}-${m}-${d}`).getTime();
    };

    const pedidos = [
      ...Array.from(polivaMap.values()),
      ...Array.from(npiMap.values()),
    ].sort((a, b) => parseDate(b.fecha) - parseDate(a.fecha));

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
 * Marca un pedido como entregado.
 * POLIVA (bono):   SJTPAH_STATUS = 'E'
 * NPI (empleado):  FCRMVH_ULTOPR = 'E'
 */
export async function marcarEntregado(req, res) {
  try {
    const { nrofor, empresa = 'FP', tipo = 'POLIVA' } = req.body;

    if (!nrofor) {
      return res.status(400).json({ success: false, message: 'Falta el número de formulario' });
    }

    const pool = await getConnection();

    if (tipo === 'NPI') {
      await pool.request().query(`
        UPDATE FCRMVH
        SET FCRMVH_ULTOPR = 'E',
            FCRMVH_FECMOD  = GETDATE()
        WHERE FCRMVH_CODFOR = 'NPI'
          AND FCRMVH_CODEMP = '${empresa}'
          AND FCRMVH_NROFOR = ${nrofor}
      `);
    } else {
      await pool.request().query(`
        UPDATE SJTPAH
        SET SJTPAH_STATUS = 'E',
            SJTPAH_FECMOD  = GETDATE()
        WHERE SJTPAH_CODFOR = 'POLIVA'
          AND SJTPAH_CODEMP = '${empresa}'
          AND SJTPAH_NROFOR = ${nrofor}
      `);
    }

    console.log(`✓ Pedido N°${nrofor} (${tipo}) marcado como entregado (empresa: ${empresa})`);
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

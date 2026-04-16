const sql = require('mssql');

const config = {
  server: 'ServerSQL2022',
  database: 'DIBIAG',
  user: 'sa',
  password: 'Password1!',
  options: {
    trustServerCertificate: true,
    encrypt: false
  }
};

sql.connect(config).then(pool => {
  return pool.request().query(`
    SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME IN ('SJTPAH', 'SJTPAI') 
      AND COLUMN_NAME LIKE '%TEXT%' 
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
}).then(result => {
  console.log(JSON.stringify(result.recordset, null, 2));
  sql.close();
}).catch(err => {
  console.error(err);
  sql.close();
});

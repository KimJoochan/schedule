// db.js
const mysql = require('mysql2/promise');

// 도커 컴포즈의 environment에 등록한 변수들을 그대로 가져옵니다.
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_NAME || 'my_database',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// ⭐ 쿼리가 커넥션을 얻어 실행될 때 발생하는 이벤트를 가로챕니다.
pool.on('connection', (connection) => {
  connection.on('enqueue', (sequence) => {
    // 실행 대기열에 들어온 명령이 'Query' 구조일 때만 필터링
    if (sequence.constructor.name === 'Query' || sequence.constructor.name === 'Execute') {
      console.log('⚙️ [DB Execute SQL]:', sequence.sql);
      if (sequence.values) {
        console.log('📦 [DB Bind Values]:', sequence.values);
      }
    }
  });
});

module.exports = pool;
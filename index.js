const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('<h1>Doc56756765ker로 실행된wefewfewf Node.js 서678678678버입56756756니다!</h1>');
});

app.listen(PORT, () => {
  console.log(`🚀 서버가 포트 ${PORT}에서 정상 작동 중입니다.`);
});
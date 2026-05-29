// src/index.ts
import express, { Request, Response } from 'express'; // 실제로는 import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import qrRouter from "./routes/qrcode";
dotenv.config();
const app = express();

const PORT = process.env.PORT || 3000;
app.use(express.static('public'));
const corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200 // 일부 레거시 브라우저(IE11, 다양한 SmartTV)를 위한 설정
};
app.use(cors(corsOptions));
app.use(express.json());
app.use("/api",qrRouter);
app.get('/api', (req: Request, res: Response) => {
  res.send('딱봐 API 서버 가동 중! 🚀');
});
app.get('/', (req: Request, res: Response) => {
  res.send('딱봐 API 서버 가동 중! 🚀');
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});
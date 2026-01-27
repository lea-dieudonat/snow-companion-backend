import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req: Request, res: Response) => {
  res.send({ status: 'ok', message: 'Snow Companion API is running! 🏂' });
});

app.listen(port, () => {
    console.log(`⚡️ Server is running at http://localhost:${port}`);
})
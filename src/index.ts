import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sessionRoutes from '@/routes/session.routes';
import userRoutes from '@/routes/user.routes';
import stationRoutes from '@/routes/station.routes';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.send({ status: 'ok', message: 'Snow Companion API is running! 🏂' });
});

app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);

app.listen(PORT, () => {
    console.log(`⚡️ Server is running at http://localhost:${PORT}`);
})
import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from '@/routes/auth.routes';
import sessionRoutes from '@/routes/session.routes';
import userRoutes from '@/routes/user.routes';
import stationRoutes from '@/routes/station.routes';
import tripRoutes from '@/routes/trip.routes';
import { errorHandler } from '@/middlewares/errorHandler';

const app: Express = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req: Request, res: Response) => {
  res.send({ status: 'ok', message: 'Snow Companion API is running! 🏂' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/trips', tripRoutes);

app.use(errorHandler);

export default app;

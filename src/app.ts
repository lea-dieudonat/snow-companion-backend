import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from '@/routes/auth.routes';
import sessionRoutes from '@/routes/session.routes';
import userRoutes from '@/routes/user.routes';
import stationRoutes from '@/routes/station.routes';
import tripRoutes from '@/routes/trip.routes';
import agentRoutes from '@/routes/agent.routes';
import { errorHandler, notFoundHandler } from '@/middlewares/errorHandler';
import helmet from 'helmet';
import { env } from '@/config/env';

const app: Express = express();

// Derrière un reverse proxy, TRUST_PROXY = nombre de proxys de confiance (0 = désactivé)
app.set('trust proxy', env.trustProxy);

app.use(helmet());
app.use(cors({ origin: env.corsOrigins }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req: Request, res: Response) => {
  res.send({ status: 'ok', message: 'Snow Companion API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/agent', agentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

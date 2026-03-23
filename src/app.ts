import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import authRoutes from '@/routes/auth.routes';
import sessionRoutes from '@/routes/session.routes';
import userRoutes from '@/routes/user.routes';
import stationRoutes from '@/routes/station.routes';
import tripRoutes from '@/routes/trip.routes';
import agentRoutes from '@/routes/agent.routes';
import { errorHandler } from '@/middlewares/errorHandler';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const app: Express = express();

app.use(cors());
app.use(express.json());

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Snow Companion API', version: '1.0.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/routes/*.ts'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/api/health', (_req: Request, res: Response) => {
  res.send({ status: 'ok', message: 'Snow Companion API is running! 🏂' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/agent', agentRoutes);

app.use(errorHandler);

export default app;

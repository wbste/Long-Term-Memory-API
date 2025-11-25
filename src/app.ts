import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config';
import { requestLogger } from './middleware/requestLogger';
import { rateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';
import { memoryRoutes } from './routes/memoryRoutes';
import { sessionRoutes } from './routes/sessionRoutes';
import { healthRoutes } from './routes/healthRoutes';
import { adminRoutes } from './routes/adminRoutes';
import { MemoryController } from './controllers/memoryController';
import { SessionController } from './controllers/sessionController';
import { HealthController } from './controllers/healthController';
import { AdminController } from './controllers/adminController';
import { MemoryService } from './services/memoryService';
import { EmbeddingProvider } from './services/embeddings/EmbeddingProvider';

export interface AppDependencies {
  memoryService: MemoryService;
  embeddingProvider?: EmbeddingProvider;
}

export const createApp = ({ memoryService, embeddingProvider }: AppDependencies) => {
  const app = express();

  // CORS: Vercel-länkarna måste finnas här
  const corsOrigin = [
    'http://localhost:5173',
    'https://memvault-demo-g38n.vercel.app',
    'https://memvault-demo-g38n-hmln73sg5-jacobs-projects-f74302f1.vercel.app'
  ];

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key']
    })
  );
  
  app.use(express.json({ limit: '1mb' }));
  app.use(requestLogger);
  app.use(rateLimiter);

  const memoryController = new MemoryController(memoryService);
  const sessionController = new SessionController(memoryService);
  const healthController = new HealthController(embeddingProvider);
  const adminController = new AdminController(memoryService);

  // Health check för Railway (viktig för att servicen inte ska krascha)
  app.get('/health', healthController.health);

  const apiRouter = express.Router();

  // --- HÄR VAR FELET (404) ---
  // Vi måste lägga till '/memory' som prefix, annars hamnar ruterna direkt på /api/
  apiRouter.use('/memory', memoryRoutes(memoryController));
  
  // Jag lägger till prefix för session och admin också för säkerhets skull
  apiRouter.use('/session', sessionRoutes(sessionController));
  apiRouter.use('/admin', adminRoutes(adminController));
  
  // Health brukar ligga direkt under /api/health i sin router-fil, så vi låter den vara
  apiRouter.use(healthRoutes(healthController));

  // Montera allt under /api
  app.use('/api', apiRouter);

  app.use(errorHandler);

  return app;
};
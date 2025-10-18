import { Router, Request, Response } from 'express';
import { database } from '@/config/database';
import { config } from '@/config/environment';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: {
      status: string;
      responseTime?: number;
    };
    redis?: {
      status: string;
      responseTime?: number;
    };
  };
}

// Health check endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const startTime = Date.now();
    
    // Check database health
    const dbHealth = await database.healthCheck();
    
    const healthStatus: HealthStatus = {
      status: dbHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.nodeEnv,
      services: {
        database: {
          status: dbHealth.status,
          responseTime: dbHealth.responseTime
        }
      }
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: config.nodeEnv,
      error: 'Health check failed',
      services: {
        database: {
          status: 'unhealthy'
        }
      }
    });
  }
});

// Liveness probe
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

// Readiness probe
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const dbHealth = await database.healthCheck();
    
    if (dbHealth.status === 'healthy') {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'not ready',
        timestamp: new Date().toISOString(),
        reason: 'Database not healthy'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      reason: 'Health check failed'
    });
  }
});

export { router as healthRoutes };
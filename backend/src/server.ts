import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { config } from '@/config/environment';
import { database } from '@/config/database';
import { logger, stream } from '@/utils/logger';
import { errorHandler } from '@/middleware/errorHandler';
import { notFoundHandler } from '@/middleware/notFoundHandler';
import { authRoutes } from '@/routes/auth';
import { documentRoutes } from '@/routes/documents';
import { jobRoutes } from '@/routes/jobs';
import { userRoutes } from '@/routes/users';
import { searchRoutes } from '@/routes/search';
import { adminRoutes } from '@/routes/admin';
import { healthRoutes } from '@/routes/health';

class Server {
  private app: express.Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = config.port;
    
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));

    // CORS configuration
    this.app.use(cors({
      origin: config.security.corsOrigin,
      credentials: true,
      optionsSuccessStatus: 200
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: config.security.rateLimitWindowMs,
      max: config.security.rateLimitMaxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.'
      },
      standardHeaders: true,
      legacyHeaders: false
    });
    this.app.use('/api', limiter);

    // Compression
    this.app.use(compression());

    // HTTP request logging
    this.app.use(morgan(config.logFormat, { stream }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Trust proxy (for reverse proxy setups)
    this.app.set('trust proxy', 1);
  }

  private initializeRoutes(): void {
    // Health check route (before authentication)
    this.app.use('/health', healthRoutes);

    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/documents', documentRoutes);
    this.app.use('/api/jobs', jobRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/search', searchRoutes);
    this.app.use('/api/admin', adminRoutes);

    // Root route
    this.app.get('/', (req, res) => {
      res.json({
        message: 'Aura Document Intelligence Platform API',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString()
      });
    });

    // API documentation route
    this.app.get('/api', (req, res) => {
      res.json({
        message: 'Aura Document Intelligence Platform API',
        version: '1.0.0',
        documentation: '/api/docs',
        endpoints: {
          auth: '/api/auth',
          documents: '/api/documents',
          jobs: '/api/jobs',
          users: '/api/users',
          search: '/api/search',
          admin: '/api/admin'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public async start(): Promise<void> {
    try {
      // Connect to database
      await database.connect();
      logger.info('Database connected successfully');

      // Start server
      this.app.listen(this.port, config.host, () => {
        logger.info(`Server is running on ${config.host}:${this.port}`);
        logger.info(`Environment: ${config.nodeEnv}`);
        logger.info(`API Documentation: http://${config.host}:${this.port}/api/docs`);
      });

    } catch (error) {
      logger.error('Failed to start server:', error);
      process.exit(1);
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}

// Initialize and start server
const server = new Server();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  database.disconnect().then(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  database.disconnect().then(() => {
    process.exit(0);
  });
});

// Start the server
if (require.main === module) {
  server.start();
}

export { server };
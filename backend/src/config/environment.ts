import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

interface DatabaseConfig {
  uri: string;
  name: string;
}

interface JWTConfig {
  secret: string;
  expiresIn: string;
  refreshExpiresIn: string;
}

interface RedisConfig {
  url: string;
}

interface FileUploadConfig {
  uploadPath: string;
  maxFileSize: number;
  allowedTypes: string[];
}

interface ServicesConfig {
  ocrServiceUrl: string;
  icrServiceUrl: string;
  nlpServiceUrl: string;
  docIntelServiceUrl: string;
}

interface QueueConfig {
  redisUrl: string;
  concurrency: number;
  timeout: number;
}

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

interface SecurityConfig {
  corsOrigin: string;
  bcryptRounds: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
}

interface Config {
  nodeEnv: string;
  port: number;
  host: string;
  database: DatabaseConfig;
  jwt: JWTConfig;
  redis: RedisConfig;
  fileUpload: FileUploadConfig;
  services: ServicesConfig;
  queue: QueueConfig;
  email: EmailConfig;
  security: SecurityConfig;
  logLevel: string;
  logFormat: string;
}

const requiredEnvVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'REDIS_URL'
];

// Validate required environment variables
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config: Config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  database: {
    uri: process.env.MONGODB_URI!,
    name: process.env.MONGODB_DB_NAME || 'aura-app'
  },
  
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  
  redis: {
    url: process.env.REDIS_URL!
  },
  
  fileUpload: {
    uploadPath: process.env.UPLOAD_PATH || path.join(process.cwd(), 'uploads'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'pdf,png,jpg,jpeg,tiff,doc,docx').split(',')
  },
  
  services: {
    ocrServiceUrl: process.env.OCR_SERVICE_URL || 'http://localhost:8001',
    icrServiceUrl: process.env.ICR_SERVICE_URL || 'http://localhost:8002',
    nlpServiceUrl: process.env.NLP_SERVICE_URL || 'http://localhost:8003',
    docIntelServiceUrl: process.env.DOC_INTEL_SERVICE_URL || 'http://localhost:8000'
  },
  
  queue: {
    redisUrl: process.env.BULL_REDIS_URL || process.env.REDIS_URL!,
    concurrency: parseInt(process.env.JOB_CONCURRENCY || '5', 10),
    timeout: parseInt(process.env.JOB_TIMEOUT || '300000', 10) // 5 minutes
  },
  
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  
  security: {
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10)
  },
  
  logLevel: process.env.LOG_LEVEL || 'info',
  logFormat: process.env.LOG_FORMAT || 'combined'
};

// Validate configuration
export function validateConfig(): void {
  const errors: string[] = [];
  
  if (config.port < 1 || config.port > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  if (config.fileUpload.maxFileSize < 1024) {
    errors.push('MAX_FILE_SIZE must be at least 1KB');
  }
  
  if (config.jwt.secret.length < 32) {
    errors.push('JWT_SECRET must be at least 32 characters long');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
}

// Validate configuration on load
validateConfig();
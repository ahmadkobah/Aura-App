import { Request, Response } from 'express';
import { AppError } from './errorHandler';

export const notFoundHandler = (req: Request, res: Response): void => {
  const error = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  
  res.status(404).json({
    status: 'error',
    message: error.message,
    requestedUrl: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
};